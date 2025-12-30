import { useState } from 'react';
import { useLocation } from 'wouter';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ArrowLeft, Calendar, MapPin, Users, Star, Plus, MessageCircle } from 'lucide-react';
import { TripWithDriver, BookingWithDetails } from '@shared/schema';
import { format } from 'date-fns';
import { RatingModal } from '@/components/RatingModal';
import { ChatDialog } from '@/components/ChatDialog';
import { useUnreadMessagesForTrips } from '@/hooks/useUnreadMessages';
import { Navbar } from '@/components/Navbar';
import { supabase } from '@/lib/supabase';
import { mapBooking, mapTrip } from '@/lib/mapper';
import { useAuth } from '@/contexts/AuthContext';

export default function MyTrips() {
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState('bookings');
  const [ratingBooking, setRatingBooking] = useState<BookingWithDetails | null>(null);
  const [chatState, setChatState] = useState<{
    isOpen: boolean;
    tripId: string;
    otherUserId: string;
    otherUserName: string;
    otherUserPhoto?: string;
  }>({
    isOpen: false,
    tripId: '',
    otherUserId: '',
    otherUserName: '',
  });
  const { user } = useAuth();

  const { data: bookings, isLoading: loadingBookings } = useQuery<BookingWithDetails[]>({
    queryKey: ['my-bookings', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('bookings')
        .select('*, trip:trips(*, driver:drivers(*, user:users(*)))')
        .eq('passenger_id', user.id);

      if (error) throw error;
      return (data || []).map(mapBooking);
    },
    enabled: !!user,
  });

  const { data: myTrips, isLoading: loadingTrips } = useQuery<TripWithDriver[]>({
    queryKey: ['my-created-trips', user?.id],
    queryFn: async () => {
      if (!user) return [];
      // First get driver ID
      const { data: driver, error: driverError } = await supabase
        .from('drivers')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!driver) return []; // Not a driver

      const { data, error } = await supabase
        .from('trips')
        .select('*, driver:drivers(*, user:users(*))')
        .eq('driver_id', driver.id)
        .order('departure_time', { ascending: false });

      if (error) throw error;
      return (data || []).map(mapTrip);
    },
    enabled: !!user,
  });

  // Get unread message counts for all bookings
  const bookingTrips = bookings?.map(b => ({
    tripId: b.trip.id,
    otherUserId: b.trip.driver.userId,
  })) || [];

  const myTripsList = myTrips?.map(t => ({
    tripId: t.id,
    otherUserId: '', // Will be populated per passenger
  })) || [];

  const unreadCounts = useUnreadMessagesForTrips(bookingTrips);

  const cancelBookingMutation = useMutation({
    mutationFn: async (bookingId: string) => {
      // 1. Update booking status
      const { data: booking, error: bookingError } = await supabase
        .from('bookings')
        .update({ status: 'cancelled' })
        .eq('id', bookingId)
        .select()
        .single();

      if (bookingError) throw bookingError;

      // 2. Increment available seats (Optimistic: assume it succeeds)
      const seats = booking.seats_booked;
      const tripId = booking.trip_id;

      const { data: trip } = await supabase.from('trips').select('available_seats').eq('id', tripId).single();
      if (trip) {
        await supabase.from('trips').update({ available_seats: trip.available_seats + seats }).eq('id', tripId);
      }
      return booking;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-bookings'] });
    },
  });

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      upcoming: 'bg-primary/10 text-primary',
      ongoing: 'bg-success/10 text-success',
      completed: 'bg-muted text-muted-foreground',
      cancelled: 'bg-destructive/10 text-destructive',
      confirmed: 'bg-success/10 text-success',
      pending: 'bg-warning/10 text-warning',
      payment_pending: 'bg-warning/10 text-warning',
      rejected: 'bg-destructive/10 text-destructive',
    };
    return colors[status] || 'bg-muted text-muted-foreground';
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="container mx-auto px-6 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="bookings" data-testid="tab-bookings">My Bookings</TabsTrigger>
            <TabsTrigger value="trips" data-testid="tab-trips">My Trips</TabsTrigger>
          </TabsList>

          <TabsContent value="bookings" className="mt-6">
            {loadingBookings ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">Loading your bookings...</p>
              </div>
            ) : bookings && bookings.length > 0 ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {bookings.map((booking) => (
                  <Card key={booking.id} className="p-6 hover-elevate" data-testid={`booking-card-${booking.id}`}>
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <Badge className={getStatusColor(booking.status)}>
                          {booking.status}
                        </Badge>
                      </div>
                      <div className="text-right">
                        <div className="text-xl font-bold">₹{booking.totalAmount}</div>
                        <div className="text-xs text-muted-foreground">{booking.seatsBooked} seat(s)</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 mb-4">
                      <Avatar className="w-12 h-12">
                        <AvatarImage src={booking.trip.driver.user.profilePhoto || undefined} />
                        <AvatarFallback>{booking.trip.driver.user.fullName.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-semibold">{booking.trip.driver.user.fullName}</div>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Star className="w-3 h-3 fill-warning text-warning" />
                          <span>{booking.trip.driver.rating}</span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2 mb-4">
                      <div className="flex items-start gap-2 text-sm">
                        <MapPin className="w-4 h-4 text-success mt-0.5 flex-shrink-0" />
                        <span>{booking.trip.pickupLocation}</span>
                      </div>
                      <div className="flex items-start gap-2 text-sm">
                        <MapPin className="w-4 h-4 text-destructive mt-0.5 flex-shrink-0" />
                        <span>{booking.trip.dropLocation}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="w-4 h-4" />
                        <span>{format(new Date(booking.trip.departureTime), 'MMM dd, yyyy • hh:mm a')}</span>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        className="relative"
                        onClick={() => setChatState({
                          isOpen: true,
                          tripId: booking.trip.id,
                          otherUserId: booking.trip.driver.userId,
                          otherUserName: booking.trip.driver.user.fullName,
                          otherUserPhoto: booking.trip.driver.user.profilePhoto || undefined,
                        })}
                      >
                        <MessageCircle className="w-4 h-4" />
                        {unreadCounts[booking.trip.id] > 0 && (
                          <Badge className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 text-[10px]">
                            {unreadCounts[booking.trip.id]}
                          </Badge>
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        className="flex-1"
                        onClick={() => navigate(`/trip/${booking.trip.id}`)}
                        data-testid={`button-view-trip-${booking.id}`}
                      >
                        View Trip
                      </Button>
                      {booking.status === 'payment_pending' && (
                        <Button
                          className="flex-1"
                          onClick={() => navigate(`/payment/${booking.id}`)}
                          data-testid={`button-pay-now-${booking.id}`}
                        >
                          Pay Now
                        </Button>
                      )}
                      {booking.status === 'confirmed' && new Date(booking.trip.departureTime) < new Date() && (
                        <Button
                          className="flex-1"
                          variant="secondary"
                          onClick={() => setRatingBooking(booking)}
                        >
                          Rate Driver
                        </Button>
                      )}
                      {(booking.status === 'confirmed' || booking.status === 'pending') && new Date(booking.trip.departureTime) > new Date() && (
                        <Button
                          className="flex-1"
                          variant="destructive"
                          onClick={() => cancelBookingMutation.mutate(booking.id)}
                          disabled={cancelBookingMutation.isPending}
                        >
                          Cancel Booking
                        </Button>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="p-12 text-center">
                <Users className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">No bookings yet</h3>
                <p className="text-muted-foreground mb-6">
                  Start your journey by booking a ride
                </p>
                <Button onClick={() => navigate('/search')} data-testid="button-find-ride">
                  Find a Ride
                </Button>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="trips" className="mt-6">
            {loadingTrips ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">Loading your trips...</p>
              </div>
            ) : myTrips && myTrips.length > 0 ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {myTrips.map((trip) => (
                  <Card key={trip.id} className="p-6 hover-elevate" data-testid={`trip-card-${trip.id}`}>
                    <div className="flex items-start justify-between mb-4">
                      <Badge className={getStatusColor(trip.status)}>
                        {trip.status}
                      </Badge>
                      <div className="text-right">
                        <div className="text-xl font-bold">₹{trip.pricePerSeat}</div>
                        <div className="text-xs text-muted-foreground">per seat</div>
                      </div>
                    </div>

                    <div className="space-y-2 mb-4">
                      <div className="flex items-start gap-2 text-sm">
                        <MapPin className="w-4 h-4 text-success mt-0.5 flex-shrink-0" />
                        <span className="font-medium">{trip.pickupLocation}</span>
                      </div>
                      <div className="flex items-start gap-2 text-sm">
                        <MapPin className="w-4 h-4 text-destructive mt-0.5 flex-shrink-0" />
                        <span className="font-medium">{trip.dropLocation}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="w-4 h-4" />
                        <span>{format(new Date(trip.departureTime), 'MMM dd, yyyy • hh:mm a')}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Users className="w-4 h-4" />
                        <span>{trip.availableSeats} of {trip.totalSeats} seats available</span>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        className="flex-1"
                        onClick={() => navigate(`/trip/${trip.id}`)}
                        data-testid={`button-view-${trip.id}`}
                      >
                        View Details
                      </Button>
                      {trip.status === 'ongoing' && (
                        <Button
                          className="flex-1"
                          onClick={() => navigate(`/track/${trip.id}`)}
                          data-testid={`button-track-${trip.id}`}
                        >
                          Track Live
                        </Button>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="p-12 text-center">
                <MapPin className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">No trips created yet</h3>
                <p className="text-muted-foreground mb-6">
                  Become a driver and start offering rides
                </p>
                <Button onClick={() => navigate('/create-trip')} data-testid="button-create-first-trip">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Your First Trip
                </Button>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {ratingBooking && (
        <RatingModal
          isOpen={!!ratingBooking}
          onClose={() => setRatingBooking(null)}
          tripId={ratingBooking.trip.id}
          driverId={ratingBooking.trip.driver.user.id}
          driverName={ratingBooking.trip.driver.user.fullName}
        />
      )}

      <ChatDialog
        isOpen={chatState.isOpen}
        onClose={() => setChatState(prev => ({ ...prev, isOpen: false }))}
        tripId={chatState.tripId}
        otherUserId={chatState.otherUserId}
        otherUserName={chatState.otherUserName}
        otherUserPhoto={chatState.otherUserPhoto}
      />
    </div>
  );
}
