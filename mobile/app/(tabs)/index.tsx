import { View, StyleSheet, TouchableOpacity, ScrollView, ImageBackground } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { LocationAutocomplete } from '@/components/LocationAutocomplete';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Text } from '@/components/ui/text';
import { Calendar } from '@/components/ui/calendar';
import { Coordinates } from '@/lib/maps';
import { QuickActions } from '@/components/QuickActions';
import { PopularRoutesMobile } from '@/components/HomeComponents';
import { HomeMap } from '@/components/HomeMap';
import { RideService, Ride } from '@/services/RideService';
import { supabase } from '@/lib/supabase';
import { QuickBookModal } from '@/components/QuickBookModal';

export default function HomeScreen() {
  const router = useRouter();
  const [pickup, setPickup] = useState('');
  const [pickupCoords, setPickupCoords] = useState<Coordinates>();
  const [drop, setDrop] = useState('');
  const [dropCoords, setDropCoords] = useState<Coordinates>();
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [showDatePicker, setShowDatePicker] = useState(false);

  // State for QuickActions data
  const [recentRide, setRecentRide] = useState<{ destination: string; time: string } | undefined>();
  const [savedPlaces, setSavedPlaces] = useState<Array<{ id: string, name: string, icon: string, lat?: number, lng?: number }>>([]);
  const [showQuickBook, setShowQuickBook] = useState(false);

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const rides = await RideService.getRecentRides(user.id, 1);
    if (rides.length > 0) {
      setRecentRide({
        destination: rides[0].drop_location,
        time: new Date(rides[0].created_at).toLocaleDateString()
      });
    }

    const { data: places, error: placesError } = await supabase
      .from('saved_places')
      .select('*')
      .eq('user_id', user.id);

    if (placesError) {
      console.log('Error fetching saved places:', placesError);
      setSavedPlaces([]);
    } else if (places && places.length > 0) {
      setSavedPlaces(places.map((p: any) => ({
        id: p.id,
        name: p.label || p.name,
        icon: p.place_type === 'home' ? 'home' : p.place_type === 'work' ? 'briefcase' : 'location',
        lat: p.latitude,
        lng: p.longitude
      })));
    } else {
      setSavedPlaces([]);
    }
  };

  const handleSearch = () => {
    if (!pickup || !drop) return;

    const params = {
      pickup,
      drop,
      pickupLat: pickupCoords?.lat.toString(),
      pickupLng: pickupCoords?.lng.toString(),
      dropLat: dropCoords?.lat.toString(),
      dropLng: dropCoords?.lng.toString(),
      date: selectedDate?.toISOString(),
    };

    router.push({
      pathname: '/(tabs)/search',
      params
    });
  };

  const handleQuickAction = async (action: string) => {
    console.log('Quick Action:', action);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    if (action === 'repeat_ride') {
      const rides = await RideService.getRecentRides(user.id, 1);
      if (rides.length > 0) {
        const ride = rides[0];
        setPickup(ride.pickup_location);
        setPickupCoords({ lat: ride.pickup_lat, lng: ride.pickup_lng });
        setDrop(ride.drop_location);
        setDropCoords({ lat: ride.drop_lat, lng: ride.drop_lng });
      }
    } else if (action === 'add_place') {
      router.push('/saved-places' as any);
    } else if (action.startsWith('place_')) {
      const placeId = action.split('_')[1];
      const place = savedPlaces.find(p => p.id === placeId);
      if (place) {
        setDrop(place.name);
        if (place.lat && place.lng) {
          setDropCoords({ lat: place.lat, lng: place.lng });
        }
      }
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View className="flex-row justify-between items-center px-4 py-3 bg-white border-b border-gray-200">
        <View className="flex-row items-center gap-2">
          <View className="w-8 h-8 rounded-lg bg-primary items-center justify-center">
            <Text className="text-white font-bold text-lg">T</Text>
          </View>
          <Text variant="h3" className="text-primary text-xl font-bold">TCSYGO</Text>
        </View>
        <View className="flex-row items-center gap-2">
          <TouchableOpacity onPress={() => router.push('/notifications')}>
            <Ionicons name="notifications-outline" size={24} color="#3b82f6" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push('/(tabs)/profile')}>
            <Ionicons name="person-circle-outline" size={32} color="#3b82f6" />
            <View style={{ position: 'absolute', bottom: 0, right: 0, width: 10, height: 10, borderRadius: 5, backgroundColor: '#10b981', borderWidth: 1, borderColor: 'white' }} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Search Card */}
        <View className="px-4 py-6 bg-blue-600 pb-12">
          <Text style={styles.heroTitle}>Where to today?</Text>
        </View>

        <View className="px-4 -mt-8">
          <Card className="p-4 bg-white shadow-lg">
            <View className="gap-4">
              <View className="relative z-20">
                <LocationAutocomplete
                  placeholder="Pickup location"
                  value={pickup}
                  onChange={(val, coords) => {
                    setPickup(val);
                    if (coords) setPickupCoords(coords);
                  }}
                  className="z-20"
                />
              </View>

              <View className="relative z-10">
                <LocationAutocomplete
                  placeholder="Drop location"
                  value={drop}
                  onChange={(val, coords) => {
                    setDrop(val);
                    if (coords) setDropCoords(coords);
                  }}
                  className="z-10"
                />
              </View>

              <TouchableOpacity
                onPress={() => setShowDatePicker(!showDatePicker)}
                style={styles.dateButton}
              >
                <Ionicons name="calendar-outline" size={20} color="#6b7280" />
                <Text style={styles.dateText}>
                  {selectedDate ? selectedDate.toLocaleDateString() : 'Now'}
                </Text>
                {!selectedDate && <Text style={{ fontSize: 10, color: '#10b981', marginLeft: 'auto', fontWeight: 'bold' }}>CHEAPEST</Text>}
              </TouchableOpacity>

              {showDatePicker && (
                <Calendar
                  selected={selectedDate}
                  onSelect={(date) => {
                    setSelectedDate(date);
                    setShowDatePicker(false);
                  }}
                  minDate={new Date()}
                />
              )}

              <Button
                onPress={handleSearch}
                disabled={!pickup || !drop}
                size="lg"
                className="w-full mt-2"
              >
                <Ionicons name="search" size={20} color="white" style={{ marginRight: 8 }} />
                Search Rides
              </Button>

              <Button
                onPress={() => setShowQuickBook(true)}
                disabled={!pickup || !drop}
                variant="outline"
                size="lg"
                className="w-full"
              >
                <Ionicons name="flash" size={20} color="#3b82f6" style={{ marginRight: 8 }} />
                Quick Book (Instant)
              </Button>
            </View>
          </Card>
        </View>

        {pickupCoords && dropCoords && (
          <QuickBookModal
            visible={showQuickBook}
            onClose={() => setShowQuickBook(false)}
            pickup={{ address: pickup, coords: pickupCoords }}
            drop={{ address: drop, coords: dropCoords }}
            onBookingSuccess={(bookingId) => {
              setShowQuickBook(false);
              router.push(`/booking/${bookingId}`);
            }}
          />
        )}

        {/* Quick Actions (Rapido Style) */}
        <View className="px-4 mt-8">
          <QuickActions
            onAction={handleQuickAction}
            recentRide={recentRide}
            savedPlaces={savedPlaces}
          />
        </View>

        {/* Map View */}
        <HomeMap />

        {/* Popular Routes */}
        <View className="px-4 mt-4">
          <PopularRoutesMobile />
        </View>

        {/* Why Choose TCSYGO */}
        <View className="px-4 mt-8">
          <Text style={styles.sectionTitle}>Why Choose TCSYGO?</Text>

          <View style={styles.featureGrid}>
            <Card className="p-6 mb-4">
              <View className="items-center">
                <View style={[styles.iconCircle, { backgroundColor: '#dbeafe' }]}>
                  <Ionicons name="cash-outline" size={32} color="#3b82f6" />
                </View>
                <Text style={styles.featureTitle}>Save Money</Text>
                <Text style={styles.featureDescription}>
                  Share travel costs and make your journey more affordable
                </Text>
              </View>
            </Card>

            <Card className="p-6 mb-4">
              <View className="items-center">
                <View style={[styles.iconCircle, { backgroundColor: '#d1fae5' }]}>
                  <Ionicons name="leaf-outline" size={32} color="#10b981" />
                </View>
                <Text style={styles.featureTitle}>Go Green</Text>
                <Text style={styles.featureDescription}>
                  Reduce carbon emissions by sharing rides with others
                </Text>
              </View>
            </Card>

            <Card className="p-6 mb-4">
              <View className="items-center">
                <View style={[styles.iconCircle, { backgroundColor: '#fef3c7' }]}>
                  <Ionicons name="shield-checkmark-outline" size={32} color="#f59e0b" />
                </View>
                <Text style={styles.featureTitle}>Travel Safe</Text>
                <Text style={styles.featureDescription}>
                  Verified drivers and secure payment options for peace of mind
                </Text>
              </View>
            </Card>
          </View>
        </View>

        {/* How It Works */}
        <View className="px-4 mt-8 mb-8">
          <Text style={styles.sectionTitle}>How It Works</Text>

          <Card className="p-4 mb-3">
            <View className="flex-row items-start gap-4">
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>1</Text>
              </View>
              <View className="flex-1">
                <Text style={styles.stepTitle}>Search for a ride</Text>
                <Text style={styles.stepDescription}>
                  Enter your pickup and drop locations to find available trips
                </Text>
              </View>
            </View>
          </Card>

          <Card className="p-4 mb-3">
            <View className="flex-row items-start gap-4">
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>2</Text>
              </View>
              <View className="flex-1">
                <Text style={styles.stepTitle}>Book your seat</Text>
                <Text style={styles.stepDescription}>
                  Choose a trip that matches your schedule and budget
                </Text>
              </View>
            </View>
          </Card>

          <Card className="p-4 mb-3">
            <View className="flex-row items-start gap-4">
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>3</Text>
              </View>
              <View className="flex-1">
                <Text style={styles.stepTitle}>Enjoy your journey</Text>
                <Text style={styles.stepDescription}>
                  Track your ride in real-time and arrive safely at your destination
                </Text>
              </View>
            </View>
          </Card>
        </View>

        {/* CTA Buttons */}
        <View className="px-4 mb-8">
          <Button
            size="lg"
            className="w-full mb-3"
            onPress={() => router.push('/(tabs)/search')}
          >
            <Ionicons name="people-outline" size={20} color="white" style={{ marginRight: 8 }} />
            Find a Ride
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="w-full"
            onPress={() => router.push('/create-trip')}
          >
            Offer a Ride
          </Button>
        </View>
      </ScrollView>

      {/* FAB for Create Trip */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push('/create-trip')}
      >
        <Ionicons name="add" size={28} color="white" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  scrollView: {
    flex: 1,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 12,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    backgroundColor: '#ffffff',
  },
  dateText: {
    fontSize: 14,
    color: '#6b7280',
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    textAlign: 'center',
    marginBottom: 20,
  },
  featureGrid: {
    gap: 16,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  featureTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 8,
  },
  featureDescription: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  stepNumber: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#dbeafe',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepNumberText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#3b82f6',
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  stepDescription: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
});
