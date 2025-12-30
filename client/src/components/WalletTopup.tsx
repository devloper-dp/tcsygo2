import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Wallet, CreditCard, Smartphone, Building2, Plus, Loader2, CheckCircle2 } from 'lucide-react';
import { createWalletTopupOrder, verifyAndAddToWallet } from '@/lib/wallet-service';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useQueryClient } from '@tanstack/react-query';

interface WalletTopupProps {
    onSuccess?: (amount: number) => void;
    className?: string;
}

export function WalletTopup({ onSuccess, className = '' }: WalletTopupProps) {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [showDialog, setShowDialog] = useState(false);
    const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
    const [customAmount, setCustomAmount] = useState('');
    const [paymentMethod, setPaymentMethod] = useState<'upi' | 'card' | 'netbanking'>('upi');
    const [processing, setProcessing] = useState(false);

    const quickAmounts = [100, 500, 1000, 2000, 5000];

    const handleTopup = async () => {
        const amount = selectedAmount || parseFloat(customAmount);

        if (!amount || amount < 10) {
            toast({
                title: 'Invalid Amount',
                description: 'Minimum topup amount is ₹10',
                variant: 'destructive',
            });
            return;
        }

        if (amount > 50000) {
            toast({
                title: 'Amount Too Large',
                description: 'Maximum topup amount is ₹50,000',
                variant: 'destructive',
            });
            return;
        }

        setProcessing(true);

        try {
            // Create Razorpay order
            const order = await createWalletTopupOrder(amount);

            // Initialize Razorpay
            const options = {
                key: order.key,
                amount: order.amount,
                currency: order.currency,
                name: 'TCSYGO',
                description: 'Wallet Topup',
                order_id: order.orderId,
                handler: async function (response: any) {
                    try {
                        // Verify payment and add to wallet
                        const success = await verifyAndAddToWallet(
                            response.razorpay_order_id,
                            response.razorpay_payment_id,
                            response.razorpay_signature,
                            order.amount
                        );

                        if (success) {
                            toast({
                                title: '✅ Topup Successful',
                                description: `₹${amount} added to your wallet`,
                            });

                            // Refresh wallet balance
                            queryClient.invalidateQueries({ queryKey: ['wallet'] });

                            setShowDialog(false);
                            setSelectedAmount(null);
                            setCustomAmount('');

                            if (onSuccess) {
                                onSuccess(amount);
                            }
                        } else {
                            throw new Error('Payment verification failed');
                        }
                    } catch (error) {
                        console.error('Payment verification error:', error);
                        toast({
                            title: 'Verification Failed',
                            description: 'Payment could not be verified. Please contact support.',
                            variant: 'destructive',
                        });
                    } finally {
                        setProcessing(false);
                    }
                },
                prefill: {
                    name: '',
                    email: '',
                    contact: '',
                },
                theme: {
                    color: '#3b82f6',
                },
                modal: {
                    ondismiss: function () {
                        setProcessing(false);
                        toast({
                            title: 'Payment Cancelled',
                            description: 'You cancelled the payment',
                        });
                    },
                },
            };

            const razorpay = new (window as any).Razorpay(options);
            razorpay.open();
        } catch (error) {
            console.error('Topup error:', error);
            toast({
                title: 'Topup Failed',
                description: 'Failed to initiate payment. Please try again.',
                variant: 'destructive',
            });
            setProcessing(false);
        }
    };

    const finalAmount = selectedAmount || parseFloat(customAmount) || 0;
    const showCashback = finalAmount >= 1000;
    const cashbackAmount = showCashback ? Math.floor(finalAmount * 0.02) : 0; // 2% cashback

    return (
        <>
            <Button
                onClick={() => setShowDialog(true)}
                className={`gap-2 ${className}`}
            >
                <Plus className="w-4 h-4" />
                Add Money
            </Button>

            <Dialog open={showDialog} onOpenChange={setShowDialog}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Wallet className="w-5 h-5 text-primary" />
                            Add Money to Wallet
                        </DialogTitle>
                        <DialogDescription>
                            Choose an amount and payment method
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-6 py-4">
                        {/* Quick Amount Selection */}
                        <div>
                            <Label className="mb-3 block">Quick Select</Label>
                            <div className="grid grid-cols-3 gap-2">
                                {quickAmounts.map((amount) => (
                                    <Button
                                        key={amount}
                                        variant={selectedAmount === amount ? 'default' : 'outline'}
                                        onClick={() => {
                                            setSelectedAmount(amount);
                                            setCustomAmount('');
                                        }}
                                        className="h-12"
                                    >
                                        ₹{amount}
                                    </Button>
                                ))}
                            </div>
                        </div>

                        {/* Custom Amount */}
                        <div>
                            <Label htmlFor="custom-amount">Custom Amount</Label>
                            <div className="relative mt-2">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                                    ₹
                                </span>
                                <Input
                                    id="custom-amount"
                                    type="number"
                                    placeholder="Enter amount"
                                    value={customAmount}
                                    onChange={(e) => {
                                        setCustomAmount(e.target.value);
                                        setSelectedAmount(null);
                                    }}
                                    className="pl-8"
                                    min="10"
                                    max="50000"
                                />
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                                Min: ₹10 • Max: ₹50,000
                            </p>
                        </div>

                        {/* Cashback Offer */}
                        {showCashback && (
                            <Card className="p-3 bg-success/10 border-success/20">
                                <div className="flex items-center gap-2">
                                    <CheckCircle2 className="w-5 h-5 text-success" />
                                    <div>
                                        <p className="font-semibold text-sm">Cashback Offer!</p>
                                        <p className="text-xs text-muted-foreground">
                                            Get ₹{cashbackAmount} cashback on this topup
                                        </p>
                                    </div>
                                </div>
                            </Card>
                        )}

                        {/* Payment Method */}
                        <div>
                            <Label className="mb-3 block">Payment Method</Label>
                            <Tabs value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as any)}>
                                <TabsList className="grid w-full grid-cols-3">
                                    <TabsTrigger value="upi">
                                        <Smartphone className="w-4 h-4 mr-1" />
                                        UPI
                                    </TabsTrigger>
                                    <TabsTrigger value="card">
                                        <CreditCard className="w-4 h-4 mr-1" />
                                        Card
                                    </TabsTrigger>
                                    <TabsTrigger value="netbanking">
                                        <Building2 className="w-4 h-4 mr-1" />
                                        Bank
                                    </TabsTrigger>
                                </TabsList>

                                <TabsContent value="upi" className="mt-4">
                                    <div className="text-center py-4">
                                        <Smartphone className="w-12 h-12 mx-auto mb-2 text-primary" />
                                        <p className="text-sm text-muted-foreground">
                                            Pay using any UPI app
                                        </p>
                                    </div>
                                </TabsContent>

                                <TabsContent value="card" className="mt-4">
                                    <div className="text-center py-4">
                                        <CreditCard className="w-12 h-12 mx-auto mb-2 text-primary" />
                                        <p className="text-sm text-muted-foreground">
                                            Debit/Credit cards accepted
                                        </p>
                                    </div>
                                </TabsContent>

                                <TabsContent value="netbanking" className="mt-4">
                                    <div className="text-center py-4">
                                        <Building2 className="w-12 h-12 mx-auto mb-2 text-primary" />
                                        <p className="text-sm text-muted-foreground">
                                            All major banks supported
                                        </p>
                                    </div>
                                </TabsContent>
                            </Tabs>
                        </div>

                        {/* Summary */}
                        {finalAmount > 0 && (
                            <Card className="p-4 bg-muted/50">
                                <div className="space-y-2">
                                    <div className="flex justify-between text-sm">
                                        <span>Amount</span>
                                        <span className="font-semibold">₹{finalAmount.toFixed(2)}</span>
                                    </div>
                                    {showCashback && (
                                        <div className="flex justify-between text-sm text-success">
                                            <span>Cashback (2%)</span>
                                            <span className="font-semibold">+₹{cashbackAmount}</span>
                                        </div>
                                    )}
                                    <div className="border-t pt-2 flex justify-between font-bold">
                                        <span>Total to Pay</span>
                                        <span className="text-primary">₹{finalAmount.toFixed(2)}</span>
                                    </div>
                                </div>
                            </Card>
                        )}

                        {/* Action Button */}
                        <Button
                            size="lg"
                            className="w-full"
                            onClick={handleTopup}
                            disabled={finalAmount < 10 || processing}
                        >
                            {processing ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Processing...
                                </>
                            ) : (
                                <>
                                    <Wallet className="w-4 h-4 mr-2" />
                                    Add ₹{finalAmount.toFixed(2)}
                                </>
                            )}
                        </Button>

                        {/* Security Badge */}
                        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                            <CheckCircle2 className="w-4 h-4 text-success" />
                            <span>Secured by Razorpay</span>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
