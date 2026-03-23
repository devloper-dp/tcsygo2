import { View, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Modal, Alert, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useState, useEffect } from 'react';
import { useTheme } from '@/contexts/ThemeContext';

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { mapTrip } from '@/lib/mapper';
import { TripCard } from '@/components/TripCard';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Pagination } from '@/components/ui/pagination';
import { Skeleton } from '@/components/ui/skeleton';
import { Sheet } from '@/components/ui/sheet';
import { Slider } from '@/components/ui/slider';
import { MobileFilters } from '@/components/MobileFilters';
import { NotificationBanner } from '@/components/MobileNotifications';
import { useSearchStore } from '@/lib/search-store';
import { FareEstimation } from '@/components/FareEstimation';
import { RideService } from '@/services/RideService';
import { RidePreferences, RidePreference } from '@/components/RidePreferences';
import { NoTripsFound } from '@/components/EmptyStates';
import { useResponsive } from '@/hooks/useResponsive';

const ITEMS_PER_PAGE = 10;

type SortOption = 'price-asc' | 'price-desc' | 'time-asc' | 'time-desc' | 'rating-desc';

interface Filters {
  minPrice: number;
  maxPrice: number;
  vehicleTypes: string[];
  minRating: number;
}

export default function SearchScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const { theme, colors } = useTheme();
  const isDark = theme === 'dark';
  const { hScale, vScale, spacing, fontSize } = useResponsive();

  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState<SortOption>('time-asc');
  const [showFilters, setShowFilters] = useState(false);
  const [showSort, setShowSort] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [preferences, setPreferences] = useState<RidePreference>({
    ac_preferred: true,
    music_allowed: true,
    pet_friendly: false,
    luggage_capacity: 1
  });

  // Instant booking state
  const [bookingLoading, setBookingLoading] = useState(false);

  const [filters, setFilters] = useState<Filters>({
    minPrice: 0,
    maxPrice: 5000,
    vehicleTypes: [],
    minRating: 0,
  });

  const [notification, setNotification] = useState<{
    visible: boolean;
    type: 'success' | 'error' | 'warning' | 'info';
    message: string;
  }>({
    visible: false,
    type: 'info',
    message: '',
  });

  const showNotification = (message: string, type: typeof notification.type = 'info') => {
    setNotification({ visible: true, message, type });
  };

  const { history, addSearch, removeSearch } = useSearchStore();

  // Save search to history when results are found
  useEffect(() => {
    if (params.pickup && params.drop) {
      addSearch({
        pickup: params.pickup as string,
        drop: params.drop as string,
        pickupLat: params.pickupLat ? parseFloat(params.pickupLat as string) : undefined,
        pickupLng: params.pickupLng ? parseFloat(params.pickupLng as string) : undefined,
        dropLat: params.dropLat ? parseFloat(params.dropLat as string) : undefined,
        dropLng: params.dropLng ? parseFloat(params.dropLng as string) : undefined,
      });
    }
  }, [params.pickup, params.drop]);

  // Search Trips
  const { data: trips, isLoading, refetch } = useQuery({
    queryKey: ['search-trips', params.pickup, params.drop, params.date, filters, sortBy],
    queryFn: async () => {
      let query = supabase
        .from('trips')
        .select('*, driver:drivers(*, user:users(*))')
        .eq('status', 'upcoming')
        .gt('available_seats', 0);

      if (params.date) {
        const dateStr = params.date as string;
        const startOfDay = new Date(dateStr);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(dateStr);
        endOfDay.setHours(23, 59, 59, 999);

        query = query
          .gte('departure_time', startOfDay.toISOString())
          .lte('departure_time', endOfDay.toISOString());
      }

      // Apply filters
      if (filters.minPrice > 0 || filters.maxPrice < 5000) {
        query = query
          .gte('price_per_seat', filters.minPrice)
          .lte('price_per_seat', filters.maxPrice);
      }

      if (filters.vehicleTypes.length > 0) {
        // This would need a join or filter on driver.vehicle_type
      }

      const { data, error } = await query;
      if (error) throw error;

      let mappedTrips = (data || []).map(mapTrip);

      // Apply rating filter (client-side since it requires calculation)
      if (filters.minRating > 0) {
        mappedTrips = mappedTrips.filter(trip =>
          (trip.driver.user.rating || 0) >= filters.minRating
        );
      }

      // Apply sorting
      mappedTrips.sort((a, b) => {
        switch (sortBy) {
          case 'price-asc':
            return parseFloat(a.pricePerSeat) - parseFloat(b.pricePerSeat);
          case 'price-desc':
            return parseFloat(b.pricePerSeat) - parseFloat(a.pricePerSeat);
          case 'time-asc':
            return new Date(a.departureTime).getTime() - new Date(b.departureTime).getTime();
          case 'time-desc':
            return new Date(b.departureTime).getTime() - new Date(a.departureTime).getTime();
          case 'rating-desc':
            return (b.driver.user.rating || 0) - (a.driver.user.rating || 0);
          default:
            return 0;
        }
      });

      return mappedTrips;
    }
  });

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const handleInstantBook = async (vehicleType: string, price: number) => {
    setBookingLoading(true);
    try {
      // Create a pending trip/request
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('Login Required', 'Please login to book a ride');
        return;
      }

      const trip = await RideService.bookRide({
        pickup_location: params.pickup as string,
        drop_location: params.drop as string,
        pickup_lat: params.pickupLat ? parseFloat(params.pickupLat as string) : 0,
        pickup_lng: params.pickupLng ? parseFloat(params.pickupLng as string) : 0,
        drop_lat: params.dropLat ? parseFloat(params.dropLat as string) : 0,
        drop_lng: params.dropLng ? parseFloat(params.dropLng as string) : 0,
        price_per_seat: price,
        // Special fields for instant ride request
        // Note: You might need to adjust your 'trips' table to support 'passenger_id' as creator or use a separate 'ride_requests' table
        // For now assuming we insert and mark as 'request'
        preferences: preferences // Pass preferences to service
      });

      if (trip) {
        Alert.alert('Request Sent', `Finding you a ${vehicleType}...`);
        // Navigate to a 'Finding Driver' screen or Trip Details in 'searching' state
        router.push(`/trip/${trip.id}`);
      }
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setBookingLoading(false);
    }
  };

  const totalPages = Math.ceil((trips?.length || 0) / ITEMS_PER_PAGE);
  const paginatedTrips = trips?.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const activeFilterCount =
    (filters.minPrice > 0 || filters.maxPrice < 5000 ? 1 : 0) +
    filters.vehicleTypes.length +
    (filters.minRating > 0 ? 1 : 0);

  const hasCoordinates = params.pickupLat && params.dropLat;

  return (
    <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-950" edges={['top']}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={isDark ? "#020617" : "#ffffff"} />
      {/* Header */}
      <View style={{ paddingHorizontal: spacing.lg, paddingVertical: vScale(16), borderBottomWidth: 1 }} className="flex-row justify-between items-center bg-white dark:bg-slate-900 border-border dark:border-slate-800 shadow-sm z-10">
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={hScale(24)} color={isDark ? "#f8fafc" : "#1f2937"} />
        </TouchableOpacity>
        <Text variant="h1" style={{ fontSize: fontSize.xl, marginLeft: hScale(16) }} className="flex-1 text-slate-900 dark:text-white">Search Results</Text>
        <View style={{ flexDirection: 'row', gap: spacing.md }}>
          <TouchableOpacity onPress={() => setShowSort(true)}>
            <Ionicons name="swap-vertical" size={hScale(24)} color={isDark ? "#f8fafc" : "#1f2937"} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setShowFilters(true)} className="relative">
            <Ionicons name="options-outline" size={hScale(24)} color={isDark ? "#f8fafc" : "#1f2937"} />
            {activeFilterCount > 0 && (
              <View style={{ top: -vScale(4), right: -hScale(4), width: hScale(16), height: hScale(16) }} className="absolute bg-red-500 rounded-full justify-center items-center">
                <Text style={{ fontSize: hScale(10) }} className="text-white font-bold">{activeFilterCount}</Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setShowPreferences(true)}>
            <Ionicons name="settings-outline" size={hScale(24)} color={isDark ? "#f8fafc" : "#1f2937"} />
          </TouchableOpacity>
        </View>
      </View>

      <NotificationBanner
        visible={notification.visible}
        type={notification.type}
        message={notification.message}
        onDismiss={() => setNotification({ ...notification, visible: false })}
      />

      {/* Search HistorySection (Only if no params) */}
      {!params.pickup && !params.drop && history.length > 0 && (
        <View style={{ padding: spacing.lg, borderBottomWidth: 1 }} className="bg-white dark:bg-slate-900 border-border dark:border-slate-800">
          <Text variant="h3" style={{ marginBottom: vScale(12) }} className="text-slate-900 dark:text-white">Recent Searches</Text>
          {history.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={{ paddingVertical: vScale(12), borderBottomWidth: 1, gap: spacing.md }}
              className="flex-row items-center border-gray-50 dark:border-slate-800"
              onPress={() => router.push({
                pathname: '/(tabs)/search',
                params: { pickup: item.pickup, drop: item.drop }
              })}
            >
              <Ionicons name="time-outline" size={hScale(20)} color={isDark ? "#94a3b8" : "#6b7280"} />
              <View className="flex-1">
                <Text style={{ fontSize: fontSize.base }} className="text-text-primary dark:text-white font-medium">{item.pickup} → {item.drop}</Text>
                <Text style={{ fontSize: fontSize.xs, marginTop: vScale(2) }} className="text-text-secondary dark:text-slate-400 font-medium">{new Date(item.timestamp).toLocaleDateString()}</Text>
              </View>
              <TouchableOpacity onPress={() => removeSearch(item.id)}>
                <Ionicons name="close-circle-outline" size={hScale(20)} color={isDark ? "#64748b" : "#9ca3af"} />
              </TouchableOpacity>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Result Count & Sort Info */}
      <View style={{ padding: spacing.lg, borderBottomWidth: 1 }} className="flex-row justify-between items-center bg-white dark:bg-slate-900 border-border dark:border-slate-800">
        <Text style={{ fontSize: fontSize.base }} className="font-semibold text-text-primary dark:text-white">
          {trips?.length || 0} trips found
        </Text>
        <Text style={{ fontSize: fontSize.xs }} className="text-text-secondary dark:text-slate-400">
          {sortBy === 'price-asc' && '💰 Price: Low to High'}
          {sortBy === 'price-desc' && '💰 Price: High to Low'}
          {sortBy === 'time-asc' && '🕐 Time: Earliest'}
          {sortBy === 'time-desc' && '🕐 Time: Latest'}
          {sortBy === 'rating-desc' && '⭐ Rating: Highest'}
        </Text>
      </View>

      {/* Trip List */}
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: spacing.lg }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {/* Instant Booking Section */}
        {hasCoordinates && (
          <FareEstimation
            pickupCoords={{
              lat: parseFloat(params.pickupLat as string),
              lng: parseFloat(params.pickupLng as string)
            }}
            dropCoords={{
              lat: parseFloat(params.dropLat as string),
              lng: parseFloat(params.dropLng as string)
            }}
            onBook={handleInstantBook}
          />
        )}

        {/* Scheduled Trips */}
        <Text variant="h3" style={{ marginBottom: vScale(16), marginTop: vScale(16) }} className="text-slate-900 dark:text-white">Available Rides</Text>

        {isLoading ? (
          // Loading Skeletons
          Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} style={{ padding: spacing.lg, marginBottom: vScale(16), borderRadius: hScale(12) }} className="border-border dark:border-slate-800 shadow-soft bg-white dark:bg-slate-900">
              <View className="flex-row items-center">
                <Skeleton style={{ width: hScale(48), height: hScale(48), borderRadius: hScale(24) }} />
                <View style={{ flex: 1, marginLeft: hScale(12) }}>
                  <Skeleton style={{ width: hScale(128), height: vScale(16), marginBottom: vScale(8) }} />
                  <Skeleton style={{ width: hScale(96), height: vScale(12) }} />
                </View>
                <Skeleton style={{ width: hScale(64), height: vScale(24) }} />
              </View>
              <Skeleton style={{ width: '100%', height: vScale(80), marginTop: vScale(16) }} />
            </Card>
          ))
        ) : paginatedTrips && paginatedTrips.length > 0 ? (
          <>
            {paginatedTrips.map((trip) => (
              <TripCard
                key={trip.id}
                trip={trip}
                onBook={() => router.push(`/trip/${trip.id}`)}
              />
            ))}

            {/* Pagination */}
            {totalPages > 1 && (
              <View style={{ marginTop: vScale(16), marginBottom: vScale(8) }}>
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={setCurrentPage}
                />
              </View>
            )}
          </>
        ) : (
          // Empty State - Using Shared Component
          <View className="mt-5">
            <NoTripsFound onSearch={() => {
              setFilters({ minPrice: 0, maxPrice: 5000, vehicleTypes: [], minRating: 0 });
              setSortBy('time-asc');
            }} />
          </View>
        )}
      </ScrollView>

      {/* Sort Modal */}
      <Modal
        visible={showSort}
        transparent
        animationType="slide"
        onRequestClose={() => setShowSort(false)}
      >
        <TouchableOpacity
          className="flex-1 bg-black/50 justify-end"
          activeOpacity={1}
          onPress={() => setShowSort(false)}
        >
          <View style={{ borderTopLeftRadius: hScale(24), borderTopRightRadius: hScale(24) }} className="bg-white dark:bg-slate-900 max-h-[80%]">
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.xl, borderBottomWidth: 1 }} className="border-border dark:border-slate-800">
              <Text variant="h2" className="text-slate-900 dark:text-white">Sort By</Text>
              <TouchableOpacity onPress={() => setShowSort(false)}>
                <Ionicons name="close" size={hScale(24)} color={isDark ? "#94a3b8" : "#6b7280"} />
              </TouchableOpacity>
            </View>

            {[
              { value: 'time-asc', label: 'Departure Time: Earliest', icon: 'time-outline' },
              { value: 'time-desc', label: 'Departure Time: Latest', icon: 'time-outline' },
              { value: 'price-asc', label: 'Price: Low to High', icon: 'cash-outline' },
              { value: 'price-desc', label: 'Price: High to Low', icon: 'cash-outline' },
              { value: 'rating-desc', label: 'Rating: Highest', icon: 'star-outline' },
            ].map((option) => (
              <TouchableOpacity
                key={option.value}
                style={{ padding: spacing.lg, borderBottomWidth: 1, gap: spacing.md }}
                className={`flex-row items-center border-border dark:border-slate-800 ${sortBy === option.value ? (isDark ? 'bg-blue-900/30' : 'bg-blue-50') : ''}`}
                onPress={() => {
                  setSortBy(option.value as SortOption);
                  setShowSort(false);
                  setCurrentPage(1);
                }}
              >
                <Ionicons
                  name={option.icon as any}
                  size={hScale(20)}
                  color={sortBy === option.value ? '#3b82f6' : (isDark ? '#94a3b8' : '#6b7280')}
                />
                <Text
                  style={{ fontSize: fontSize.sm }}
                  className={`flex-1 ${sortBy === option.value ? 'text-primary dark:text-blue-400 font-semibold' : 'text-text-primary dark:text-slate-300'}`}
                >
                  {option.label}
                </Text>
                {sortBy === option.value && (
                  <Ionicons name="checkmark" size={hScale(20)} color="#3b82f6" />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      <MobileFilters
        visible={showFilters}
        onClose={() => setShowFilters(false)}
        filters={{
          minPrice: filters.minPrice,
          maxPrice: filters.maxPrice,
          minSeats: 1,
          sortBy: sortBy.startsWith('price') ? 'price' : sortBy.startsWith('time') ? 'departure' : 'rating',
          sortOrder: sortBy.endsWith('desc') ? 'desc' : 'asc',
        }}
        onApply={(newFilters) => {
          setFilters({
            ...filters,
            minPrice: newFilters.minPrice || 0,
            maxPrice: newFilters.maxPrice || 5000,
          });
          if (newFilters.sortBy) {
            const prefix = newFilters.sortBy === 'departure' ? 'time' : newFilters.sortBy;
            setSortBy(`${prefix}-${newFilters.sortOrder || 'asc'}` as SortOption);
          }
          setCurrentPage(1);
          showNotification('Filters applied successfully', 'success');
        }}
      />

      {/* Preferences Modal */}
      <Modal
        visible={showPreferences}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPreferences(false)}
      >
        <TouchableOpacity
          className="flex-1 bg-black/50 justify-end"
          activeOpacity={1}
          onPress={() => setShowPreferences(false)}
        >
          <View style={{ borderTopLeftRadius: hScale(24), borderTopRightRadius: hScale(24) }} className="bg-white dark:bg-slate-900 max-h-[80%]">
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.xl, borderBottomWidth: 1 }} className="border-border dark:border-slate-800">
              <Text variant="h2" className="text-slate-900 dark:text-white">Ride Preferences</Text>
              <TouchableOpacity onPress={() => setShowPreferences(false)}>
                <Ionicons name="close" size={hScale(24)} color={isDark ? "#94a3b8" : "#6b7280"} />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: vScale(400) }}>
              <RidePreferences
                preferences={preferences}
                onPreferencesChange={setPreferences}
                showSaveButton={false}
                style={{ elevation: 0, shadowOpacity: 0 }}
              />
            </ScrollView>
            <View style={{ padding: spacing.lg, borderTopWidth: 1 }} className="border-border dark:border-slate-800">
              <Button style={{ height: vScale(48), borderRadius: hScale(12) }} onPress={() => setShowPreferences(false)}>Apply Preferences</Button>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

    </SafeAreaView>
  );
}


