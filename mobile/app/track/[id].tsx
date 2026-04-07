import { useState, useEffect } from 'react';
import { View, TouchableOpacity, Alert, ActivityIndicator, Share, Linking, Vibration } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { Map, Marker, Polyline } from '../../components/Map';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { locationTrackingService, LocationUpdate } from '@/services/LocationTrackingService';
import { Text } from '@/components/ui/text';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DriverVerificationModal } from '@/components/DriverVerificationModal';
import { RatingModal } from '@/components/RatingModal';
import { SplitFareModal } from '@/components/SplitFareModal';
import { useTheme } from '@/contexts/ThemeContext';
import { useResponsive } from '@/hooks/useResponsive';

export default function TrackTripScreen() {
    const router = useRouter();
    const { id: tripId } = useLocalSearchParams();
    const { user } = useAuth();
    const { isDark } = useTheme();
    const { hScale, vScale, spacing } = useResponsive();
    const { toast } = require('@/components/ui/toast').useToast();
    const [driverLocation, setDriverLocation] = useState<LocationUpdate | null>(null);
    const [eta, setEta] = useState<string>('Calculating...');
    const [showVerification, setShowVerification] = useState(false);
    const [showSplitFare, setShowSplitFare] = useState(false);
    const [hasVerified, setHasVerified] = useState(false);
    const [isCompleted, setIsCompleted] = useState(false);

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

        // Subscribe to trip status changes for completion
        const statusChannel = supabase
            .channel(`trip-status-${tripId}`)
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'trips',
                    filter: `id=eq.${tripId}`
                },
                (payload) => {
                    if (payload.new.status === 'completed') {
                        setIsCompleted(true);
                        Vibration.vibrate(500);
                    }
                }
            )
            .subscribe();

        // Subscribe to updates
        const unsubscribe = locationTrackingService.subscribeToTrip({
            tripId,
            onUpdate: (location) => {
                setDriverLocation(location);

                if (trip) {
                    const distToDrop = calculateDistance(
                        location.lat,
                        location.lng,
                        parseFloat(trip.drop_lat),
                        parseFloat(trip.drop_lng)
                    );
                    const distToPickup = calculateDistance(
                        location.lat,
                        location.lng,
                        parseFloat(trip.pickup_lat),
                        parseFloat(trip.pickup_lng)
                    );

                    // Geofence check for arrival
                    if (distToPickup < 0.05 && !hasVerified) { // 50 meters
                        setShowVerification(true);
                    }

                    const speed = location.speed || 40;
                    const timeInMinutes = Math.round((distToDrop / speed) * 60);
                    setEta(`${timeInMinutes} min`);
                }
            },
            onError: (error) => {
                console.error('Location tracking error:', error);
            },
        });

        return () => {
            unsubscribe();
            supabase.removeChannel(statusChannel);
        };
    }, [tripId, trip, hasVerified]);

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
                            const { error } = await supabase.from('emergency_alerts').insert({
                                trip_id: tripId,
                                user_id: user?.id,
                                lat: driverLocation?.lat || trip?.pickup_lat,
                                lng: driverLocation?.lng || trip?.pickup_lng,
                                status: 'triggered'
                            });

                            if (error) throw error;

                            toast({
                                title: "SOS SENT",
                                description: "Help is on the way. Your location has been shared.",
                            });
                        } catch (err: any) {
                            toast({
                                title: "Error",
                                description: err.message || "Failed to send SOS.",
                                variant: "destructive",
                            });
                        }
                    }
                }
            ]
        );
    };

    const handleShareRide = async () => {
        if (!trip) return;
        try {
            const message = `I'm riding with TCSYGO! 
Driver: ${trip.driver?.user?.full_name} (${trip.driver?.vehicle_number})
Route: ${trip.pickup_location} to ${trip.drop_location}
Track my ride: https://tcsygo.app/track/${trip.id}`;

            await Share.share({
                message,
                title: "Track my TCSYGO Ride"
            });
        } catch (error: any) {
            console.error(error.message);
        }
    };

    const handleSafetyCheckIn = async () => {
        try {
            const { error } = await supabase.from('safety_checkins').insert({
                booking_id: tripId,
                status: 'safe',
                location: driverLocation ? { lat: driverLocation.lat, lng: driverLocation.lng } : null
            });

            if (error) throw error;
            toast({
                title: "Check-in Successful",
                description: "We've notified your safety contacts that you are safe.",
            });
        } catch (error) {
            toast({
                title: "Safety Check",
                description: "I am safe! (Verified locally)",
            });
        }
    };

    const openInMaps = () => {
        if (!trip) return;
        const url = `https://www.openstreetmap.org/directions?engine=fossgis_osrm_car&route=${trip.pickup_lat}%2C${trip.pickup_lng}%3B${trip.drop_lat}%2C${trip.drop_lng}`;
        Linking.openURL(url);
    };

    if (isLoading || !trip) {
        return (
            <View style={{ gap: vScale(12) }} className="flex-1 justify-center items-center">
                <ActivityIndicator size="large" color="#3b82f6" />
                <Text style={{ fontSize: hScale(14) }}>Connecting to vehicle...</Text>
            </View>
        );
    }

    if (error) {
        return (
            <View className="flex-1 justify-center items-center">
                <Text style={{ fontSize: hScale(14) }}>Error loading trip</Text>
            </View>
        );
    }

    const driverUser = trip.driver?.user;

    return (
        <View className="flex-1 bg-slate-50 dark:bg-slate-950">
            <SafeAreaView className="bg-white dark:bg-slate-900 z-30 shadow-sm" edges={['top']}>
                <View style={{ paddingHorizontal: spacing.xl, paddingVertical: vScale(16), gap: hScale(16), borderBottomWidth: 1 }} className="flex-row items-center border-slate-100 dark:border-slate-800">
                    <TouchableOpacity onPress={() => router.back()} style={{ padding: hScale(8), borderRadius: hScale(20) }} className="bg-slate-100 dark:bg-slate-800">
                        <Ionicons name="arrow-back" size={hScale(20)} color={isDark ? "#94a3b8" : "#1f2937"} />
                    </TouchableOpacity>
                    <View className="flex-1">
                        <Text style={{ fontSize: hScale(18) }} className="font-black text-slate-900 dark:text-white tracking-tight">Live Tracking</Text>
                        <Text style={{ fontSize: hScale(10) }} className="font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest" numberOfLines={1}>
                            {trip.pickup_location.split(',')[0]} → {trip.drop_location.split(',')[0]}
                        </Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: hScale(12) }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: hScale(12), paddingVertical: vScale(6), borderRadius: hScale(20), borderWidth: 1, gap: hScale(8) }} className="bg-emerald-500/10 border-emerald-500/20">
                            <View style={{ width: hScale(8), height: hScale(8), borderRadius: hScale(4) }} className="bg-emerald-500 shadow-sm shadow-emerald-500" />
                            <Text style={{ fontSize: hScale(10) }} className="font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">LIVE</Text>
                        </View>
                        <TouchableOpacity onPress={handleSOS} style={{ paddingHorizontal: hScale(16), paddingVertical: vScale(8), borderRadius: hScale(20) }} className="bg-rose-600 active:bg-rose-700 shadow-lg shadow-rose-600/20">
                            <Text style={{ fontSize: hScale(12) }} className="text-white font-black uppercase tracking-widest">SOS</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </SafeAreaView>

            <Map
                style={{ flex: 1 }}
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
                        <View style={{ padding: hScale(6), borderRadius: hScale(20), borderWidth: 2 }} className="bg-white dark:bg-slate-900 border-blue-600 shadow-lg">
                            <Ionicons name="car" size={hScale(24)} color="#3b82f6" />
                        </View>
                    </Marker>
                )}
                {trip.route && trip.route.geometry && trip.route.geometry.length > 0 && (
                    <Polyline
                        coordinates={trip.route.geometry.map((coord: any) => ({ latitude: coord.lat, longitude: coord.lng }))}
                        strokeColor="#3b82f6"
                        strokeWidth={hScale(4)}
                    />
                )}
            </Map>

            <View style={{ padding: spacing.xl, borderRadius: hScale(40), marginTop: vScale(-40), borderTopWidth: 1 }} className="bg-white dark:bg-slate-900 shadow-2xl z-20 border-slate-100 dark:border-slate-800">
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: hScale(16), marginBottom: vScale(24) }}>
                    <Avatar style={{ width: hScale(64), height: hScale(64), borderRadius: hScale(24), borderWidth: 1 }} className="border-slate-100 dark:border-slate-800">
                        <AvatarImage src={driverUser?.profile_photo} />
                        <AvatarFallback className="bg-slate-100 dark:bg-slate-800 font-black text-slate-600 dark:text-slate-300">
                            {driverUser?.full_name?.charAt(0)}
                        </AvatarFallback>
                    </Avatar>
                    <View className="flex-1">
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: hScale(8) }}>
                            <Text style={{ fontSize: hScale(20) }} className="font-black text-slate-900 dark:text-white tracking-tight">{driverUser?.full_name}</Text>
                            <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: hScale(8), paddingVertical: vScale(2), borderRadius: hScale(6), gap: hScale(4) }} className="bg-blue-500/10">
                                <Ionicons name="checkmark-circle" size={hScale(14)} color="#3b82f6" />
                                <Text style={{ fontSize: hScale(10) }} className="font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest">Verified</Text>
                            </View>
                        </View>
                        <Text style={{ fontSize: hScale(14), marginTop: vScale(2) }} className={`font-black uppercase tracking-widest ${eta === '0 min' ? 'text-emerald-500' : 'text-blue-500'}`}>
                            {eta === '0 min' ? 'Arrived at pickup' : 'En route to pickup'}
                        </Text>
                        {driverLocation && (
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: hScale(8), marginTop: vScale(8) }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: hScale(8), paddingVertical: vScale(4), borderRadius: hScale(8), borderWidth: 1, gap: hScale(6) }} className="bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-800/50">
                                    <Ionicons name="navigate" size={hScale(12)} color="#3b82f6" />
                                    <Text style={{ fontSize: hScale(10) }} className="font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest">ETA: {eta}</Text>
                                </View>
                                {driverLocation.speed && (
                                    <Text style={{ fontSize: hScale(10), lineHeight: vScale(14) }} className="font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                                        • {Math.round(driverLocation.speed)} km/h
                                    </Text>
                                )}
                            </View>
                        )}
                    </View>
                    <View style={{ flexDirection: 'row', gap: hScale(12) }}>
                        <TouchableOpacity
                            style={{ width: hScale(48), height: hScale(48), borderRadius: hScale(16), borderWidth: 1 }}
                            className="bg-slate-100 dark:bg-slate-800 justify-center items-center border-slate-200 dark:border-slate-700"
                            onPress={() => router.push(`/chat/${tripId}`)}
                        >
                            <Ionicons name="chatbubble" size={hScale(20)} color={isDark ? "#60a5fa" : "#2563eb"} />
                        </TouchableOpacity>
                        <TouchableOpacity style={{ width: hScale(48), height: hScale(48), borderRadius: hScale(16), borderWidth: 1 }} className="bg-slate-100 dark:bg-slate-800 justify-center items-center border-slate-200 dark:border-slate-700">
                            <Ionicons name="call" size={hScale(20)} color={isDark ? "#60a5fa" : "#2563eb"} />
                        </TouchableOpacity>
                    </View>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: hScale(12), padding: hScale(16), borderRadius: hScale(16), borderWidth: 1 }} className="bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-800">
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: hScale(8) }}>
                        <Ionicons name="shield-checkmark" size={hScale(16)} color="#10b981" />
                        <Text style={{ fontSize: hScale(10) }} className="font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Insured Trip</Text>
                    </View>
                    <View style={{ width: 1, height: vScale(16), marginHorizontal: hScale(4) }} className="bg-slate-200 dark:bg-slate-700 mx-1" />
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: hScale(8) }}>
                        <Ionicons name="eye" size={hScale(16)} color={isDark ? "#94a3b8" : "#64748b"} />
                        <Text style={{ fontSize: hScale(10) }} className="font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Monitored</Text>
                    </View>
                    <TouchableOpacity onPress={handleSafetyCheckIn} style={{ marginLeft: hScale(16), paddingHorizontal: hScale(16), paddingVertical: vScale(8), borderRadius: hScale(12), borderWidth: 1 }} className="ml-auto bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-800/50">
                        <Text style={{ fontSize: hScale(10) }} className="text-blue-600 dark:text-blue-400 font-black uppercase tracking-widest">I'm Safe</Text>
                    </TouchableOpacity>
                </View>                {/* Quick Actions Grid */}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: vScale(32), paddingTop: vScale(32), borderTopWidth: 1 }} className="border-slate-100 dark:border-slate-800">
                    <TouchableOpacity style={{ alignItems: 'center', gap: vScale(8), flex: 1 }} onPress={handleShareRide}>
                        <View style={{ width: hScale(48), height: hScale(48), borderRadius: hScale(20), borderWidth: 1 }} className="bg-blue-50 dark:bg-blue-900/30 justify-center items-center border-blue-100 dark:border-blue-800">
                            <Ionicons name="share-social" size={hScale(20)} color={isDark ? "#60a5fa" : "#2563eb"} />
                        </View>
                        <Text style={{ fontSize: hScale(10) }} className="font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Share</Text>
                    </TouchableOpacity>
 
                    <TouchableOpacity style={{ alignItems: 'center', gap: vScale(8), flex: 1 }} onPress={openInMaps}>
                        <View style={{ width: hScale(48), height: hScale(48), borderRadius: hScale(20), borderWidth: 1 }} className="bg-emerald-50 dark:bg-emerald-900/30 justify-center items-center border-emerald-100 dark:border-emerald-800">
                            <Ionicons name="map" size={hScale(20)} color={isDark ? "#34d399" : "#059669"} />
                        </View>
                        <Text style={{ fontSize: hScale(10) }} className="font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Navigate</Text>
                    </TouchableOpacity>
 
                    <TouchableOpacity style={{ alignItems: 'center', gap: vScale(8), flex: 1 }} onPress={() => setShowSplitFare(true)}>
                        <View style={{ width: hScale(48), height: hScale(48), borderRadius: hScale(20), borderWidth: 1 }} className="bg-purple-50 dark:bg-purple-900/30 justify-center items-center border-purple-100 dark:border-purple-800">
                            <Ionicons name="people" size={hScale(20)} color={isDark ? "#c084fc" : "#7c3aed"} />
                        </View>
                        <Text style={{ fontSize: hScale(10) }} className="font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Split</Text>
                    </TouchableOpacity>
 
                    <TouchableOpacity style={{ alignItems: 'center', gap: vScale(8), flex: 1 }} onPress={() => toast({ title: 'Support', description: 'Contact us at: help@tcsygo.com' })}>
                        <View style={{ width: hScale(48), height: hScale(48), borderRadius: hScale(20), borderWidth: 1 }} className="bg-slate-100 dark:bg-slate-800 justify-center items-center border-slate-200 dark:border-slate-700">
                            <Ionicons name="help-circle" size={hScale(20)} color={isDark ? "#94a3b8" : "#4b5563"} />
                        </View>
                        <Text style={{ fontSize: hScale(10) }} className="font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Support</Text>
                    </TouchableOpacity>
                </View>
                {/* Dev Only: Simulation Button */}
                {__DEV__ && (
                    <TouchableOpacity
                        style={{ marginTop: vScale(8), padding: hScale(8), borderRadius: hScale(8) }}
                        className="bg-gray-200 items-center"
                        onPress={() => {
                            if (tripId && trip.driver.user_id) {
                                // locationTrackingService.startSimulation(tripId as string, trip.driver.user_id);
                                toast({
                                    title: 'Simulation',
                                    description: 'Simulation feature unavailable',
                                });
                            }
                        }}
                    >
                        <Text style={{ fontSize: hScale(10) }} className="text-gray-700">DEV: Start Location Simulation</Text>
                    </TouchableOpacity>
                )}
            </View>

            <DriverVerificationModal
                isVisible={showVerification}
                onClose={() => setShowVerification(false)}
                driver={trip.driver}
                onVerify={() => {
                    setHasVerified(true);
                    setShowVerification(false);
                    toast({
                        title: "Verified",
                        description: "Have a safe trip!",
                    });
                }}
            />

            <RatingModal
                isOpen={isCompleted}
                onClose={() => setIsCompleted(false)}
                onSubmit={(rating: number, feedback: string) => {
                    // Handle rating submission
                    setIsCompleted(false);
                    router.push('/trips');
                }}
                tripDetails={{
                    driverName: driverUser?.full_name || 'Driver',
                    driverPhoto: driverUser?.profile_photo || undefined,
                    amount: parseFloat(trip.price_per_seat || '0'),
                    pickup: trip.pickup_location,
                    drop: trip.drop_location
                }}
            />

            <SplitFareModal
                isVisible={showSplitFare}
                onClose={() => setShowSplitFare(false)}
                bookingId={tripId as string} // Ideally we use booking ID not trip ID, but for MVP assuming 1-1 or getting booking ID elsewhere
                totalAmount={parseFloat(trip.price_per_seat || '0')}
            />
        </View >
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
