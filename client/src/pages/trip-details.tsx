import { useState, useEffect, useRef } from 'react';
import { useLocation, useRoute } from 'wouter';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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
import { LocationAutocomplete } from '@/components/LocationAutocomplete';
import { MapView } from '@/components/MapView';
import { LiveDriveStats } from '@/components/LiveDriveStats';
import { locationTrackingService } from '@/lib/location-tracking'; // Added import
import { useToast } from '@/hooks/use-toast';
import { queryClient } from '@/lib/queryClient';
import { ArrowLeft, Calendar, MapPin, Users, Star, Car, Check, X, Shield, Play, Square, ThumbsUp, Eye, Edit2, DollarSign, Share2, AlertTriangle, Phone, Navigation } from 'lucide-react';
import { RatingModal } from '@/components/RatingModal';
import { ReviewsList } from '@/components/ReviewsList';
import { EditTripModal } from '@/components/EditTripModal';
import { TripWithDriver } from '@shared/schema';
import { format } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { mapTrip } from '@/lib/mapper';
import { ChatDialog } from '@/components/ChatDialog';
import { MessageCircle } from 'lucide-react';
import { useUnreadMessages } from '@/hooks/useUnreadMessages';
import { Navbar } from '@/components/Navbar';
import { DriverVerification } from '@/components/DriverVerification';
import { TipDriver } from '@/components/TipDriver';
import { TripReplay } from '@/components/TripReplay';
import { RealDriverTracker } from '@/components/RealDriverTracker';
import { RidePreferences } from '@/components/RidePreferences';
import { SplitFare } from '@/components/SplitFare';
import { ShareRideStatus } from '@/components/ShareRideStatus';
import { MultiPaymentSelector } from '@/components/MultiPaymentSelector';
import { RideInsuranceInfo } from '@/components/RideInsuranceInfo';
import { SafetyTips } from '@/components/SafetyTips';
import { RideSharingInvite } from '@/components/RideSharingInvite';
import { RidePreference } from '@/components/RidePreferences';
import { FareBreakdown } from '@/components/FareBreakdown';
import { PaymentReceipt } from '@/components/PaymentReceipt';
import { PromoCodeInput } from '@/components/PromoCodeInput';
import { PromoCode } from '@/lib/promo-service';
import { applyPromoCode, calculateFare, formatCurrency } from '@/lib/fareCalculator';
import { processAutoPayments } from '@/lib/auto-pay';
import { useTranslation } from 'react-i18next';

