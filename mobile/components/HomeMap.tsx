import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { Text } from '@/components/ui/text';
import { Ionicons } from '@expo/vector-icons';
import { Map, Marker } from './Map';
import * as Location from 'expo-location';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'expo-router';

export function HomeMap() {
    const router = useRouter();
    const [location, setLocation] = useState<Location.LocationObject | null>(null);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    const { data: trips } = useQuery({
        queryKey: ['active-trips-map'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('trips')
                .select('*')
                .eq('status', 'upcoming')
                .limit(20);
            if (error) throw error;
            return data;
        },
    });

    useEffect(() => {
        (async () => {
            try {
                let { status } = await Location.requestForegroundPermissionsAsync();
                if (status !== 'granted') {
                    setErrorMsg('Permission to access location was denied');
                    setLoading(false);
                    return;
                }

                let location = await Location.getCurrentPositionAsync({});
                setLocation(location);
            } catch (error) {
                setErrorMsg('Could not fetch location');
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    const centerOnUser = async () => {
        setLoading(true);
        try {
            let location = await Location.getCurrentPositionAsync({});
            setLocation(location);
        } catch (error) {
            Alert.alert('Error', 'Could not refresh location');
        } finally {
            setLoading(false);
        }
    };

    if (loading && !location) {
        return (
            <View style={styles.centerContainer}>
                <ActivityIndicator size="large" color="#3b82f6" />
                <Text style={styles.loadingText}>Initializing Map...</Text>
            </View>
        );
    }

    const initialRegion = location ? {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.0922,
        longitudeDelta: 0.0421,
    } : {
        latitude: 12.9716, // Default to Bangalore
        longitude: 77.5946,
        latitudeDelta: 0.1,
        longitudeDelta: 0.1,
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Explore Nearby Rides</Text>
                {errorMsg && <Text style={styles.errorText}>{errorMsg}</Text>}
            </View>

            <View style={styles.mapWrapper}>
                <Map
                    style={styles.map}
                    initialRegion={initialRegion}
                >
                    {location && (
                        <Marker
                            coordinate={{
                                latitude: location.coords.latitude,
                                longitude: location.coords.longitude,
                            }}
                            title="You are here"
                        >
                            <View style={styles.userMarker}>
                                <View style={styles.userMarkerInner} />
                            </View>
                        </Marker>
                    )}

                    {trips?.map((trip) => (
                        <Marker
                            key={trip.id}
                            coordinate={{
                                latitude: parseFloat(trip.pickup_lat),
                                longitude: parseFloat(trip.pickup_lng),
                            }}
                            onPress={() => router.push(`/trip/${trip.id}`)}
                        >
                            <View style={styles.tripMarker}>
                                <Ionicons name="car" size={16} color="white" />
                                <Text style={styles.priceText}>₹{trip.price_per_seat}</Text>
                            </View>
                        </Marker>
                    ))}
                </Map>

                <TouchableOpacity
                    style={styles.locateBtn}
                    onPress={centerOnUser}
                >
                    <Ionicons name="locate" size={24} color="#3b82f6" />
                </TouchableOpacity>

                <View style={styles.mapOverlay}>
                    <View style={styles.chipScroll}>
                        <TouchableOpacity style={styles.chip} onPress={() => router.push('/search')}>
                            <Ionicons name="options-outline" size={16} color="#374151" />
                            <Text style={styles.chipText}>Filters</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.chip}>
                            <Text style={styles.chipText}>Price: Low to High</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginBottom: 24,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        marginBottom: 12,
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1f2937',
    },
    errorText: {
        fontSize: 12,
        color: '#ef4444',
    },
    mapWrapper: {
        height: 300,
        backgroundColor: '#f3f4f6',
        borderRadius: 16,
        overflow: 'hidden',
        marginHorizontal: 16,
        position: 'relative',
    },
    map: {
        ...StyleSheet.absoluteFillObject,
    },
    centerContainer: {
        height: 300,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f9fafb',
        borderRadius: 16,
        margin: 16,
    },
    loadingText: {
        marginTop: 12,
        color: '#6b7280',
    },
    userMarker: {
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: 'rgba(59, 130, 246, 0.3)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    userMarkerInner: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: '#3b82f6',
        borderWidth: 2,
        borderColor: 'white',
    },
    tripMarker: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#3b82f6',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 20,
        gap: 4,
        borderWidth: 2,
        borderColor: 'white',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    priceText: {
        color: 'white',
        fontSize: 12,
        fontWeight: 'bold',
    },
    locateBtn: {
        position: 'absolute',
        right: 16,
        bottom: 16,
        backgroundColor: 'white',
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 4,
    },
    mapOverlay: {
        position: 'absolute',
        top: 16,
        left: 0,
        right: 0,
        paddingHorizontal: 16,
    },
    chipScroll: {
        flexDirection: 'row',
        gap: 8,
    },
    chip: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        gap: 6,
        borderWidth: 1,
        borderColor: '#e5e7eb',
    },
    chipText: {
        fontSize: 12,
        fontWeight: '500',
        color: '#374151',
    },
});
