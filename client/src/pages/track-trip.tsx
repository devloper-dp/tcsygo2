import { useState, useEffect } from 'react';
import { useLocation, useRoute } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Phone, Shield, Navigation, MessageSquare, CheckCircle } from 'lucide-react';
import { ChatDialog } from '@/components/ChatDialog';
import { MapView } from '@/components/MapView';
import { LiveDriveStats } from '@/components/LiveDriveStats';
import { DriverArrivalTimer } from '@/components/DriverArrivalTimer';
import { GeofenceAlerts } from '@/components/GeofenceAlerts';
import { ShareRideStatus } from '@/components/ShareRideStatus';
import { SplitFare } from '@/components/SplitFare';
import { SafetyCheckIn } from '@/components/SafetyCheckIn';
import { DriverVerification } from '@/components/DriverVerification';
import { TurnByTurnNavigation } from '@/components/TurnByTurnNavigation';
import { TripWithDriver } from '@shared/schema';
import { supabase } from '@/lib/supabase';
import { mapTrip } from '@/lib/mapper';
import { locationTrackingService, LocationUpdate } from '@/lib/location-tracking';
import { getRoute, Coordinates, calculateDistance as calculateDistanceKm } from '@/lib/maps';
import { useAuth } from '@/contexts/AuthContext';
import { useUnreadMessages } from '@/hooks/useUnreadMessages';

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
import { RealDriverTracker } from '@/components/RealDriverTracker';
import { processAutoPayments } from '@/lib/auto-pay';

