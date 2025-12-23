import { View, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Map, Marker } from '../components/Map';
import { Ionicons } from '@expo/vector-icons';
import { LocationAutocomplete } from '../components/LocationAutocomplete';
import { TripCard, TripWithDriver } from '../components/TripCard';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Text } from '../components/ui/text';
import { supabase } from '../lib/supabase';
import { mapTrip } from '../lib/mapper';
import { Coordinates } from '../lib/mapbox';

export default function SearchScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();

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
        enabled: true, // Always enable or check params
    });

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: '#f9fafb' }} edges={['top']}>
            <Stack.Screen options={{ headerShown: false }} />

            <View className="flex-row items-center justify-between px-4 py-3 bg-white border-b border-gray-200">
                <TouchableOpacity onPress={() => router.back()} className="p-2 -ml-2">
                    <Ionicons name="arrow-back" size={24} color="#1f2937" />
                </TouchableOpacity>
                <Text variant="h3" className="flex-1 text-center font-bold">Find a Ride</Text>
                <TouchableOpacity
                    onPress={() => setShowMap(!showMap)}
                    className="p-2 -mr-2 flex-row items-center gap-1"
                >
                    <Ionicons name={showMap ? "list" : "map"} size={20} color="#3b82f6" />
                    <Text className="text-primary font-medium">{showMap ? "List" : "Map"}</Text>
                </TouchableOpacity>
            </View>

            <View className="p-4 bg-white border-b border-gray-200 z-50">
                <LocationAutocomplete
                    placeholder="Pickup location"
                    value={pickup}
                    onChange={(val, coords) => {
                        setPickup(val);
                        if (coords) setPickupCoords(coords);
                    }}
                    className="mb-3"
                />
                <LocationAutocomplete
                    placeholder="Drop location"
                    value={drop}
                    onChange={(val, coords) => {
                        setDrop(val);
                        if (coords) setDropCoords(coords);
                    }}
                />
            </View>

            {showMap ? (
                <View className="flex-1">
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
                <ScrollView className="flex-1 p-4" contentContainerStyle={{ paddingBottom: 20 }}>
                    {isLoading ? (
                        <View className="flex-1 items-center justify-center py-10">
                            <ActivityIndicator size="large" color="#3b82f6" />
                        </View>
                    ) : trips && trips.length > 0 ? (
                        <View className="gap-4">
                            <Text className="text-lg font-semibold mb-2">{trips.length} trips found</Text>
                            {trips.map((trip) => (
                                <TripCard
                                    key={trip.id}
                                    trip={trip}
                                    onBook={() => router.push(`/trip/${trip.id}`)}
                                />
                            ))}
                        </View>
                    ) : (
                        <Card className="p-8 items-center">
                            <Ionicons name="search" size={64} color="#9ca3af" style={{ marginBottom: 16 }} />
                            <Text variant="h3" className="text-center mb-2">No trips found</Text>
                            <Text className="text-gray-500 text-center mb-6">
                                Try adjusting your search criteria or check back later
                            </Text>
                            <Button onPress={() => router.push('/create-trip')} className="w-full">
                                Offer a Ride Instead
                            </Button>
                        </Card>
                    )}
                </ScrollView>
            )}
        </SafeAreaView>
    );
}
