import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MapPin, Navigation, Clock, IndianRupee } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Navbar } from '@/components/Navbar';
import { useToast } from '@/hooks/use-toast';
import { RideRequest, TripStatus } from '@shared/schema';
import { useAuth } from '@/contexts/AuthContext';
import { mapDriver } from '@/lib/mapper';

export default function DriverRequests() {
    const [, navigate] = useLocation();
    const { user } = useAuth();
    const { toast } = useToast();
    const queryClient = useQueryClient();

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
            const { data, error } = await supabase
                .from('ride_requests')
                .select('*')
                .eq('status', 'pending')
                .order('created_at', { ascending: false });

            if (error) throw error;
            return data;
        },
        refetchInterval: 5000,
    });

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

            // 1. Create Trip
            const { data: trip, error: tripError } = await supabase
                .from('trips')
                .insert({
                    driver_id: driverProfile.id,
                    pickup_location: request.pickupLocation,
                    pickup_lat: request.pickupLat,
                    pickup_lng: request.pickupLng,
                    drop_location: request.dropLocation,
                    drop_lat: request.dropLat,
                    drop_lng: request.dropLng,
                    departure_time: new Date().toISOString(), // Immediate
                    distance: request.distance,
                    duration: request.duration,
                    price_per_seat: request.fare, // For single seat/entire ride mapping
                    available_seats: 0, // Booked
                    total_seats: 4, // Default
                    status: TripStatus.ONGOING, // Start immediately or Upcoming? Let's say Upcoming until they pick up.
                    preferences: {},
                })
                .select()
                .single();

            if (tripError) throw tripError;

            // 2. Update Request
            const { error: reqError } = await supabase
                .from('ride_requests')
                .update({
                    status: 'accepted',
                    driver_id: driverProfile.id,
                    trip_id: trip.id
                })
                .eq('id', request.id);

            if (reqError) throw reqError;

            // 3. Create Booking Record (Critical for Payments & Tracking)
            const { error: bookingError } = await supabase
                .from('bookings')
                .insert({
                    trip_id: trip.id,
                    passenger_id: request.passengerId,
                    seats_booked: 1, // Instant ride usually 1 or full cap? Assuming 1 for now or request.seats
                    total_amount: request.fare,
                    status: 'confirmed',
                    pickup_location: request.pickupLocation,
                    drop_location: request.dropLocation,
                });

            if (bookingError) throw bookingError;

            // 4. Send Notification to Passenger
            await supabase.from('notifications').insert({
                user_id: request.passengerId,
                title: 'Ride Accepted',
                message: `Driver ${user?.fullName || 'nearby'} has accepted your ride!`,
                type: 'booking',
                data: { tripId: trip.id, driverId: driverProfile.id },
                is_read: false
            });

            return trip;
        },
        onSuccess: (trip) => {
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

    if (isLoading) return <div>Loading...</div>;

    return (
        <div className="min-h-screen bg-background">
            <Navbar />
            <div className="container mx-auto px-4 py-6">
                <h1 className="text-2xl font-bold mb-6">Ride Requests</h1>

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
