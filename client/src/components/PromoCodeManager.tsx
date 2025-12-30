import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tag, Copy, CheckCircle2, Calendar, TrendingUp } from 'lucide-react';
import { getActivePromoCodes, validatePromoCode, PromoCode } from '@/lib/promo-service';
import { useToast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';

interface PromoCodeManagerProps {
    onApplyPromo?: (promo: PromoCode, discount: number) => void;
    amount?: number;
    vehicleType?: string;
}

export function PromoCodeManager({ onApplyPromo, amount = 0, vehicleType }: PromoCodeManagerProps) {
    const { toast } = useToast();
    const [promoInput, setPromoInput] = useState('');
    const [validating, setValidating] = useState(false);

    const { data: promos = [], isLoading } = useQuery<PromoCode[]>({
        queryKey: ['promo-codes'],
        queryFn: getActivePromoCodes,
    });

    const handleApplyPromo = async (code: string) => {
        if (!code.trim()) {
            toast({
                title: 'Enter Promo Code',
                description: 'Please enter a promo code',
                variant: 'destructive',
            });
            return;
        }

        setValidating(true);
        try {
            const result = await validatePromoCode(code, amount, vehicleType);

            if (result.valid && result.promo && result.discount) {
                toast({
                    title: '✅ Promo Applied!',
                    description: result.message,
                });

                if (onApplyPromo) {
                    onApplyPromo(result.promo, result.discount);
                }
            } else {
                toast({
                    title: 'Invalid Promo Code',
                    description: result.message,
                    variant: 'destructive',
                });
            }
        } catch (error) {
            console.error('Promo validation error:', error);
            toast({
                title: 'Error',
                description: 'Failed to validate promo code',
                variant: 'destructive',
            });
        } finally {
            setValidating(false);
        }
    };

    const copyPromoCode = (code: string) => {
        navigator.clipboard.writeText(code);
        toast({
            title: 'Copied!',
            description: `Promo code ${code} copied to clipboard`,
        });
    };

    const calculateSavings = (promo: PromoCode): string => {
        if (!amount) return 'N/A';

        let savings = 0;
        if (promo.discount_type === 'percentage') {
            savings = (amount * promo.discount_value) / 100;
            if (promo.max_discount && savings > promo.max_discount) {
                savings = promo.max_discount;
            }
        } else {
            savings = Math.min(promo.discount_value, amount);
        }

        return `₹${savings.toFixed(2)}`;
    };

    const getDiscountText = (promo: PromoCode): string => {
        if (promo.discount_type === 'percentage') {
            return `${promo.discount_value}% OFF${promo.max_discount ? ` (Max ₹${promo.max_discount})` : ''}`;
        }
        return `₹${promo.discount_value} OFF`;
    };

    const getDaysLeft = (validUntil: string): number => {
        const now = new Date();
        const expiry = new Date(validUntil);
        const diffTime = expiry.getTime() - now.getTime();
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    };

    return (
        <div className="space-y-4">
            <Card className="p-4">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <Tag className="w-5 h-5 text-primary" />
                    Apply Promo Code
                </h3>

                <div className="flex gap-2">
                    <Input
                        placeholder="Enter promo code"
                        value={promoInput}
                        onChange={(e) => setPromoInput(e.target.value.toUpperCase())}
                        className="flex-1"
                    />
                    <Button
                        onClick={() => handleApplyPromo(promoInput)}
                        disabled={validating || !promoInput.trim()}
                    >
                        {validating ? 'Validating...' : 'Apply'}
                    </Button>
                </div>
            </Card>

            <Tabs defaultValue="available" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="available">Available</TabsTrigger>
                    <TabsTrigger value="trending">Trending</TabsTrigger>
                </TabsList>

                <TabsContent value="available" className="space-y-3 mt-4">
                    {isLoading ? (
                        <Card className="p-8 text-center">
                            <p className="text-muted-foreground">Loading promo codes...</p>
                        </Card>
                    ) : promos.length === 0 ? (
                        <Card className="p-8 text-center">
                            <Tag className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                            <h4 className="font-semibold mb-2">No Promo Codes Available</h4>
                            <p className="text-sm text-muted-foreground">
                                Check back later for exciting offers
                            </p>
                        </Card>
                    ) : (
                        promos.map((promo) => {
                            const daysLeft = getDaysLeft(promo.valid_until);
                            const isExpiringSoon = daysLeft <= 3;

                            return (
                                <Card key={promo.id} className="p-4 relative overflow-hidden">
                                    {/* Decorative Corner */}
                                    <div className="absolute top-0 right-0 w-16 h-16 bg-primary/10 rounded-bl-full" />

                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-2">
                                                <Badge variant="default" className="font-mono">
                                                    {promo.code}
                                                </Badge>
                                                {isExpiringSoon && (
                                                    <Badge variant="destructive" className="text-xs">
                                                        Expires Soon
                                                    </Badge>
                                                )}
                                            </div>

                                            <p className="text-sm text-muted-foreground mb-2">
                                                {promo.description || 'Special discount offer'}
                                            </p>

                                            <div className="flex items-center gap-4 text-sm">
                                                <div className="flex items-center gap-1">
                                                    <TrendingUp className="w-4 h-4 text-success" />
                                                    <span className="font-semibold text-success">
                                                        {getDiscountText(promo)}
                                                    </span>
                                                </div>

                                                {amount > 0 && (
                                                    <div className="text-muted-foreground">
                                                        Save: {calculateSavings(promo)}
                                                    </div>
                                                )}
                                            </div>

                                            <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                                                <div className="flex items-center gap-1">
                                                    <Calendar className="w-3 h-3" />
                                                    <span>
                                                        {daysLeft} day{daysLeft !== 1 ? 's' : ''} left
                                                    </span>
                                                </div>

                                                {promo.min_amount > 0 && (
                                                    <span>Min: ₹{promo.min_amount}</span>
                                                )}

                                                {promo.max_uses && (
                                                    <span>
                                                        {promo.max_uses - promo.current_uses} uses left
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex flex-col gap-2">
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => copyPromoCode(promo.code)}
                                            >
                                                <Copy className="w-4 h-4 mr-1" />
                                                Copy
                                            </Button>

                                            {onApplyPromo && amount > 0 && (
                                                <Button
                                                    size="sm"
                                                    onClick={() => handleApplyPromo(promo.code)}
                                                    disabled={amount < promo.min_amount}
                                                >
                                                    Apply
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                </Card>
                            );
                        })
                    )}
                </TabsContent>

                <TabsContent value="trending" className="space-y-3 mt-4">
                    <Card className="p-8 text-center">
                        <TrendingUp className="w-12 h-12 mx-auto mb-4 text-primary" />
                        <h4 className="font-semibold mb-2">Trending Offers</h4>
                        <p className="text-sm text-muted-foreground">
                            Most popular promo codes will appear here
                        </p>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
