import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabase';
import { mapTrip } from '@/lib/mapper';
import { locationTrackingService } from '@/lib/location-tracking';
import { getRoute, Coordinates, calculateDistance } from '@/lib/maps';
import { Loader2, Play, Pause } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function RideSimulator() {
    const { toast } = useToast();
    const [selectedTripId, setSelectedTripId] = useState<string | null>(null);
    const [isSimulating, setIsSimulating] = useState(false);
    const [simulationSpeed, setSimulationSpeed] = useState(1); // 1x, 2x, 5x
    const [progress, setProgress] = useState(0); // 0 to 1
    const [routePath, setRoutePath] = useState<Coordinates[]>([]);

    // Fetch active trips (ongoing or upcoming)
    const { data: activeTrips, isLoading, refetch } = useQuery({
        queryKey: ['active-trips-sim'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('trips')
                .select('*, driver:drivers(*, user:users(*))')
                .in('status', ['ongoing', 'upcoming'])
                .order('created_at', { ascending: false });

            if (error) throw error;
            return (data || []).map(mapTrip);
        }
    });

    // Simulation State
    const [cumulativeDistances, setCumulativeDistances] = useState<number[]>([]);
    const [totalDistance, setTotalDistance] = useState(0);

    // Fetch route when trip selected and pre-calculate distances
    useEffect(() => {
        if (!selectedTripId || !activeTrips) return;
        const trip = activeTrips.find(t => t.id === selectedTripId);
        if (!trip) return;

        const fetchRoute = async () => {
            try {
                // Determine start location (driver loc or pickup)
                // For sim, let's start from pickup
                const pickup = { lat: Number(trip.pickupLat), lng: Number(trip.pickupLng) };
                const drop = { lat: Number(trip.dropLat), lng: Number(trip.dropLng) };

                const routeData = await getRoute(pickup, drop);
                setRoutePath(routeData.geometry);

                // Pre-calculate cumulative distances for smooth interpolation
                let total = 0;
                const dists = [0]; // Start at 0
                for (let i = 0; i < routeData.geometry.length - 1; i++) {
                    const d = calculateDistance(
                        routeData.geometry[i].lat,
                        routeData.geometry[i].lng,
                        routeData.geometry[i + 1].lat,
                        routeData.geometry[i + 1].lng
                    );
                    total += d;
                    dists.push(total);
                }
                setCumulativeDistances(dists);
                setTotalDistance(total);

                setProgress(0);
                setIsSimulating(false);
            } catch (e) {
                console.error("Failed to fetch route for sim", e);
            }
        };
        fetchRoute();
    }, [selectedTripId, activeTrips]);

    // Simulation Loop
    // Simulation Loop
    useEffect(() => {
        if (!isSimulating || !selectedTripId || routePath.length === 0 || cumulativeDistances.length === 0) return;

        const trip = activeTrips?.find(t => t.id === selectedTripId);
        if (!trip) return;

        const intervalMs = 1000;
        const speedKmh = 40 * simulationSpeed; // Base 40km/h
        const distancePerTick = (speedKmh / 3600) * (intervalMs / 1000); // km per tick

        const timer = setInterval(async () => {
            setProgress(prev => {
                const currentDistInfo = prev * totalDistance;
                const nextDist = currentDistInfo + distancePerTick;

                if (nextDist >= totalDistance) {
                    setIsSimulating(false);
                    return 1;
                }

                const nextProgress = nextDist / totalDistance;

                // Find current segment for interpolation
                // Optimization: Binary search is better but linear is fine for < 1000 points
                let segmentIndex = 0;
                for (let i = 0; i < cumulativeDistances.length - 1; i++) {
                    if (nextDist >= cumulativeDistances[i] && nextDist < cumulativeDistances[i + 1]) {
                        segmentIndex = i;
                        break;
                    }
                }

                // Interpolate
                const p1 = routePath[segmentIndex];
                const p2 = routePath[segmentIndex + 1];
                const distWithinSegment = nextDist - cumulativeDistances[segmentIndex];
                const segmentLength = cumulativeDistances[segmentIndex + 1] - cumulativeDistances[segmentIndex];

                const ratio = segmentLength > 0 ? distWithinSegment / segmentLength : 0;

                const lat = p1.lat + (p2.lat - p1.lat) * ratio;
                const lng = p1.lng + (p2.lng - p1.lng) * ratio;

                // Update Location in DB
                locationTrackingService.updateLocation({
                    tripId: selectedTripId,
                    driverId: trip.driverId,
                    lat: lat,
                    lng: lng,
                    speed: speedKmh,
                    heading: 0 // Could calculate heading here if needed
                }).catch(console.error);

                return nextProgress;
            });
        }, intervalMs);

        return () => clearInterval(timer);
    }, [isSimulating, selectedTripId, routePath, simulationSpeed, activeTrips, cumulativeDistances, totalDistance]);

    const handleCompleteTrip = async () => {
        if (!selectedTripId) return;
        try {
            await supabase.from('trips').update({ status: 'completed' }).eq('id', selectedTripId);
            toast({ title: "Trip Completed", description: "Marked as completed in DB" });
            refetch();
        } catch (e) {
            toast({ title: "Error", description: "Failed to complete trip", variant: "destructive" });
        }
    };

    const handleStartTrip = async () => {
        if (!selectedTripId) return;
        try {
            await supabase.from('trips').update({ status: 'ongoing' }).eq('id', selectedTripId);
            toast({ title: "Trip Started", description: "Marked as ongoing in DB" });
            refetch();
        } catch (e) {
            toast({ title: "Error", description: "Failed to start trip", variant: "destructive" });
        }
    };

    return (
        <div className="container mx-auto p-4 max-w-4xl">
            <h1 className="text-2xl font-bold mb-4">Ride Simulator (DevTools)</h1>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="p-4">
                    <h2 className="font-semibold mb-2">Active Trips</h2>
                    {isLoading ? <Loader2 className="animate-spin" /> : (
                        <div className="space-y-2 max-h-[400px] overflow-y-auto">
                            {activeTrips?.length === 0 && <p className="text-muted-foreground">No active trips</p>}
                            {activeTrips?.map(trip => (
                                <div
                                    key={trip.id}
                                    className={`p-3 border rounded cursor-pointer hover:bg-muted ${selectedTripId === trip.id ? 'bg-primary/10 border-primary' : ''}`}
                                    onClick={() => setSelectedTripId(trip.id)}
                                >
                                    <div className="flex justify-between">
                                        <Badge>{trip.status}</Badge>
                                        <span className="text-xs text-muted-foreground">{new Date(trip.createdAt).toLocaleTimeString()}</span>
                                    </div>
                                    <div className="text-sm mt-1">
                                        <div className="font-medium">{trip.driver.user.fullName}</div>
                                        <div className="text-xs truncate">{trip.pickupLocation} &rarr; {trip.dropLocation}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </Card>

                <Card className="p-4">
                    <h2 className="font-semibold mb-2">Controls</h2>
                    {selectedTripId ? (
                        <div className="space-y-4">
                            <div className="flex items-center gap-2">
                                <Button size="sm" variant="outline" onClick={handleStartTrip}>Start Trip</Button>
                                <Button size="sm" variant="outline" onClick={handleCompleteTrip}>Complete Trip</Button>
                            </div>

                            <div className="border-t pt-4">
                                <h3 className="text-sm font-medium mb-2">Simulation</h3>
                                <div className="flex items-center gap-2 mb-2">
                                    <Button size="icon" onClick={() => setIsSimulating(!isSimulating)}>
                                        {isSimulating ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                                    </Button>
                                    <Button size="sm" variant={simulationSpeed === 1 ? "default" : "outline"} onClick={() => setSimulationSpeed(1)}>1x</Button>
                                    <Button size="sm" variant={simulationSpeed === 5 ? "default" : "outline"} onClick={() => setSimulationSpeed(5)}>5x</Button>
                                    <Button size="sm" variant={simulationSpeed === 10 ? "default" : "outline"} onClick={() => setSimulationSpeed(10)}>10x</Button>
                                </div>
                                <div className="w-full bg-secondary h-2 rounded overflow-hidden">
                                    <div className="bg-primary h-full transition-all" style={{ width: `${progress * 100}%` }} />
                                </div>
                                <div className="text-xs text-muted-foreground mt-1 text-right">
                                    {Math.round(progress * 100)}% Route Covered
                                </div>
                            </div>

                            <div className="border-t pt-4">
                                <h3 className="text-sm font-medium mb-2">Info</h3>
                                <p className="text-xs text-muted-foreground">
                                    Simulating GPS updates to 'live_locations' table.
                                    The passenger client listens to this table and updates the map.
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center text-muted-foreground py-10">Select a trip to control</div>
                    )}
                </Card>
            </div>
        </div>
    );
}