export default function TrackTrip() {
    const [, navigate] = useLocation();
    const [, params] = useRoute('/track/:id');
    const tripId = params?.id;
    const { user } = useAuth();
    const { toast } = useToast();
    const [driverLocation, setDriverLocation] = useState<LocationUpdate | null>(null);
    const [eta, setEta] = useState<string>('Calculating...');
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [routePath, setRoutePath] = useState<Coordinates[]>([]);
    const [navigationSteps, setNavigationSteps] = useState<any[]>([]);
    const [currentStepIndex, setCurrentStepIndex] = useState(0);
    const [distanceToPickup, setDistanceToPickup] = useState<number | null>(null);
    const [distanceToDrop, setDistanceToDrop] = useState<number | null>(null);
    const [showVerification, setShowVerification] = useState(false);
    const [verificationCompleted, setVerificationCompleted] = useState(false);

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

                // Calculate distance from driver to pickup location
                if (trip) {
                    const distanceToPickupLocation = calculateDistanceKm(
                        location.lat,
                        location.lng,
                        Number(trip.pickupLat),
                        Number(trip.pickupLng)
                    );
                    setDistanceToPickup(distanceToPickupLocation);

                    // Trigger verification when driver is arrived (within 50m)
                    if (distanceToPickupLocation <= 0.05 && !verificationCompleted && !showVerification) {
                        setShowVerification(true);
                    }

                    const distanceToDropLocation = calculateDistanceKm(
                        location.lat,
                        location.lng,
                        Number(trip.dropLat),
                        Number(trip.dropLng)
                    );
                    setDistanceToDrop(distanceToDropLocation);

                    // Update current step index based on proximity
                    if (navigationSteps.length > 0 && routePath.length > 0) {
                        // Simple logic: find closest point on path (approximate)
                        const totalSteps = navigationSteps.length;
                        const progress = 1 - (distanceToDropLocation / (Number(trip.distance) + 0.001));
                        const estimatedStep = Math.floor(progress * totalSteps);
                        setCurrentStepIndex(Math.min(Math.max(0, estimatedStep), totalSteps - 1));
                    }

                    const speed = location.speed || 40; // km/h
                    const timeInMinutes = Math.round((distanceToDropLocation / speed) * 60);
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

    // Get unread message count
    const unreadCount = useUnreadMessages({
        tripId: trip?.id || '',
        otherUserId: trip?.driver.user.id || '',
        enabled: !!trip,
    });

    // Fetch booking to get passenger ID for notifications
    const { data: booking } = useQuery({
        queryKey: ['trip-booking', tripId],
        queryFn: async () => {
            if (!tripId) return null;
            const { data, error } = await supabase
                .from('bookings')
                .select('id, passenger_id, total_amount')
                .eq('trip_id', tripId)
                .maybeSingle();
            return data;
        },
        enabled: !!tripId
    });

    // Fetch route if not available in trip data
    useEffect(() => {
        if (!trip) return;

        const fetchRoute = async () => {
            // If trip already has a route, use it
            if (trip.route && Array.isArray(trip.route) && trip.route.length > 0) {
                setRoutePath(trip.route);
                return;
            }

            // Otherwise fetch from OSRM
            try {
                const pickup: Coordinates = { lat: Number(trip.pickupLat), lng: Number(trip.pickupLng) };
                const drop: Coordinates = { lat: Number(trip.dropLat), lng: Number(trip.dropLng) };

                const routeData = await getRoute(pickup, drop);
                setRoutePath(routeData.geometry);
                if (routeData.steps) {
                    setNavigationSteps(routeData.steps);
                }
            } catch (error) {
                console.error('Failed to fetch route:', error);
            }
        };

        fetchRoute();
    }, [trip]);

    const handleSOS = async () => {
        if (!trip) return;

        try {
            const { error } = await supabase.from('emergency_alerts').insert({
                trip_id: trip.id,
                user_id: user?.id,
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
                        <ShareRideStatus
                            tripId={trip.id}
                            driverName={driver.user.fullName}
                            vehicleNumber={driver.vehiclePlate}
                            pickupLocation={trip.pickupLocation}
                            dropLocation={trip.dropLocation}
                            estimatedArrival={eta}
                            className="hidden md:flex"
                        />
                        {booking && (
                            <SplitFare
                                bookingId={booking.id}
                                totalAmount={booking.total_amount || 0}
                                className="hidden md:flex"
                            />
                        )}
                        <Badge variant="outline" className="animate-pulse bg-green-500/10 text-green-500 border-green-500/20 hidden sm:flex">
                            ● LIVE
                        </Badge>
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button variant="destructive" size="sm" className="gap-2 animate-pulse hover:animate-none">
                                    <Shield className="w-4 h-4" />
                                    <span className="hidden sm:inline">SOS</span>
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle className="text-destructive flex items-center gap-2">
                                        <Shield className="w-5 h-5" />
                                        Emergency SOS
                                    </AlertDialogTitle>
                                    <AlertDialogDescription>
                                        Use this in case of an emergency. We will notify your emergency contacts and the safety team.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <div className="flex flex-col gap-3 py-2">
                                    <Button
                                        variant="destructive"
                                        className="w-full gap-2 text-lg h-12"
                                        onClick={() => window.open('tel:100')}
                                    >
                                        <Phone className="w-5 h-5" />
                                        CALL POLICE (100)
                                    </Button>
                                    <AlertDialogAction onClick={handleSOS} className="w-full bg-destructive/90 hover:bg-destructive text-destructive-foreground">
                                        Send Alert to Safety Team
                                    </AlertDialogAction>
                                </div>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>

                        {/* Mobile Menu for Actions */}
                        <div className="md:hidden flex gap-2">
                            <ShareRideStatus
                                tripId={trip.id}
                                driverName={driver.user.fullName}
                                vehicleNumber={driver.vehiclePlate}
                                pickupLocation={trip.pickupLocation}
                                dropLocation={trip.dropLocation}
                                estimatedArrival={eta}
                                className="h-9 w-9 px-0"
                                iconOnly
                            />
                            {booking && (
                                <SplitFare
                                    bookingId={booking.id}
                                    totalAmount={booking.total_amount || 0}
                                    className="h-9 w-9 px-0"
                                    iconOnly
                                />
                            )}
                        </div>
                    </div>
                </div>
            </header>

            <div className="flex-1 relative">
                <MapView
                    markers={markers}
                    route={routePath}
                    className="w-full h-full absolute inset-0"
                    zoom={14}
                />

                {/* Live Drive Stats Overlay */}
                {trip.status === 'ongoing' && driverLocation && (
                    <LiveDriveStats
                        tripId={trip.id}
                        driverLocation={driverLocation}
                        pickupLocation={{ lat: Number(trip.pickupLat), lng: Number(trip.pickupLng) }}
                        dropLocation={{ lat: Number(trip.dropLat), lng: Number(trip.dropLng) }}
                        startTime={trip.departureTime}
                        isDriver={false}
                    />
                )}

                {/* Safety Check-In */}
                <SafetyCheckIn
                    tripId={trip.id}
                    isActive={trip.status === 'ongoing'}
                    className="absolute top-6 left-6 right-6 md:left-auto md:right-6 md:w-96"
                />

                {/* Turn-by-Turn Navigation */}
                {trip.status === 'ongoing' && driverLocation && navigationSteps.length > 0 && (
                    <TurnByTurnNavigation
                        steps={navigationSteps}
                        totalDistance={parseFloat(trip.distance) * 1000 || 5000} // in meters
                        remainingDistance={trip.status === 'ongoing'
                            ? (distanceToDrop ? distanceToDrop * 1000 : 2000)
                            : (distanceToPickup ? distanceToPickup * 1000 : 2000)}
                        currentStepIndex={currentStepIndex}
                        className="absolute top-24 left-6 right-6 md:left-6 md:right-auto md:w-96"
                    />
                )}

                {/* Driver Info Overlay */}
                <div className="absolute bottom-6 left-6 right-6 md:left-auto md:right-6 md:w-96 space-y-3">
                    {/* Driver Arrival Timer */}
                    {trip.status !== 'completed' && driverLocation && (
                        <DriverArrivalTimer
                            driverLocation={{ lat: driverLocation.lat, lng: driverLocation.lng }}
                            pickupLocation={{ lat: Number(trip.pickupLat), lng: Number(trip.pickupLng) }}
                        />
                    )}

                    {/* Geofence Alerts */}
                    {driverLocation && (
                        <GeofenceAlerts
                            driverLocation={{ lat: driverLocation.lat, lng: driverLocation.lng }}
                            pickupLocation={{ lat: Number(trip.pickupLat), lng: Number(trip.pickupLng) }}
                            dropLocation={{ lat: Number(trip.dropLat), lng: Number(trip.dropLng) }}
                            tripStatus={trip.status as 'pending' | 'ongoing' | 'completed'}
                        />
                    )}

                    <Card className="p-4 shadow-xl border-primary/20">
                        {/* Distance to Pickup Indicator */}
                        {distanceToPickup !== null && trip.status !== 'completed' && (
                            <div className="mb-3 p-3 bg-primary/10 rounded-lg border border-primary/20">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Navigation className="w-4 h-4 text-primary" />
                                        <span className="text-sm font-medium">Driver Distance</span>
                                    </div>
                                    <Badge variant="secondary" className="text-base font-bold">
                                        {distanceToPickup < 1
                                            ? `${Math.round(distanceToPickup * 1000)} m`
                                            : `${distanceToPickup.toFixed(1)} km`}
                                    </Badge>
                                </div>
                                {distanceToPickup < 0.5 && (
                                    <p className="text-xs text-muted-foreground mt-1">
                                        Driver is nearby!
                                    </p>
                                )}
                            </div>
                        )}

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
                            <div className="flex flex-col gap-2">
                                <Button
                                    size="icon"
                                    variant="secondary"
                                    className="rounded-full h-10 w-10 border border-primary/20 hover:bg-primary/5"
                                    onClick={() => navigate('/safety-center')}
                                    title="Safety Center"
                                >
                                    <Shield className="w-4 h-4 text-primary" />
                                </Button>
                                <Button size="icon" variant="secondary" className="rounded-full h-10 w-10" onClick={() => window.location.href = `tel:${driver.user.phone}`}>
                                    <Phone className="w-4 h-4" />
                                </Button>
                                <Button
                                    size="icon"
                                    variant="default"
                                    className="rounded-full h-10 w-10 relative"
                                    onClick={() => setIsChatOpen(true)}
                                >
                                    <MessageSquare className="w-4 h-4" />
                                    {unreadCount > 0 && (
                                        <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-[10px]">
                                            {unreadCount}
                                        </Badge>
                                    )}
                                </Button>
                            </div>
                        </div>

                        <ChatDialog
                            isOpen={isChatOpen}
                            onClose={() => setIsChatOpen(false)}
                            tripId={trip.id}
                            otherUserId={driver.user.id}
                            otherUserName={driver.user.fullName}
                            otherUserPhoto={driver.user.profilePhoto || undefined}
                        />

                        <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground bg-muted/50 p-2 rounded">
                            <div className="flex items-center gap-2">
                                <Shield className="w-3 h-3 text-primary" />
                                <span>Monitored for safety</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <CheckCircle className="w-3 h-3 text-success" />
                                <span>Ride Insured</span>
                            </div>
                        </div>
                    </Card>
                </div>
            </div>

            {showVerification && driver && (
                <DriverVerification
                    driver={driver}
                    onVerified={() => {
                        setShowVerification(false);
                        setVerificationCompleted(true);
                    }}
                    onReportMismatch={() => {
                        setShowVerification(false);
                        toast({
                            title: "Report Submitted",
                            description: "We have received your report and will investigate.",
                        });
                    }}
                />
            )}


            {/* Real Driver Tracker (Only for Driver) */}
            {trip && user?.id === trip.driver.userId && (
                <RealDriverTracker
                    tripId={trip.id}
                    driverId={trip.driverId}
                    isDriver={true}
                    pickupLocation={{ lat: Number(trip.pickupLat), lng: Number(trip.pickupLng) }}
                    dropLocation={{ lat: Number(trip.dropLat), lng: Number(trip.dropLng) }}
                    onArrival={async () => {
                        // Driver arrived logic if needed (usually just notification which is handled)
                    }}
                    onComplete={async () => {
                        // Mark trip as completed in DB if not already
                        if (trip.status !== 'completed') {
                            const { error } = await supabase.from('trips').update({ status: 'completed' }).eq('id', trip.id);
                            if (error) {
                                console.error("Failed to complete trip", error);
                            } else {
                                toast({ title: "Trip Completed", description: "You have reached the destination." });
                                // Trigger Auto-Pay
                                await processAutoPayments(trip.id);
                            }
                        }
                    }}
                />
            )}

        </div>
    );
}

