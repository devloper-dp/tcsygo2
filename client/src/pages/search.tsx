import { useState, useEffect, useMemo } from 'react';
import { useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Navbar } from '@/components/Navbar';
import { TripListSkeleton } from '@/components/SkeletonLoaders';
import { NoTripsFound } from '@/components/EmptyStates';
import { LocationAutocomplete } from '@/components/LocationAutocomplete';
import { TripCard } from '@/components/TripCard';
import { MapView } from '@/components/MapView';
import { AdvancedFilters } from '@/components/AdvancedFilters';
import { SurgePricingIndicator } from '@/components/SurgePricingIndicator';
import { PromoCodeInput } from '@/components/PromoCodeInput';
import { FareEstimator } from '@/components/FareEstimator';
import { RideScheduler } from '@/components/RideScheduler';
import { SafetyTips } from '@/components/SafetyTips';
import { CarbonFootprint } from '@/components/CarbonFootprint';
import { Search as SearchIcon, MapPin, Zap, Clock, Rocket } from 'lucide-react';
import { QuickBookWidget } from '@/components/QuickBookWidget';
import { TripWithDriver } from '@shared/schema';
import { Coordinates, getRoute, reverseGeocode } from '@/lib/maps';
import { supabase } from '@/lib/supabase';
import { mapTrip } from '@/lib/mapper';
import { useSearchStore } from '@/lib/search-store';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';

