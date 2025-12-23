import { useState, useEffect } from 'react';
import { useLocation, useRoute } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Phone, Shield, Navigation } from 'lucide-react';
import { MapView } from '@/components/MapView';
import { TripWithDriver } from '@shared/schema';
import { supabase } from '@/lib/supabase';
import { mapTrip } from '@/lib/mapper';
import { locationTrackingService, LocationUpdate } from '@/lib/location-tracking';

import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";

export default function TrackTrip() {
    const [, navigate] = useLocation();
    const [, params] = useRoute('/track/:id');
    const tripId = params?.id;
    const { toast } = useToast();
    const [driverLocation, setDriverLocation] = useState<LocationUpdate | null>(null);
    const [eta, setEta] = useState<string>('Calculating...');

    const { data: trip, isLoading } = useQuery<TripWithDriver>({
        queryKey: ['track-trip', tripId],
        queryFn: async () => {
            if (!tripId) throw new Error("Trip ID required");
            const { data, error } = await supabase
                .from('trips')
                .select('*, driver:drivers(*, user:users(*))')
                .eq('id', tripId)
                .single();

            if (error) throw error;
            return mapTrip(data);
        },
        enabled: !!tripId,
    });

    // Subscribe to real-time location updates
    useEffect(() => {
        if (!tripId) return;

        // Get initial location
        locationTrackingService.getCurrentLocation(tripId).then(location => {
            if (location) {
                setDriverLocation(location);
            }
        });

        // Subscribe to updates
        const unsubscribe = locationTrackingService.subscribeToTrip({
            tripId,
            onUpdate: (location) => {
                setDriverLocation(location);
                // Calculate ETA (simplified - in production, use a routing API)
                if (trip) {
                    const distance = calculateDistance(
                        location.lat,
                        location.lng,
                        Number(trip.dropLat),
                        Number(trip.dropLng)
                    );
                    const speed = location.speed || 40; // km/h
                    const timeInMinutes = Math.round((distance / speed) * 60);
                    setEta(`${timeInMinutes} min`);
                }
            },
            onError: (error) => {
                console.error('Location tracking error:', error);
                toast({
                    title: 'Location update failed',
                    description: 'Unable to get driver location',
                    variant: 'destructive',
                });
            },
        });

        return () => {
            unsubscribe();
        };
    }, [tripId, trip]);

    const handleSOS = async () => {
        if (!trip) return;

        try {
            const { error } = await supabase.from('emergency_alerts').insert({
                trip_id: trip.id,
                user_id: trip.driver.userId,
                lat: driverLocation?.lat || trip.pickupLat,
                lng: driverLocation?.lng || trip.pickupLng,
                status: 'triggered'
            });

            if (error) throw error;

            toast({
                title: "EMERGENCY ALERT SENT",
                description: "Help is on the way. Your location has been shared with our safety team.",
                variant: "destructive",
                duration: 10000,
            });
        } catch (error) {
            console.error("SOS Error:", error);
            toast({
                title: "Failed to send alert",
                description: "Please call 100 immediately.",
                variant: "destructive",
            });
        }
    };

    if (isLoading || !trip) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                    <p className="text-muted-foreground">Connecting to vehicle...</p>
                </div>
            </div>
        );
    }

    const driver = trip.driver;

    // Prepare markers for map
    const markers = [
        {
            id: 'pickup',
            coordinates: { lat: Number(trip.pickupLat), lng: Number(trip.pickupLng) },
            color: '#22c55e',
            popup: `<strong>Pickup:</strong> ${trip.pickupLocation}`
        },
        {
            id: 'drop',
            coordinates: { lat: Number(trip.dropLat), lng: Number(trip.dropLng) },
            color: '#ef4444',
            popup: `<strong>Drop:</strong> ${trip.dropLocation}`
        },
    ];

    if (driverLocation) {
        markers.push({
            id: 'driver',
            coordinates: { lat: driverLocation.lat, lng: driverLocation.lng },
            color: '#3b82f6',
            popup: `<strong>Driver:</strong> ${driver.user.fullName}`
        });
    }

    return (
        <div className="min-h-screen bg-background flex flex-col">
            <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur shrink-0">
                <div className="container mx-auto px-6 h-16 flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => navigate('/my-trips')}>
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                    <div>
                        <h1 className="text-xl font-display font-bold">Live Tracking</h1>
                        <p className="text-xs text-muted-foreground">
                            {trip.pickupLocation} → {trip.dropLocation}
                        </p>
                    </div>
                    <div className="ml-auto flex items-center gap-2">
                        <Badge variant="outline" className="animate-pulse bg-green-500/10 text-green-500 border-green-500/20">
                            ● LIVE
                        </Badge>
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button variant="destructive" size="sm" className="gap-2 animate-pulse hover:animate-none">
                                    <Shield className="w-4 h-4" />
                                    SOS
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle className="text-destructive flex items-center gap-2">
                                        <Shield className="w-5 h-5" />
                                        Emergency SOS
                                    </AlertDialogTitle>
                                    <AlertDialogDescription>
                                        Are you sure you want to trigger an emergency alert? This will send your live location to our safety team and emergency contacts.
                                        <br /><br />
                                        <strong>Only use this in case of a genuine emergency.</strong>
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={handleSOS} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
                                        YES, SEND HELP
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </div>
                </div>
            </header>

            <div className="flex-1 relative">
                <MapView
                    markers={markers}
                    className="w-full h-full absolute inset-0"
                    zoom={14}
                />

                {/* Driver Info Overlay */}
                <div className="absolute bottom-6 left-6 right-6 md:left-auto md:right-6 md:w-96">
                    <Card className="p-4 shadow-xl border-primary/20">
                        <div className="flex items-center gap-4">
                            <Avatar className="w-12 h-12 border-2 border-background">
                                <AvatarImage src={driver.user.profilePhoto || undefined} />
                                <AvatarFallback>{driver.user.fullName.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                                <h3 className="font-semibold truncate">{driver.user.fullName}</h3>
                                <p className="text-sm text-muted-foreground">
                                    {driver.vehicleMake} {driver.vehicleModel} • {driver.vehiclePlate}
                                </p>
                                {driverLocation && (
                                    <div className="flex items-center gap-2 mt-1">
                                        <Navigation className="w-3 h-3 text-primary" />
                                        <span className="text-xs font-medium text-primary">ETA: {eta}</span>
                                        {driverLocation.speed && (
                                            <span className="text-xs text-muted-foreground">
                                                • {Math.round(driverLocation.speed)} km/h
                                            </span>
                                        )}
                                    </div>
                                )}
                            </div>
                            <Button size="icon" variant="secondary" className="rounded-full h-10 w-10">
                                <Phone className="w-4 h-4" />
                            </Button>
                        </div>

                        <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 p-2 rounded">
                            <Shield className="w-3 h-3" />
                            <span>Your ride is monitored for safety</span>
                        </div>
                    </Card>
                </div>
            </div>
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
