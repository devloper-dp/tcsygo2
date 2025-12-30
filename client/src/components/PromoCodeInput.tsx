import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tag, Check, X, Loader2 } from 'lucide-react';
import { formatCurrency } from '@/lib/fareCalculator';
import { PromoCode } from '@/lib/promo-service';
import { usePromoCode, useActivePromoCodes } from '@/hooks/usePromoCode';

interface PromoCodeInputProps {
    onPromoApplied?: (promoCode: PromoCode) => void;
    onPromoRemoved?: () => void;
    defaultCode?: string;
    className?: string;
}

export function PromoCodeInput({
    onPromoApplied,
    onPromoRemoved,
    defaultCode,
    className = '',
}: PromoCodeInputProps) {
    const [code, setCode] = useState(defaultCode || '');
    const [searchCode, setSearchCode] = useState(defaultCode || '');
    const [appliedPromo, setAppliedPromo] = useState<PromoCode | null>(null);
    const [error, setError] = useState('');

    useEffect(() => {
        if (defaultCode) {
            handleApply();
        }
    }, [defaultCode]);

    // Fetch available codes for suggestions
    const { data: availableCodes } = useActivePromoCodes();

    // Fetch specific code when user clicks apply
    const { data: promoCode, isLoading: isValidating, isError, refetch } = usePromoCode(searchCode);

    const handleApply = async () => {
        if (!code.trim()) {
            setError('Please enter a promo code');
            return;
        }

        setError('');
        setSearchCode(code);

        const result = await refetch();

        if (result.data) {
            // Basic validation
            if (!result.data.is_active || new Date(result.data.valid_until) < new Date()) {
                setError('Promo code has expired');
            } else if (result.data.max_uses && result.data.current_uses >= result.data.max_uses) {
                setError('Promo code usage limit reached');
            } else {
                setAppliedPromo(result.data);
                setCode('');
                if (onPromoApplied) onPromoApplied(result.data);
            }
        } else {
            setError('Invalid or expired promo code');
        }
    };

    const handleRemove = () => {
        setAppliedPromo(null);
        setCode('');
        setSearchCode('');
        setError('');

        if (onPromoRemoved) {
            onPromoRemoved();
        }
    };

    return (
        <Card className={`p-4 ${className}`}>
            <div className="space-y-3">
                <div className="flex items-center gap-2">
                    <Tag className="w-4 h-4 text-primary" />
                    <h4 className="font-semibold">Promo Code</h4>
                </div>

                {appliedPromo ? (
                    <div className="space-y-2">
                        <div className="flex items-center justify-between p-3 bg-success/10 border border-success/20 rounded-lg">
                            <div className="flex items-center gap-2">
                                <Check className="w-4 h-4 text-success" />
                                <div>
                                    <p className="font-semibold text-success">{appliedPromo.code}</p>
                                    <p className="text-xs text-muted-foreground">
                                        {appliedPromo.discount_type === 'percentage'
                                            ? `${appliedPromo.discount_value}% off${appliedPromo.max_discount
                                                ? ` (max ${formatCurrency(appliedPromo.max_discount)})`
                                                : ''
                                            }`
                                            : `${formatCurrency(appliedPromo.discount_value)} off`}
                                    </p>
                                </div>
                            </div>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleRemove}
                                className="h-8 w-8 p-0"
                            >
                                <X className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-2">
                        <div className="flex gap-2">
                            <Input
                                placeholder="Enter promo code"
                                value={code}
                                onChange={(e) => {
                                    setCode(e.target.value.toUpperCase());
                                    setError('');
                                }}
                                onKeyPress={(e) => {
                                    if (e.key === 'Enter') {
                                        handleApply();
                                    }
                                }}
                                className={error ? 'border-destructive' : ''}
                            />
                            <Button
                                onClick={handleApply}
                                disabled={isValidating || !code.trim()}
                                className="whitespace-nowrap"
                            >
                                {isValidating ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    'Apply'
                                )}
                            </Button>
                        </div>

                        {error && (
                            <p className="text-xs text-destructive flex items-center gap-1">
                                <X className="w-3 h-3" />
                                {error}
                            </p>
                        )}

                        {/* Available Promo Codes */}
                        {availableCodes && availableCodes.length > 0 && (
                            <div className="space-y-1">
                                <p className="text-xs text-muted-foreground">Available offers:</p>
                                <div className="flex flex-wrap gap-2">
                                    {availableCodes.map((promo) => (
                                        <Badge
                                            key={promo.code}
                                            variant="outline"
                                            className="cursor-pointer hover:bg-primary/10"
                                            onClick={() => setCode(promo.code)}
                                        >
                                            {promo.code}
                                        </Badge>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </Card>
    );
}
