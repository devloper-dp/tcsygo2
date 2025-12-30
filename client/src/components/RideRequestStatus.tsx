import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Loader2, MapPin, User, Star, Phone, MessageCircle, X, Clock, Navigation } from 'lucide-react';
import { RideRequest, subscribeToRideRequest, cancelRideRequest, getRideRequest } from '@/lib/ride-matching-service';
import { useToast } from '@/hooks/use-toast';
import { formatDistance, formatDuration } from '@/lib/navigation-service';
import { RideInsuranceInfo } from '@/components/RideInsuranceInfo';
import { DriverArrivalTimer } from '@/components/DriverArrivalTimer';
import { GeofenceAlerts } from '@/components/GeofenceAlerts';

interface RideRequestStatusProps {
    requestId: string;
    onComplete?: () => void;
    onCancel?: () => void;
}

export function RideRequestStatus({ requestId, onComplete, onCancel }: RideRequestStatusProps) {
    const [, navigate] = useLocation();
    const { toast } = useToast();
    const [request, setRequest] = useState<RideRequest | null>(null);
    const [driver, setDriver] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [showCancelDialog, setShowCancelDialog] = useState(false);
    const [cancelReason, setCancelReason] = useState('');
    const [cancelling, setCancelling] = useState(false);
    const [searchRadius, setSearchRadius] = useState(5);
    const [driverLocation, setDriverLocation] = useState<{ lat: number; lng: number } | null>(null);
    const [eta, setEta] = useState<number | null>(null);
    const [distanceToPickup, setDistanceToPickup] = useState<number | null>(null);

    useEffect(() => {
        loadRequest();
        const unsubscribe = subscribeToRideRequest(requestId, handleRequestUpdate);
        return unsubscribe;
    }, [requestId]);

    const loadRequest = async () => {
        try {
            const data = await getRideRequest(requestId);
            if (data) {
                setRequest(data);
                if (data.matched_driver_id) {
                    await loadDriver(data.matched_driver_id);
                }
            }
        } catch (error) {
            console.error('Failed to load request:', error);
            toast({
                title: 'Error',
                description: 'Failed to load ride request',
                variant: 'destructive',
            });
        } finally {
            setLoading(false);
        }
    };

    const loadDriver = async (driverId: string) => {
        try {
            const { supabase } = await import('@/lib/supabase');
            const { data, error } = await supabase
                .from('drivers')
                .select('*, user:users(*)')
                .eq('id', driverId)
                .single();

            if (error) throw error;
            setDriver(data);
        } catch (error) {
            console.error('Failed to load driver:', error);
        }
    };

    // Subscribe to driver location updates
    useEffect(() => {
        if (!driver?.id || !request) return;

        const subscribeToDriverLocation = async () => {
            const { supabase } = await import('@/lib/supabase');
            const channel = supabase
                .channel(`driver_location:${driver.id}`)
                .on(
                    'postgres_changes',
                    {
                        event: 'UPDATE',
                        schema: 'public',
                        table: 'driver_availability',
                        filter: `driver_id=eq.${driver.id}`,
                    },
                    (payload: any) => {
                        const newLocation = {
                            lat: payload.new.current_lat,
                            lng: payload.new.current_lng,
                        };
                        setDriverLocation(newLocation);

                        // Calculate distance and ETA
                        if (request.pickup_lat && request.pickup_lng) {
                            const distance = calculateDistance(
                                newLocation.lat,
                                newLocation.lng,
                                request.pickup_lat,
                                request.pickup_lng
                            );
                            setDistanceToPickup(distance);
                            // Assume average speed of 30 km/h in city
                            const etaMinutes = Math.ceil((distance / 1000) / 30 * 60);
                            setEta(etaMinutes);
                        }
                    }
                )
                .subscribe();

            return () => {
                supabase.removeChannel(channel);
            };
        };

        subscribeToDriverLocation();
    }, [driver?.id, request]);

    // Helper function to calculate distance
    const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
        const R = 6371000; // Earth's radius in meters
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    };

    const handleRequestUpdate = (updatedRequest: RideRequest) => {
        setRequest(updatedRequest);

        if (updatedRequest.status === 'matched' && updatedRequest.matched_driver_id) {
            loadDriver(updatedRequest.matched_driver_id);
            toast({
                title: '🚗 Driver Found!',
                description: 'A driver has been matched to your request',
            });
        }

        if (updatedRequest.status === 'accepted') {
            toast({
                title: '✅ Ride Confirmed',
                description: 'Driver is on the way to pick you up',
            });
            if (onComplete) {
                onComplete();
            } else {
                // Navigate to track trip page - in a real app, this would be the trip ID
                // For now, we'll navigate to my-trips
                navigate(`/my-trips`);
            }
        }

        if (updatedRequest.status === 'expired') {
            toast({
                title: 'Request Expired',
                description: 'No drivers available. Please try again.',
                variant: 'destructive',
            });
            if (onCancel) onCancel();
        }

        // Update search radius for animation
        if (updatedRequest.search_radius) {
            setSearchRadius(updatedRequest.search_radius / 1000); // Convert to km
        }
    };

    const handleCancel = async () => {
        if (!cancelReason.trim()) {
            toast({
                title: 'Reason Required',
                description: 'Please select a cancellation reason',
                variant: 'destructive',
            });
            return;
        }

        setCancelling(true);
        try {
            await cancelRideRequest(requestId, cancelReason);
            toast({
                title: 'Request Cancelled',
                description: 'Your ride request has been cancelled',
            });
            setShowCancelDialog(false);
            if (onCancel) onCancel();
        } catch (error) {
            console.error('Failed to cancel:', error);
            toast({
                title: 'Cancellation Failed',
                description: 'Failed to cancel ride request',
                variant: 'destructive',
            });
        } finally {
            setCancelling(false);
        }
    };

    if (loading) {
        return (
            <Card className="p-8 text-center">
                <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
                <p className="text-muted-foreground">Loading ride request...</p>
            </Card>
        );
    }

    if (!request) {
        return (
            <Card className="p-8 text-center">
                <p className="text-destructive">Ride request not found</p>
            </Card>
        );
    }

    const cancelReasons = [
        'Changed my mind',
        'Found alternative transport',
        'Taking too long',
        'Wrong pickup location',
        'Other',
    ];

    return (
        <>
            <Card className="overflow-hidden">
                {/* Status Header */}
                <div className={`p-4 ${request.status === 'searching' ? 'bg-primary/10' :
                    request.status === 'matched' ? 'bg-warning/10' :
                        request.status === 'accepted' ? 'bg-success/10' :
                            'bg-muted'
                    }`}>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            {request.status === 'searching' && (
                                <Loader2 className="w-5 h-5 animate-spin text-primary" />
                            )}
                            <div>
                                <h3 className="font-semibold">
                                    {(request.status === 'searching' || request.status === 'pending') && (request.scheduled_time ? '📅 Ride Scheduled' : '🔍 Finding Drivers...')}
                                    {request.status === 'matched' && 'Driver Found!'}
                                    {request.status === 'accepted' && 'Ride Confirmed'}
                                    {request.status === 'cancelled' && 'Cancelled'}
                                    {request.status === 'expired' && 'Expired'}
                                </h3>
                                <p className="text-sm text-muted-foreground">
                                    {(request.status === 'searching' || request.status === 'pending') && (
                                        request.scheduled_time
                                            ? `Scheduled for ${new Date(request.scheduled_time).toLocaleString()}`
                                            : `Searching within ${searchRadius}km radius`
                                    )}
                                    {request.status === 'matched' && 'Waiting for driver confirmation'}
                                    {request.status === 'accepted' && 'Driver is on the way'}
                                </p>
                            </div>
                        </div>
                        <Badge variant={
                            request.status === 'searching' ? 'default' :
                                request.status === 'matched' ? 'secondary' :
                                    request.status === 'accepted' ? 'default' :
                                        request.status === 'pending' ? 'outline' :
                                            'outline'
                        }>
                            {(request.status === 'pending' ? 'SCHEDULED' : request.status).toUpperCase()}
                        </Badge>
                    </div>
                </div>

                {/* Trip Details */}
                <div className="p-4 space-y-3 border-b">
                    <div className="flex items-start gap-3">
                        <MapPin className="w-5 h-5 text-success mt-0.5" />
                        <div className="flex-1">
                            <p className="text-xs text-muted-foreground">Pickup</p>
                            <p className="font-medium">{request.pickup_location}</p>
                        </div>
                    </div>
                    <div className="flex items-start gap-3">
                        <MapPin className="w-5 h-5 text-destructive mt-0.5" />
                        <div className="flex-1">
                            <p className="text-xs text-muted-foreground">Drop</p>
                            <p className="font-medium">{request.drop_location}</p>
                        </div>
                    </div>
                </div>

                {/* Fare Details */}
                <div className="p-4 border-b">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-muted-foreground">Estimated Fare</p>
                            <p className="text-2xl font-bold text-primary">₹{request.fare.toFixed(2)}</p>
                            {(request.discount_amount ?? 0) > 0 && (
                                <p className="text-xs text-success">Saved ₹{(request.discount_amount ?? 0).toFixed(2)}</p>
                            )}
                        </div>
                        <div className="text-right">
                            <p className="text-sm text-muted-foreground">{formatDistance(request.distance * 1000)}</p>
                            <p className="text-sm text-muted-foreground">{formatDuration(request.duration * 60)}</p>
                        </div>
                    </div>
                </div>

                {/* Driver Details (if matched) */}
                {driver && (request.status === 'matched' || request.status === 'accepted') && (
                    <div className="p-4 border-b bg-muted/30">
                        <h4 className="font-semibold mb-3">Driver Details</h4>
                        <div className="flex items-center gap-4">
                            <Avatar className="w-16 h-16">
                                <AvatarImage src={driver.user?.profile_photo} />
                                <AvatarFallback>
                                    <User className="w-8 h-8" />
                                </AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                                <p className="font-semibold">{driver.user?.full_name}</p>
                                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                    <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                                    <span>{driver.rating || '5.0'}</span>
                                    <span className="mx-1">•</span>
                                    <span>{driver.total_trips || 0} trips</span>
                                </div>
                                <p className="text-sm text-muted-foreground">
                                    {driver.vehicle_make} {driver.vehicle_model} • {driver.vehicle_plate}
                                </p>
                            </div>
                            <div className="flex gap-2">
                                <Button size="icon" variant="outline">
                                    <Phone className="w-4 h-4" />
                                </Button>
                                <Button size="icon" variant="outline">
                                    <MessageCircle className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>

                        {/* Driver Arrival Timer */}
                        {request.status === 'accepted' && driverLocation && (
                            <div className="mt-4">
                                <DriverArrivalTimer
                                    driverLocation={driverLocation}
                                    pickupLocation={{
                                        lat: request.pickup_lat,
                                        lng: request.pickup_lng,
                                    }}
                                />
                            </div>
                        )}

                        {/* ETA Display */}
                        {eta !== null && distanceToPickup !== null && (
                            <div className="mt-3 p-3 bg-primary/10 rounded-lg">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Clock className="w-4 h-4 text-primary" />
                                        <span className="text-sm font-medium">Arriving in {eta} min</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Navigation className="w-4 h-4 text-muted-foreground" />
                                        <span className="text-sm text-muted-foreground">
                                            {formatDistance(distanceToPickup)} away
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Geofencing Alerts */}
                {request.status === 'accepted' && driverLocation && (
                    <div className="p-4 border-b">
                        <GeofenceAlerts
                            driverLocation={driverLocation}
                            pickupLocation={{
                                lat: request.pickup_lat,
                                lng: request.pickup_lng,
                            }}
                            dropLocation={{
                                lat: request.drop_lat,
                                lng: request.drop_lng,
                            }}
                            tripStatus="ongoing"
                        />
                    </div>
                )}

                {/* Insurance Info */}
                <div className="p-4 border-b">
                    <RideInsuranceInfo
                        tripId={request.id}
                        insuranceCoverage={500000}
                        policyNumber={`INS-${request.id.slice(0, 8).toUpperCase()}`}
                    />
                </div>

                {/* Actions */}
                <div className="p-4">
                    {request.status === 'searching' || request.status === 'matched' || request.status === 'pending' ? (
                        <Button
                            variant="destructive"
                            className="w-full"
                            onClick={() => setShowCancelDialog(true)}
                        >
                            <X className="w-4 h-4 mr-2" />
                            Cancel Request
                        </Button>
                    ) : request.status === 'accepted' ? (
                        <Button
                            className="w-full"
                            onClick={() => navigate(`/track-trip/${requestId}`)}
                        >
                            Track Ride
                        </Button>
                    ) : null}
                </div>
            </Card>

            {/* Cancel Dialog */}
            <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Cancel Ride Request?</DialogTitle>
                        <DialogDescription>
                            Please select a reason for cancellation
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-2 py-4">
                        {cancelReasons.map((reason) => (
                            <Button
                                key={reason}
                                variant={cancelReason === reason ? 'default' : 'outline'}
                                className="w-full justify-start"
                                onClick={() => setCancelReason(reason)}
                            >
                                {reason}
                            </Button>
                        ))}
                    </div>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setShowCancelDialog(false)}
                            disabled={cancelling}
                        >
                            Keep Request
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleCancel}
                            disabled={!cancelReason || cancelling}
                        >
                            {cancelling ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Cancelling...
                                </>
                            ) : (
                                'Confirm Cancel'
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