export default function TripDetails() {
  const { t } = useTranslation();
  const [, navigate] = useLocation();
  const [, params] = useRoute('/trip/:id');
  const { toast } = useToast();
  const { user } = useAuth();
  const tripId = params?.id;

  const [seatsToBook, setSeatsToBook] = useState(1);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [showReviewsModal, setShowReviewsModal] = useState(false);
  const [showEditTripModal, setShowEditTripModal] = useState(false);
  const [showDriverVerification, setShowDriverVerification] = useState(false);
  const [showTripReplay, setShowTripReplay] = useState(false);

  const [paymentMethod, setPaymentMethod] = useState<any>({ type: 'cash' });
  const [tipAmount, setTipAmount] = useState(0);


  const [customPickup, setCustomPickup] = useState('');
  const [customDrop, setCustomDrop] = useState('');
  const [appliedPromo, setAppliedPromo] = useState<PromoCode | null>(null);
  const [discount, setDiscount] = useState(0);
  const [selectedPreferences, setSelectedPreferences] = useState<RidePreference>({
    music_allowed: true,
    pet_friendly: false,
    luggage_capacity: 1,
    ac_preferred: true,
  });
  const [showInviteDialog, setShowInviteDialog] = useState(false);

  const [chatState, setChatState] = useState<{
    isOpen: boolean;
    otherUserId: string;
    otherUserName: string;
    otherUserPhoto?: string;
  }>({
    isOpen: false,
    otherUserId: '',
    otherUserName: '',
  });

  const { data: bookings } = useQuery({
    queryKey: ['trip-bookings', tripId],
    queryFn: async () => {
      if (!tripId) return [];
      const { data, error } = await supabase
        .from('bookings')
        .select('*, passenger:users(*)')
        .eq('trip_id', tripId);

      if (error) throw error;
      return data;
    },
    enabled: !!tripId && !!user,
  });

  const myBooking = bookings?.find((b: any) => b.passenger_id === user?.id);

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

  const [driverLocation, setDriverLocation] = useState<{ lat: number; lng: number; speed?: number; heading?: number } | null>(null);

  // Subscribe to real-time location updates
  useEffect(() => {
    if (!tripId) return;

    // Subscribe using the service
    const unsubscribe = locationTrackingService.subscribeToTrip({
      tripId,
      onUpdate: (location) => {
        setDriverLocation(location);
      },
      onError: (error) => {
        console.error('Location tracking error:', error);
      }
    });

    // Also fetch initial location
    locationTrackingService.getCurrentLocation(tripId).then(loc => {
      if (loc) setDriverLocation(loc);
    });

    return () => {
      unsubscribe();
    };
  }, [tripId]);

  // Set default values when trip loads
  useEffect(() => {
    if (trip) {
      setCustomPickup(trip.pickupLocation);
      setCustomDrop(trip.dropLocation);
    }
  }, [trip]);

  // Handle Promo Code from URL
  const searchParams = new URLSearchParams(window.location.search);
  const promoFromUrl = searchParams.get('promoCode') || undefined;

  const isDriver = user?.id === trip?.driver.userId;

  // Get unread message count for passenger (when not driver)
  const unreadCount = useUnreadMessages({
    tripId: trip?.id || '',
    otherUserId: trip?.driver.userId || '',
    enabled: !isDriver && !!trip,
  });

  const bookingMutation = useMutation({
    mutationFn: async (data: { tripId: string; seatsBooked: number; paymentMethod: any }) => {
      if (!user) throw new Error("Must be logged in");

      // Calculate amount (Fare + 5% Platform Fee) - Discount
      const basePrice = (parseInt(trip?.pricePerSeat.toString() || '0') * data.seatsBooked);
      const priceWithPlatform = basePrice * 1.05;
      const finalAmount = Math.max(0, priceWithPlatform - discount);

      // Handle Wallet Payment
      if (data.paymentMethod.id === 'wallet') {
        const { data: wallet, error: walletError } = await supabase
          .from('wallets')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (walletError) throw new Error("Could not fetch wallet balance");

        if (parseFloat(wallet.balance) < finalAmount) {
          throw new Error("Insufficient wallet balance. Please add money or choose another method.");
        }

        // Deduct from wallet
        const { error: updateError } = await supabase
          .from('wallets')
          .update({ balance: parseFloat(wallet.balance) - finalAmount })
          .eq('id', wallet.id);

        if (updateError) throw new Error("Wallet transaction failed");

        // Record transaction
        await supabase.from('wallet_transactions').insert({
          wallet_id: wallet.id,
          type: 'debit',
          amount: finalAmount,
          description: `Payment for trip #${data.tripId.slice(0, 8)}`,
          status: 'completed',
          reference_id: data.tripId
        });
      }

      // 1. Create booking
      const bookingData = {
        trip_id: data.tripId,
        passenger_id: user.id,
        seats_booked: data.seatsBooked,
        total_amount: finalAmount,
        status: 'confirmed',
        payment_status: data.paymentMethod.id === 'wallet' ? 'paid' : 'pending',
        payment_method: data.paymentMethod.id,
        pickup_location: customPickup || trip?.pickupLocation,
        drop_location: customDrop || trip?.dropLocation,
        preferences: selectedPreferences, // Including preferences if table supports JSONB
      };

      const { data: booking, error: bookingError } = await supabase
        .from('bookings')
        .insert(bookingData)
        .select()
        .single();

      if (bookingError) throw bookingError;

      // Decrement available seats
      const { error: tripError } = await supabase
        .from('trips')
        .update({ available_seats: (trip?.availableSeats || 0) - data.seatsBooked })
        .eq('id', data.tripId);

      if (tripError) throw tripError;

      return booking;
    },
    onSuccess: (_, variables) => {
      toast({
        title: 'Booking Confirmed!',
        description: variables.paymentMethod.id === 'wallet'
          ? 'Payment successful. Have a safe ride!'
          : 'Your seat is reserved. Payment will be collected after the ride.',
      });
      queryClient.invalidateQueries({ queryKey: ['trip-details', tripId] });
      queryClient.invalidateQueries({ queryKey: ['my-bookings'] });
      // Clear promo logic
      setAppliedPromo(null);
      setDiscount(0);
      navigate('/my-trips');
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

      // If trip is being completed, update all confirmed bookings to payment_pending
      if (status === 'completed') {
        const { error: bookingError } = await supabase
          .from('bookings')
          .update({ status: 'payment_pending' })
          .eq('trip_id', tripId)
          .eq('status', 'confirmed');

        if (bookingError) {
          console.error('Failed to update booking statuses:', bookingError);
        }

        // Trigger auto-payments for eligible passengers
        await processAutoPayments(tripId!);
      }

      return data;
    },
    onSuccess: (_, status) => {
      toast({
        title: `Trip ${status === 'ongoing' ? 'Started' : 'Ended'}`,
        description: status === 'ongoing' ? 'Location sharing is active.' : 'Thank you for driving. Passengers will be notified to complete payment.',
      });
      queryClient.invalidateQueries({ queryKey: ['trip-details', tripId] });
      queryClient.invalidateQueries({ queryKey: ['my-bookings'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Update failed',
        description: error.message || 'Please try again',
        variant: 'destructive',
      });
    }
  });

  // Redirect to tracking page if trip is ongoing
  const handleTrackRide = () => {
    navigate(`/track/${tripId}`);
  };

  useEffect(() => {
    if (!isDriver && trip?.status === 'ongoing') {
      // Optional: auto-redirect passenger to tracking page if they just opened this
      // navigate(`/track/${tripId}`);
    }
  }, [isDriver, trip?.status, tripId]);

  // Auto-show driver verification for passengers when trip starts
  useEffect(() => {
    if (!isDriver && trip?.status === 'ongoing') {
      // Check if already verified in this session to avoid annoyance
      const isVerified = sessionStorage.getItem(`verified_driver_${trip.id}`);
      if (!isVerified) {
        setShowDriverVerification(true);
      }
    }
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

  // Handle legacy route (array) and new route (object)
  const routeData = Array.isArray(trip.route) ? { geometry: trip.route, waypoints: [] } : (trip.route as any);
  const routeGeometry = routeData?.geometry || [];
  const waypoints = routeData?.waypoints || [];

  const markers = [
    { id: 'pickup', coordinates: { lat: parseFloat(trip.pickupLat), lng: parseFloat(trip.pickupLng) }, color: '#22c55e', popup: trip.pickupLocation },
    ...waypoints.map((w: any, i: number) => ({
      id: `waypoint-${i}`,
      coordinates: w.coords,
      color: '#3b82f6',
      popup: `Stop ${i + 1}: ${w.location}`
    })),
    { id: 'drop', coordinates: { lat: parseFloat(trip.dropLat), lng: parseFloat(trip.dropLng) }, color: '#ef4444', popup: trip.dropLocation }
  ];

  const route = routeGeometry;

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
      paymentMethod,
    });
  };

  const baseTotalPrice = parseFloat(trip.pricePerSeat) * seatsToBook;

  // Update discount when seats or promo changes
  useEffect(() => {
    if (appliedPromo) {
      let newDiscount = 0;
      const totalFare = baseTotalPrice * 1.05; // Base + platform fee

      if (appliedPromo.discount_type === 'percentage') {
        newDiscount = (totalFare * appliedPromo.discount_value) / 100;
        if (appliedPromo.max_discount) {
          newDiscount = Math.min(newDiscount, appliedPromo.max_discount);
        }
      } else {
        newDiscount = appliedPromo.discount_value;
      }
      setDiscount(newDiscount);
    } else {
      setDiscount(0);
    }
  }, [seatsToBook, appliedPromo, trip]);

  const finalTotalPrice = Math.max(0, (baseTotalPrice * 1.05) - discount);

  const handleShareTrip = () => {
    if (!driver || !trip) return;
    const text = `I'm on a ride with ${driver.user.fullName} in a ${driver.vehicleColor} ${driver.vehicleModel} (${driver.vehiclePlate}). Track my ride: ${window.location.href}`;
    if (navigator.share) {
      navigator.share({
        title: 'My Ride Details',
        text: text,
        url: window.location.href
      }).catch(console.error);
    } else {
      navigator.clipboard.writeText(text);
      toast({ title: 'Ride details copied to clipboard' });
    }
  };

  const handleSOS = async () => {
    try {
      const { error } = await supabase.from('emergency_alerts').insert({
        trip_id: trip.id,
        user_id: user?.id,
        lat: driverLocation?.lat.toString() || trip.pickupLat,
        lng: driverLocation?.lng.toString() || trip.pickupLng,
        status: 'triggered'
      });

      if (error) throw error;

      toast({
        title: "Emergency Alert Sent",
        description: "Your emergency contacts and the police control room have been notified with your live location.",
        variant: "destructive",
        duration: 5000
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

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

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
                <button
                  className="flex items-center gap-2 mb-2 hover:bg-muted p-1 rounded transition-colors"
                  onClick={() => setShowReviewsModal(true)}
                >
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 fill-warning text-warning" />
                    <span className="font-medium">{driver.rating}</span>
                  </div>
                  <span className="text-muted-foreground">•</span>
                  <span className="text-muted-foreground">{driver.totalTrips} trips</span>
                  <Eye className="w-3 h-3 text-muted-foreground ml-1" />
                </button>

                {driver.verificationStatus === 'verified' && (
                  <Badge variant="outline" className="gap-1">
                    <Check className="w-3 h-3 text-success" />
                    Verified Driver
                  </Badge>
                )}
                {!isDriver && (
                  <Button
                    variant="outline"
                    className="mt-4 w-full gap-2 relative"
                    onClick={() => setChatState({
                      isOpen: true,
                      otherUserId: driver.userId,
                      otherUserName: driver.user.fullName,
                      otherUserPhoto: driver.user.profilePhoto || undefined
                    })}
                  >
                    <MessageCircle className="w-4 h-4" />
                    {t('trip.chat')}
                    {unreadCount > 0 && (
                      <Badge className="ml-auto h-5 min-w-5 flex items-center justify-center p-1 text-[10px]">
                        {unreadCount}
                      </Badge>
                    )}
                  </Button>
                )}
              </div>

              <div className="text-right">
                <div className="text-3xl font-bold text-primary flex items-center justify-end gap-2" data-testid="text-trip-price">
                  {trip.surgeMultiplier && trip.surgeMultiplier > 1 && (
                    <div className="flex flex-col items-end">
                      <span className="text-xs font-medium text-warning bg-warning/10 px-2 py-1 rounded inline-flex items-center gap-1">
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" /></svg>
                        High Demand
                      </span>
                    </div>
                  )}
                  ₹{trip.pricePerSeat}
                </div>
                <div className="text-sm text-muted-foreground">per seat</div>

                {trip.status === 'ongoing' && (isDriver || myBooking) && (
                  <Button
                    className="mt-2 w-full animate-pulse gap-2"
                    onClick={handleTrackRide}
                    variant="secondary"
                  >
                    <Navigation className="w-4 h-4" />
                    Track Live Ride
                  </Button>
                )}
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

          {/* Ride Insurance Info */}
          {!isDriver && (
            <RideInsuranceInfo
              tripId={trip.id}
              insuranceCoverage={500000}
              policyNumber={`INS-${trip.id.slice(0, 8).toUpperCase()}`}
            />
          )}

          {/* Trip Replay for Completed Trips */}
          {trip.status === 'completed' && (
            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-lg mb-1">Trip Replay</h3>
                  <p className="text-sm text-muted-foreground">Watch a replay of your journey</p>
                </div>
                <Button onClick={() => setShowTripReplay(true)} variant="outline" className="gap-2">
                  <Play className="w-4 h-4" />
                  Watch Replay
                </Button>
              </div>

              <Dialog open={showTripReplay} onOpenChange={setShowTripReplay}>
                <DialogContent className="max-w-4xl h-[80vh] flex flex-col p-0 gap-0">
                  <DialogHeader className="p-4 border-b shrink-0">
                    <DialogTitle>Trip Replay</DialogTitle>
                    <DialogDescription>
                      Watch an animated replay of your completed journey
                    </DialogDescription>
                  </DialogHeader>
                  <div className="flex-1 relative bg-gray-100 overflow-hidden">
                    <TripReplay
                      tripId={trip.id}
                      route={route}
                      startTime={trip.departureTime}
                      endTime={new Date(new Date(trip.departureTime).getTime() + (typeof trip.duration === 'string' ? parseFloat(trip.duration) : trip.duration) * 60000).toISOString()}
                      pickupLocation={trip.pickupLocation}
                      dropLocation={trip.dropLocation}
                      duration={typeof trip.duration === 'string' ? parseFloat(trip.duration) : trip.duration}
                      distance={typeof trip.distance === 'string' ? parseFloat(trip.distance) : trip.distance}
                    />
                  </div>
                </DialogContent>
              </Dialog>
            </Card>
          )}

          {!isDriver && trip.status === 'upcoming' && (
            <SafetyTips />
          )}

          {/* Ride Actions (Share, Split, SOS) */}
          {!isDriver && (trip.status === 'upcoming' || trip.status === 'ongoing') && (
            <Card className="p-4 space-y-3">
              <h3 className="font-semibold text-sm mb-2">Ride Actions</h3>
              <div className="grid grid-cols-2 gap-3">
                <ShareRideStatus
                  tripId={trip.id}
                  driverName={driver.user.fullName}
                  vehicleNumber={driver.vehiclePlate}
                  pickupLocation={trip.pickupLocation}
                  dropLocation={trip.dropLocation}
                  estimatedArrival={format(new Date(new Date(trip.departureTime).getTime() + (typeof trip.duration === 'string' ? parseFloat(trip.duration) : trip.duration) * 60000), 'hh:mm a')}
                  className="w-full"
                />

                {myBooking && (
                  <SplitFare
                    bookingId={myBooking.id}
                    totalAmount={myBooking.total_amount || 0}
                    className="w-full"
                  />
                )}

                <Button variant="outline" className="w-full gap-2" onClick={() => setShowInviteDialog(true)}>
                  <Users className="w-4 h-4" />
                  Invite Friends
                </Button>
              </div>

              {trip.status === 'ongoing' && (
                <div className="pt-2">
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" className="w-full gap-2 shadow-sm animate-pulse hover:animate-none">
                        <AlertTriangle className="w-4 h-4" /> {t('trip.sos')}
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
                </div>
              )}
            </Card>
          )}

          {/* Invite Friends Dialog */}
          <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Invite Friends to Share Ride</DialogTitle>
                <DialogDescription>
                  Split the fare by inviting colleagues or friends to join your ride
                </DialogDescription>
              </DialogHeader>
              <RideSharingInvite
                tripId={trip.id}
                totalFare={myBooking ? parseFloat(myBooking.total_amount.toString()) : parseFloat(trip.pricePerSeat)}
                onInvitesSent={() => setShowInviteDialog(false)}
              />
            </DialogContent>
          </Dialog>

          {/* Fare Breakdown for Passengers */}
          {/*!Fare Breakdown for Passengers!*/}
          {!isDriver && (
            <FareBreakdown
              {...(() => {
                const breakdown = calculateFare(
                  'car', // Defaulting to car as vehicle type isn't strictly typed in trip yet
                  typeof trip.distance === 'string' ? parseFloat(trip.distance) : trip.distance,
                  typeof trip.duration === 'string' ? parseFloat(trip.duration) : trip.duration,
                  trip.surgeMultiplier || 1
                );
                return {
                  baseFare: breakdown.baseFare,
                  distanceCharges: breakdown.distanceCharge,
                  timeCharges: breakdown.timeCharge,
                  surgeCharges: breakdown.surgePricing,
                  platformFee: breakdown.platformFee,
                  gst: breakdown.gst,
                  discount: discount,
                  totalFare: Math.max(0, breakdown.totalFare - discount),
                  className: "border-primary/20"
                };
              })()}
            />
          )}

          {isDriver ? (
            <>
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
                      {t('trip.start_trip')}
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
                      {t('trip.end_trip')}
                    </Button>
                  ) : (
                    <div className="p-4 bg-muted rounded-lg text-center font-medium">
                      Trip {trip.status}
                    </div>
                  )}

                  {(trip.status === 'confirmed' || trip.status === 'upcoming') && (
                    <>
                      <Button
                        size="lg"
                        variant="outline"
                        className="w-full gap-2"
                        onClick={() => setShowEditTripModal(true)}
                      >
                        <Edit2 className="w-4 h-4" />
                        Edit Trip Details
                      </Button>
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
                    </>
                  )}
                </div>
              </Card>

              {/* Passenger List for Driver */}
              {isDriver && bookings && bookings.length > 0 && (
                <Card className="p-6">
                  <h3 className="font-semibold mb-4 flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    Passengers ({bookings.length})
                  </h3>
                  <div className="space-y-4">
                    {bookings.map((booking: any) => (
                      <div key={booking.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                        <div className="flex items-center gap-3">
                          <Avatar className="w-10 h-10">
                            <AvatarImage src={booking.passenger?.profile_photo} />
                            <AvatarFallback>{booking.passenger?.full_name?.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium">{booking.passenger?.full_name}</div>
                            <div className="text-sm text-muted-foreground">
                              {booking.seats_booked} seat(s) • <span className="capitalize">{booking.status}</span>
                            </div>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setChatState({
                            isOpen: true,
                            otherUserId: booking.passenger_id,
                            otherUserName: booking.passenger.full_name,
                            otherUserPhoto: booking.passenger.profile_photo
                          })}
                        >
                          <MessageCircle className="w-4 h-4 text-primary" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </Card>
              )}
            </>
          ) : (
            <Card className="p-6">
              <h3 className="font-semibold mb-4">Book Your Seats</h3>

              <div className="space-y-4">
                {/* Custom Location Inputs */}
                <div className="space-y-3">
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1.5 block">Pickup Location</Label>
                    <LocationAutocomplete
                      value={customPickup}
                      onChange={(val) => setCustomPickup(val)}
                      placeholder="Enter pickup location"
                      className="h-9 text-sm"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1.5 block">Drop Location</Label>
                    <LocationAutocomplete
                      value={customDrop}
                      onChange={(val) => setCustomDrop(val)}
                      placeholder="Enter drop location"
                      className="h-9 text-sm"
                    />
                  </div>
                </div>

                <Separator />

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

                {/* Ride Preferences for the Passenger to Set */}
                <div className="py-2">
                  <RidePreferences
                    showSaveButton={false}
                    className="border-0 shadow-none p-0"
                    onPreferencesChange={(prefs) => setSelectedPreferences(prefs)}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between text-lg">
                  <div className="flex flex-col">
                    <span className="font-medium">Total Amount</span>
                    {discount > 0 && (
                      <span className="text-sm text-success">
                        (Includes ₹{discount.toFixed(2)} discount)
                      </span>
                    )}
                  </div>
                  <span className="text-2xl font-bold text-primary" data-testid="text-total-price">
                    ₹{finalTotalPrice.toFixed(2)}
                  </span>
                </div>



                <Separator />

                <PromoCodeInput
                  onPromoApplied={(promo) => setAppliedPromo(promo)}
                  onPromoRemoved={() => {
                    setAppliedPromo(null);
                    setDiscount(0);
                  }}
                  defaultCode={promoFromUrl}
                  className="border-0 shadow-none p-0"
                />

                <Separator />

                <div className="py-2">
                  <MultiPaymentSelector
                    amount={finalTotalPrice}
                    onPaymentMethodSelect={(method) => setPaymentMethod(method)}
                    selectedMethod={paymentMethod}
                  />
                </div>

                <Button
                  size="lg"
                  className="w-full"
                  onClick={handleBookTrip}
                  disabled={bookingMutation.isPending || trip.availableSeats === 0 || (trip.status !== 'upcoming' && trip.status !== 'confirmed')}
                  data-testid="button-confirm-booking"
                >
                  {bookingMutation.isPending ? 'Booking...' : trip.availableSeats === 0 ? 'Sold Out' : 'Confirm & Pay'}
                </Button>
              </div>
            </Card>
          )}

          {/* Ride Sharing Invite Section */}
          {!isDriver && trip.status !== 'completed' && trip.status !== 'cancelled' && (
            <div className="mt-6">
              <RideSharingInvite
                tripId={trip.id}
                totalFare={parseFloat(trip.pricePerSeat) * seatsToBook}
              />
            </div>
          )}

          {/* Rating Modal */}
          {trip && (
            <>
              <RatingModal
                isOpen={showRatingModal}
                onClose={() => setShowRatingModal(false)}
                tripId={trip.id}
                driverId={trip.driver.userId}
                driverName={driver.user.fullName}
              />
              <ReviewsList
                isOpen={showReviewsModal}
                onClose={() => setShowReviewsModal(false)}
                userId={trip.driver.userId}
                userName={driver.user.fullName}
              />
              <EditTripModal
                isOpen={showEditTripModal}
                onClose={() => setShowEditTripModal(false)}
                trip={trip}
              />
              <ChatDialog
                isOpen={chatState.isOpen}
                onClose={() => setChatState(prev => ({ ...prev, isOpen: false }))}
                tripId={trip.id}
                otherUserId={chatState.otherUserId}
                otherUserName={chatState.otherUserName}
                otherUserPhoto={chatState.otherUserPhoto}
              />

              {showDriverVerification && !isDriver && trip.status === 'ongoing' && (
                <DriverVerification
                  driver={driver}
                  onVerified={() => {
                    setShowDriverVerification(false);
                    sessionStorage.setItem(`verified_driver_${trip.id}`, 'true');
                  }}
                  onReportMismatch={() => {
                    setShowDriverVerification(false);
                    toast({
                      title: 'Mismatch Reported',
                      description: 'Our support team will contact you shortly',
                      variant: 'destructive',
                    });
                  }}
                />
              )}
            </>
          )}

          {!isDriver && trip.status === 'completed' && (
            <Card className="p-6 mt-6">
              <h3 className="font-semibold mb-4">Trip Completed</h3>
              <p className="text-muted-foreground mb-4">
                This trip has ended. How was your ride?
              </p>
              <div className="space-y-3">
                <Button
                  className="w-full gap-2"
                  onClick={() => setShowRatingModal(true)}
                >
                  <ThumbsUp className="w-4 h-4" />
                  Rate Driver
                </Button>

                <TipDriver
                  driverName={driver.user.fullName}
                  onTipSelected={async (amount) => {
                    setTipAmount(amount);
                    try {
                      // Check wallet balance
                      const { data: wallet, error: walletError } = await supabase
                        .from('wallets')
                        .select('id, balance')
                        .eq('user_id', user!.id)
                        .single();

                      if (walletError || !wallet) throw new Error("Wallet not found");

                      const balance = parseFloat(wallet.balance);
                      if (balance < amount) {
                        toast({
                          title: "Insufficient Balance",
                          description: "Please add money to your wallet to tip.",
                          variant: "destructive"
                        });
                        return;
                      }

                      // Deduct from wallet
                      await supabase.from('wallets').update({ balance: balance - amount }).eq('id', wallet.id);

                      // Create transaction
                      await supabase.from('wallet_transactions').insert({
                        wallet_id: wallet.id,
                        type: 'debit',
                        amount: amount,
                        description: `Tip for Driver ${driver.user.fullName}`,
                        status: 'completed',
                        reference_id: trip.id
                      });

                      // Credit to driver (Optional: In a real app we'd add to driver wallet too, but let's just record the tip)
                      await supabase.from('driver_tips').insert({
                        trip_id: trip.id,
                        amount: amount,
                        payer_id: user!.id,
                        driver_id: trip.driver.id
                      });

                      toast({
                        title: `Tip of ₹${amount} sent!`,
                        description: 'Thank you for your generosity!',
                      });
                    } catch (e: any) {
                      console.error('Tip failed:', e);
                      toast({
                        title: "Tip Failed",
                        description: e.message || "Could not process tip.",
                        variant: "destructive"
                      });
                    }
                  }}
                />

                <Button
                  variant="outline"
                  className="w-full gap-2"
                  onClick={() => setShowTripReplay(true)}
                >
                  <Play className="w-4 h-4" />
                  View Trip Replay
                </Button>

                {(() => {
                  const breakdown = calculateFare(
                    'car', // Defaulting to car as vehicle type isn't strictly typed in trip yet
                    typeof trip.distance === 'string' ? parseFloat(trip.distance) : trip.distance,
                    typeof trip.duration === 'string' ? parseFloat(trip.duration) : trip.duration,
                    trip.surgeMultiplier || 1
                  );
                  return (
                    <PaymentReceipt
                      bookingId={myBooking?.id || ''}
                      tripDate={new Date(trip.departureTime)}
                      driverName={driver.user.fullName}
                      vehicleNumber={driver.vehiclePlate}
                      pickupLocation={trip.pickupLocation}
                      dropLocation={trip.dropLocation}
                      distance={typeof trip.distance === 'string' ? parseFloat(trip.distance) : trip.distance}
                      duration={typeof trip.duration === 'string' ? parseFloat(trip.duration) : trip.duration}
                      baseFare={breakdown.baseFare}
                      distanceCharge={breakdown.distanceCharge}
                      timeCharge={breakdown.timeCharge}
                      surgePricing={breakdown.surgePricing}
                      platformFee={breakdown.platformFee}
                      gst={breakdown.gst}
                      totalFare={myBooking?.total_amount ? parseFloat(myBooking.total_amount.toString()) : 0}
                      paymentMethod={paymentMethod?.type?.toUpperCase() || 'WALLET'}
                      paymentId={`TXN-${myBooking?.id?.slice(0, 8) || '0000'}`}
                    />
                  );
                })()}

                {myBooking && (
                  <SplitFare
                    bookingId={myBooking.id}
                    totalAmount={parseFloat(trip.pricePerSeat) * myBooking.seats_booked}
                    className="w-full gap-2"
                  />
                )}
              </div>
            </Card>
          )}

          {/* Trip Replay Modal - Moved to Dialog for better UX */}
          {/* We will handle this by rendering it over the map or in a dialog. For now, let's keep the logic here but cleaner. */}
          {showTripReplay && trip.status === 'completed' && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
              <div className="w-full max-w-4xl h-[80vh] bg-background rounded-xl shadow-2xl overflow-hidden relative flex flex-col">
                <TripReplay
                  tripId={trip.id}
                  route={route}
                  pickupLocation={trip.pickupLocation}
                  dropLocation={trip.dropLocation}
                  startTime={trip.departureTime}
                  endTime={new Date(new Date(trip.departureTime).getTime() + (typeof trip.duration === 'string' ? parseFloat(trip.duration) : trip.duration) * 60000).toISOString()}
                  distance={typeof trip.distance === 'string' ? parseFloat(trip.distance) : trip.distance}
                  duration={typeof trip.duration === 'string' ? parseFloat(trip.duration) : trip.duration}
                  onClose={() => setShowTripReplay(false)}
                  className="h-full w-full border-0"
                />
              </div>
            </div>
          )}


        </div>

        <div className="w-full lg:w-1/2 h-[50vh] lg:h-full border-t lg:border-t-0 lg:border-l relative">
          <MapView
            markers={markers}
            route={route}
            tripId={tripId}
          />

          {/* Live Drive Stats Overlay */}
          {trip.status === 'ongoing' && driverLocation && (
            <LiveDriveStats
              tripId={trip.id}
              driverLocation={driverLocation}
              pickupLocation={{ lat: parseFloat(trip.pickupLat), lng: parseFloat(trip.pickupLng) }}
              dropLocation={{ lat: parseFloat(trip.dropLat), lng: parseFloat(trip.dropLng) }}
              startTime={trip.departureTime}
              isDriver={isDriver}
            />
          )}

          {/* Real Driver Tracker for trip details page */}
          {isDriver && trip.status === 'ongoing' && (
            <RealDriverTracker
              tripId={trip.id}
              driverId={trip.driverId}
              isDriver={true}
              pickupLocation={{ lat: parseFloat(trip.pickupLat), lng: parseFloat(trip.pickupLng) }}
              dropLocation={{ lat: parseFloat(trip.dropLat), lng: parseFloat(trip.dropLng) }}
              onArrival={() => { }}
              onComplete={() => {
                updateStatusMutation.mutate('completed');
              }}
            />
          )}

        </div>
      </div>
    </div>
  );
}


