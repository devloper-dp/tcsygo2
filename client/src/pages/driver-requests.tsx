import { useEffect, useRef } from 'react';
import { useLocation } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Navigation, Clock, IndianRupee } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Navbar } from '@/components/Navbar';
import { useToast } from '@/hooks/use-toast';
import { RideRequest } from '@shared/schema';
import { useAuth } from '@/contexts/AuthContext';
import { mapDriver } from '@/lib/mapper';

export default function DriverRequests() {
    const [, navigate] = useLocation();
    const { user } = useAuth();
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const previousRequestCount = useRef(0);

    // Fetch driver profile
    const { data: driverProfile } = useQuery({
        queryKey: ['my-driver-profile', user?.id],
        queryFn: async () => {
            if (!user) return null;
            const { data, error } = await supabase.from('drivers').select('*').eq('user_id', user.id).single();
            if (error) return null;
            return mapDriver(data);
        },
        enabled: !!user
    });

    const { data: requests, isLoading } = useQuery<RideRequest[]>({
        queryKey: ['pending-requests'],
        queryFn: async () => {
            if (!driverProfile) return [];

            // 1. Get pending requests
            const { data: requestData, error: requestError } = await supabase
                .from('ride_requests')
                .select('*')
                .in('status', ['pending', 'searching'])
                .order('created_at', { ascending: false });

            if (requestError) throw requestError;

            // 2. Get my ongoing trips and their passengers
            // We need to know who we are already driving to hide their "zombie" requests
            const { data: tripData, error: tripError } = await supabase
                .from('trips')
                .select('booking_id, bookings!inner(passenger_id)') // Join with bookings to get passenger_id
                .eq('driver_id', driverProfile.id)
                .eq('status', 'ongoing');

            if (tripError && tripError.code !== 'PGRST116') {
                // Log error but proceed, non-critical if optimization fails
                console.error("Failed to fetch active trips for filtering", tripError);
            }

            const activePassengerIds = new Set((tripData || []).map((t: any) => t.bookings?.passenger_id));


            // Map snake_case to camelCase
            const mapped = (requestData || []).map((item: any) => ({
                id: item.id,
                passengerId: item.passenger_id,
                pickupLocation: item.pickup_location,
                pickupLat: item.pickup_lat,
                pickupLng: item.pickup_lng,
                dropLocation: item.drop_location,
                dropLat: item.drop_lat,
                dropLng: item.drop_lng,
                vehicleType: item.vehicle_type,
                fare: item.fare,
                distance: item.distance,
                duration: item.duration,
                status: item.status,
                seats: item.seats,
                createdAt: item.created_at,
                updatedAt: item.updated_at
            }));

            // Deduplicate & Filter
            const uniqueRequests: typeof mapped = [];
            const seenPassengers = new Set();

            for (const req of mapped) {
                // Filter 1: Don't show requests from passengers we are currently driving
                if (activePassengerIds.has(req.passengerId)) continue;

                // Filter 2: Deduplicate by passenger (show only newest)
                if (!seenPassengers.has(req.passengerId)) {
                    seenPassengers.add(req.passengerId);
                    uniqueRequests.push(req);
                }
            }
            return uniqueRequests;
        },
        refetchInterval: 5000,
        enabled: !!driverProfile // requests query depends on driverProfile
    });

    // Play sound on new request
    useEffect(() => {
        if (requests && requests.length > previousRequestCount.current) {
            const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
            audio.play().catch(e => console.log('Audio play failed', e));
            toast({
                title: "New Ride Request! 🔔",
                description: "Check the list for details.",
                className: "bg-primary text-primary-foreground"
            });
        }
        previousRequestCount.current = requests?.length || 0;
    }, [requests, toast]);

    // Realtime subscription
    useEffect(() => {
        const channel = supabase
            .channel('public:ride_requests')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'ride_requests'
                },
                () => {
                    queryClient.invalidateQueries({ queryKey: ['pending-requests'] });
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [queryClient]);

    const acceptRequestMutation = useMutation({
        mutationFn: async (request: RideRequest) => {
            if (!driverProfile) throw new Error("Driver profile not found");

            // 1. ATOMIC LOCK: Try to set status to 'accepted' first
            // This prevents race conditions where multiple drivers accept the same ride
            const { data: updatedRequest, error: updateError } = await supabase
                .from('ride_requests')
                .update({
                    status: 'accepted',
                    driver_id: driverProfile.id
                })
                .eq('id', request.id)
                .in('status', ['pending', 'searching']) // Only update if it's still pending
                .select()
                .single();

            if (updateError || !updatedRequest) {
                throw new Error("Ride is no longer available (taken by another driver)");
            }

            try {
                // 2. Create Booking Record
                const { data: booking, error: bookingError } = await supabase
                    .from('bookings')
                    .insert({
                        passenger_id: request.passengerId,
                        driver_id: driverProfile.id,
                        seats_booked: request.seats || 1,
                        total_amount: request.fare,
                        status: 'confirmed',
                        pickup_location: request.pickupLocation,
                        pickup_lat: request.pickupLat,
                        pickup_lng: request.pickupLng,
                        drop_location: request.dropLocation,
                        drop_lat: request.dropLat,
                        drop_lng: request.dropLng
                    })
                    .select()
                    .single();

                if (bookingError) throw bookingError;

                if (bookingError) throw bookingError;

                // 3. Check for existing active trip for this driver (POOLING)
                let tripId;
                const { data: activeTrip } = await supabase
                    .from('trips')
                    .select('id, available_seats, pickup_lat, pickup_lng, drop_lat, drop_lng, bookings(drop_lat, drop_lng, status)')
                    .eq('driver_id', driverProfile.id)
                    .eq('status', 'ongoing')
                    .gt('available_seats', 0)
                    .maybeSingle();

                if (activeTrip) {
                    // 3a. Deviation Check (Advanced Routing)
                    const { locationTrackingService } = await import('@/lib/location-tracking');
                    const { calculateDetour } = await import('@/lib/maps');

                    // Get current driver location
                    const driverLoc = await locationTrackingService.getCurrentLocation(activeTrip.id);
                    const startCoord = driverLoc ? { lat: driverLoc.lat, lng: driverLoc.lng } : { lat: Number(activeTrip.pickup_lat), lng: Number(activeTrip.pickup_lng) };

                    // Get existing drops from bookings (waypoints)
                    const bookings = (activeTrip.bookings || []).filter((b: any) => b.status === 'confirmed');
                    const currentWaypoints = bookings.map((b: any) => ({ lat: Number(b.drop_lat), lng: Number(b.drop_lng) }));

                    // New stops to add
                    const newStops = [
                        { lat: Number(request.pickupLat), lng: Number(request.pickupLng) },
                        { lat: Number(request.dropLat), lng: Number(request.dropLng) }
                    ];

                    const detour = await calculateDetour(
                        startCoord,
                        { lat: Number(activeTrip.drop_lat), lng: Number(activeTrip.drop_lng) }, // Trip end
                        currentWaypoints,
                        newStops
                    );

                    // THRESHOLD: 15 minutes max detour
                    if (detour.detourDuration > 15) {
                        throw new Error(`Detour too large (+${Math.round(detour.detourDuration)} mins). Cannot pool.`);
                    }

                    // reuse existing trip
                    tripId = activeTrip.id;

                    // Update seats AND ROUTE so checking clients see the new path
                    await supabase.from('trips')
                        .update({
                            available_seats: activeTrip.available_seats - 1,
                            route: detour.geometry
                        })
                        .eq('id', tripId);

                } else {
                    // Create New Trip
                    const { data: trip, error: tripError } = await supabase
                        .from('trips')
                        .insert({
                            driver_id: driverProfile.id,
                            booking_id: booking.id, // Primary booking
                            pickup_location: request.pickupLocation,
                            pickup_lat: request.pickupLat,
                            pickup_lng: request.pickupLng,
                            drop_location: request.dropLocation,
                            drop_lat: request.dropLat,
                            drop_lng: request.dropLng,
                            departure_time: new Date().toISOString(),
                            distance: request.distance,
                            duration: request.duration,
                            price_per_seat: request.fare,
                            available_seats: 3, // Assuming 4 seater - 1
                            total_seats: 4,
                            status: 'ongoing',
                            preferences: {},
                        })
                        .select()
                        .single();

                    if (tripError) throw tripError;
                    tripId = trip.id;
                }

                // 4. Update Booking with Trip ID
                const { error: updateBookingError } = await supabase
                    .from('bookings')
                    .update({ trip_id: tripId })
                    .eq('id', booking.id);

                if (updateBookingError) throw updateBookingError;

                // 5. Update Request with Trip ID (Link it back)
                const { error: reqError } = await supabase
                    .from('ride_requests')
                    .update({
                        trip_id: tripId
                    })
                    .eq('id', request.id);

                if (reqError) throw reqError;

                // 6. Send Notification to Passenger
                await supabase.from('notifications').insert({
                    user_id: request.passengerId,
                    title: 'Ride Accepted',
                    message: `Driver ${user?.fullName || 'nearby'} has accepted your ride!`,
                    type: 'booking',
                    data: { tripId: tripId, driverId: driverProfile.id },
                    is_read: false
                });

                // 7. Auto-cancel other pending/searching requests for this passenger
                // wrapped in try-catch to be non-blocking (RLS might prevent updating other rows)
                try {
                    await supabase
                        .from('ride_requests')
                        .update({
                            status: 'cancelled',
                            cancellation_reason: 'Auto-cancelled due to other request acceptance'
                        })
                        .eq('passenger_id', request.passengerId)
                        .neq('id', request.id) // Don't cancel the one we just accepted
                        .in('status', ['pending', 'searching']);
                } catch (cleanupError) {
                    console.error("Non-fatal error: Failed to auto-cancel sibling requests", cleanupError);
                }


                return { id: tripId };
            } catch (error) {
                // Rollback: If anything fails after "locking" the request, we should try to release it
                // ensuring it goes back to 'pending' so others can try.
                console.error("Error during trip creation, rolling back request status...", error);

                await supabase
                    .from('ride_requests')
                    .update({ status: 'pending', driver_id: null })
                    .eq('id', request.id)
                    .eq('driver_id', driverProfile.id); // Only release if WE were the ones who locked it

                throw error;
            }
        },
        onSuccess: (trip, variables) => {
            // Optimistically update the list by removing the accepted request immediately
            queryClient.setQueryData(['pending-requests'], (oldData: any[]) => {
                if (!oldData) return [];
                return oldData.filter(req => req.id !== variables.id);
            });

            toast({
                title: "Request Accepted",
                description: "Navigate to pickup location.",
            });
            navigate(`/track/${trip.id}`);
        },
        onError: (error: any) => {
            toast({
                title: "Failed to accept",
                description: error.message,
                variant: "destructive"
            });
        }
    });

    const cleanupMutation = useMutation({
        mutationFn: async () => {
            // Fetch all pending requests
            const { data: allRequests } = await supabase
                .from('ride_requests')
                .select('*')
                .in('status', ['pending', 'searching']);

            if (!allRequests || allRequests.length === 0) return;

            // Group by passenger_id
            const grouped: Record<string, any[]> = {};
            allRequests.forEach(req => {
                if (!grouped[req.passenger_id]) grouped[req.passenger_id] = [];
                grouped[req.passenger_id].push(req);
            });

            let removedCount = 0;

            // Process each group
            for (const pid in grouped) {
                const reqs = grouped[pid];
                if (reqs.length > 1) {
                    // Sort by created_at descending (newest first)
                    reqs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

                    // Keep the newest (index 0), cancel the rest
                    const duplicates = reqs.slice(1);

                    for (const dup of duplicates) {
                        await supabase
                            .from('ride_requests')
                            .update({
                                status: 'cancelled',
                                cancellation_reason: 'Cleanup: Duplicate request removal'
                            })
                            .eq('id', dup.id);
                        removedCount++;
                    }
                }
            }
            return removedCount;
        },
        onSuccess: (count) => {
            queryClient.invalidateQueries({ queryKey: ['pending-requests'] });
            toast({
                title: "Cleanup Complete",
                description: count ? `Removed ${count} duplicate requests.` : "No duplicates found.",
            });
        },
        onError: (err) => {
            toast({
                title: "Cleanup Failed",
                description: err.message,
                variant: 'destructive',
            });
        }
    });

    if (isLoading) return <div>Loading...</div>;

    return (
        <div className="min-h-screen bg-background">
            <Navbar />
            <div className="container mx-auto px-4 py-6">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-2xl font-bold">Ride Requests</h1>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => cleanupMutation.mutate()}
                        disabled={cleanupMutation.isPending}
                    >
                        {cleanupMutation.isPending ? 'Cleaning...' : 'Cleanup Duplicates'}
                    </Button>
                </div>

                <div className="space-y-4">
                    {requests && requests.length === 0 && (
                        <div className="text-center py-10 text-muted-foreground">
                            No pending requests nearby.
                        </div>
                    )}

                    {requests?.map((req) => (
                        <Card key={req.id} className="p-4 border-l-4 border-l-primary">
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex items-center gap-2">
                                    <Badge variant="outline" className="uppercase text-xs">{req.vehicleType}</Badge>
                                    <span className="text-xs text-muted-foreground">{new Date(req.createdAt).toLocaleTimeString()}</span>
                                </div>
                                <div className="font-bold text-lg flex items-center text-green-600">
                                    <IndianRupee className="w-4 h-4" />
                                    {req.fare}
                                </div>
                            </div>

                            <div className="space-y-4 mb-6">
                                <div className="flex items-start gap-3">
                                    <div className="flex flex-col items-center gap-1">
                                        <div className="w-2 h-2 rounded-full bg-green-500 mt-2" />
                                        <div className="w-0.5 h-10 bg-border" />
                                        <div className="w-2 h-2 rounded-full bg-red-500" />
                                    </div>
                                    <div className="flex-1 space-y-4">
                                        <div>
                                            <div className="text-xs text-muted-foreground">Pickup</div>
                                            <div className="font-medium text-sm">{req.pickupLocation}</div>
                                        </div>
                                        <div>
                                            <div className="text-xs text-muted-foreground">Drop</div>
                                            <div className="font-medium text-sm">{req.dropLocation}</div>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-4 text-sm text-muted-foreground bg-secondary/20 p-2 rounded">
                                    <div className="flex items-center gap-1">
                                        <Navigation className="w-4 h-4" />
                                        {req.distance} km
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <Clock className="w-4 h-4" />
                                        {req.duration} min
                                    </div>
                                </div>
                            </div>

                            <Button
                                className="w-full"
                                size="lg"
                                onClick={() => acceptRequestMutation.mutate(req)}
                                disabled={acceptRequestMutation.isPending}
                            >
                                {acceptRequestMutation.isPending ? 'Accepting...' : 'Accept Ride'}
                            </Button>
                        </Card>
                    ))}
                </div>
            </div>
        </div>
    );
}
