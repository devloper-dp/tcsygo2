import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Heart, Star } from 'lucide-react';
import { formatCurrency } from '@/lib/fareCalculator';

interface TipDriverProps {
    driverName: string;
    onTipSelected?: (amount: number) => void;
    className?: string;
}

const PRESET_TIPS = [10, 20, 30, 50];

export function TipDriver({
    driverName,
    onTipSelected,
    className = '',
}: TipDriverProps) {
    const [selectedTip, setSelectedTip] = useState<number | null>(null);
    const [customTip, setCustomTip] = useState('');
    const [showCustom, setShowCustom] = useState(false);

    const handlePresetTip = (amount: number) => {
        setSelectedTip(amount);
        setShowCustom(false);
        setCustomTip('');
        if (onTipSelected) {
            onTipSelected(amount);
        }
    };

    const handleCustomTip = () => {
        const amount = parseFloat(customTip);
        if (!isNaN(amount) && amount > 0) {
            setSelectedTip(amount);
            if (onTipSelected) {
                onTipSelected(amount);
            }
        }
    };

    const handleNoTip = () => {
        setSelectedTip(0);
        setShowCustom(false);
        setCustomTip('');
        if (onTipSelected) {
            onTipSelected(0);
        }
    };

    return (
        <Card className={`p-4 ${className}`}>
            <div className="space-y-4">
                {/* Header */}
                <div className="text-center space-y-1">
                    <div className="w-12 h-12 rounded-full bg-warning/10 flex items-center justify-center mx-auto">
                        <Heart className="w-6 h-6 text-warning" />
                    </div>
                    <h3 className="font-semibold text-lg">Tip Your Driver</h3>
                    <p className="text-sm text-muted-foreground">
                        Show your appreciation for {driverName}'s service
                    </p>
                </div>

                {/* Preset Tips */}
                <div className="grid grid-cols-4 gap-2">
                    {PRESET_TIPS.map((amount) => (
                        <Button
                            key={amount}
                            variant={selectedTip === amount ? 'default' : 'outline'}
                            onClick={() => handlePresetTip(amount)}
                            className="flex flex-col h-auto py-3"
                        >
                            <span className="text-lg font-bold">₹{amount}</span>
                        </Button>
                    ))}
                </div>

                {/* Custom Tip */}
                {!showCustom ? (
                    <Button
                        variant="outline"
                        onClick={() => setShowCustom(true)}
                        className="w-full"
                    >
                        Custom Amount
                    </Button>
                ) : (
                    <div className="space-y-2">
                        <Label htmlFor="custom-tip">Custom Tip Amount</Label>
                        <div className="flex gap-2">
                            <Input
                                id="custom-tip"
                                type="number"
                                placeholder="Enter amount"
                                value={customTip}
                                onChange={(e) => setCustomTip(e.target.value)}
                                min="1"
                            />
                            <Button onClick={handleCustomTip}>Add</Button>
                        </div>
                    </div>
                )}

                {/* No Tip */}
                <Button
                    variant="ghost"
                    onClick={handleNoTip}
                    className="w-full text-muted-foreground"
                >
                    No Tip
                </Button>

                {/* Selected Tip Display */}
                {selectedTip !== null && selectedTip > 0 && (
                    <div className="text-center p-3 bg-success/10 border border-success/20 rounded-lg">
                        <div className="flex items-center justify-center gap-2">
                            <Star className="w-4 h-4 text-success fill-success" />
                            <span className="font-semibold text-success">
                                {formatCurrency(selectedTip)} tip added
                            </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            Thank you for supporting our drivers!
                        </p>
                    </div>
                )}
            </div>
        </Card>
    );
}
