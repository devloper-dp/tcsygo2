import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tag, X, Plus } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { mapPromoCode } from '@/lib/mapper';
import { PromoCode } from '@shared/schema';

// Interface moved to shared schema

interface PromoCodeDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onApply: (code: PromoCode) => void;
    currentAmount: number;
}

export function PromoCodeDialog({ isOpen, onClose, onApply, currentAmount }: PromoCodeDialogProps) {
    const [promoCode, setPromoCode] = useState('');
    const [error, setError] = useState('');
    const [isValidating, setIsValidating] = useState(false);

    const { data: availablePromoCodes, isLoading, error: promoError } = useQuery<PromoCode[]>({
        queryKey: ['promo-codes'],
        queryFn: async () => {
            try {
                const now = new Date().toISOString();
                const { data, error } = await supabase
                    .from('promo_codes')
                    .select('*')
                    .eq('is_active', true)
                    .lte('valid_from', now)
                    .gte('valid_until', now);

                if (error) {
                    console.error('Promo codes query error:', error);
                    throw error;
                }
                return (data || []).map(mapPromoCode);
            } catch (err) {
                console.error('Failed to fetch promo codes:', err);
                // Return empty array instead of throwing to prevent UI breakage
                return [];
            }
        },
    });

    const handleApply = async () => {
        setError('');
        setIsValidating(true);

        try {
            // Check against loaded promo codes
            const foundPromo = (availablePromoCodes || []).find(
                p => p.code.toLowerCase() === promoCode.toLowerCase()
            );

            if (foundPromo) {
                // Determine discount and apply
                onApply(foundPromo);
                onClose();
                setPromoCode('');
            } else {
                // If not in the pre-fetched list, it might be a hidden or specific user code
                // Try fetching directly from DB for this specific code
                const { data: specificPromo, error: fetchError } = await supabase
                    .from('promo_codes')
                    .select('*')
                    .eq('code', promoCode.toUpperCase())
                    .eq('is_active', true)
                    .single();

                if (specificPromo) {
                    const now = new Date();
                    const validFrom = new Date(specificPromo.valid_from);
                    const validUntil = new Date(specificPromo.valid_until);

                    if (now >= validFrom && now <= validUntil) {
                        onApply(mapPromoCode(specificPromo));
                        onClose();
                        setPromoCode('');
                    } else {
                        setError('Promo code is expired or not yet valid');
                    }
                } else {
                    setError('Invalid promo code');
                }
            }
        } catch (err) {
            console.error('Promo validation error:', err);
            setError('Failed to validate promo code');
        } finally {
            setIsValidating(false);
        }
    };

    const calculateDiscount = (promo: PromoCode) => {
        const value = parseFloat(promo.discountValue);
        if (promo.discountType === 'percentage') {
            return Math.round((currentAmount * value) / 100);
        }
        return value;
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Apply Promo Code</DialogTitle>
                    <DialogDescription>
                        Enter a promo code to get a discount on your booking
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="promo">Promo Code</Label>
                        <div className="flex gap-2">
                            <Input
                                id="promo"
                                placeholder="Enter code"
                                value={promoCode}
                                onChange={(e) => {
                                    setPromoCode(e.target.value.toUpperCase());
                                    setError('');
                                }}
                                className={error ? 'border-destructive' : ''}
                            />
                            <Button
                                onClick={handleApply}
                                disabled={!promoCode || isValidating}
                            >
                                {isValidating ? 'Validating...' : 'Apply'}
                            </Button>
                        </div>
                        {error && (
                            <p className="text-sm text-destructive">{error}</p>
                        )}
                    </div>

                    <Separator />

                    <div className="space-y-3">
                        <p className="text-sm font-medium">Available Offers</p>
                        {isLoading ? (
                            <div className="text-center py-4 text-sm text-muted-foreground">Loading offers...</div>
                        ) : availablePromoCodes && availablePromoCodes.length > 0 ? (
                            availablePromoCodes.map((promo) => (
                                <div
                                    key={promo.id}
                                    className="p-3 border rounded-lg hover:bg-accent cursor-pointer transition-colors"
                                    onClick={() => {
                                        setPromoCode(promo.code);
                                        setError('');
                                    }}
                                >
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <Tag className="w-4 h-4 text-primary" />
                                                <span className="font-mono font-semibold text-sm">{promo.code}</span>
                                            </div>
                                            <p className="text-sm text-muted-foreground">
                                                {promo.discountType === 'percentage'
                                                    ? `${promo.discountValue}% OFF`
                                                    : `₹${promo.discountValue} OFF`}
                                            </p>
                                        </div>
                                        <Badge variant="secondary">
                                            Save ₹{calculateDiscount(promo)}
                                        </Badge>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-4 text-sm text-muted-foreground">No offers available</div>
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}

interface PaymentMethodSelectorProps {
    selectedMethod: string;
    onSelect: (method: string) => void;
}

// Payment methods configuration for Razorpay
const PAYMENT_METHODS = [
    {
        id: 'upi',
        name: 'UPI',
        description: 'Google Pay, PhonePe, Paytm',
        icon: '📱',
        enabled: true,
    },
    {
        id: 'card',
        name: 'Credit/Debit Card',
        description: 'Visa, Mastercard, RuPay',
        icon: '💳',
        enabled: true,
    },
    {
        id: 'netbanking',
        name: 'Net Banking',
        description: 'All major banks',
        icon: '🏦',
        enabled: true,
    },
    {
        id: 'wallet',
        name: 'Wallet',
        description: 'Paytm, PhonePe, Amazon Pay',
        icon: '👛',
        enabled: true,
    },
] as const;

export function PaymentMethodSelector({ selectedMethod, onSelect }: PaymentMethodSelectorProps) {
    const paymentMethods = PAYMENT_METHODS.filter(method => method.enabled);

    return (
        <div className="space-y-3">
            <Label className="text-base font-semibold">Payment Method</Label>
            <div className="grid grid-cols-1 gap-3">
                {paymentMethods.map((method) => (
                    <div
                        key={method.id}
                        className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${selectedMethod === method.id
                            ? 'border-primary bg-primary/5'
                            : 'border-border hover:border-primary/50'
                            }`}
                        onClick={() => onSelect(method.id)}
                    >
                        <div className="flex items-center gap-3">
                            <span className="text-2xl">{method.icon}</span>
                            <div className="flex-1">
                                <p className="font-medium">{method.name}</p>
                                <p className="text-sm text-muted-foreground">{method.description}</p>
                            </div>
                            {selectedMethod === method.id && (
                                <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                                    <div className="w-2 h-2 rounded-full bg-white" />
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
