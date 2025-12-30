import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Clock, MapPin } from 'lucide-react';
import { calculateDistance, formatDistance, Location } from '@/lib/geofence';
import { getRoute } from '@/lib/maps';

interface DriverArrivalTimerProps {
    driverLocation: Location;
    pickupLocation: Location;
    estimatedArrivalMinutes?: number;
    className?: string;
}

export function DriverArrivalTimer({
    driverLocation,
    pickupLocation,
    estimatedArrivalMinutes = 5,
    className = '',
}: DriverArrivalTimerProps) {
    const [distance, setDistance] = useState(0);
    const [timeRemaining, setTimeRemaining] = useState(estimatedArrivalMinutes * 60); // in seconds
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        let mounted = true;

        const updateETA = async () => {
            // Calculate straight line first for immediate feedback
            const dist = calculateDistance(driverLocation, pickupLocation);
            if (mounted) setDistance(dist);

            try {
                // Get real driving route
                const route = await getRoute(
                    { lat: driverLocation.lat, lng: driverLocation.lng },
                    { lat: pickupLocation.lat, lng: pickupLocation.lng }
                );

                if (mounted && route) {
                    setDistance(route.distance);
                    setTimeRemaining(Math.ceil(route.duration)); // duration is in seconds
                }
            } catch (error) {
                console.error('Failed to get route for timer:', error);
                // Fallback to straight line estimation
                const speedMps = (30 * 1000) / 3600;
                if (mounted) setTimeRemaining(Math.ceil(dist / speedMps));
            }
        };

        updateETA();
        // Poll every 30 seconds for updates
        const interval = setInterval(updateETA, 30000);

        return () => {
            mounted = false;
            clearInterval(interval);
        };
    }, [driverLocation, pickupLocation]);

    useEffect(() => {
        // Countdown timer for smooth interpolation between polls
        const interval = setInterval(() => {
            setTimeRemaining((prev) => {
                if (prev <= 0) return 0;
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        // Calculate progress (inverse of time remaining)
        const totalTime = estimatedArrivalMinutes * 60;
        const elapsed = totalTime - timeRemaining;
        const progressPercent = (elapsed / totalTime) * 100;
        setProgress(Math.min(progressPercent, 100));
    }, [timeRemaining, estimatedArrivalMinutes]);

    const formatTime = (seconds: number) => {
        if (seconds <= 0) return 'Arrived';

        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;

        if (mins === 0) {
            return `${secs}s`;
        }
        return `${mins}m ${secs}s`;
    };

    const getStatusColor = () => {
        if (timeRemaining <= 0) return 'text-success';
        if (timeRemaining <= 60) return 'text-warning';
        return 'text-primary';
    };

    const getStatusMessage = () => {
        if (timeRemaining <= 0) return 'Driver has arrived!';
        if (timeRemaining <= 60) return 'Driver arriving soon';
        if (timeRemaining <= 180) return 'Driver is nearby';
        return 'Driver is on the way';
    };

    return (
        <Card className={`p-4 ${className}`}>
            <div className="space-y-4">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Clock className={`w-5 h-5 ${getStatusColor()}`} />
                        <span className="font-semibold">{getStatusMessage()}</span>
                    </div>
                    <div className={`text-2xl font-bold ${getStatusColor()}`}>
                        {formatTime(timeRemaining)}
                    </div>
                </div>

                {/* Progress Bar */}
                <div className="space-y-2">
                    <Progress value={progress} className="h-2" />
                    <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Started</span>
                        <span>Arriving</span>
                    </div>
                </div>

                {/* Distance */}
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="w-4 h-4" />
                    <span>{formatDistance(distance)} away</span>
                </div>

                {/* Arrival Animation */}
                {timeRemaining <= 30 && timeRemaining > 0 && (
                    <div className="text-center">
                        <div className="inline-flex items-center gap-2 px-4 py-2 bg-warning/10 border border-warning/20 rounded-full animate-pulse">
                            <div className="w-2 h-2 bg-warning rounded-full animate-ping" />
                            <span className="text-sm font-medium text-warning">
                                Get ready! Driver arriving in {timeRemaining}s
                            </span>
                        </div>
                    </div>
                )}

                {timeRemaining <= 0 && (
                    <div className="text-center">
                        <div className="inline-flex items-center gap-2 px-4 py-2 bg-success/10 border border-success/20 rounded-full">
                            <div className="w-2 h-2 bg-success rounded-full" />
                            <span className="text-sm font-medium text-success">
                                Driver has arrived at pickup location
                            </span>
                        </div>
                    </div>
                )}
            </div>
        </Card>
    );
}
