import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Clock, Navigation, TrendingDown } from 'lucide-react';
import { getRoute } from '@/lib/maps';
import { Coordinates } from '@/lib/maps';

interface RealTimeETAProps {
    currentLocation: Coordinates;
    destination: Coordinates;
    className?: string;
}

export function RealTimeETA({ currentLocation, destination, className = '' }: RealTimeETAProps) {
    const [eta, setEta] = useState<number | null>(null);
    const [distance, setDistance] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        calculateETA();

        // Update ETA every 30 seconds
        const interval = setInterval(() => {
            calculateETA();
        }, 30000);

        return () => clearInterval(interval);
    }, [currentLocation, destination]);

    const calculateETA = async () => {
        try {
            setLoading(true);
            const route = await getRoute(currentLocation, destination);

            // Duration is in seconds, convert to minutes
            const etaMinutes = Math.ceil(route.duration / 60);
            setEta(etaMinutes);

            // Distance is in meters, convert to km
            setDistance(route.distance / 1000);
        } catch (error) {
            console.error('Error calculating ETA:', error);
        } finally {
            setLoading(false);
        }
    };

    const formatETA = (minutes: number): string => {
        if (minutes < 60) {
            return `${minutes} min`;
        }
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return `${hours}h ${mins}m`;
    };

    if (loading && eta === null) {
        return (
            <Card className={`p-4 ${className}`}>
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center animate-pulse">
                        <Clock className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1">
                        <p className="text-sm text-muted-foreground">Calculating ETA...</p>
                    </div>
                </div>
            </Card>
        );
    }

    if (!eta || !distance) return null;

    return (
        <Card className={`p-4 ${className}`}>
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Clock className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1">
                    <p className="font-semibold text-lg">{formatETA(eta)}</p>
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <Navigation className="w-3 h-3" />
                        {distance.toFixed(1)} km away
                    </p>
                </div>
                <div className="text-right">
                    <p className="text-xs text-muted-foreground">ETA</p>
                    <p className="text-xs text-success flex items-center gap-1">
                        <TrendingDown className="w-3 h-3" />
                        Live
                    </p>
                </div>
            </div>
        </Card>
    );
}
