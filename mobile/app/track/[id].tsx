import { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { Map, Marker } from '../../components/Map';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { locationTrackingService, LocationUpdate } from '@/lib/location-tracking';
import { Text } from '@/components/ui/text';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

export default function TrackTripScreen() {
    const router = useRouter();
    const { id: tripId } = useLocalSearchParams();
    const { user } = useAuth();
    const [driverLocation, setDriverLocation] = useState<LocationUpdate | null>(null);
    const [eta, setEta] = useState<string>('Calculating...');

    const { data: trip, isLoading, error } = useQuery({
        queryKey: ['track-trip', tripId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('trips')
                .select(`
                    *,
                    driver:drivers(*, user:users(*))
                `)
                .eq('id', tripId)
                .single();
            if (error) throw error;
            return data;
        },
        enabled: !!tripId,
    });

    // Subscribe to real-time location updates using our service
    useEffect(() => {
        if (!tripId || typeof tripId !== 'string') return;

        // Get initial location
        locationTrackingService.getCurrentLocation(tripId).then(location => {
            if (location) {
                setDriverLocation(location);
            }
        });

        // Subscribe to updates
        const unsubscribe = locationTrackingService.subscribeToTrip({
            tripId,
            onUpdate: (location) => {
                setDriverLocation(location);

                // Calculate ETA
                if (trip) {
                    const distance = calculateDistance(
                        location.lat,
                        location.lng,
                        parseFloat(trip.drop_lat),
                        parseFloat(trip.drop_lng)
                    );
                    const speed = location.speed || 40; // km/h
                    const timeInMinutes = Math.round((distance / speed) * 60);
                    setEta(`${timeInMinutes} min`);
                }
            },
            onError: (error) => {
                console.error('Location tracking error:', error);
            },
        });

        return () => {
            unsubscribe();
        };
    }, [tripId, trip]);

    const handleSOS = () => {
        Alert.alert(
            "Emergency SOS",
            "Are you sure you want to trigger an emergency alert? This will send your live location to our safety team.",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "YES, SEND HELP",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            const { error } = await supabase.from('sos_alerts').insert({
                                trip_id: tripId,
                                reporter_id: user?.id,
                                lat: driverLocation?.lat || trip?.pickup_lat,
                                lng: driverLocation?.lng || trip?.pickup_lng,
                                status: 'triggered'
                            });

                            if (error) throw error;

                            Alert.alert("SOS SENT", "Help is on the way. Your location has been shared.");
                        } catch (err: any) {
                            Alert.alert("Error", err.message || "Failed to send SOS.");
                        }
                    }
                }
            ]
        );
    };

    if (isLoading || !trip) {
        return (
            <View style={styles.loading}>
                <ActivityIndicator size="large" color="#3b82f6" />
                <Text>Connecting to vehicle...</Text>
            </View>
        );
    }

    if (error) {
        return (
            <View style={styles.center}>
                <Text>Error loading trip</Text>
            </View>
        );
    }

    const driverUser = trip.driver?.user;

    return (
        <View style={styles.container}>
            <SafeAreaView style={styles.headerContainer} edges={['top']}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={24} color="#1f2937" />
                    </TouchableOpacity>
                    <View style={styles.headerCenter}>
                        <Text variant="h3" style={styles.headerTitle}>Live Tracking</Text>
                        <Text style={styles.headerSubtitle} numberOfLines={1}>
                            {trip.pickup_location} → {trip.drop_location}
                        </Text>
                    </View>
                    <View style={styles.headerRight}>
                        <View style={styles.liveBadge}>
                            <View style={styles.liveDot} />
                            <Text style={styles.liveText}>LIVE</Text>
                        </View>
                        <TouchableOpacity onPress={handleSOS} style={styles.sosButton}>
                            <Ionicons name="shield" size={16} color="white" />
                            <Text style={styles.sosText}>SOS</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </SafeAreaView>

            <Map
                style={styles.map}
                initialRegion={{
                    latitude: parseFloat(trip.pickup_lat),
                    longitude: parseFloat(trip.pickup_lng),
                    latitudeDelta: 0.0922,
                    longitudeDelta: 0.0421,
                }}
            >
                <Marker
                    coordinate={{ latitude: parseFloat(trip.pickup_lat), longitude: parseFloat(trip.pickup_lng) }}
                    title="Pickup"
                    pinColor="green"
                />
                <Marker
                    coordinate={{ latitude: parseFloat(trip.drop_lat), longitude: parseFloat(trip.drop_lng) }}
                    title="Drop"
                    pinColor="red"
                />
                {driverLocation && (
                    <Marker
                        coordinate={{ latitude: driverLocation.lat, longitude: driverLocation.lng }}
                        title="Driver"
                    >
                        <View style={styles.driverMarker}>
                            <Ionicons name="car" size={20} color="white" />
                        </View>
                    </Marker>
                )}
            </Map>

            <View style={styles.footer}>
                <View style={styles.driverInfo}>
                    <Avatar className="w-12 h-12">
                        <AvatarImage src={driverUser?.profile_photo} />
                        <AvatarFallback>{driverUser?.full_name?.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <View style={styles.driverDetails}>
                        <Text style={styles.driverName}>{driverUser?.full_name}</Text>
                        <Text style={styles.driverStatus}>En route</Text>
                        {driverLocation && (
                            <View style={styles.etaContainer}>
                                <Ionicons name="navigate" size={12} color="#3b82f6" />
                                <Text style={styles.etaText}>ETA: {eta}</Text>
                                {driverLocation.speed && (
                                    <Text style={styles.speedText}>
                                        • {Math.round(driverLocation.speed)} km/h
                                    </Text>
                                )}
                            </View>
                        )}
                    </View>
                    <TouchableOpacity style={styles.callButton}>
                        <Ionicons name="call" size={20} color="#3b82f6" />
                    </TouchableOpacity>
                </View>
                <View style={styles.safetyBanner}>
                    <Ionicons name="shield-checkmark" size={14} color="#6b7280" />
                    <Text style={styles.safetyText}>Your ride is monitored for safety</Text>
                </View>
            </View>
        </View>
    );
}

