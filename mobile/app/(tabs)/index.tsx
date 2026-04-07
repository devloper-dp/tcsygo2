import { View, StyleSheet, TouchableOpacity, ScrollView, StatusBar, Modal, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { LocationInput } from '@/components/LocationInput';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Text } from '@/components/ui/text';
import { Coordinates } from '@/lib/maps';
import { QuickActions } from '@/components/QuickActions';
import { PopularRoutesMobile } from '@/components/HomeComponents';
import { HomeMap } from '@/components/HomeMap';
import { RideService } from '@/services/RideService';
import { supabase } from '@/lib/supabase';
import { QuickBookModal } from '@/components/QuickBookModal';
import { useQuery } from '@tanstack/react-query';
import { OnboardingTutorial } from '@/components/OnboardingTutorial';
import { SafetyTips } from '@/components/SafetyTips';
import { CarbonFootprint } from '@/components/CarbonFootprint';
import { RidePreferences } from '@/components/RidePreferences';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useTranslation } from 'react-i18next';
import { Bell, User, Map as MapIcon, Plus, X, Search, ArrowRight } from 'lucide-react-native';
import { useResponsive } from '@/hooks/useResponsive';

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { t } = useTranslation();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { hScale, vScale, spacing, fontSize } = useResponsive();
  const [pickup, setPickup] = useState('');
  const [pickupCoords, setPickupCoords] = useState<Coordinates>();
  const [drop, setDrop] = useState('');
  const [dropCoords, setDropCoords] = useState<Coordinates>();
  const [selectedDate, setSelectedDate] = useState<Date>();

  // State for QuickActions data
  const [recentRide, setRecentRide] = useState<{ destination: string; time: string } | undefined>();
  const [savedPlaces, setSavedPlaces] = useState<Array<{ id: string, name: string, icon: string, lat?: number, lng?: number }>>([]);
  const [showQuickBook, setShowQuickBook] = useState(false);

  // New States
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);

  // Fetch user statistics
  const { data: userStats } = useQuery({
    queryKey: ['user-stats'],
    queryFn: async () => {
      if (!user) return { totalDistance: 0, totalRides: 0 };

      const { data: bookings } = await supabase
        .from('bookings')
        .select('trip:trips(distance_covered)')
        .eq('passenger_id', user.id)
        .eq('status', 'completed');

      const totalDistance = bookings?.reduce((sum, b: any) => sum + (parseFloat(b.trip?.distance_covered) || 0), 0) || 0;
      return { totalDistance, totalRides: bookings?.length || 0 };
    },
    enabled: !!user
  });

  useEffect(() => {
    fetchUserData();
    checkOnboarding();
    checkActiveDriverTrip();
  }, []);

  const checkOnboarding = async () => {
    // Check local storage first
    const hasCompleted = await AsyncStorage.getItem('onboarding_completed');
    if (!hasCompleted) {
      setShowOnboarding(true);
    }
  };

  const checkActiveDriverTrip = async () => {
    // If user is a driver, check for ongoing trips to redirect
    if (user?.role === 'driver') {
      const { data: driver } = await supabase.from('drivers').select('id').eq('user_id', user.id).single();
      if (driver) {
        const { data: activeTrip } = await supabase
          .from('trips')
          .select('id')
          .eq('driver_id', driver.id)
          .eq('status', 'ongoing')
          .maybeSingle();

        if (activeTrip) {
          router.replace(`/track/${activeTrip.id}`);
        }
      }
    }
  };

  const fetchUserData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const rides = await RideService.getRecentRides(user.id, 1);
    if (rides.length > 0) {
      setRecentRide({
        destination: (rides[0] as any).dropLocation,
        time: new Date((rides[0] as any).createdAt).toLocaleDateString()
      });
    }

    const { data: places } = await supabase.from('saved_places').select('*').eq('user_id', user.id);
    if (places && places.length > 0) {
      setSavedPlaces(places.map((p: any) => ({
        id: p.id,
        name: p.label || p.name,
        icon: p.place_type === 'home' ? 'home' : p.place_type === 'work' ? 'briefcase' : 'location',
        lat: p.latitude,
        lng: p.longitude
      })));
    }
  };

  const handleSearch = () => {
    if (!pickup || !drop) return;
    router.push({
      pathname: '/(tabs)/search',
      params: {
        pickup, drop,
        pickupLat: pickupCoords?.lat.toString(),
        pickupLng: pickupCoords?.lng.toString(),
        dropLat: dropCoords?.lat.toString(),
        dropLng: dropCoords?.lng.toString(),
        date: selectedDate?.toISOString(),
      }
    });
  };

  const handleQuickAction = async (action: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    if (action === 'repeat_ride') {
      const rides = await RideService.getRecentRides(user.id, 1);
      if (rides.length > 0) {
        const ride = rides[0] as any;
        setPickup(ride.pickupLocation);
        setPickupCoords({ lat: ride.pickupLat, lng: ride.pickupLng });
        setDrop(ride.dropLocation);
        setDropCoords({ lat: ride.dropLat, lng: ride.dropLng });
      }
    } else if (action === 'add_place') {
      router.push('/saved-places');
    } else if (action === 'preferences') {
      setShowPreferences(true);
    } else if (action.startsWith('place_')) {
      const placeId = action.split('_')[1];
      const place = savedPlaces.find(p => p.id === placeId);
      if (place) {
        setDrop(place.name);
        if (place.lat && place.lng) setDropCoords({ lat: place.lat, lng: place.lng });
      }
    }
  };

  return (
    <View className="flex-1 bg-slate-50 dark:bg-slate-950">
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={isDark ? "#020617" : "#ffffff"} />

      {/* Onboarding Tutorial */}
      <OnboardingTutorial
        visible={showOnboarding}
        onComplete={() => setShowOnboarding(false)}
      />

      {/* Ride Preferences Modal */}
      <Modal
        visible={showPreferences}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPreferences(false)}
      >
        <TouchableOpacity
          className="flex-1 bg-black/50 justify-end"
          activeOpacity={1}
          >
          <View style={{ borderTopLeftRadius: hScale(24), borderTopRightRadius: hScale(24), padding: spacing.xl }} className="bg-white dark:bg-slate-900 max-h-[80%]">
            <View style={{ paddingBottom: vScale(16), marginBottom: vScale(8), borderBottomWidth: 1 }} className="flex-row justify-between items-center border-slate-100 dark:border-slate-800">
              <Text style={{ fontSize: fontSize.xl }} className="font-bold text-slate-900 dark:text-white">Ride Preferences</Text>
              <TouchableOpacity onPress={() => setShowPreferences(false)}>
                <X size={hScale(24)} color={isDark ? "#94a3b8" : "#64748b"} />
              </TouchableOpacity>
            </View>
            <RidePreferences userId={user?.id} />
          </View>
        </TouchableOpacity>
      </Modal>


      {/* HEADER: Premium Slate Design */}
      <View style={{ paddingTop: vScale(8), paddingHorizontal: spacing.xl, paddingBottom: vScale(16), borderBottomWidth: 1 }} className="bg-white dark:bg-slate-900 border-slate-50 dark:border-slate-800 z-50 shadow-sm">
        <SafeAreaView edges={['top']} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
            <View style={{ width: hScale(40), height: hScale(40), borderRadius: hScale(20), borderWidth: 1 }} className="bg-slate-100 dark:bg-slate-800 items-center justify-center border-slate-200 dark:border-slate-700 overflow-hidden">
              <Text style={{ fontSize: fontSize.lg }} className="text-slate-600 dark:text-slate-400 font-bold">{user?.fullName?.charAt(0) || 'U'}</Text>
            </View>
            <View>
              <Text style={{ fontSize: hScale(10) }} className="text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">Good Morning,</Text>
              <Text style={{ fontSize: fontSize.lg }} className="font-extrabold text-slate-900 dark:text-white leading-tight">{user?.fullName?.split(' ')[0]}</Text>
            </View>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
            <TouchableOpacity
              onPress={() => router.push('/notifications')}
              style={{ width: hScale(40), height: hScale(40), borderRadius: hScale(20), borderWidth: 1 }}
              className="bg-slate-50 dark:bg-slate-800 border-slate-100 dark:border-slate-700 items-center justify-center active:bg-slate-100"
            >
              <Bell size={hScale(20)} color={isDark ? "#94a3b8" : "#64748b"} />
              <View style={{ top: vScale(10), right: hScale(12), width: hScale(8), height: hScale(8) }} className="absolute rounded-full bg-red-500 ring-2 ring-white dark:ring-slate-900" />
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>

      <ScrollView 
        style={{ flex: 1, paddingHorizontal: spacing.xl }} 
        contentContainerStyle={{ paddingBottom: vScale(100), paddingTop: vScale(24) }} 
        showsVerticalScrollIndicator={false}
      >

        {/* HERO CARD: Search */}
        <View style={{ marginBottom: vScale(32) }}>
          <Card style={{ padding: spacing.xl, borderRadius: hScale(24), borderWidth: 1 }} className="bg-white dark:bg-slate-900 shadow-lg shadow-slate-200/50 border-slate-100 dark:border-slate-800">
            <View style={{ borderRadius: hScale(16), borderWidth: 1, marginBottom: vScale(24) }} className="bg-slate-50 dark:bg-slate-800 border-slate-100 dark:border-slate-700 overflow-hidden relative">
              {/* Connector Line */}
              <View style={{ left: hScale(34), top: vScale(44), bottom: vScale(44), width: 2 }} className="absolute bg-slate-300 dark:bg-slate-600 z-10" />

              <View style={{ padding: spacing.xs }}>
                <LocationInput
                  placeholder="Current Location"
                  value={pickup}
                  onChange={(val, coords) => {
                    setPickup(val);
                    if (coords) setPickupCoords(coords);
                  }}
                  isPickup
                />
              </View>
              <View style={{ height: 1, marginHorizontal: spacing.xl }} className="bg-slate-200 dark:bg-slate-700" />
              <View style={{ padding: spacing.xs }}>
                <LocationInput
                  placeholder="Enter destination"
                  value={drop}
                  onChange={(val, coords) => {
                    setDrop(val);
                    if (coords) setDropCoords(coords);
                  }}
                />
              </View>
            </View>

            <Button
              onPress={handleSearch}
              disabled={!pickup || !drop}
              style={{ width: '100%', height: vScale(56), borderRadius: hScale(16), flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.md }}
              className={`shadow-button ${!pickup || !drop ? (isDark ? 'bg-slate-800' : 'bg-slate-300') : (isDark ? 'bg-white' : 'bg-slate-900')}`}
            >
              <Search size={hScale(20)} color={isDark && pickup && drop ? "black" : "white"} />
              <Text style={{ fontSize: fontSize.lg }} className={`${isDark && pickup && drop ? 'text-slate-900' : 'text-white'} font-bold tracking-wide`}>Find a Ride</Text>
            </Button>
          </Card>
        </View>

        {/* Quick Actions */}
        <View style={{ marginBottom: vScale(32) }}>
          <QuickActions
            onAction={handleQuickAction}
            recentRide={recentRide}
            savedPlaces={savedPlaces}
          />
        </View>

        <View style={{ marginBottom: vScale(32) }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: vScale(16), paddingHorizontal: spacing.xs }}>
            <View>
              <Text style={{ fontSize: fontSize.lg }} className="font-bold text-slate-900 dark:text-white">Nearby Rides</Text>
              <Text style={{ fontSize: fontSize.sm, marginTop: vScale(2) }} className="text-slate-500 dark:text-slate-400 font-medium">Explore available rides around you</Text>
            </View>
            <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={{ fontSize: hScale(12), marginRight: spacing.xs }} className="text-blue-600 dark:text-blue-400 font-bold uppercase tracking-wide">View All</Text>
              <ArrowRight size={hScale(12)} color={isDark ? "#60a5fa" : "#2563eb"} />
            </TouchableOpacity>
          </View>

          <View style={{ height: vScale(256), borderRadius: hScale(24), borderWidth: 1 }} className="overflow-hidden shadow-md bg-slate-100 border-slate-100 relative">
            <HomeMap />
            <LinearGradient
              colors={['transparent', 'rgba(15, 23, 42, 0.05)']}
              style={StyleSheet.absoluteFill}
              pointerEvents="none"
            />
            <TouchableOpacity
              activeOpacity={0.9}
              style={{ bottom: vScale(16), right: hScale(16), width: hScale(48), height: hScale(48), borderRadius: hScale(16), borderWidth: 1 }}
              className="absolute bg-white items-center justify-center shadow-lg border-slate-100"
            >
              <MapIcon size={hScale(24)} color="#0f172a" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Popular Routes */}
        <View style={{ marginBottom: vScale(32) }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: vScale(16), paddingHorizontal: spacing.xs }}>
            <View>
              <Text style={{ fontSize: fontSize.lg }} className="font-bold text-slate-900 dark:text-white">{t('popular_routes') || "Popular Routes"}</Text>
              <Text style={{ fontSize: fontSize.sm, marginTop: vScale(2) }} className="text-slate-500 dark:text-slate-400 font-medium">Most traveled paths this week</Text>
            </View>
          </View>
          <PopularRoutesMobile />
        </View>

        {/* Safety Tips Section */}
        <View style={{ marginBottom: vScale(32) }}>
          <Text style={{ fontSize: fontSize.lg, marginBottom: vScale(16), paddingHorizontal: spacing.xs }} className="font-bold text-slate-900 dark:text-white">Safety First</Text>
          <SafetyTips />
        </View>

        {/* Carbon Footprint Section - Only show if data exists */}
        {userStats && (userStats.totalDistance > 0 || userStats.totalRides > 0) && (
          <View style={{ marginBottom: vScale(32) }}>
            <Text style={{ fontSize: fontSize.lg, marginBottom: vScale(16), paddingHorizontal: spacing.xs }} className="font-bold text-slate-900 dark:text-white">Your Impact</Text>
            <CarbonFootprint totalDistance={userStats.totalDistance} totalRides={userStats.totalRides} />
          </View>
        )}

      </ScrollView>

      {/* Primary Floating Action Button - Drivers Only */}
      {user?.role === 'driver' && (
        <TouchableOpacity
          onPress={() => router.push('/create-trip')}
          activeOpacity={0.9}
          style={{ bottom: vScale(24), right: hScale(24), width: hScale(64), height: hScale(64), borderRadius: hScale(32), borderWidth: 4 }}
          className="absolute bg-slate-900 items-center justify-center shadow-xl z-50 border-white"
        >
          <Plus size={hScale(32)} color="white" />
        </TouchableOpacity>
      )}

      {/* Booking Modal */}
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

    </View>
  );
}