export default function Search() {
  const { t } = useTranslation();
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
  const [scheduledTimeParam] = useState(searchParams.get('scheduledTime'));
  const [date, setDate] = useState(() => {
    const dateParam = searchParams.get('date');
    if (dateParam) return dateParam;
    if (searchParams.get('scheduledTime')) {
      return searchParams.get('scheduledTime')!.split('T')[0];
    }
    return '';
  });
  const [isMobileMapOpen, setIsMobileMapOpen] = useState(false);
  const { filters } = useSearchStore();
  const { user } = useAuth();

  // New state for map features
  const [selectionMode, setSelectionMode] = useState<'pickup' | 'drop' | null>(null);
  const [routeInfo, setRouteInfo] = useState<{ distance: number; duration: number; route: Coordinates[] } | null>(null);
  const [estimatedPrice, setEstimatedPrice] = useState<{ min: number; max: number } | null>(null);

  const [bookingType, setBookingType] = useState<'instant' | 'scheduled'>(
    searchParams.get('scheduledTime') ? 'scheduled' : 'instant'
  );
  const [scheduledDateTime, setScheduledDateTime] = useState<Date | undefined>(
    scheduledTimeParam ? new Date(scheduledTimeParam) : undefined
  );
  // Rapido-like features state
  const [vehicleType, setVehicleType] = useState<'all' | 'bike' | 'auto' | 'car'>(
    (searchParams.get('vehicleType') as 'all' | 'bike' | 'auto' | 'car') || 'all'
  );
  const [surgeMultiplier, setSurgeMultiplier] = useState(1.0);
  const [promoCode, setPromoCode] = useState(searchParams.get('promoCode') || '');
  const [promoDiscount, setPromoDiscount] = useState(0);

  // Sync state with URL when it changes
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    setPickup(searchParams.get('pickup') || '');
    setDrop(searchParams.get('drop') || '');
    if (searchParams.get('pickupLat') && searchParams.get('pickupLng')) {
      setPickupCoords({ lat: parseFloat(searchParams.get('pickupLat')!), lng: parseFloat(searchParams.get('pickupLng')!) });
    }
    if (searchParams.get('dropLat') && searchParams.get('dropLng')) {
      setDropCoords({ lat: parseFloat(searchParams.get('dropLat')!), lng: parseFloat(searchParams.get('dropLng')!) });
    }
    setDate(searchParams.get('date') || '');
    setVehicleType((searchParams.get('vehicleType') as 'all' | 'bike' | 'auto' | 'car') || 'all');
    setPromoCode(searchParams.get('promoCode') || '');

    const preferencesParam = searchParams.get('preferences');
    if (preferencesParam) {
      try {
        const parsedPreferences = JSON.parse(preferencesParam);
        useSearchStore.getState().setFilters({ preferences: parsedPreferences });
      } catch (e) {
        console.error('Failed to parse preferences from URL', e);
      }
    }
  }, [window.location.search]);

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
        // Create date objects ensuring we respect the selected date in local time
        const startOfDay = new Date(`${date}T00:00:00`);
        const endOfDay = new Date(`${date}T23:59:59.999`);

        query = query
          .gte('departure_time', startOfDay.toISOString())
          .lte('departure_time', endOfDay.toISOString());
      }

      const { data, error } = await query.order('departure_time', { ascending: true });

      if (error) throw error;

      return (data || []).map(mapTrip);
    },
    // Query should be enabled by default so users see trips immediately
  });

  // Calculate route and price when coords change
  useEffect(() => {
    async function updateRoute() {
      if (pickupCoords && dropCoords) {
        try {
          const routeData = await getRoute(pickupCoords, dropCoords);
          setRouteInfo({
            distance: routeData.distance,
            duration: routeData.duration,
            route: routeData.geometry
          });

          // Estimate price: Base ₹40 + ₹12/km
          // This is just a rough estimate for users

          // Use shared fare calculator
          const { calculateFare } = await import('@/lib/fareCalculator');
          // Default to car for search estimation
          const fareBreakdown = calculateFare('car', routeData.distance, routeData.duration);

          setEstimatedPrice({
            min: Math.floor(fareBreakdown.totalFare * 0.9), // -10% range
            max: Math.ceil(fareBreakdown.totalFare * 1.1)   // +10% range
          });

        } catch (error) {
          console.error("Failed to calculate route", error);
        }
      } else {
        setRouteInfo(null);
        setEstimatedPrice(null);
      }
    }
    updateRoute();
  }, [pickupCoords, dropCoords]);

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
      setSelectionMode(null); // Exit selection mode
    } catch (error) {
      console.error("Failed to reverse geocode", error);
    }
  };

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

    // Vehicle Type filter
    if (vehicleType !== 'all') {
      filtered = filtered.filter(trip => {
        // Assuming trip.driver.vehicleType exists or inferring from vehicle model/make
        // In a real app, vehicleType should be a column. For now, we can check a property or just pass through for demo if column missing.
        // Or we can assume 'bike' has fewer seats (1) or checking vehicle details.
        // Let's assume we filter by available seats implicitly for bike (1-2) vs car (3+), or add a check if data exists.
        // Since vehicle_type isn't in the schema explicitly shown in previous turn for 'drivers' table (it showed vehicle_make etc),
        // we might need to rely on 'available_seats' or add it.
        // For this implementation, I'll filter by seat count as a proxy if vehicle_type is missing, or strictly if present.
        // Let's check the partial mapTrip.
        const vType = (trip.driver as any)?.vehicleType?.toLowerCase() ||
          (parseInt(trip.totalSeats.toString()) <= 2 ? 'bike' : parseInt(trip.totalSeats.toString()) <= 4 ? 'auto' : 'car');

        return vType === vehicleType;
      });
    }

    // Seats filter
    if (filters.minSeats) {
      filtered = filtered.filter(trip => trip.availableSeats >= filters.minSeats!);
    }

    // Time filter
    if (filters.departureTimeStart || filters.departureTimeEnd || scheduledTimeParam) {
      filtered = filtered.filter(trip => {
        const tripTime = new Date(trip.departureTime).toTimeString().slice(0, 5);

        if (scheduledTimeParam) {
          // If a specific scheduled time was requested, show trips around that time (e.g., +1 hour window or just anything after)
          // For now, let's just ensure it's after the scheduled time
          const scheduled = new Date(scheduledTimeParam);
          if (new Date(trip.departureTime) < scheduled) return false;
        }

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

  const markers = useMemo(() => {
    const m = [];
    if (pickupCoords) {
      m.push({
        id: 'pickup',
        coordinates: pickupCoords,
        color: '#22c55e',
        popup: `<strong>Pickup:</strong> ${pickup}`
      });
    }
    if (dropCoords) {
      m.push({
        id: 'drop',
        coordinates: dropCoords,
        color: '#ef4444',
        popup: `<strong>Drop:</strong> ${drop}`
      });
    }
    // Add trip markers
    if (trips && trips.length > 0) {
      trips.forEach(trip => {
        m.push({
          id: `trip-${trip.id}`,
          coordinates: { lat: parseFloat(trip.pickupLat), lng: parseFloat(trip.pickupLng) },
          color: '#3b82f6', // Blue for available rides
          popup: `
            <div class="p-1">
              <strong>${trip.driver?.user?.fullName || 'Driver'}</strong>
              <div class="text-xs text-gray-500 my-1">${new Date(trip.departureTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
              <div class="font-bold text-green-600">₹${trip.pricePerSeat}</div>
              <div class="text-xs truncate max-w-[150px]">${trip.pickupLocation}</div>
            </div>
          `
        });
      });
    }

    return m;
  }, [pickupCoords, dropCoords, pickup, drop, trips]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <Navbar />

      <div className="flex flex-col lg:flex-row h-[calc(100vh-4rem)]">
        {/* Main Content - Left Side */}
        <div className="w-full lg:w-1/2 overflow-y-auto">
          <div className="p-4 sm:p-6 space-y-6">
            {/* Enhanced Search Form */}
            <Card className="sticky top-0 z-10 shadow-xl border-primary/20 bg-card/95 backdrop-blur-sm">
              <div className="p-4 sm:p-6 space-y-4">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-lg">
                    <SearchIcon className="w-5 h-5 text-primary-foreground" />
                  </div>
                  <div>
                    <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                      {user ? `Welcome back, ${user.fullName?.split(' ')[0]}!` : 'Find Your Ride'}
                    </h1>
                    <p className="text-xs sm:text-sm text-muted-foreground">Search available trips</p>
                  </div>
                </div>

                <div className="space-y-4">
                  {/* Booking Type Toggle */}
                  <div className="flex gap-2 p-1 bg-muted rounded-lg">
                    <Button
                      variant={bookingType === 'instant' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => {
                        setBookingType('instant');
                        setScheduledDateTime(undefined);
                      }}
                      className="flex-1 transition-all"
                    >
                      <Zap className="w-4 h-4 mr-2" />
                      Instant Ride
                    </Button>
                    <Button
                      variant={bookingType === 'scheduled' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setBookingType('scheduled')}
                      className="flex-1 transition-all"
                    >
                      <Clock className="w-4 h-4 mr-2" />
                      Schedule Ride
                    </Button>
                  </div>

                  {/* Location Inputs */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {/* Pickup Location */}
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <Label className="text-sm font-medium">{t('common.pickup')}</Label>
                        <Button
                          variant={selectionMode === 'pickup' ? "default" : "ghost"}
                          size="sm"
                          onClick={() => {
                            const newMode = selectionMode === 'pickup' ? null : 'pickup';
                            setSelectionMode(newMode);
                            // Auto-open mobile map when entering selection mode
                            if (newMode === 'pickup' && !isMobileMapOpen) {
                              setIsMobileMapOpen(true);
                            }
                          }}
                          className="h-7 text-xs px-2 transition-all duration-200"
                        >
                          <MapPin className="w-3 h-3 mr-1" />
                          {selectionMode === 'pickup' ? t('common.cancel') : 'Map'}
                        </Button>
                      </div>
                      <LocationAutocomplete
                        value={pickup}
                        onChange={(val, coords) => {
                          setPickup(val);
                          if (coords) setPickupCoords(coords);
                        }}
                        placeholder={t('common.pickup')}
                        testId="input-search-pickup"
                        className="transition-all duration-200 focus:ring-2 focus:ring-primary/20"
                      />
                    </div>

                    {/* Drop Location */}
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <Label className="text-sm font-medium">{t('common.drop')}</Label>
                        <Button
                          variant={selectionMode === 'drop' ? "default" : "ghost"}
                          size="sm"
                          onClick={() => {
                            const newMode = selectionMode === 'drop' ? null : 'drop';
                            setSelectionMode(newMode);
                            // Auto-open mobile map when entering selection mode
                            if (newMode === 'drop' && !isMobileMapOpen) {
                              setIsMobileMapOpen(true);
                            }
                          }}
                          className="h-7 text-xs px-2 transition-all duration-200"
                        >
                          <MapPin className="w-3 h-3 mr-1" />
                          {selectionMode === 'drop' ? t('common.cancel') : 'Map'}
                        </Button>
                      </div>
                      <LocationAutocomplete
                        value={drop}
                        onChange={(val, coords) => {
                          setDrop(val);
                          if (coords) setDropCoords(coords);
                        }}
                        placeholder={t('common.drop')}
                        testId="input-search-drop"
                        className="transition-all duration-200 focus:ring-2 focus:ring-primary/20"
                      />
                    </div>
                  </div>

                  {/* Date/Time and Filters */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {/* Date/Time Selection */}
                    {bookingType === 'instant' ? (
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">{t('common.departure')}</Label>
                        <Input
                          type="date"
                          value={date}
                          onChange={(e) => setDate(e.target.value)}
                          data-testid="input-search-date"
                          className="transition-all duration-200 focus:ring-2 focus:ring-primary/20"
                        />
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Schedule Date & Time</Label>
                        <RideScheduler
                          onSchedule={(scheduledDate, time) => {
                            setScheduledDateTime(scheduledDate);
                            setBookingType('scheduled');
                            const dateStr = scheduledDate.toISOString().split('T')[0];
                            setDate(dateStr);
                            // time parameter available for future use (e.g., analytics)
                            console.log('Scheduled time:', time);
                          }}
                          className="w-full"
                        />
                      </div>
                    )}

                    {/* Advanced Filters */}
                    <div className="space-y-2 flex items-end">
                      <AdvancedFilters />
                    </div>
                  </div>

                  {/* Scheduled Time Display */}
                  {scheduledDateTime && bookingType === 'scheduled' && (
                    <div className="p-3 bg-primary/10 border border-primary/20 rounded-lg">
                      <div className="flex items-center gap-2 text-sm">
                        <Clock className="w-4 h-4 text-primary" />
                        <span className="font-medium">Scheduled for:</span>
                        <span className="text-primary">
                          {format(scheduledDateTime, 'PPP')} at {format(scheduledDateTime, 'p')}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Route Info & Fare Estimator */}
                {routeInfo && (
                  <div className="mt-4 pt-4 border-t space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="flex flex-wrap gap-3 sm:gap-4 text-sm">
                      <div className="flex items-center gap-2 px-3 py-2 bg-primary/5 rounded-lg">
                        <MapPin className="w-4 h-4 text-primary" />
                        <div>
                          <span className="text-xs text-muted-foreground block">Distance</span>
                          <span className="font-semibold">{routeInfo.distance.toFixed(1)} km</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 px-3 py-2 bg-success/5 rounded-lg">
                        <Clock className="w-4 h-4 text-success" />
                        <div>
                          <span className="text-xs text-muted-foreground block">Duration</span>
                          <span className="font-semibold">{routeInfo.duration} min</span>
                        </div>
                      </div>
                    </div>

                    {estimatedPrice && pickupCoords && dropCoords && (
                      <div className="space-y-3">
                        <FareEstimator
                          vehicleType="car"
                          distanceKm={routeInfo.distance}
                          durationMinutes={routeInfo.duration}
                          onFareCalculated={(fare) => {
                            const baseMin = Math.floor(fare.totalFare * 0.8);
                            const baseMax = fare.totalFare;
                            // Apply promo discount if available
                            const discountedMin = promoDiscount > 0 ? baseMin - promoDiscount : baseMin;
                            const discountedMax = promoDiscount > 0 ? baseMax - promoDiscount : baseMax;
                            setEstimatedPrice({ min: Math.max(0, discountedMin), max: discountedMax });
                            setSurgeMultiplier(fare.surgeMultiplier || 1.0);
                          }}
                        />

                        {surgeMultiplier > 1.0 && (
                          <SurgePricingIndicator
                            multiplier={surgeMultiplier}
                            demand={surgeMultiplier >= 2.0 ? 'very_high' : surgeMultiplier >= 1.5 ? 'high' : 'medium'}
                          />
                        )}

                        <PromoCodeInput
                          onPromoApplied={(promo) => {
                            setPromoCode(promo.code);
                            const discount = promo.discount_type === 'percentage'
                              ? promo.discount_value
                              : promo.discount_value;
                            setPromoDiscount(discount);
                          }}
                          onPromoRemoved={() => {
                            setPromoCode('');
                            setPromoDiscount(0);
                          }}
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            </Card>

            {/* Quick Book Section */}
            <Card className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border-primary/20 shadow-lg overflow-hidden">
              <div className="bg-gradient-to-r from-primary to-primary/80 p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                  <Rocket className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-lg">{t('search.instant_booking')}</h3>
                  <p className="text-xs text-white/80">Book a ride instantly</p>
                </div>
              </div>
              <div className="p-4">
                <QuickBookWidget className="shadow-none border-0 p-0 bg-transparent" />
              </div>
            </Card>

            {/* Results Header */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg sm:text-xl font-bold">
                  {t('search.trips_found', { count: (trips || []).length })}
                </h2>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  {pickup && drop ? `${pickup} → ${drop}` : 'Enter locations to search'}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsMobileMapOpen(!isMobileMapOpen)}
                className="lg:hidden transition-all duration-200 hover:scale-105"
                data-testid="button-toggle-map"
              >
                <MapPin className="w-4 h-4 mr-2" />
                {isMobileMapOpen ? 'Hide Map' : 'Show Map'}
              </Button>
            </div>

            {/* Results */}
            {isLoading ? (
              <TripListSkeleton count={5} />
            ) : trips && trips.length > 0 ? (
              <>
                <Card className="p-4 bg-success/5 border-success/20 shadow-md">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-success/20 flex items-center justify-center">
                      <Zap className="w-6 h-6 text-success animate-pulse" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm sm:text-base">{t('search.instant_booking')}</h3>
                      <p className="text-xs text-muted-foreground">
                        {trips.length} ride{trips.length > 1 ? 's' : ''} ready for immediate booking
                      </p>
                    </div>
                  </div>
                </Card>

                <div className="space-y-4">
                  {trips.map((trip) => (
                    <div
                      key={trip.id}
                      className="transform transition-all duration-200 hover:scale-[1.02] hover:shadow-lg"
                    >
                      <TripCard
                        trip={trip}
                        onBook={() => {
                          const params = new URLSearchParams();
                          if (promoCode) params.set('promoCode', promoCode);
                          if (vehicleType !== 'all') params.set('vehiclePreference', vehicleType);

                          const prefs = useSearchStore.getState().filters.preferences;
                          if (prefs) params.set('preferences', JSON.stringify(prefs));

                          navigate(`/trip/${trip.id}?${params.toString()}`);
                        }}
                      />
                    </div>
                  ))}
                </div>

                <SafetyTips className="mt-6" />

                {/* Carbon Footprint Display */}
                {routeInfo && trips && (
                  <CarbonFootprint
                    totalDistance={routeInfo.distance}
                    totalRides={trips.length}
                  />
                )}
              </>
            ) : pickup && drop ? (
              <NoTripsFound onAdjustFilters={() => { }} />
            ) : (
              <Card className="p-12 text-center shadow-lg">
                <SearchIcon className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                <h3 className="text-xl font-semibold mb-2">Start searching</h3>
                <p className="text-muted-foreground">
                  Enter your pickup and drop locations to find available trips
                </p>
                {selectionMode && (
                  <div className="mt-4 p-3 bg-primary/10 text-primary rounded-lg inline-block animate-pulse">
                    Click on the map to set {selectionMode} location
                  </div>
                )}
              </Card>
            )}
          </div>
        </div>

        {/* Map View - Right Side */}
        <div
          className="hidden lg:block w-full lg:w-1/2 h-full border-l relative"
          style={{ cursor: selectionMode ? 'crosshair' : 'default' }}
        >
          <MapView
            markers={markers}
            route={routeInfo?.route}
            onMapClick={handleMapClick}
            className="w-full h-full"
            isVisible={true}
          />
          {selectionMode && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] bg-black/75 text-white px-4 py-2 rounded-full text-sm font-medium shadow-lg pointer-events-none animate-bounce">
              📍 Click map to set {selectionMode} location
            </div>
          )}
        </div>

        {/* Mobile Map Overlay */}
        {isMobileMapOpen && (
          <div className="lg:hidden fixed inset-0 z-50 bg-white dark:bg-gray-900">
            <div
              className="relative w-full h-full"
              style={{
                height: '100vh',
                width: '100vw',
                cursor: selectionMode ? 'crosshair' : 'default'
              }}
            >
              <MapView
                key="mobile-map"
                markers={markers}
                route={routeInfo?.route}
                onMapClick={handleMapClick}
                className="w-full h-full"
                isVisible={isMobileMapOpen}
              />
              {selectionMode && (
                <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] bg-black/75 text-white px-4 py-2 rounded-full text-sm font-medium shadow-lg pointer-events-none animate-bounce">
                  📍 Click map to set {selectionMode} location
                </div>
              )}

              {/* Close Map Button */}
              <Button
                onClick={() => setIsMobileMapOpen(false)}
                className="fixed bottom-6 right-6 z-[1001] w-14 h-14 rounded-full shadow-2xl bg-primary hover:bg-primary/90 transition-all duration-200 hover:scale-110"
                size="icon"
              >
                <SearchIcon className="w-6 h-6" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
