import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface SurgePricingIndicatorProps {
    multiplier: number;
    demand: 'low' | 'medium' | 'high' | 'very_high';
    className?: string;
}

export function SurgePricingIndicator({
    multiplier,
    demand,
    className = '',
}: SurgePricingIndicatorProps) {
    if (multiplier <= 1.0) {
        return null;
    }

    const getDemandColor = () => {
        switch (demand) {
            case 'very_high':
                return 'bg-destructive text-destructive-foreground';
            case 'high':
                return 'bg-orange-500 text-white';
            case 'medium':
                return 'bg-yellow-500 text-white';
            default:
                return 'bg-primary text-primary-foreground';
        }
    };

    const getDemandText = () => {
        switch (demand) {
            case 'very_high':
                return 'Very High Demand';
            case 'high':
                return 'High Demand';
            case 'medium':
                return 'Moderate Demand';
            default:
                return 'Normal Demand';
        }
    };

    const getExplanation = () => {
        switch (demand) {
            case 'very_high':
                return 'Extremely high demand in your area. Fares are significantly higher than usual.';
            case 'high':
                return 'High demand in your area. Fares are higher than usual to ensure availability.';
            case 'medium':
                return 'Moderate demand. Slight price increase to balance supply and demand.';
            default:
                return 'Normal pricing applies.';
        }
    };

    return (
        <div className={className}>
            <Alert variant="destructive" className="border-orange-500 bg-orange-50 dark:bg-orange-950">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <TrendingUp className="w-4 h-4" />
                                <span className="font-semibold">Surge Pricing Active</span>
                            </div>
                            <Badge className={getDemandColor()}>
                                {multiplier}x
                            </Badge>
                        </div>
                        <div className="space-y-1">
                            <p className="text-sm font-medium">{getDemandText()}</p>
                            <p className="text-xs text-muted-foreground">
                                {getExplanation()}
                            </p>
                        </div>
                    </div>
                </AlertDescription>
            </Alert>
        </div>
    );
}
