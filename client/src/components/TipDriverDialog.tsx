import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Heart, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';

interface TipDriverDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    bookingId: string;
    driverId: string;
    driverName: string;
    onTipComplete?: () => void;
}

const PRESET_TIPS = [10, 20, 50, 100];

export function TipDriverDialog({
    open,
    onOpenChange,
    bookingId,
    driverId,
    driverName,
    onTipComplete,
}: TipDriverDialogProps) {
    const { toast } = useToast();
    const [selectedTip, setSelectedTip] = useState<number | 'custom'>(20);
    const [customAmount, setCustomAmount] = useState('');
    const [processing, setProcessing] = useState(false);

    const getTipAmount = (): number => {
        if (selectedTip === 'custom') {
            return parseFloat(customAmount) || 0;
        }
        return selectedTip as number;
    };

    const handleTipDriver = async () => {
        const amount = getTipAmount();

        if (amount <= 0) {
            toast({
                title: 'Invalid Amount',
                description: 'Please enter a valid tip amount',
                variant: 'destructive',
            });
            return;
        }

        setProcessing(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('User not authenticated');

            // Check wallet balance
            const { data: wallet } = await supabase
                .from('wallets')
                .select('id, balance')
                .eq('user_id', user.id)
                .single();

            if (!wallet || wallet.balance < amount) {
                toast({
                    title: 'Insufficient Balance',
                    description: 'Please add money to your wallet to tip the driver',
                    variant: 'destructive',
                });
                setProcessing(false);
                return;
            }

            // Create tip record
            const { error: tipError } = await supabase
                .from('driver_tips')
                .insert({
                    booking_id: bookingId,
                    driver_id: driverId,
                    passenger_id: user.id,
                    amount: amount,
                    payment_method: 'wallet',
                    payment_status: 'completed',
                });

            if (tipError) throw tipError;

            // Deduct from passenger wallet
            const { error: deductError } = await supabase
                .from('wallets')
                .update({ balance: wallet.balance - amount })
                .eq('user_id', user.id);

            if (deductError) throw deductError;

            // Add wallet transaction
            const { error: txnError } = await supabase
                .from('wallet_transactions')
                .insert({
                    wallet_id: wallet.id,
                    type: 'debit',
                    amount: amount,
                    description: `Tip to ${driverName}`,
                    status: 'completed',
                    reference_id: bookingId,
                });

            if (txnError) throw txnError;

            // Get driver's wallet
            const { data: driverUser } = await supabase
                .from('drivers')
                .select('user_id')
                .eq('id', driverId)
                .single();

            if (driverUser) {
                const { data: driverWallet } = await supabase
                    .from('wallets')
                    .select('*')
                    .eq('user_id', driverUser.user_id)
                    .single();

                if (driverWallet) {
                    // Credit to driver wallet
                    await supabase
                        .from('wallets')
                        .update({ balance: driverWallet.balance + amount })
                        .eq('user_id', driverUser.user_id);

                    // Add driver wallet transaction
                    await supabase
                        .from('wallet_transactions')
                        .insert({
                            wallet_id: driverWallet.id,
                            type: 'credit',
                            amount: amount,
                            description: `Tip from passenger`,
                            status: 'completed',
                            reference_id: bookingId,
                        });
                }
            }

            // Send notification to driver
            if (driverUser) {
                await supabase
                    .from('notifications')
                    .insert({
                        user_id: driverUser.user_id,
                        title: '💰 Tip Received',
                        message: `You received a ₹${amount} tip!`,
                        type: 'tip',
                        data: { booking_id: bookingId, amount },
                    });
            }

            toast({
                title: '❤️ Tip Sent!',
                description: `₹${amount} tip sent to ${driverName}`,
            });

            onOpenChange(false);
            if (onTipComplete) onTipComplete();
        } catch (error: any) {
            console.error('Tip error:', error);
            toast({
                title: 'Tip Failed',
                description: error.message || 'Failed to send tip',
                variant: 'destructive',
            });
        } finally {
            setProcessing(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Heart className="w-5 h-5 text-red-500" />
                        Tip Your Driver
                    </DialogTitle>
                    <DialogDescription>
                        Show your appreciation to {driverName} for a great ride
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    {/* Preset Tips */}
                    <div>
                        <Label className="text-sm font-medium mb-3 block">Select Amount</Label>
                        <div className="grid grid-cols-4 gap-2">
                            {PRESET_TIPS.map((amount) => (
                                <Button
                                    key={amount}
                                    variant={selectedTip === amount ? 'default' : 'outline'}
                                    className="h-12"
                                    onClick={() => setSelectedTip(amount)}
                                >
                                    ₹{amount}
                                </Button>
                            ))}
                        </div>
                    </div>

                    {/* Custom Amount */}
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <RadioGroupItem
                                value="custom"
                                id="custom"
                                checked={selectedTip === 'custom'}
                                onClick={() => setSelectedTip('custom')}
                            />
                            <Label htmlFor="custom" className="cursor-pointer">
                                Custom Amount
                            </Label>
                        </div>
                        {selectedTip === 'custom' && (
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                                    ₹
                                </span>
                                <Input
                                    type="number"
                                    placeholder="Enter amount"
                                    value={customAmount}
                                    onChange={(e) => setCustomAmount(e.target.value)}
                                    className="pl-7"
                                    min="1"
                                />
                            </div>
                        )}
                    </div>

                    {/* Total Display */}
                    <div className="p-4 bg-primary/10 rounded-lg">
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">Tip Amount</span>
                            <span className="text-2xl font-bold text-primary">
                                ₹{getTipAmount().toFixed(2)}
                            </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            Will be deducted from your wallet
                        </p>
                    </div>
                </div>

                <DialogFooter className="gap-2 sm:gap-0">
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        disabled={processing}
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleTipDriver}
                        disabled={processing || getTipAmount() <= 0}
                    >
                        {processing ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Processing...
                            </>
                        ) : (
                            <>
                                <Heart className="w-4 h-4 mr-2" />
                                Send Tip
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
