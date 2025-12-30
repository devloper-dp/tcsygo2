import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { TrendingUp, Info } from 'lucide-react';
import {
    calculateFare,
    calculateSurgeMultiplier,
    getCurrentDemand,
    formatCurrency,
    fetchFareConfig,
    FareBreakdown,
} from '@/lib/fareCalculator';
import { useQuery } from '@tanstack/react-query';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';

interface FareEstimatorProps {
    vehicleType: 'bike' | 'auto' | 'car';
    distanceKm: number;
    durationMinutes: number;
    onFareCalculated?: (fare: FareBreakdown) => void;
    className?: string;
}

export function FareEstimator({
    vehicleType,
    distanceKm,
    durationMinutes,
    onFareCalculated,
    className = '',
}: FareEstimatorProps) {
    const [fare, setFare] = useState<FareBreakdown | null>(null);
    const [demand, setDemand] = useState<'low' | 'medium' | 'high' | 'very_high'>('low');

    const { data: fareConfig } = useQuery({
        queryKey: ['fare-config'],
        queryFn: fetchFareConfig,
        staleTime: 1000 * 60 * 60, // 1 hour
    });

    useEffect(() => {
        // Get current demand based on time
        const currentHour = new Date().getHours();
        const currentDemand = getCurrentDemand(currentHour);
        setDemand(currentDemand);

        // Calculate surge multiplier
        const surgeMultiplier = calculateSurgeMultiplier(currentDemand);

        // Calculate fare
        if (fareConfig) {
            const calculatedFare = calculateFare(
                vehicleType,
                distanceKm,
                durationMinutes,
                surgeMultiplier,
                fareConfig
            );
            setFare(calculatedFare);
            if (onFareCalculated) {
                onFareCalculated(calculatedFare);
            }
        }

    }, [vehicleType, distanceKm, durationMinutes, onFareCalculated, fareConfig]);

    if (!fare) {
        return null;
    }

    const hasSurge = fare.surgeMultiplier > 1.0;

    return (
        <Card className={`p-4 ${className}`}>
            <div className="space-y-3">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-lg">Fare Estimate</h3>
                    {hasSurge && (
                        <Badge variant="destructive" className="flex items-center gap-1">
                            <TrendingUp className="w-3 h-3" />
                            {fare.surgeMultiplier}x Surge
                        </Badge>
                    )}
                </div>

                <Separator />

                {/* Fare Breakdown */}
                <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">Base Fare</span>
                        <span>{formatCurrency(fare.baseFare)}</span>
                    </div>

                    <div className="flex justify-between">
                        <span className="text-muted-foreground">
                            Distance ({distanceKm.toFixed(1)} km)
                        </span>
                        <span>{formatCurrency(fare.distanceCharge)}</span>
                    </div>

                    <div className="flex justify-between">
                        <span className="text-muted-foreground">
                            Time ({durationMinutes} min)
                        </span>
                        <span>{formatCurrency(fare.timeCharge)}</span>
                    </div>

                    {hasSurge && (
                        <div className="flex justify-between text-destructive">
                            <div className="flex items-center gap-1">
                                <span>Surge Pricing</span>
                                <TooltipProvider>
                                    <Tooltip>
                                        <TooltipTrigger>
                                            <Info className="w-3 h-3" />
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            <p className="max-w-xs">
                                                Due to high demand, surge pricing is currently active.
                                                Prices may vary based on demand.
                                            </p>
                                        </TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                            </div>
                            <span>{formatCurrency(fare.surgePricing)}</span>
                        </div>
                    )}

                    <div className="flex justify-between">
                        <span className="text-muted-foreground">Platform Fee</span>
                        <span>{formatCurrency(fare.platformFee)}</span>
                    </div>

                    <div className="flex justify-between">
                        <span className="text-muted-foreground">GST (5%)</span>
                        <span>{formatCurrency(fare.gst)}</span>
                    </div>

                    {fare.discount > 0 && (
                        <div className="flex justify-between text-success">
                            <span>Discount</span>
                            <span>-{formatCurrency(fare.discount)}</span>
                        </div>
                    )}
                </div>

                <Separator />

                {/* Total */}
                <div className="flex justify-between items-center">
                    <span className="font-semibold text-lg">Total Fare</span>
                    <span className="font-bold text-2xl text-primary">
                        {formatCurrency(fare.totalFare)}
                    </span>
                </div>

                {/* ETA */}
                <div className="text-xs text-muted-foreground text-center">
                    Estimated time: {durationMinutes} minutes
                </div>
            </div>
        </Card>
    );
}