// Helper function to calculate distance
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'white',
    },
    headerContainer: {
        backgroundColor: 'white',
        zIndex: 10,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingBottom: 16,
        gap: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#f3f4f6',
    },
    backButton: {
        padding: 4,
    },
    headerCenter: {
        flex: 1,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1f2937',
    },
    headerSubtitle: {
        fontSize: 12,
        color: '#6b7280',
    },
    headerRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    liveBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        backgroundColor: '#dcfce7',
        borderWidth: 1,
        borderColor: '#86efac',
        gap: 4,
    },
    liveDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#22c55e',
    },
    liveText: {
        fontSize: 10,
        fontWeight: 'bold',
        color: '#22c55e',
    },
    sosButton: {
        backgroundColor: '#ef4444',
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        gap: 4,
    },
    sosText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 12,
    },
    map: {
        flex: 1,
    },
    loading: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 12,
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    footer: {
        backgroundColor: 'white',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        marginTop: -20,
        padding: 20,
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: -2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 3.84,
        elevation: 5,
    },
    driverInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    driverDetails: {
        flex: 1,
    },
    driverName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#1f2937',
    },
    driverStatus: {
        fontSize: 14,
        color: '#22c55e',
        fontWeight: '500',
    },
    etaContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginTop: 4,
    },
    etaText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#3b82f6',
    },
    speedText: {
        fontSize: 12,
        color: '#6b7280',
    },
    callButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#f3f4f6',
        justifyContent: 'center',
        alignItems: 'center',
    },
    safetyBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginTop: 12,
        padding: 8,
        backgroundColor: '#f9fafb',
        borderRadius: 8,
    },
    safetyText: {
        fontSize: 12,
        color: '#6b7280',
    },
    driverMarker: {
        backgroundColor: '#3b82f6',
        padding: 8,
        borderRadius: 20,
        borderWidth: 2,
        borderColor: 'white',
    }
});
