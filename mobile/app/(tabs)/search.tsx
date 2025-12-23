import { View, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';

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

  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState<SortOption>('time-asc');
  const [showFilters, setShowFilters] = useState(false);
  const [showSort, setShowSort] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

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

  const totalPages = Math.ceil((trips?.length || 0) / ITEMS_PER_PAGE);
  const paginatedTrips = trips?.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const activeFilterCount =
    (filters.minPrice > 0 || filters.maxPrice < 5000 ? 1 : 0) +
    filters.vehicleTypes.length +
    (filters.minRating > 0 ? 1 : 0);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#1f2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Search Results</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={() => setShowSort(true)} style={styles.iconButton}>
            <Ionicons name="swap-vertical" size={24} color="#1f2937" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setShowFilters(true)} style={styles.iconButton}>
            <Ionicons name="options-outline" size={24} color="#1f2937" />
            {activeFilterCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{activeFilterCount}</Text>
              </View>
            )}
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
        <View style={styles.historyContainer}>
          <Text style={styles.sectionTitle}>Recent Searches</Text>
          {history.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.historyItem}
              onPress={() => router.push({
                pathname: '/(tabs)/search',
                params: { pickup: item.pickup, drop: item.drop }
              })}
            >
              <Ionicons name="time-outline" size={20} color="#6b7280" />
              <View style={styles.historyText}>
                <Text style={styles.historyRoute}>{item.pickup} → {item.drop}</Text>
                <Text style={styles.historyDate}>{new Date(item.timestamp).toLocaleDateString()}</Text>
              </View>
              <TouchableOpacity onPress={() => removeSearch(item.id)}>
                <Ionicons name="close-circle-outline" size={20} color="#9ca3af" />
              </TouchableOpacity>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Result Count & Sort Info */}
      <View style={styles.resultBar}>
        <Text style={styles.resultText}>
          {trips?.length || 0} trips found
        </Text>
        <Text style={styles.sortText}>
          {sortBy === 'price-asc' && '💰 Price: Low to High'}
          {sortBy === 'price-desc' && '💰 Price: High to Low'}
          {sortBy === 'time-asc' && '🕐 Time: Earliest'}
          {sortBy === 'time-desc' && '🕐 Time: Latest'}
          {sortBy === 'rating-desc' && '⭐ Rating: Highest'}
        </Text>
      </View>

      {/* Trip List */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.tripList}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {isLoading ? (
          // Loading Skeletons
          Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="p-4 mb-4">
              <View style={styles.skeletonCard}>
                <Skeleton className="w-12 h-12 rounded-full" />
                <View className="flex-1 ml-3">
                  <Skeleton className="w-32 h-4 mb-2" />
                  <Skeleton className="w-24 h-3" />
                </View>
                <Skeleton className="w-16 h-6" />
              </View>
              <Skeleton className="w-full h-20 mt-4" />
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
              <View style={styles.paginationContainer}>
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={setCurrentPage}
                />
              </View>
            )}
          </>
        ) : (
          // Empty State
          <View style={styles.emptyState}>
            <Ionicons name="car-outline" size={80} color="#d1d5db" />
            <Text style={styles.emptyTitle}>No trips found</Text>
            <Text style={styles.emptyDescription}>
              Try adjusting your search criteria or filters
            </Text>
            <Button
              variant="outline"
              onPress={() => {
                setFilters({
                  minPrice: 0,
                  maxPrice: 5000,
                  vehicleTypes: [],
                  minRating: 0,
                });
                setSortBy('time-asc');
              }}
              className="mt-4"
            >
              Reset Filters
            </Button>
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
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowSort(false)}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Sort By</Text>
              <TouchableOpacity onPress={() => setShowSort(false)}>
                <Ionicons name="close" size={24} color="#6b7280" />
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
                style={[
                  styles.sortOption,
                  sortBy === option.value && styles.sortOptionActive,
                ]}
                onPress={() => {
                  setSortBy(option.value as SortOption);
                  setShowSort(false);
                  setCurrentPage(1);
                }}
              >
                <Ionicons
                  name={option.icon as any}
                  size={20}
                  color={sortBy === option.value ? '#3b82f6' : '#6b7280'}
                />
                <Text
                  style={[
                    styles.sortOptionText,
                    sortBy === option.value && styles.sortOptionTextActive,
                  ]}
                >
                  {option.label}
                </Text>
                {sortBy === option.value && (
                  <Ionicons name="checkmark" size={20} color="#3b82f6" />
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    flex: 1,
    marginLeft: 16,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  iconButton: {
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#ef4444',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  resultBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  resultText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  sortText: {
    fontSize: 12,
    color: '#6b7280',
  },
  scrollView: {
    flex: 1,
  },
  tripList: {
    padding: 16,
  },
  skeletonCard: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  paginationContainer: {
    marginTop: 16,
    marginBottom: 8,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1f2937',
    marginTop: 16,
  },
  emptyDescription: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 40,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
  },
  sortOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
    gap: 12,
  },
  sortOptionActive: {
    backgroundColor: '#eff6ff',
  },
  sortOptionText: {
    flex: 1,
    fontSize: 14,
    color: '#374151',
  },
  sortOptionTextActive: {
    color: '#3b82f6',
    fontWeight: '600',
  },
  filterContent: {
    padding: 20,
  },
  filterSection: {
    marginBottom: 24,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 12,
  },
  sliderContainer: {
    paddingHorizontal: 8,
  },
  ratingOptions: {
    flexDirection: 'row',
    gap: 8,
  },
  ratingOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#ffffff',
  },
  ratingOptionActive: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  ratingOptionText: {
    fontSize: 12,
    color: '#374151',
  },
  ratingOptionTextActive: {
    color: '#ffffff',
  },
  filterActions: {
    flexDirection: 'row',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  historyContainer: {
    padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f9fafb',
    gap: 12,
  },
  historyText: {
    flex: 1,
  },
  historyRoute: {
    fontSize: 15,
    fontWeight: '500',
    color: '#374151',
  },
  historyDate: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 12,
  },
});
