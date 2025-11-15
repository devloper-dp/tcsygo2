import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { LocationAutocomplete } from '@/components/LocationAutocomplete';
import { TripCard } from '@/components/TripCard';
import { MapView } from '@/components/MapView';
import { Search as SearchIcon, MapPin, SlidersHorizontal } from 'lucide-react';
import { TripWithDriver } from '@shared/schema';
import { Coordinates } from '@/lib/mapbox';

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
  const [showMap, setShowMap] = useState(true);

  const { data: trips, isLoading } = useQuery<TripWithDriver[]>({
    queryKey: ['/api/trips/search', pickup, drop, date],
    enabled: !!(pickup && drop),
  });

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
        <div className={`${showMap ? 'w-full lg:w-1/2' : 'w-full'} overflow-y-auto`}>
          <div className="p-6 space-y-6">
            <Card className="p-4">
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

                <Button variant="outline" size="icon" data-testid="button-filter">
                  <SlidersHorizontal className="w-4 h-4" />
                </Button>
              </div>
            </Card>

            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-display font-bold">
                {trips ? `${trips.length} trips found` : 'Search for trips'}
              </h2>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowMap(!showMap)}
                className="lg:hidden"
                data-testid="button-toggle-map"
              >
                <MapPin className="w-4 h-4 mr-2" />
                {showMap ? 'Hide Map' : 'Show Map'}
              </Button>
            </div>

            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Card key={i} className="p-6">
                    <div className="flex gap-6">
                      <Skeleton className="w-16 h-16 rounded-full" />
                      <div className="flex-1 space-y-3">
                        <Skeleton className="h-6 w-1/3" />
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-2/3" />
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
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
              <Card className="p-12 text-center">
                <SearchIcon className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">No trips found</h3>
                <p className="text-muted-foreground mb-6">
                  Try adjusting your search criteria or check back later
                </p>
                <Button onClick={() => navigate('/create-trip')} data-testid="button-create-trip-cta">
                  Create a Trip Instead
                </Button>
              </Card>
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

        {showMap && (
          <div className="hidden lg:block lg:w-1/2 h-full border-l">
            <MapView markers={markers} />
          </div>
        )}
      </div>
    </div>
  );
}
