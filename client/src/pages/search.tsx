import { useState, useEffect, useMemo } from 'react';
import { useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { TripListSkeleton } from '@/components/SkeletonLoaders';
import { NoTripsFound } from '@/components/EmptyStates';
import { LocationAutocomplete } from '@/components/LocationAutocomplete';
import { TripCard } from '@/components/TripCard';
import { MapView } from '@/components/MapView';
import { AdvancedFilters } from '@/components/AdvancedFilters';
import { Search as SearchIcon, MapPin } from 'lucide-react';
import { TripWithDriver } from '@shared/schema';
import { Coordinates } from '@/lib/mapbox';
import { supabase } from '@/lib/supabase';
import { mapTrip } from '@/lib/mapper';
import { useSearchStore } from '@/lib/search-store';

export default function Search() {
  const [, navigate] = useLocation();
  const searchParams = new URLSearchParams(window.location.search);

  const [pickup, setPickup] = useState(searchParams.get('pickup') || '');
  const [drop, setDrop] = useState(searchParams.get('drop') || '');
  const [pickupCoords, setPickupCoords] = useState<Coordinates | undefined>(
    searchParams.get('pickupLat') && searchParams.get('pickupLng')
      ? { lat: parseFloat(searchParams.get('pickupLat')!), lng: parseFloat(searchParams.get('pickupLng')!) }
      : undefined
  );
  const [dropCoords, setDropCoords] = useState<Coordinates | undefined>(
    searchParams.get('dropLat') && searchParams.get('dropLng')
      ? { lat: parseFloat(searchParams.get('dropLat')!), lng: parseFloat(searchParams.get('dropLng')!) }
      : undefined
  );
  const [date, setDate] = useState(searchParams.get('date') || '');
  const [isMobileMapOpen, setIsMobileMapOpen] = useState(false);
  const { filters } = useSearchStore();

  const { data: allTrips, isLoading } = useQuery<TripWithDriver[]>({
    queryKey: ['trips-search', pickup, drop, date],
    queryFn: async () => {
      let query = supabase
        .from('trips')
        .select('*, driver:drivers(*, user:users(*))')
        .eq('status', 'upcoming')
        .gt('available_seats', 0);

      if (pickup) {
        query = query.ilike('pickup_location', `%${pickup}%`);
      }
      if (drop) {
        query = query.ilike('drop_location', `%${drop}%`);
      }
      if (date) {
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);

        query = query
          .gte('departure_time', startOfDay.toISOString())
          .lte('departure_time', endOfDay.toISOString());
      }

      const { data, error } = await query.order('departure_time', { ascending: true });

      if (error) throw error;

      return (data || []).map(mapTrip);
    },
    enabled: !!(pickup && drop),
  });

  // Apply client-side filters
  const trips = useMemo(() => {
    if (!allTrips) return allTrips;

    let filtered = [...allTrips];

    // Price filter
    if (filters.minPrice !== undefined) {
      filtered = filtered.filter(trip => parseFloat(trip.pricePerSeat) >= filters.minPrice!);
    }
    if (filters.maxPrice !== undefined) {
      filtered = filtered.filter(trip => parseFloat(trip.pricePerSeat) <= filters.maxPrice!);
    }

    // Seats filter
    if (filters.minSeats) {
      filtered = filtered.filter(trip => trip.availableSeats >= filters.minSeats!);
    }

    // Time filter
    if (filters.departureTimeStart || filters.departureTimeEnd) {
      filtered = filtered.filter(trip => {
        const tripTime = new Date(trip.departureTime).toTimeString().slice(0, 5);
        if (filters.departureTimeStart && tripTime < filters.departureTimeStart) return false;
        if (filters.departureTimeEnd && tripTime > filters.departureTimeEnd) return false;
        return true;
      });
    }

    // Preferences filter
    if (filters.preferences) {
      Object.entries(filters.preferences).forEach(([key, value]) => {
        if (value) {
          filtered = filtered.filter(trip => trip.preferences?.[key as keyof typeof trip.preferences]);
        }
      });
    }

    // Sort
    if (filters.sortBy) {
      filtered.sort((a, b) => {
        let aVal: any, bVal: any;
        switch (filters.sortBy) {
          case 'price':
            aVal = parseFloat(a.pricePerSeat);
            bVal = parseFloat(b.pricePerSeat);
            break;
          case 'departure':
            aVal = new Date(a.departureTime).getTime();
            bVal = new Date(b.departureTime).getTime();
            break;
          case 'duration':
            aVal = a.duration;
            bVal = b.duration;
            break;
          case 'rating':
            aVal = parseFloat(a.driver?.rating || '0');
            bVal = parseFloat(b.driver?.rating || '0');
            break;
          default:
            return 0;
        }
        return filters.sortOrder === 'desc' ? bVal - aVal : aVal - bVal;
      });
    }

    return filtered;
  }, [allTrips, filters]);

  const markers = pickupCoords && dropCoords ? [
    {
      id: 'pickup',
      coordinates: pickupCoords,
      color: '#22c55e',
      popup: `<strong>Pickup:</strong> ${pickup}`
    },
    {
      id: 'drop',
      coordinates: dropCoords,
      color: '#ef4444',
      popup: `<strong>Drop:</strong> ${drop}`
    }
  ] : [];

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          <button onClick={() => navigate('/')} className="flex items-center gap-2 hover-elevate active-elevate-2 px-2 py-1 rounded-lg">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-lg">T</span>
            </div>
            <span className="font-display font-bold text-xl">TCSYGO</span>
          </button>

          <Button onClick={() => navigate('/profile')} variant="ghost" data-testid="button-profile">
            Profile
          </Button>
        </div>
      </header>

      <div className="flex h-[calc(100vh-4rem)]">
        <div className={`w-full lg:w-1/2 overflow-y-auto ${isMobileMapOpen ? 'hidden lg:block' : 'block'}`}>
          <div className="p-6 space-y-6">
            <Card className="p-4 shadow-md border-primary/10">
              <div className="grid grid-cols-1 md:grid-cols-[1fr,1fr,auto,auto] gap-3">
                <LocationAutocomplete
                  value={pickup}
                  onChange={(val, coords) => {
                    setPickup(val);
                    if (coords) setPickupCoords(coords);
                  }}
                  placeholder="Pickup location"
                  testId="input-search-pickup"
                />

                <LocationAutocomplete
                  value={drop}
                  onChange={(val, coords) => {
                    setDrop(val);
                    if (coords) setDropCoords(coords);
                  }}
                  placeholder="Drop location"
                  testId="input-search-drop"
                />

                <Input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  data-testid="input-search-date"
                />

                <AdvancedFilters />
              </div>
            </Card>

            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-display font-bold">
                {trips ? `${trips.length} trips found` : 'Search for trips'}
              </h2>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsMobileMapOpen(!isMobileMapOpen)}
                className="lg:hidden"
                data-testid="button-toggle-map"
              >
                <MapPin className="w-4 h-4 mr-2" />
                {isMobileMapOpen ? 'Show List' : 'Show Map'}
              </Button>
            </div>

            {isLoading ? (
              <TripListSkeleton count={5} />
            ) : trips && trips.length > 0 ? (
              <div className="space-y-4">
                {trips.map((trip) => (
                  <TripCard
                    key={trip.id}
                    trip={trip}
                    onBook={() => navigate(`/trip/${trip.id}`)}
                  />
                ))}
              </div>
            ) : pickup && drop ? (
              <NoTripsFound onAdjustFilters={() => { }} />
            ) : (
              <Card className="p-12 text-center">
                <SearchIcon className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">Start searching</h3>
                <p className="text-muted-foreground">
                  Enter your pickup and drop locations to find available trips
                </p>
              </Card>
            )}
          </div>
        </div>

        <div className={`w-full lg:w-1/2 h-full border-l ${isMobileMapOpen ? 'block' : 'hidden lg:block'}`}>
          <MapView markers={markers} />
        </div>
      </div>
    </div>
  );
}
