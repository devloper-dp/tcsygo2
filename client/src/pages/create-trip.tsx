import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { LocationAutocomplete } from '@/components/LocationAutocomplete';
import { MapView } from '@/components/MapView';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { getRoute, Coordinates } from '@/lib/mapbox';
import { ArrowLeft, MapPin, Calendar, Clock, Users, DollarSign, Route as RouteIcon } from 'lucide-react';
import { InsertTrip } from '@shared/schema';

export default function CreateTrip() {
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const [pickup, setPickup] = useState('');
  const [pickupCoords, setPickupCoords] = useState<Coordinates>();
  const [drop, setDrop] = useState('');
  const [dropCoords, setDropCoords] = useState<Coordinates>();
  const [departureDate, setDepartureDate] = useState('');
  const [departureTime, setDepartureTime] = useState('');
  const [seats, setSeats] = useState('4');
  const [pricePerSeat, setPricePerSeat] = useState('');
  const [preferences, setPreferences] = useState({
    smoking: false,
    pets: false,
    music: true
  });

  const [routeInfo, setRouteInfo] = useState<{ distance: number; duration: number; route: Coordinates[] }>();

  const { data: driverProfile, isLoading: isLoadingDriver } = useQuery<any>({
    queryKey: ['/api/drivers/my-profile'],
  });

  // Redirect if not a driver or not verified
  useEffect(() => {
    if (!isLoadingDriver && !driverProfile) {
      toast({
        title: "Driver Profile Required",
        description: "You need to complete driver onboarding before posting trips.",
        variant: "destructive"
      });
      navigate('/driver-onboarding');
    }
  }, [isLoadingDriver, driverProfile, navigate, toast]);

  const createTripMutation = useMutation({
    mutationFn: async (tripData: Partial<InsertTrip>) => {
      return await apiRequest('POST', '/api/trips', tripData);
    },
    onSuccess: () => {
      toast({
        title: 'Trip created successfully!',
        description: 'Your trip has been published and is now visible to passengers.',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/trips'] });
      navigate('/my-trips');
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to create trip',
        description: error.message || 'Please try again',
        variant: 'destructive',
      });
    },
  });

  const calculateRoute = async () => {
    if (!pickupCoords || !dropCoords) return;

    try {
      const route = await getRoute(pickupCoords, dropCoords);
      setRouteInfo({
        distance: route.distance,
        duration: route.duration,
        route: route.geometry
      });

      if (!pricePerSeat) {
        const estimatedPrice = Math.round(route.distance * 8);
        setPricePerSeat(estimatedPrice.toString());
      }
    } catch (error) {
      console.error('Error calculating route:', error);
    }
  };

  useEffect(() => {
    if (pickupCoords && dropCoords) {
      calculateRoute();
    }
  }, [pickupCoords, dropCoords]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!driverProfile) {
      toast({
        title: 'Driver profile not found',
        description: 'Please complete driver onboarding first.',
        variant: 'destructive',
      });
      navigate('/driver-onboarding');
      return;
    }

    if (!pickupCoords || !dropCoords || !routeInfo) {
      toast({
        title: 'Missing information',
        description: 'Please select valid pickup and drop locations',
        variant: 'destructive',
      });
      return;
    }

    const departureDateTime = new Date(`${departureDate}T${departureTime}`).toISOString();

    createTripMutation.mutate({
      driverId: driverProfile.id,
      pickupLocation: pickup,
      pickupLat: pickupCoords.lat.toString(),
      pickupLng: pickupCoords.lng.toString(),
      dropLocation: drop,
      dropLat: dropCoords.lat.toString(),
      dropLng: dropCoords.lng.toString(),
      departureTime: departureDateTime,
      distance: routeInfo.distance.toString(),
      duration: routeInfo.duration,
      pricePerSeat: pricePerSeat,
      availableSeats: parseInt(seats),
      totalSeats: parseInt(seats),
      route: routeInfo.route,
      preferences,
    } as any);
  };

  const markers = pickupCoords && dropCoords ? [
    { id: 'pickup', coordinates: pickupCoords, color: '#22c55e', popup: pickup },
    { id: 'drop', coordinates: dropCoords, color: '#ef4444', popup: drop }
  ] : [];

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur">
        <div className="container mx-auto px-6 h-16 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/')} data-testid="button-back">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-display font-bold">Create a Trip</h1>
        </div>
      </header>

      <div className="flex h-[calc(100vh-4rem)]">
        <div className="w-full lg:w-1/2 overflow-y-auto">
          <form onSubmit={handleSubmit} className="p-6 space-y-6 max-w-2xl">
            <Card className="p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-primary" />
                Route Details
              </h2>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="pickup">Pickup Location</Label>
                  <LocationAutocomplete
                    value={pickup}
                    onChange={(val, coords) => {
                      setPickup(val);
                      if (coords) setPickupCoords(coords);
                    }}
                    placeholder="Where will you pick up passengers?"
                    testId="input-create-pickup"
                  />
                </div>

                <div>
                  <Label htmlFor="drop">Drop Location</Label>
                  <LocationAutocomplete
                    value={drop}
                    onChange={(val, coords) => {
                      setDrop(val);
                      if (coords) setDropCoords(coords);
                    }}
                    placeholder="Where will you drop off passengers?"
                    testId="input-create-drop"
                  />
                </div>

                {routeInfo && (
                  <div className="flex items-center gap-4 p-3 bg-muted rounded-lg">
                    <RouteIcon className="w-5 h-5 text-primary" />
                    <div className="flex-1">
                      <div className="text-sm font-medium">
                        {routeInfo.distance.toFixed(1)} km • {routeInfo.duration} min
                      </div>
                      <div className="text-xs text-muted-foreground">Estimated route</div>
                    </div>
                  </div>
                )}
              </div>
            </Card>

            <Card className="p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-primary" />
                Schedule
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="date">Departure Date</Label>
                  <Input
                    id="date"
                    type="date"
                    value={departureDate}
                    onChange={(e) => setDepartureDate(e.target.value)}
                    required
                    data-testid="input-create-date"
                  />
                </div>

                <div>
                  <Label htmlFor="time">Departure Time</Label>
                  <Input
                    id="time"
                    type="time"
                    value={departureTime}
                    onChange={(e) => setDepartureTime(e.target.value)}
                    required
                    data-testid="input-create-time"
                  />
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                Capacity & Pricing
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="seats">Available Seats</Label>
                  <Input
                    id="seats"
                    type="number"
                    min="1"
                    max="7"
                    value={seats}
                    onChange={(e) => setSeats(e.target.value)}
                    required
                    data-testid="input-create-seats"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    How many passengers can you accommodate?
                  </p>
                </div>

                <div>
                  <Label htmlFor="price">Price per Seat (₹)</Label>
                  <Input
                    id="price"
                    type="number"
                    min="0"
                    value={pricePerSeat}
                    onChange={(e) => setPricePerSeat(e.target.value)}
                    required
                    data-testid="input-create-price"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Suggested: ₹{routeInfo ? Math.round(routeInfo.distance * 8) : '---'}
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <h2 className="text-lg font-semibold mb-4">Preferences</h2>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="smoking" className="text-base">Smoking allowed</Label>
                    <p className="text-sm text-muted-foreground">Passengers can smoke in the car</p>
                  </div>
                  <Switch
                    id="smoking"
                    checked={preferences.smoking}
                    onCheckedChange={(checked) => setPreferences({ ...preferences, smoking: checked })}
                    data-testid="switch-smoking"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="pets" className="text-base">Pets allowed</Label>
                    <p className="text-sm text-muted-foreground">Passengers can bring pets</p>
                  </div>
                  <Switch
                    id="pets"
                    checked={preferences.pets}
                    onCheckedChange={(checked) => setPreferences({ ...preferences, pets: checked })}
                    data-testid="switch-pets"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="music" className="text-base">Music allowed</Label>
                    <p className="text-sm text-muted-foreground">You'll play music during the trip</p>
                  </div>
                  <Switch
                    id="music"
                    checked={preferences.music}
                    onCheckedChange={(checked) => setPreferences({ ...preferences, music: checked })}
                    data-testid="switch-music"
                  />
                </div>
              </div>
            </Card>

            <Button
              type="submit"
              size="lg"
              className="w-full"
              disabled={createTripMutation.isPending || !pickupCoords || !dropCoords || !departureDate || !departureTime}
              data-testid="button-publish-trip"
            >
              {createTripMutation.isPending ? 'Publishing...' : 'Publish Trip'}
            </Button>
          </form>
        </div>

        <div className="hidden lg:block lg:w-1/2 h-full border-l">
          <MapView
            markers={markers}
            route={routeInfo?.route}
          />
        </div>
      </div>
    </div>
  );
}
