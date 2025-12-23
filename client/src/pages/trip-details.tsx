import { useState, useEffect, useRef } from 'react';
import { useLocation, useRoute } from 'wouter';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { MapView } from '@/components/MapView';
import { useToast } from '@/hooks/use-toast';
import { queryClient } from '@/lib/queryClient';
import { ArrowLeft, Calendar, MapPin, Users, Star, Car, Check, X, Shield, Play, Square, ThumbsUp } from 'lucide-react';
import { RatingModal } from '@/components/RatingModal';
import { TripWithDriver } from '@shared/schema';
import { format } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { mapTrip } from '@/lib/mapper';
import { locationTrackingService } from '@/lib/location-tracking';

export default function TripDetails() {
  const [, navigate] = useLocation();
  const [, params] = useRoute('/trip/:id');
  const { toast } = useToast();
  const { user } = useAuth();
  const tripId = params?.id;

  const [seatsToBook, setSeatsToBook] = useState(1);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const watchIdRef = useRef<number | null>(null);

  const { data: trip, isLoading } = useQuery<TripWithDriver>({
    queryKey: ['trip-details', tripId],
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

  const isDriver = user?.id === trip?.driver.userId;

  const bookingMutation = useMutation({
    mutationFn: async (data: { tripId: string; seatsBooked: number }) => {
      if (!user) throw new Error("Must be logged in");

      // 1. Create booking
      const bookingData = {
        trip_id: data.tripId,
        passenger_id: user.id,
        seats_booked: data.seatsBooked,
        // Calculate amount?
        total_amount: parseInt(trip?.pricePerSeat.toString() || '0') * data.seatsBooked,
        status: 'pending',
        pickup_location: trip?.pickupLocation,
        drop_location: trip?.dropLocation,
      };

      const { data: booking, error: bookingError } = await supabase
        .from('bookings')
        .insert(bookingData)
        .select()
        .single();

      if (bookingError) throw bookingError;

      return booking;
    },
    onSuccess: (data) => {
      toast({
        title: 'Booking initiated!',
        description: 'Proceeding to payment...',
      });
      queryClient.invalidateQueries({ queryKey: ['trip-details', tripId] });
      navigate(`/payment/${data.id}`);
    },
    onError: (error: any) => {
      toast({
        title: 'Booking failed',
        description: error.message || 'Please try again',
        variant: 'destructive',
      });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async (status: string) => {
      const { data, error } = await supabase
        .from('trips')
        .update({ status: status })
        .eq('id', tripId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, status) => {
      toast({
        title: `Trip ${status === 'ongoing' ? 'Started' : 'Ended'}`,
        description: status === 'ongoing' ? 'Location sharing is active.' : 'Thank you for driving.',
      });
      queryClient.invalidateQueries({ queryKey: ['trip-details', tripId] });
    },
    onError: (error: any) => {
      toast({
        title: 'Update failed',
        description: error.message || 'Please try again',
        variant: 'destructive',
      });
    }
  });

  useEffect(() => {
    if (!isDriver || !trip || trip.status !== 'ongoing') {
      locationTrackingService.stopTracking();
      return;
    }

    if (!navigator.geolocation) {
      toast({ title: 'Geolocation not supported', variant: 'destructive' });
      return;
    }

    // Start tracking using the service
    locationTrackingService.setUpdateInterval(5000);
    locationTrackingService.startTracking(
      trip.id,
      trip.driver.id,
      () => new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            resolve({
              lat: position.coords.latitude,
              lng: position.coords.longitude,
              heading: position.coords.heading || undefined,
              speed: position.coords.speed || undefined
            });
          },
          (error) => reject(error),
          { enableHighAccuracy: true }
        );
      })
    );

    // Also keep the broadcast for immediate realtime feel (optional, but service might handle it)
    // Actually, LocationTrackingService uses upsert to table, and track-trip.tsx listens to table changes.
    // So broadcast is redundant if we're using table changes.

    return () => {
      locationTrackingService.stopTracking();
    };
  }, [isDriver, trip?.status, trip?.id]);


  if (isLoading || !trip) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading trip details...</p>
        </div>
      </div>
    );
  }

  const driver = trip.driver;
  const departureDate = new Date(trip.departureTime);
  const markers = [
    { id: 'pickup', coordinates: { lat: parseFloat(trip.pickupLat), lng: parseFloat(trip.pickupLng) }, color: '#22c55e', popup: trip.pickupLocation },
    { id: 'drop', coordinates: { lat: parseFloat(trip.dropLat), lng: parseFloat(trip.dropLng) }, color: '#ef4444', popup: trip.dropLocation }
  ];
  const route = trip.route as any[];

  const handleBookTrip = () => {
    if (seatsToBook < 1 || seatsToBook > trip.availableSeats) {
      toast({
        title: 'Invalid seats',
        description: `Please select between 1 and ${trip.availableSeats} seats`,
        variant: 'destructive',
      });
      return;
    }

    bookingMutation.mutate({
      tripId: trip.id,
      seatsBooked: seatsToBook,
    });
  };

  const totalPrice = parseFloat(trip.pricePerSeat) * seatsToBook;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur">
        <div className="container mx-auto px-6 h-16 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => window.history.back()} data-testid="button-back">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-display font-bold">Trip Details</h1>
          {trip.status === 'ongoing' && (
            <Badge variant="destructive" className="ml-auto animate-pulse">
              ● LIVE
            </Badge>
          )}
        </div>
      </header>

      <div className="flex flex-col lg:flex-row lg:h-[calc(100vh-4rem)]">
        <div className="w-full lg:w-1/2 lg:h-full lg:overflow-y-auto p-6 space-y-6">
          <Card className="p-6">
            <div className="flex items-start gap-4 mb-6">
              <Avatar className="w-20 h-20">
                <AvatarImage src={driver.user.profilePhoto || undefined} />
                <AvatarFallback>{driver.user.fullName.charAt(0)}</AvatarFallback>
              </Avatar>

              <div className="flex-1">
                <h2 className="text-2xl font-bold mb-1" data-testid="text-driver-name">
                  {driver.user.fullName}
                </h2>
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 fill-warning text-warning" />
                    <span className="font-medium">{driver.rating}</span>
                  </div>
                  <span className="text-muted-foreground">•</span>
                  <span className="text-muted-foreground">{driver.totalTrips} trips</span>
                </div>

                {driver.verificationStatus === 'verified' && (
                  <Badge variant="outline" className="gap-1">
                    <Check className="w-3 h-3 text-success" />
                    Verified Driver
                  </Badge>
                )}
              </div>

              <div className="text-right">
                <div className="text-3xl font-bold text-primary" data-testid="text-trip-price">
                  ₹{trip.pricePerSeat}
                </div>
                <div className="text-sm text-muted-foreground">per seat</div>
              </div>
            </div>

            <Separator className="my-6" />

            <div className="space-y-4">
              <div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                  <Calendar className="w-4 h-4" />
                  <span>Departure</span>
                </div>
                <div className="text-lg font-semibold" data-testid="text-departure-time">
                  {format(departureDate, 'EEEE, MMMM dd, yyyy • hh:mm a')}
                </div>
              </div>

              <div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                  <MapPin className="w-4 h-4" />
                  <span>Route</span>
                </div>
                <div className="space-y-3 pl-6 border-l-2 border-primary/30">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-3 h-3 rounded-full bg-success border-2 border-background -ml-[1.4rem]" />
                      <span className="text-sm font-medium">Pickup</span>
                    </div>
                    <div className="font-semibold" data-testid="text-pickup-location">{trip.pickupLocation}</div>
                  </div>

                  <div className="text-sm text-muted-foreground pl-1">
                    {trip.distance} km • {trip.duration} min
                  </div>

                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-3 h-3 rounded-full bg-destructive border-2 border-background -ml-[1.4rem]" />
                      <span className="text-sm font-medium">Drop-off</span>
                    </div>
                    <div className="font-semibold" data-testid="text-drop-location">{trip.dropLocation}</div>
                  </div>
                </div>
              </div>

              <div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                  <Users className="w-4 h-4" />
                  <span>Available Seats</span>
                </div>
                <div className="text-lg font-semibold" data-testid="text-available-seats">
                  {trip.availableSeats} of {trip.totalSeats} seats
                </div>
              </div>

              <div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                  <Car className="w-4 h-4" />
                  <span>Vehicle</span>
                </div>
                <div className="text-lg font-semibold">
                  {driver.vehicleMake} {driver.vehicleModel} • {driver.vehicleColor}
                </div>
                <div className="text-sm text-muted-foreground mt-1">{driver.vehiclePlate}</div>
              </div>
            </div>
          </Card>

          {trip.preferences && Object.keys(trip.preferences).length > 0 && (
            <Card className="p-6">
              <h3 className="font-semibold mb-4">Trip Preferences</h3>
              <div className="flex flex-wrap gap-2">
                {trip.preferences.smoking !== undefined && (
                  <Badge variant={trip.preferences.smoking ? "default" : "secondary"}>
                    {trip.preferences.smoking ? <Check className="w-3 h-3 mr-1" /> : <X className="w-3 h-3 mr-1" />}
                    Smoking {trip.preferences.smoking ? 'allowed' : 'not allowed'}
                  </Badge>
                )}
                {trip.preferences.pets !== undefined && (
                  <Badge variant={trip.preferences.pets ? "default" : "secondary"}>
                    {trip.preferences.pets ? <Check className="w-3 h-3 mr-1" /> : <X className="w-3 h-3 mr-1" />}
                    Pets {trip.preferences.pets ? 'allowed' : 'not allowed'}
                  </Badge>
                )}
                {trip.preferences.music !== undefined && (
                  <Badge variant={trip.preferences.music ? "default" : "secondary"}>
                    {trip.preferences.music ? <Check className="w-3 h-3 mr-1" /> : <X className="w-3 h-3 mr-1" />}
                    Music {trip.preferences.music ? 'allowed' : 'not allowed'}
                  </Badge>
                )}
              </div>
            </Card>
          )}

          {driver.user.bio && (
            <Card className="p-6">
              <h3 className="font-semibold mb-3">About {driver.user.fullName.split(' ')[0]}</h3>
              <p className="text-muted-foreground">{driver.user.bio}</p>
            </Card>
          )}

          {isDriver ? (
            <Card className="p-6 border-primary/20 bg-primary/5">
              <h3 className="font-semibold mb-4 text-primary flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Trip Management
              </h3>

              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  {trip.status === 'ongoing'
                    ? "You are currently sharing your live location. Drive safely!"
                    : "Start the trip when you are ready to leave. This will enable live location tracking for passengers."}
                </p>

                {trip.status === 'confirmed' || trip.status === 'upcoming' ? (
                  <Button
                    size="lg"
                    className="w-full gap-2"
                    onClick={() => updateStatusMutation.mutate('ongoing')}
                    disabled={updateStatusMutation.isPending}
                  >
                    <Play className="w-4 h-4" />
                    Start Trip
                  </Button>
                ) : trip.status === 'ongoing' ? (
                  <Button
                    size="lg"
                    variant="destructive"
                    className="w-full gap-2"
                    onClick={() => updateStatusMutation.mutate('completed')}
                    disabled={updateStatusMutation.isPending}
                  >
                    <Square className="w-4 h-4" />
                    End Trip
                  </Button>
                ) : (
                  <div className="p-4 bg-muted rounded-lg text-center font-medium">
                    Trip {trip.status}
                  </div>
                )}

                {(trip.status === 'confirmed' || trip.status === 'upcoming') && (
                  <Button
                    size="lg"
                    variant="outline"
                    className="w-full gap-2 border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
                    onClick={() => updateStatusMutation.mutate('cancelled')}
                    disabled={updateStatusMutation.isPending}
                  >
                    <X className="w-4 h-4" />
                    Cancel Trip
                  </Button>
                )}
              </div>
            </Card>
          ) : (
            <Card className="p-6">
              <h3 className="font-semibold mb-4">Book Your Seats</h3>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="seats">Number of Seats</Label>
                  <div className="flex items-center gap-3 mt-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setSeatsToBook(Math.max(1, seatsToBook - 1))}
                      disabled={seatsToBook <= 1}
                      data-testid="button-decrease-seats"
                    >
                      -
                    </Button>
                    <Input
                      id="seats"
                      type="number"
                      min="1"
                      max={trip.availableSeats}
                      value={seatsToBook}
                      onChange={(e) => setSeatsToBook(parseInt(e.target.value) || 1)}
                      className="w-20 text-center"
                      data-testid="input-seats"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setSeatsToBook(Math.min(trip.availableSeats, seatsToBook + 1))}
                      disabled={seatsToBook >= trip.availableSeats}
                      data-testid="button-increase-seats"
                    >
                      +
                    </Button>
                  </div>
                </div>

                <Separator />

                <div className="flex items-center justify-between text-lg">
                  <span className="font-medium">Total Amount</span>
                  <span className="text-2xl font-bold text-primary" data-testid="text-total-price">
                    ₹{totalPrice.toFixed(2)}
                  </span>
                </div>

                <Button
                  size="lg"
                  className="w-full"
                  onClick={handleBookTrip}
                  disabled={bookingMutation.isPending || trip.availableSeats === 0 || trip.status !== 'upcoming' && trip.status !== 'confirmed'}
                  data-testid="button-confirm-booking"
                >
                  {bookingMutation.isPending ? 'Booking...' : trip.availableSeats === 0 ? 'Sold Out' : 'Proceed to Payment'}
                </Button>
              </div>
            </Card>
          )}

          {/* Rating Modal */}
          {trip && (
            <RatingModal
              isOpen={showRatingModal}
              onClose={() => setShowRatingModal(false)}
              tripId={trip.id}
              driverId={trip.driver.userId}
              driverName={driver.user.fullName}
            />
          )}

          {!isDriver && trip.status === 'completed' && (
            <Card className="p-6 mt-6">
              <h3 className="font-semibold mb-4">Trip Completed</h3>
              <p className="text-muted-foreground mb-4">
                This trip has ended. How was your ride?
              </p>
              <Button
                className="w-full gap-2"
                onClick={() => setShowRatingModal(true)}
              >
                <ThumbsUp className="w-4 h-4" />
                Rate Driver
              </Button>
            </Card>
          )}
        </div>

        <div className="w-full lg:w-1/2 h-[50vh] lg:h-full border-t lg:border-t-0 lg:border-l">
          <MapView
            markers={markers}
            route={route}
            tripId={tripId}
          />
        </div>
      </div>
    </div>
  );
}


