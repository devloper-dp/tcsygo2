import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Navigation, Clock, Gauge, MapPin as Target } from 'lucide-react';

interface LiveDriveStatsProps {
    tripId: string;
    driverLocation?: {
        lat: number;
        lng: number;
        speed?: number;
        heading?: number;
    } | null;
    pickupLocation: { lat: number; lng: number };
    dropLocation: { lat: number; lng: number };
    startTime?: string;
    isDriver?: boolean;
}

export function LiveDriveStats({
    tripId,
    driverLocation,
    pickupLocation,
    dropLocation,
    startTime,
    isDriver = false
}: LiveDriveStatsProps) {
    const [distanceTraveled, setDistanceTraveled] = useState(0);
    const [elapsedTime, setElapsedTime] = useState(0);
    const [distanceToDestination, setDistanceToDestination] = useState<number | null>(null);
    const [estimatedArrival, setEstimatedArrival] = useState<string>('Calculating...');
    const [previousLocation, setPreviousLocation] = useState<{ lat: number; lng: number } | null>(null);

    // Calculate elapsed time
    useEffect(() => {
        if (!startTime) return;

        const interval = setInterval(() => {
            const start = new Date(startTime).getTime();
            const now = Date.now();
            const elapsed = Math.floor((now - start) / 1000); // in seconds
            setElapsedTime(elapsed);
        }, 1000);

        return () => clearInterval(interval);
    }, [startTime]);

    // Calculate distance traveled and distance to destination
    useEffect(() => {
        if (!driverLocation) return;

        // Calculate distance to destination
        const distToDest = calculateDistance(
            driverLocation.lat,
            driverLocation.lng,
            dropLocation.lat,
            dropLocation.lng
        );
        setDistanceToDestination(distToDest);

        // Calculate ETA
        const speed = driverLocation.speed || 40; // km/h default
        if (speed > 0) {
            const timeInMinutes = Math.round((distToDest / speed) * 60);
            setEstimatedArrival(`${timeInMinutes} min`);
        }

        // Calculate distance traveled since last update
        if (previousLocation) {
            const segmentDistance = calculateDistance(
                previousLocation.lat,
                previousLocation.lng,
                driverLocation.lat,
                driverLocation.lng
            );
            setDistanceTraveled(prev => prev + segmentDistance);
        }

        setPreviousLocation({ lat: driverLocation.lat, lng: driverLocation.lng });
    }, [driverLocation, dropLocation]);

    const formatTime = (seconds: number): string => {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;

        if (hours > 0) {
            return `${hours}h ${minutes}m`;
        }
        return `${minutes}m ${secs}s`;
    };

    const [nextTurn, setNextTurn] = useState<{ instruction: string; distance: string; icon: 'left' | 'right' | 'straight' }>({
        instruction: 'Head north on Main St',
        distance: '200m',
        icon: 'straight'
    });

    // Real turn-by-turn navigation
    useEffect(() => {
        if (!isDriver || !driverLocation) return;

        let isMounted = true;

        const updateNavigation = async () => {
            try {
                const { getNavigationInstructions, getCurrentInstruction, formatDistance } = await import('@/lib/navigation-service');

                // Get navigation instructions from current location to destination
                const route = await getNavigationInstructions(
                    { lat: driverLocation.lat, lng: driverLocation.lng },
                    dropLocation
                );

                if (!isMounted) return;

                // Get current instruction based on driver's location
                const currentInstruction = getCurrentInstruction(
                    route.instructions,
                    { lat: driverLocation.lat, lng: driverLocation.lng }
                );

                if (currentInstruction) {
                    const iconMap: Record<string, 'left' | 'right' | 'straight'> = {
                        'turn-left': 'left',
                        'turn-slight-left': 'left',
                        'turn-sharp-left': 'left',
                        'turn-right': 'right',
                        'turn-slight-right': 'right',
                        'turn-sharp-right': 'right',
                        'straight': 'straight',
                        'depart': 'straight',
                        'destination': 'straight',
                    };

                    setNextTurn({
                        instruction: currentInstruction.instruction,
                        distance: formatDistance(currentInstruction.distance),
                        icon: iconMap[currentInstruction.type] || 'straight',
                    });
                }
            } catch (error) {
                console.error('Navigation update error:', error);
            }
        };

        updateNavigation();
        const interval = setInterval(updateNavigation, 10000); // Update every 10 seconds

        return () => {
            isMounted = false;
            clearInterval(interval);
        };
    }, [isDriver, driverLocation, dropLocation]);

    if (!driverLocation) {
        return null;
    }

    return (
        <div className="absolute top-4 left-4 right-4 md:left-4 md:right-auto md:w-80 z-[1000] pointer-events-none">
            <Card className="p-4 shadow-xl border-primary/20 bg-background/95 backdrop-blur pointer-events-auto">
                {/* Turn-by-Turn Instruction */}
                <div className="bg-primary text-primary-foreground p-3 rounded-lg mb-4 flex items-center gap-3 shadow-sm">
                    <div className="text-3xl font-bold">
                        {nextTurn.icon === 'left' && '←'}
                        {nextTurn.icon === 'right' && '→'}
                        {nextTurn.icon === 'straight' && '↑'}
                    </div>
                    <div>
                        <div className="text-2xl font-bold leading-none">{nextTurn.distance}</div>
                        <div className="text-sm opacity-90 font-medium">{nextTurn.instruction}</div>
                    </div>
                </div>

                <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-sm">Live Drive Stats</h3>
                    <Badge variant="outline" className="animate-pulse bg-green-500/10 text-green-500 border-green-500/20">
                        ● LIVE
                    </Badge>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    {/* Current Speed */}
                    <div className="flex items-start gap-2">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <Gauge className="w-4 h-4 text-primary" />
                        </div>
                        <div className="min-w-0">
                            <p className="text-xs text-muted-foreground">Speed</p>
                            <p className="text-lg font-bold">
                                {driverLocation.speed ? Math.round(driverLocation.speed) : 0}
                                <span className="text-xs font-normal text-muted-foreground ml-1">km/h</span>
                            </p>
                        </div>
                    </div>

                    {/* Distance Traveled */}
                    <div className="flex items-start gap-2">
                        <div className="w-8 h-8 rounded-full bg-success/10 flex items-center justify-center flex-shrink-0">
                            <Navigation className="w-4 h-4 text-success" />
                        </div>
                        <div className="min-w-0">
                            <p className="text-xs text-muted-foreground">Traveled</p>
                            <p className="text-lg font-bold">
                                {distanceTraveled.toFixed(1)}
                                <span className="text-xs font-normal text-muted-foreground ml-1">km</span>
                            </p>
                        </div>
                    </div>

                    {/* Elapsed Time */}
                    <div className="flex items-start gap-2">
                        <div className="w-8 h-8 rounded-full bg-warning/10 flex items-center justify-center flex-shrink-0">
                            <Clock className="w-4 h-4 text-warning" />
                        </div>
                        <div className="min-w-0">
                            <p className="text-xs text-muted-foreground">Duration</p>
                            <p className="text-lg font-bold">
                                {formatTime(elapsedTime)}
                            </p>
                        </div>
                    </div>

                    {/* Distance to Destination */}
                    <div className="flex items-start gap-2">
                        <div className="w-8 h-8 rounded-full bg-destructive/10 flex items-center justify-center flex-shrink-0">
                            <Target className="w-4 h-4 text-destructive" />
                        </div>
                        <div className="min-w-0">
                            <p className="text-xs text-muted-foreground">To Destination</p>
                            <p className="text-lg font-bold">
                                {distanceToDestination !== null ? distanceToDestination.toFixed(1) : '...'}
                                <span className="text-xs font-normal text-muted-foreground ml-1">km</span>
                            </p>
                        </div>
                    </div>
                </div>

                {/* ETA */}
                <div className="mt-3 pt-3 border-t">
                    <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Estimated Arrival</span>
                        <span className="text-sm font-bold text-primary">{estimatedArrival}</span>
                    </div>
                </div>

                {isDriver && (
                    <div className="mt-2 text-xs text-muted-foreground text-center">
                        Your location is being shared with passengers
                    </div>
                )}
            </Card>
        </div>
    );
}

// Helper function to calculate distance between two coordinates (Haversine formula)
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Radius of the Earth in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}
