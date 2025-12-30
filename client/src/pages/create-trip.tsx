import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { LocationAutocomplete } from '@/components/LocationAutocomplete';
import { MapView } from '@/components/MapView';
import { useToast } from '@/hooks/use-toast';
import { queryClient } from '@/lib/queryClient';
import { getRoute, Coordinates, reverseGeocode } from '@/lib/maps';
import { ArrowLeft, MapPin, Calendar, Users, Route as RouteIcon, Plus, X } from 'lucide-react';
import { InsertTrip } from '@shared/schema';
import { supabase } from '@/lib/supabase';
import { mapDriver } from '@/lib/mapper';
import { useAuth } from '@/contexts/AuthContext';
import { Navbar } from '@/components/Navbar';

export default function CreateTrip() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();

  const [isMobileMapOpen, setIsMobileMapOpen] = useState(false);

  // ... (keep existing state)
  const [pickup, setPickup] = useState('');
  const [pickupCoords, setPickupCoords] = useState<Coordinates>();
  const [drop, setDrop] = useState('');
  const [dropCoords, setDropCoords] = useState<Coordinates>();
  const [waypoints, setWaypoints] = useState<{ id: string; location: string; coords: Coordinates }[]>([]);
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
  const [selectionMode, setSelectionMode] = useState<'pickup' | 'drop' | null>(null);

  const handleMapClick = async (coords: Coordinates) => {
    if (!selectionMode) return;

    try {
      const address = await reverseGeocode(coords);

      if (selectionMode === 'pickup') {
        setPickup(address);
        setPickupCoords(coords);
      } else {
        setDrop(address);
        setDropCoords(coords);
      }
      setSelectionMode(null);
      setIsMobileMapOpen(false); // Return to form after selection
    } catch (error) {
      console.error("Failed to reverse geocode", error);
    }
  };

  // ... (keep driver profile query)
  const { data: driverProfile, isLoading: isLoadingDriver } = useQuery<any>({
    queryKey: ['my-driver-profile', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from('drivers')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error) {
        // If not found, it's okay, return null to trigger redirect
        return null;
      }
      return mapDriver(data);
    },
    enabled: !!user,
  });

  // ... (keep redirect effect)
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

  // ... (keep mutation and calculation logic)
  const createTripMutation = useMutation({
    mutationFn: async (tripData: Partial<InsertTrip>) => {
      // Map to snake_case
      const dbTrip = {
        driver_id: tripData.driverId,
        pickup_location: tripData.pickupLocation,
        pickup_lat: tripData.pickupLat,
        pickup_lng: tripData.pickupLng,
        drop_location: tripData.dropLocation,
        drop_lat: tripData.dropLat,
        drop_lng: tripData.dropLng,
        departure_time: tripData.departureTime,
        distance: tripData.distance,
        duration: tripData.duration,
        price_per_seat: tripData.pricePerSeat,
        available_seats: tripData.availableSeats,
        total_seats: tripData.totalSeats,
        status: 'upcoming',
        route: tripData.route,
        preferences: tripData.preferences,
      };

      const { data, error } = await supabase.from('trips').insert(dbTrip).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({
        title: 'Trip created successfully!',
        description: 'Your trip has been published and is now visible to passengers.',
      });
      queryClient.invalidateQueries({ queryKey: ['my-created-trips'] });
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
      const route = await getRoute(pickupCoords, dropCoords, waypoints.map(w => w.coords));
      setRouteInfo({
        distance: route.distance,
        duration: route.duration,
        route: route.geometry
      });

      // Calculate suggested price based on distance and demand
      const distance = route.distance;
      const basePrice = Math.round(distance * 3); // ₹3 per km base

      // Check similar trips for dynamic pricing
      // This is a simplified "demand" check
      const { data: similarTrips } = await supabase
        .from('trips')
        .select('price_per_seat')
        .ilike('pickup_location', `%${pickup}%`)
        .ilike('drop_location', `%${drop}%`)
        .eq('status', 'upcoming');

      let suggestedPrice = basePrice;
      if (similarTrips && similarTrips.length > 0) {
        const avgPrice = similarTrips.reduce((acc, trip) => acc + parseFloat(trip.price_per_seat), 0) / similarTrips.length;
        // If average market price is higher, suggest slightly lower to be competitive, or match it
        suggestedPrice = Math.round((basePrice + avgPrice) / 2);
      }

      setPricePerSeat(suggestedPrice.toString());

      toast({
        title: "Route Calculated",
        description: `Distance: ${distance.toFixed(1)} km. Suggested price: ₹${suggestedPrice}`,
      });
    } catch (error: any) {
      console.error('Error calculating route:', error);
      toast({
        title: 'Error calculating route',
        description: error.message || 'Could not calculate route or suggested price.',
        variant: 'destructive',
      });
    }
  };

  useEffect(() => {
    if (pickupCoords && dropCoords) {
      calculateRoute();
    }
  }, [pickupCoords, dropCoords, waypoints]);

  const addWaypoint = () => {
    setWaypoints([...waypoints, { id: crypto.randomUUID(), location: '', coords: { lat: 0, lng: 0 } }]);
  };

  const removeWaypoint = (id: string) => {
    setWaypoints(waypoints.filter(w => w.id !== id));
  };

  const updateWaypoint = (id: string, location: string, coords?: Coordinates) => {
    setWaypoints(waypoints.map(w =>
      w.id === id ? { ...w, location, coords: coords || w.coords } : w
    ));
  };

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
      route: { geometry: routeInfo.route, waypoints: waypoints.map(w => ({ location: w.location, coords: w.coords })) },
      preferences,
      base_price: pricePerSeat, // Initialize base_price
      surge_multiplier: 1.0,
    } as any);
  };

  const markers = pickupCoords && dropCoords ? [
    { id: 'pickup', coordinates: pickupCoords, color: '#22c55e', popup: pickup },
    ...waypoints.map((w, i) => ({
      id: `waypoint-${i}`,
      coordinates: w.coords,
      color: '#3b82f6',
      popup: `Stop ${i + 1}: ${w.location}`
    })),
    { id: 'drop', coordinates: dropCoords, color: '#ef4444', popup: drop }
  ] : [];

  const handleSetOnMap = (mode: 'pickup' | 'drop') => {
    if (selectionMode === mode) {
      setSelectionMode(null);
    } else {
      setSelectionMode(mode);
      setIsMobileMapOpen(true);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="flex h-[calc(100vh-4rem)] relative">
        <div className={`w-full lg:w-1/2 overflow-y-auto ${isMobileMapOpen ? 'hidden lg:block' : 'block'}`}>
          <form onSubmit={handleSubmit} className="p-6 space-y-6 max-w-2xl">
            <div className="flex items-center justify-between mb-4">
              <div></div> {/* Spacer */}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsMobileMapOpen(!isMobileMapOpen)}
                className="lg:hidden"
              >
                <MapPin className="w-4 h-4 mr-2" />
                {isMobileMapOpen ? 'Show Form' : 'Show Map'}
              </Button>
            </div>

            <Card className="p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-primary" />
                Route Details
              </h2>

              <div className="space-y-4">
                <div>
                  <div className="flex justify-between items-center">
                    <Label htmlFor="pickup">Pickup Location</Label>
                    <Button
                      type="button"
                      variant={selectionMode === 'pickup' ? "secondary" : "ghost"}
                      size="sm"
                      onClick={() => handleSetOnMap('pickup')}
                      className="h-6 text-xs px-2"
                    >
                      <MapPin className="w-3 h-3 mr-1" />
                      {selectionMode === 'pickup' ? 'Cancel' : 'Set on Map'}
                    </Button>
                  </div>
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

                {waypoints.map((waypoint, index) => (
                  <div key={waypoint.id} className="relative">
                    <Label>Stop {index + 1}</Label>
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <LocationAutocomplete
                          value={waypoint.location}
                          onChange={(val, coords) => updateWaypoint(waypoint.id, val, coords)}
                          placeholder="Add a stop"
                        />
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="text-destructive"
                        onClick={() => removeWaypoint(waypoint.id)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}

                <div className="flex justify-center">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addWaypoint}
                    className="gap-2 text-muted-foreground"
                  >
                    <Plus className="w-4 h-4" />
                    Add Stop
                  </Button>
                </div>

                <div>
                  <div className="flex justify-between items-center">
                    <Label htmlFor="drop">Drop Location</Label>
                    <Button
                      type="button"
                      variant={selectionMode === 'drop' ? "secondary" : "ghost"}
                      size="sm"
                      onClick={() => handleSetOnMap('drop')}
                      className="h-6 text-xs px-2"
                    >
                      <MapPin className="w-3 h-3 mr-1" />
                      {selectionMode === 'drop' ? 'Cancel' : 'Set on Map'}
                    </Button>
                  </div>
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

        <div className={`w-full lg:w-1/2 h-full border-l relative ${isMobileMapOpen ? 'block h-full' : 'hidden lg:block'}`}>
          <MapView
            key={isMobileMapOpen ? 'mobile-visible' : 'desktop-or-hidden'}
            markers={markers}
            route={routeInfo?.route}
            onMapClick={handleMapClick}
            className={`w-full h-full ${selectionMode ? 'cursor-crosshair' : ''}`}
          />
          {selectionMode && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] bg-black/75 text-white px-4 py-2 rounded-full text-sm font-medium shadow-lg pointer-events-none">
              Click map to set {selectionMode} location
            </div>
          )}
          {/* Mobile close button */}
          <Button
            variant="secondary"
            size="sm"
            className="absolute bottom-4 left-1/2 -translate-x-1/2 lg:hidden z-[1000] shadow-lg"
            onClick={() => setIsMobileMapOpen(false)}
          >
            Back to Form
          </Button>
        </div>
      </div>
    </div>
  );
}
