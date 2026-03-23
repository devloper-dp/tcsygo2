import { View, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Map, Marker } from '../components/Map';
import { Ionicons } from '@expo/vector-icons';
import { LocationAutocomplete } from '../components/LocationAutocomplete';
import { TripCard } from '../components/TripCard';
import { TripWithDriver } from '../types/schema';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Text } from '../components/ui/text';
import { supabase } from '../lib/supabase';
import { mapTrip } from '../lib/mapper';
import { useAuth } from '@/contexts/AuthContext';
import { Coordinates } from '../lib/maps';
import { NoTripsFound } from '../components/EmptyStates';
import { useTheme } from '@/contexts/ThemeContext';
import { useResponsive } from '@/hooks/useResponsive';

export default function SearchScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const { isDark } = useTheme();
    const { spacing, fontSize, hScale, vScale } = useResponsive();

    const [pickup, setPickup] = useState(params.pickup as string || '');
    const [drop, setDrop] = useState(params.drop as string || '');
    const [pickupCoords, setPickupCoords] = useState<Coordinates | undefined>(
        params.pickupLat && params.pickupLng
            ? { lat: parseFloat(params.pickupLat as string), lng: parseFloat(params.pickupLng as string) }
            : undefined
    );
    const [dropCoords, setDropCoords] = useState<Coordinates | undefined>(
        params.dropLat && params.dropLng
            ? { lat: parseFloat(params.dropLat as string), lng: parseFloat(params.dropLng as string) }
            : undefined
    );
    const [date, setDate] = useState(params.date as string || '');
    const [savedSearches, setSavedSearches] = useState<any[]>([]);
    const { user } = useAuth();

    useEffect(() => {
        if (user) {
            fetchSavedSearches();
        }
    }, [user]);

    const fetchSavedSearches = async () => {
        try {
            const { data, error } = await supabase
                .from('saved_searches')
                .select('*')
                .eq('user_id', user?.id)
                .order('created_at', { ascending: false })
                .limit(5);

            if (data) setSavedSearches(data);
        } catch (error) {
            console.error('Error fetching saved searches:', error);
        }
    };

    const saveSearch = async (pickupLoc: string, dropLoc: string) => {
        if (!user || (!pickupLoc && !dropLoc)) return;

        try {
            const { data: existing } = await supabase
                .from('saved_searches')
                .select('id')
                .eq('user_id', user.id)
                .eq('pickup_location', pickupLoc)
                .eq('drop_location', dropLoc)
                .limit(1);

            if (existing && existing.length > 0) return;

            await supabase
                .from('saved_searches')
                .insert({
                    user_id: user.id,
                    name: `${pickupLoc} to ${dropLoc}`,
                    pickup_location: pickupLoc,
                    drop_location: dropLoc
                });

            fetchSavedSearches();
        } catch (error) {
            console.error('Error saving search:', error);
        }
    };

    const [showMap, setShowMap] = useState(false);

    const { data: trips, isLoading } = useQuery<TripWithDriver[]>({
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
        enabled: true,
    });

    useEffect(() => {
        if (pickup && drop && trips && trips.length > 0) {
            const timer = setTimeout(() => {
                saveSearch(pickup, drop);
            }, 2000);
            return () => clearTimeout(timer);
        }
    }, [pickup, drop, trips]);


    return (
        <SafeAreaView className="flex-1 bg-white dark:bg-slate-950" edges={['top']}>
            <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
            <Stack.Screen options={{ headerShown: false }} />

            <View 
                style={{ paddingHorizontal: spacing.xl, paddingVertical: spacing.lg }}
                className="flex-row items-center justify-between bg-white dark:bg-slate-950 border-b border-slate-100 dark:border-slate-800 shadow-sm z-30"
            >
                <TouchableOpacity 
                    onPress={() => router.back()} 
                    style={{ width: hScale(48), height: hScale(48) }}
                    className="rounded-full bg-slate-50 dark:bg-slate-900 items-center justify-center border border-slate-100 dark:border-slate-800"
                >
                    <Ionicons name="arrow-back" size={hScale(24)} color={isDark ? "#f8fafc" : "#1e293b"} />
                </TouchableOpacity>
                <Text style={{ fontSize: fontSize.xl }} className="flex-1 text-center font-black text-slate-900 dark:text-white uppercase tracking-tighter">Discovery</Text>
                <TouchableOpacity
                    onPress={() => setShowMap(!showMap)}
                    style={{ width: hScale(48), height: hScale(48), borderRadius: hScale(18) }}
                    className="bg-slate-900 dark:bg-white items-center justify-center shadow-lg shadow-slate-900/10"
                >
                    <Ionicons name={showMap ? "list" : "map"} size={hScale(22)} color={isDark ? "#0f172a" : "#ffffff"} />
                </TouchableOpacity>
            </View>

            <View 
                style={{ paddingHorizontal: spacing.xl, paddingVertical: vScale(32) }}
                className="bg-white dark:bg-slate-950 border-b border-slate-100 dark:border-slate-800/50 z-20 shadow-xl rounded-b-[40px]"
            >
                <LocationAutocomplete
                    placeholder="Source Terminal"
                    value={pickup}
                    onChange={(val, coords) => {
                        setPickup(val);
                        if (coords) setPickupCoords(coords);
                    }}
                    className="mb-4"
                    showIcon={true}
                    placeholderTextColor={isDark ? "#475569" : "#94a3b8"}
                />
                <LocationAutocomplete
                    placeholder="Destination Terminal"
                    value={drop}
                    onChange={(val, coords) => {
                        setDrop(val);
                        if (coords) setDropCoords(coords);
                    }}
                    showIcon={true}
                    placeholderTextColor={isDark ? "#475569" : "#94a3b8"}
                />
            </View>

            {showMap ? (
                <View className="flex-1 overflow-hidden mt-[-20px] bg-slate-50 dark:bg-slate-950">
                    <Map
                        style={StyleSheet.absoluteFillObject}
                        initialRegion={{
                            latitude: pickupCoords?.lat || 28.6139,
                            longitude: pickupCoords?.lng || 77.2090,
                            latitudeDelta: 0.0922,
                            longitudeDelta: 0.0421,
                        }}
                    >
                        {pickupCoords && (
                            <Marker
                                coordinate={{ latitude: pickupCoords.lat, longitude: pickupCoords.lng }}
                                title="Pickup"
                                pinColor="green"
                            />
                        )}
                        {dropCoords && (
                            <Marker
                                coordinate={{ latitude: dropCoords.lat, longitude: dropCoords.lng }}
                                title="Drop"
                                pinColor="red"
                            />
                        )}
                    </Map>
                </View>
            ) : (
                <ScrollView 
                    className="flex-1" 
                    contentContainerStyle={{ padding: spacing.xl, paddingBottom: vScale(100) }}
                    showsVerticalScrollIndicator={false}
                >
                    {!pickup && !drop && (
                        <View style={{ marginBottom: vScale(40) }}>
                            <Text style={{ fontSize: hScale(10), marginBottom: vScale(24) }} className="font-black text-slate-400 dark:text-slate-500 uppercase tracking-[2px] px-1">Tactical History</Text>
                            {savedSearches.length > 0 ? (
                                savedSearches.map((search) => (
                                    <TouchableOpacity
                                        key={search.id}
                                        style={{ padding: spacing.xl, marginBottom: spacing.base }}
                                        className="flex-row items-center bg-white dark:bg-slate-900 rounded-[28px] border border-slate-100 dark:border-slate-800 shadow-sm active:bg-slate-50 dark:active:bg-slate-800"
                                        onPress={() => {
                                            setPickup(search.pickup_location || '');
                                            setDrop(search.drop_location || '');
                                        }}
                                    >
                                        <View style={{ width: hScale(48), height: hScale(48), marginRight: spacing.xl }} className="bg-blue-50 dark:bg-blue-900/20 rounded-2xl items-center justify-center">
                                            <Ionicons name="time" size={hScale(24)} color="#3b82f6" />
                                        </View>
                                        <View className="flex-1 gap-1">
                                            <Text style={{ fontSize: fontSize.base }} className="font-black text-slate-900 dark:text-white uppercase tracking-tighter" numberOfLines={1}>{search.pickup_location.split(',')[0] || 'ANYWHERE'}</Text>
                                            <View className="flex-row items-center">
                                                <Text style={{ fontSize: hScale(10), marginRight: spacing.sm }} className="text-slate-400 dark:text-slate-500 font-black uppercase tracking-widest">TO</Text>
                                                <Text style={{ fontSize: fontSize.xs }} className="text-slate-600 dark:text-slate-400 font-bold flex-1" numberOfLines={1}>{search.drop_location.split(',')[0] || 'ANYWHERE'}</Text>
                                            </View>
                                        </View>
                                        <Ionicons name="chevron-forward" size={hScale(18)} color={isDark ? "#334155" : "#cbd5e1"} />
                                    </TouchableOpacity>
                                ))
                            ) : (
                                <View style={{ paddingVertical: vScale(48) }} className="items-center opacity-30">
                                    <Ionicons name="hourglass-outline" size={hScale(48)} color={isDark ? "#334155" : "#cbd5e1"} />
                                    <Text style={{ fontSize: hScale(10), marginTop: vScale(16) }} className="text-slate-400 dark:text-slate-500 font-black uppercase tracking-[2px]">No historical data Found</Text>
                                </View>
                            )}
                        </View>
                    )}

                    {isLoading ? (
                        <View style={{ paddingVertical: vScale(80) }} className="flex-1 items-center justify-center">
                            <ActivityIndicator size="large" color={isDark ? "#ffffff" : "#2563eb"} />
                        </View>
                    ) : trips && trips.length > 0 ? (
                        <View>
                            <View style={{ marginBottom: vScale(32) }} className="flex-row justify-between items-baseline px-1">
                                <Text style={{ fontSize: fontSize.xxl }} className="font-black text-slate-900 dark:text-white uppercase tracking-tighter">{trips.length} ASSETS FOUND</Text>
                                <Text style={{ fontSize: hScale(10) }} className="font-black text-blue-600 dark:text-blue-500 uppercase tracking-widest">Optimized Results</Text>
                            </View>
                            {trips.map((trip) => (
                                <TripCard
                                    key={trip.id}
                                    trip={trip}
                                    onBook={() => router.push(`/trip/${trip.id}`)}
                                />
                            ))}
                        </View>
                    ) : (pickup || drop) ? (
                        <NoTripsFound onSearch={() => {
                            setPickup('');
                            setDrop('');
                        }} />
                    ) : null}
                </ScrollView>
            )}
        </SafeAreaView>
    );
}
