import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Leaf, TrendingDown, Award } from 'lucide-react';

interface CarbonFootprintProps {
    totalDistance: number; // in km
    totalRides: number;
    className?: string;
}

export function CarbonFootprint({ totalDistance, totalRides, className = '' }: CarbonFootprintProps) {
    // Average car emits 120g CO2 per km
    // Carpooling reduces emissions by ~50%
    const CAR_EMISSION_PER_KM = 0.12; // kg CO2
    const CARPOOLING_REDUCTION = 0.5;

    const carbonSaved = totalDistance * CAR_EMISSION_PER_KM * CARPOOLING_REDUCTION;
    const treesEquivalent = carbonSaved / 21; // 1 tree absorbs ~21kg CO2 per year

    return (
        <Card className={`p-6 bg-gradient-to-br from-success/10 to-success/5 ${className}`}>
            <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-success/20 flex items-center justify-center">
                    <Leaf className="w-6 h-6 text-success" />
                </div>
                <div>
                    <h3 className="text-lg font-semibold">Carbon Footprint Saved</h3>
                    <p className="text-sm text-muted-foreground">Your environmental impact</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-background rounded-lg">
                    <div className="flex items-center justify-center gap-2 mb-2">
                        <TrendingDown className="w-4 h-4 text-success" />
                        <p className="text-2xl font-bold text-success">{carbonSaved.toFixed(1)}</p>
                    </div>
                    <p className="text-xs text-muted-foreground">kg CO₂ Saved</p>
                </div>

                <div className="text-center p-4 bg-background rounded-lg">
                    <div className="flex items-center justify-center gap-2 mb-2">
                        <Leaf className="w-4 h-4 text-success" />
                        <p className="text-2xl font-bold text-success">{treesEquivalent.toFixed(1)}</p>
                    </div>
                    <p className="text-xs text-muted-foreground">Trees Equivalent</p>
                </div>

                <div className="text-center p-4 bg-background rounded-lg">
                    <div className="flex items-center justify-center gap-2 mb-2">
                        <Award className="w-4 h-4 text-success" />
                        <p className="text-2xl font-bold text-success">{totalRides}</p>
                    </div>
                    <p className="text-xs text-muted-foreground">Eco Rides</p>
                </div>
            </div>

            <div className="mt-4 p-3 bg-background rounded-lg">
                <p className="text-xs text-muted-foreground text-center">
                    🌍 By carpooling, you've helped reduce emissions equivalent to planting{' '}
                    <strong className="text-success">{Math.ceil(treesEquivalent)} trees</strong>!
                </p>
            </div>

            {carbonSaved > 100 && (
                <Badge className="w-full mt-3 justify-center gap-2 bg-success hover:bg-success/90">
                    <Award className="w-4 h-4" />
                    Eco Warrior - 100kg+ CO₂ Saved!
                </Badge>
            )}
        </Card>
    );
}
