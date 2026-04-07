import { useState, useEffect, useRef } from 'react';
import {
    ActivityIndicator,
    Alert,
    ScrollView,
    TouchableOpacity,
    View,
    StatusBar,
    StyleSheet,
    Platform,
    Image,
    Share,
    Linking
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeInDown, SlideInDown, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { Map, Marker, Polyline } from '../../components/Map';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { TripTimelineMobile, DriverVerificationMobile, SimilarTripsMobile } from '../../components/TripDetailsComponents';
import { BookingConfirmationModal, SeatSelector } from '../../components/BookingComponents';
import { locationTrackingService } from '@/services/LocationTrackingService';
import { RatePassengerModal } from '../../components/RatePassengerModal';
import { EmergencyButton } from '../../components/EmergencyButton';
import { saveTrip, unsaveTrip, isTripSaved } from '@/lib/savedTrips';
import { EditTripModal } from '../../components/EditTripModal';
import { SafetyCheckIn } from '../../components/SafetyCheckIn';
import { RideInsuranceCard } from '../../components/RideInsuranceCard';
import { SafetyTipsModal } from '../../components/SafetyTipsModal';
import { GeofenceAlerts } from '../../components/GeofenceAlerts';
import { SplitFareModal } from '../../components/SplitFareModal';
import { RideService } from '@/services/RideService';
import { FareBreakdownModal } from '@/components/FareBreakdownModal';
import { TipDriverModal } from '@/components/TipDriverModal';
import { PaymentService } from '@/services/PaymentService';
import { DriverVerificationModal } from '@/components/DriverVerificationModal';
import { SafetyService } from '@/services/SafetyService';
import { logger } from '@/services/LoggerService';
import { NotificationService } from '@/services/NotificationService';
import { ReceiptService } from '@/services/ReceiptService';
import { DriverArrivalTimer } from '../../components/DriverArrivalTimer';
import { TripReplay } from '../../components/TripReplay';
import { Text } from '@/components/ui/text';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/contexts/ThemeContext';
import { useResponsive } from '@/hooks/useResponsive';
import { useToast } from '@/components/ui/toast';
import { Phone, MessageSquare, Navigation, MapPin, Clock, Calendar, Users, Info, Shield, CheckCircle, XCircle } from 'lucide-react-native';

const TripDetailsScreen = () => {
    // ... (Hooks remain same)
    const router = useRouter();
    const { id } = useLocalSearchParams();
    const { user } = useAuth();
    const { hScale, vScale, spacing } = useResponsive();
    const [seatsToBook, setSeatsToBook] = useState(1);
    const [isSaved, setIsSaved] = useState(false);

    const [showBookingConfirmation, setShowBookingConfirmation] = useState(false);
    const [showEditTripModal, setShowEditTripModal] = useState(false);
    const [showReceipt, setShowReceipt] = useState(false);
    const [showSafetyTips, setShowSafetyTips] = useState(false);
    const [showSplitFare, setShowSplitFare] = useState(false);
    const [showTipModal, setShowTipModal] = useState(false);
    const [showDriverVerification, setShowDriverVerification] = useState(false);
    const [isDriverVerified, setIsDriverVerified] = useState(false);

    // For Driver Rating Passengers
    const [ratePassengerModalVisible, setRatePassengerModalVisible] = useState(false);
    const [selectedPassenger, setSelectedPassenger] = useState<{ id: string, name: string } | null>(null);

    const [showFareBreakdown, setShowFareBreakdown] = useState(false);
    const { toast } = useToast();

    // Check if trip is saved
    useEffect(() => {
        const checkSaved = async () => {
            if (typeof id === 'string') {
                const saved = await isTripSaved(id);
                setIsSaved(saved);
            }
        };
        checkSaved();
    }, [id]);

    const { data: trip, isLoading, isError, error } = useQuery({
        queryKey: ['trip', id],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('trips')
                .select(`
                    *,
                    driver:drivers(*, user:users(*))
                `)
                .eq('id', id)
                .single();
            if (error) throw error;
            return data;
        },
    });

    const isDriver = user?.id === trip?.driver_id;

    const { data: bookings } = useQuery({
        queryKey: ['trip-bookings', id],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('bookings')
                .select(`
                    *,
                    passenger:users(*)
                `)
                .eq('trip_id', id);
            if (error) throw error;
            return data;
        },
        enabled: !!id && !!isDriver
    });

    const { data: similarTrips } = useQuery({
        queryKey: ['similar-trips', trip?.pickup_location, trip?.drop_location],
        queryFn: async () => {
            if (!trip) return [];

            // Simple location matching - matches if city/area name is contained
            // This is a basic implementation. Ideally use PostGIS for "nearby" queries
            const pickupTerm = trip.pickup_location.split(',')[0].trim();
            const dropTerm = trip.drop_location.split(',')[0].trim();

            const { data, error } = await supabase
                .from('trips')
                .select('*')
                .neq('id', id) // Exclude current trip
                .eq('status', 'upcoming')
                .gt('departure_time', new Date().toISOString())
                .or(`pickup_location.ilike.%${pickupTerm}%,drop_location.ilike.%${dropTerm}%`)
                .limit(5);

            if (error) {
                console.error("Error fetching similar trips:", error);
                return [];
            }
            return data;
        },
        enabled: !!trip
    });

    // Use QueryClient to invalidate
    const queryClient = useQueryClient();

    // Real-time seats availability subscription
    useEffect(() => {
        if (!id) return;

        const channel = supabase
            .channel(`trip-seats-${id}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'bookings',
                    filter: `trip_id=eq.${id}`
                },
                async () => {
                    // Refetch trip data when bookings change
                    queryClient.invalidateQueries({ queryKey: ['trip', id] });
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [id, queryClient]);

    const bookingMutation = useMutation({
        mutationFn: async () => {
            const { data, error } = await supabase
                .from('bookings')
                .insert([{
                    trip_id: id,
                    passenger_id: user?.id,
                    driver_id: trip.driver_id,
                    seats_booked: seatsToBook,
                    total_amount: (trip.price_per_seat * seatsToBook),
                    pickup_location: trip.pickup_location,
                    pickup_lat: trip.pickup_lat,
                    pickup_lng: trip.pickup_lng,
                    drop_location: trip.drop_location,
                    drop_lat: trip.drop_lat,
                    drop_lng: trip.drop_lng,
                    status: 'pending'
                }])
                .select()
                .single();
            if (error) throw error;
            return data;
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['trip', id] });
            router.push(`/payment/${data.id}` as any);
        },
        onError: (error: any) => {
            toast({
                title: 'Booking Failed',
                description: error.message || 'Please try again',
                variant: 'destructive',
            });
        }
    });

    const updateStatusMutation = useMutation({
        mutationFn: async (status: string) => {
            const { data, error } = await supabase
                .from('trips')
                .update({ status: status })
                .eq('id', id)
                .select()
                .single();
            if (error) throw error;
            return data;
        },
        onSuccess: async (data, status) => {
            // Find all passengers to notify
            if (bookings) {
                for (const booking of bookings) {
                    if (status === 'arrived') {
                        await NotificationService.sendDriverArrival(booking.passenger_id, trip.driver?.user?.full_name || 'Driver', 0);
                    } else if (status === 'ongoing') {
                        await NotificationService.sendRideStarted(booking.passenger_id, trip.drop_location);
                    } else if (status === 'completed') {
                        await NotificationService.sendRideCompleted(booking.passenger_id, booking.total_amount);
                    }
                }
            }

            if (status === 'ongoing') {
                try {
                    await locationTrackingService.startBackgroundTracking(id as string, user?.id as string);
                    toast({
                        title: 'Success',
                        description: 'Trip Started. Location sharing is active.',
                    });
                } catch (e: any) {
                    toast({
                        title: 'Warning',
                        description: 'Trip started but failed to start location tracking: ' + e.message,
                        variant: 'destructive',
                    });
                }
            } else if (status === 'completed') {
                await locationTrackingService.stopTracking();

                // Process auto-payments for all bookings
                try {
                    const { settled, failed } = await PaymentService.settleTripPayments(id as string);
                    if (failed > 0) {
                        toast({
                            title: 'Trip Ended',
                            description: `Trip completed successfully. ${settled} payments settled, ${failed} payments pending.`,
                        });
                    } else {
                        toast({
                            title: 'Trip Ended',
                            description: 'Trip completed and all payments have been settled.',
                        });
                    }
                } catch (paymentError: any) {
                    console.error('Error in auto-pay settlement:', paymentError);
                    toast({
                        title: 'Trip Ended',
                        description: 'Trip completed, but auto-payment settlement failed. Passengers can pay manually.',
                        variant: 'destructive',
                    });
                }
            } else {
                toast({
                    title: 'Success',
                    description: `Trip ${status}`,
                });
            }
        },
        onError: (error: any) => {
            toast({
                title: 'Error',
                description: error.message || 'Failed to update trip status',
                variant: 'destructive',
            });
        }
    });

    const [driverLocation, setDriverLocation] = useState<{ lat: number, lng: number } | null>(null);
    const [eta, setEta] = useState<string | null>(null);

    // Helper to open external maps
    const openMap = (lat: number, lng: number, label: string) => {
        const scheme = Platform.select({ ios: 'maps:0,0?q=', android: 'geo:0,0?q=' });
        const latLng = `${lat},${lng}`;
        const url = Platform.select({
            ios: `${scheme}${label}@${latLng}`,
            android: `${scheme}${latLng}(${label})`
        });

        if (url) {
            Linking.openURL(url);
        }
    };

    // Calculate ETA using MapService
    useEffect(() => {
        if (driverLocation && trip) {
            const calculateETA = async () => {
                try {
                    const { MapService } = await import('@/services/MapService');
                    const result = await MapService.getDistance(
                        driverLocation,
                        { lat: parseFloat(trip.pickup_lat), lng: parseFloat(trip.pickup_lng) }
                    );

                    const mins = Math.round(result.duration / 60);
                    if (mins < 1) setEta('Arriving now');
                    else setEta(`${mins} min away`);
                } catch (error) {
                    console.error('Error calculating ETA:', error);
                    setEta('Calculating...');
                }
            };
            calculateETA();
        }
    }, [driverLocation, trip]);

    // Handle ride status notifications
    const prevStatusRef = useRef<string | null>(null);
    useEffect(() => {
        if (!trip || !user) return;

        const currentStatus = trip.status;
        const prevStatus = prevStatusRef.current;

        if (prevStatus && prevStatus !== currentStatus) {
            // Only notify if status actually changed
            if (currentStatus === 'arrived') {
                NotificationService.sendDriverArrival(user.id, trip.driver?.user?.full_name || 'Driver', 0);
            } else if (currentStatus === 'ongoing') {
                NotificationService.sendRideStarted(user.id, trip.drop_location);
            } else if (currentStatus === 'completed') {
                NotificationService.sendRideCompleted(user.id, trip.price_per_seat);
            }
        }

        prevStatusRef.current = currentStatus;
    }, [trip?.status, user?.id]);

    // Subscribe to driver location updates
    useEffect(() => {
        if (!trip?.driver_id) return;

        const channel = supabase.channel(`driver-location-${trip.driver_id}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'live_locations',
                    filter: `driver_id=eq.${trip.driver_id}`
                },
                (payload) => {
                    const newLocation = payload.new as any;
                    setDriverLocation({
                        lat: parseFloat(newLocation.lat),
                        lng: parseFloat(newLocation.lng)
                    });
                }
            )
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'live_locations',
                    filter: `driver_id=eq.${trip.driver_id}`
                },
                (payload) => {
                    const newLocation = payload.new as any;
                    setDriverLocation({
                        lat: parseFloat(newLocation.lat),
                        lng: parseFloat(newLocation.lng)
                    });
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [trip?.driver_id]);

    // Initial fetch of driver location if available
    useEffect(() => {
        if (!trip?.driver_id) return;

        async function fetchInitialLocation() {
            const { data } = await supabase
                .from('live_locations')
                .select('*')
                .eq('driver_id', trip.driver_id)
                .order('created_at', { ascending: false })
                .limit(1)
                .single();

            if (data) {
                setDriverLocation({
                    lat: parseFloat(data.lat),
                    lng: parseFloat(data.lng)
                });
            }
        }
        fetchInitialLocation();
    }, [trip?.driver_id]);

    const handleShare = async () => {
        try {
            const trackingLink = `https://tcsygo.app/track/${id}`;
            const message = trip.status === 'ongoing'
                ? `I'm on my way! Track my ride live: ${trackingLink}`
                : `Check out this trip from ${trip.pickup_location} to ${trip.drop_location} on ${new Date(trip.departure_time).toLocaleDateString()} for ₹${trip.price_per_seat}/seat. Book now on TCSYGO! ${trackingLink}`;

            await Share.share({
                message,
                title: 'Share Trip',
            });
        } catch (error) {
            console.error('Share failed:', error);
        }
    };

    const handleSaveToggle = async () => {
        try {
            if (isSaved) {
                await unsaveTrip(id as string);
                setIsSaved(false);
                Alert.alert('Removed', 'Trip removed from saved list');
            } else {
                await saveTrip(id as string);
                setIsSaved(true);
                toast({
                    title: 'Saved',
                    description: 'Trip saved for later',
                });
            }
        } catch (e) {
            toast({
                title: 'Error',
                description: 'Failed to update saved status',
                variant: 'destructive',
            });
        }
    };
    const { theme } = useTheme();
    const isDark = theme === 'dark';

    if (isLoading) {
        return (
            <View className="flex-1 justify-center items-center bg-white dark:bg-slate-950">
                <ActivityIndicator size="large" color="#3b82f6" />
                <Text style={{ fontSize: hScale(14), marginTop: vScale(16) }} className="text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest">Loading trip details...</Text>
            </View>
        );
    }

    if (isError || !trip) {
        return (
            <View style={{ padding: spacing.xl }} className="flex-1 justify-center items-center bg-white dark:bg-slate-950">
                <View style={{ width: hScale(80), height: hScale(80), borderRadius: hScale(32), marginBottom: vScale(24) }} className="bg-rose-50 dark:bg-rose-900/20 items-center justify-center">
                    <Ionicons name="alert-circle" size={hScale(40)} color="#ef4444" />
                </View>
                <Text style={{ fontSize: hScale(24), marginBottom: vScale(8) }} className="font-black text-slate-900 dark:text-white text-center tracking-tight">Oops! Something went wrong</Text>
                <Text style={{ fontSize: hScale(16), marginBottom: vScale(32), paddingHorizontal: hScale(16), lineHeight: vScale(24) }} className="text-slate-500 dark:text-slate-400 text-center">
                    {error instanceof Error ? error.message : "Failed to load trip details. Please check your connection."}
                </Text>
                <TouchableOpacity
                    style={{ height: vScale(64), borderRadius: hScale(24) }}
                    className="bg-blue-600 w-full justify-center items-center shadow-lg shadow-blue-500/20 active:bg-blue-700"
                    onPress={() => router.back()}
                >
                    <Text style={{ fontSize: hScale(18) }} className="text-white font-black">Go Back</Text>
                </TouchableOpacity>
            </View>
        );
    }

    // isDriver is already defined at the top of the component
    return (
        <SafeAreaView edges={['top']} className="flex-1 bg-slate-50 dark:bg-slate-950">
            <View style={{ paddingHorizontal: spacing.xl, paddingVertical: vScale(16), borderBottomWidth: 1 }} className="flex-row justify-between items-center border-slate-50 dark:border-slate-800 bg-white dark:bg-slate-900 z-10 shadow-sm">
                <TouchableOpacity onPress={() => router.back()} style={{ padding: hScale(8), borderRadius: hScale(20) }} className="bg-slate-100 dark:bg-slate-800">
                    <Ionicons name="arrow-back" size={hScale(20)} color={isDark ? "#94a3b8" : "#1f2937"} />
                </TouchableOpacity>
                <Text style={{ fontSize: hScale(18) }} className="font-black text-slate-900 dark:text-white tracking-tight">Trip Details</Text>
                <View style={{ flexDirection: 'row', gap: hScale(12) }}>
                    <TouchableOpacity onPress={handleShare} style={{ padding: hScale(8), borderRadius: hScale(20) }} className="bg-slate-100 dark:bg-slate-800">
                        <Ionicons name="share-outline" size={hScale(20)} color={isDark ? "#94a3b8" : "#1f2937"} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={handleSaveToggle} style={{ padding: hScale(8), borderRadius: hScale(20) }} className="bg-slate-100 dark:bg-slate-800">
                        <Ionicons
                            name={isSaved ? "bookmark" : "bookmark-outline"}
                            size={hScale(20)}
                            color={isSaved ? "#3b82f6" : (isDark ? "#94a3b8" : "#1f2937")}
                        />
                    </TouchableOpacity>
                </View>
            </View>
 
            <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
                <View style={{ height: vScale(280) }} className="bg-slate-200 dark:bg-slate-800 relative">
                    {trip.status === 'completed' && trip.route ? (
                        <TripReplay
                            route={trip.route.map((p: any) => ({ latitude: p.lat, longitude: p.lng }))}
                            pickup={{ latitude: parseFloat(trip.pickup_lat), longitude: parseFloat(trip.pickup_lng) }}
                            drop={{ latitude: parseFloat(trip.drop_lat), longitude: parseFloat(trip.drop_lng) }}
                            style={StyleSheet.absoluteFillObject}
                        />
                    ) : (
                        <Map
                            style={StyleSheet.absoluteFillObject}
                            initialRegion={{
                                latitude: parseFloat(trip.pickup_lat),
                                longitude: parseFloat(trip.pickup_lng),
                                latitudeDelta: 0.1,
                                longitudeDelta: 0.1,
                            }}
                        >
                            <Marker
                                coordinate={{ latitude: parseFloat(trip.pickup_lat), longitude: parseFloat(trip.pickup_lng) }}
                                title="Pickup"
                                pinColor="#10b981"
                            />
                            <Marker
                                coordinate={{ latitude: parseFloat(trip.drop_lat), longitude: parseFloat(trip.drop_lng) }}
                                title="Drop"
                                pinColor="#ef4444"
                            />
                            {trip.route && trip.route.length > 0 ? (
                                <Polyline
                                    coordinates={trip.route.map((p: any) => ({ latitude: p.lat, longitude: p.lng }))}
                                    strokeColor="#3b82f6"
                                    strokeWidth={hScale(4)}
                                />
                            ) : null}
 
                            {driverLocation && (
                                <Marker
                                    coordinate={{ latitude: driverLocation.lat, longitude: driverLocation.lng }}
                                    title={`${trip.driver?.user?.full_name || 'Driver'}`}
                                >
                                    <View style={{ padding: hScale(6), borderRadius: hScale(20), borderWidth: 2 }} className="bg-white dark:bg-slate-900 border-blue-600 shadow-lg">
                                        <Ionicons name="car" size={hScale(24)} color="#3b82f6" />
                                    </View>
                                </Marker>
                            )}
                            {trip.route_polyline && (
                                <Polyline
                                    coordinates={JSON.parse(trip.route_polyline)}
                                    strokeWidth={hScale(4)}
                                    strokeColor="#3b82f6"
                                />
                            )}
                        </Map>
                    )}
 
                    {eta && !isDriver && (
                        <Animated.View entering={FadeInDown} style={{ position: 'absolute', top: vScale(16), left: hScale(16), right: hScale(16), alignItems: 'center' }}>
                            {driverLocation && (
                                <DriverArrivalTimer
                                    driverLocation={driverLocation}
                                    pickupLocation={{ lat: parseFloat(trip.pickup_lat), lng: parseFloat(trip.pickup_lng) }}
                                    onArrival={() => {
                                        if (trip.status === 'upcoming') {
                                            updateStatusMutation.mutate('arrived');
                                        }
                                    }}
                                />
                            )}
                            {!driverLocation && (
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: hScale(8), paddingHorizontal: hScale(20), paddingVertical: vScale(10), borderRadius: hScale(16), borderWidth: 1 }} className="bg-slate-900 dark:bg-slate-800 shadow-xl border-white/10">
                                    <Text style={{ fontSize: hScale(12) }} className="text-white font-black uppercase tracking-widest">Driver</Text>
                                    <View style={{ width: hScale(4), height: hScale(4), borderRadius: hScale(2), marginHorizontal: hScale(4) }} className="bg-slate-500" />
                                    <Text style={{ fontSize: hScale(14) }} className="text-blue-400 font-black">{eta}</Text>
                                </View>
                            )}
                        </Animated.View>
                    )}
                </View>

                <Animated.View entering={FadeInDown.delay(100)} style={{ padding: spacing.xl }}>
                    <Card style={{ padding: hScale(20), borderRadius: hScale(28), marginBottom: vScale(32), borderWidth: 1 }} className="flex-row justify-between items-center bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-none">
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: hScale(16) }}>
                            <View style={{ width: hScale(56), height: hScale(56), borderRadius: hScale(16), borderWidth: 1 }} className="bg-blue-100 dark:bg-blue-900/30 justify-center items-center overflow-hidden border-blue-200 dark:border-blue-800">
                                {trip.driver?.user?.avatar_url ? (
                                    <Image source={{ uri: trip.driver.user.avatar_url }} className="w-full h-full" />
                                ) : (
                                    <Text style={{ fontSize: hScale(20) }} className="text-blue-600 dark:text-blue-400 font-black">{trip.driver?.user?.full_name?.charAt(0) || 'D'}</Text>
                                )}
                            </View>
                            <View>
                                <Text style={{ fontSize: hScale(18) }} className="font-black text-slate-900 dark:text-white tracking-tight">{trip.driver?.user?.full_name || 'Verified Driver'}</Text>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: hScale(8), marginTop: vScale(2) }}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: hScale(8), paddingVertical: vScale(2), borderRadius: hScale(6), gap: hScale(4) }} className="bg-amber-100 dark:bg-amber-900/40">
                                        <Ionicons name="star" size={hScale(12)} color="#f59e0b" />
                                        <Text style={{ fontSize: hScale(10) }} className="font-black text-amber-700 dark:text-amber-400">{trip.driver?.rating || 'New'}</Text>
                                    </View>
                                    <Text style={{ fontSize: hScale(10) }} className="font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">{trip.driver?.total_trips || '0'} Rides</Text>
                                </View>
                            </View>
                        </View>
                        <TouchableOpacity 
                            onPress={() => setShowFareBreakdown(true)}
                            style={{ paddingHorizontal: hScale(16), paddingVertical: vScale(8), borderRadius: hScale(16), borderWidth: 1 }} 
                            className="items-end bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-800/50"
                        >
                            <Text style={{ fontSize: hScale(10), marginBottom: vScale(2) }} className="font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Fare</Text>
                            <Text style={{ fontSize: hScale(20) }} className="font-black text-blue-600 dark:text-blue-400 tracking-tighter">₹{trip.price_per_seat}</Text>
                        </TouchableOpacity>
                    </Card>
 
                    <View style={{ padding: hScale(24), borderRadius: hScale(32), marginBottom: vScale(40), borderWidth: 1, gap: vScale(24) }} className="bg-white dark:bg-slate-900/50 border-slate-100 dark:border-slate-800">
                        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: hScale(20) }}>
                            <View style={{ width: hScale(40), height: hScale(40), borderRadius: hScale(16), borderWidth: 1 }} className="items-center justify-center bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-800">
                                <Ionicons name="location" size={hScale(20)} color="#10b981" />
                            </View>
                            <View className="flex-1">
                                <Text style={{ fontSize: hScale(10), marginBottom: vScale(4) }} className="font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Pickup</Text>
                                <TouchableOpacity onPress={() => openMap(parseFloat(trip.pickup_lat), parseFloat(trip.pickup_lng), 'Pickup')}>
                                    <Text style={{ fontSize: hScale(16), lineHeight: vScale(20) }} className="font-black text-slate-900 dark:text-white" numberOfLines={2}>{trip.pickup_location}</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
 
                        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: hScale(20) }}>
                            <View style={{ width: hScale(40), height: hScale(40), borderRadius: hScale(16), borderWidth: 1 }} className="items-center justify-center bg-rose-50 dark:bg-rose-900/20 border-rose-100 dark:border-rose-800">
                                <Ionicons name="flag" size={hScale(20)} color="#ef4444" />
                            </View>
                            <View className="flex-1">
                                <Text style={{ fontSize: hScale(10), marginBottom: vScale(4) }} className="font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Drop-off</Text>
                                <TouchableOpacity onPress={() => openMap(parseFloat(trip.drop_lat), parseFloat(trip.drop_lng), 'Drop')}>
                                    <Text style={{ fontSize: hScale(16), lineHeight: vScale(20) }} className="font-black text-slate-900 dark:text-white" numberOfLines={2}>{trip.drop_location}</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
 
                        <View style={{ height: 1, marginVertical: vScale(4) }} className="bg-slate-100 dark:bg-slate-800 w-full" />
 
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: hScale(20) }}>
                            <View style={{ width: hScale(40), height: hScale(40), borderRadius: hScale(16), borderWidth: 1 }} className="items-center justify-center bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-800">
                                <Ionicons name="time" size={hScale(20)} color="#3b82f6" />
                            </View>
                            <View className="flex-1">
                                <Text style={{ fontSize: hScale(10), marginBottom: vScale(4) }} className="font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Departure</Text>
                                <Text style={{ fontSize: hScale(16) }} className="font-black text-slate-900 dark:text-white">
                                    {new Date(trip.departure_time).toLocaleDateString()} at {new Date(trip.departure_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </Text>
                            </View>
                        </View>
 
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: hScale(20) }}>
                            <View style={{ width: hScale(40), height: hScale(40), borderRadius: hScale(16), borderWidth: 1 }} className="items-center justify-center bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                                <Ionicons name="car" size={hScale(20)} color={isDark ? "#94a3b8" : "#475569"} />
                            </View>
                            <View className="flex-1">
                                <Text style={{ fontSize: hScale(10), marginBottom: vScale(4) }} className="font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Vehicle</Text>
                                <Text style={{ fontSize: hScale(16) }} className="font-black text-slate-900 dark:text-white">{trip.vehicle_model} • {trip.vehicle_number}</Text>
                            </View>
                        </View>
                    </View>
 
                    <View style={{ marginBottom: vScale(40) }}>
                        <Text style={{ fontSize: hScale(16), marginBottom: vScale(16), marginLeft: hScale(4) }} className="font-black text-slate-900 dark:text-white">Ride Preferences</Text>
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: hScale(12) }}>
                            {trip.preferences?.smoking_allowed && (
                                <View style={{ paddingHorizontal: hScale(16), paddingVertical: vScale(8), borderRadius: hScale(16), borderWidth: 1 }} className="bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-800/50">
                                    <Text style={{ fontSize: hScale(12) }} className="font-black text-blue-600 dark:text-blue-400 uppercase tracking-wider">Smoking Allowed</Text>
                                </View>
                            )}
                            {trip.preferences?.pets_allowed && (
                                <View style={{ paddingHorizontal: hScale(16), paddingVertical: vScale(8), borderRadius: hScale(16), borderWidth: 1 }} className="bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-800/50">
                                    <Text style={{ fontSize: hScale(12) }} className="font-black text-blue-600 dark:text-blue-400 uppercase tracking-wider">Pets Allowed</Text>
                                </View>
                            )}
                            {trip.preferences?.music_choice && (
                                <View style={{ paddingHorizontal: hScale(16), paddingVertical: vScale(8), borderRadius: hScale(16), borderWidth: 1 }} className="bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-800/50">
                                    <Text style={{ fontSize: hScale(12) }} className="font-black text-blue-600 dark:text-blue-400 uppercase tracking-wider">{trip.preferences.music_choice}</Text>
                                </View>
                            )}
                            {!trip.preferences && <Text style={{ fontSize: hScale(14), marginLeft: hScale(8) }} className="font-bold text-slate-400 dark:text-slate-500 italic">No special preferences recorded</Text>}
                        </View>
                    </View>

                    {driverLocation && (
                        <GeofenceAlerts
                            driverLocation={driverLocation}
                            pickupLocation={{ lat: parseFloat(trip.pickup_lat), lng: parseFloat(trip.pickup_lng) }}
                            dropLocation={{ lat: parseFloat(trip.drop_lat), lng: parseFloat(trip.drop_lng) }}
                            tripStatus={trip.status}
                        />
                    )}
 
                    {isDriver && bookings && bookings.length > 0 && (
                        <Animated.View
                            entering={FadeInDown.delay(200)}
                            style={{ marginBottom: vScale(40) }}
                        >
                            <Text style={{ fontSize: hScale(16), marginBottom: vScale(16), marginLeft: hScale(4) }} className="font-black text-slate-900 dark:text-white">Passengers ({bookings.length})</Text>
                            {bookings.map((booking: any, index: number) => (
                                <Animated.View
                                    key={booking.id}
                                    entering={FadeInDown.delay(300 + index * 100)}
                                    style={{ padding: hScale(16), borderRadius: hScale(24), marginBottom: vScale(12), borderWidth: 1 }}
                                    className="flex-row justify-between items-center bg-white dark:bg-slate-900/50 border-slate-100 dark:border-slate-800 shadow-sm"
                                >
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: hScale(16) }}>
                                        <View style={{ width: hScale(48), height: hScale(48), borderRadius: hScale(16), borderWidth: 1 }} className="bg-slate-100 dark:bg-slate-800 justify-center items-center border-slate-200 dark:border-slate-700">
                                            <Text style={{ fontSize: hScale(16) }} className="font-black text-slate-600 dark:text-slate-300">
                                                {booking.passenger?.full_name?.charAt(0) || 'P'}
                                            </Text>
                                        </View>
                                        <View>
                                            <Text style={{ fontSize: hScale(16) }} className="font-black text-slate-900 dark:text-white">{booking.passenger?.full_name || 'Passenger'}</Text>
                                            <Text style={{ fontSize: hScale(10) }} className="font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">{booking.seats_booked} seats • {booking.status}</Text>
                                        </View>
                                    </View>
 
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: hScale(12) }}>
                                        <TouchableOpacity
                                            onPress={() => router.push(`/chat/${id}?userId=${booking.passenger_id}&userName=${booking.passenger?.full_name}` as any)}
                                            style={{ width: hScale(40), height: hScale(40), borderRadius: hScale(12), borderWidth: 1 }}
                                            className="bg-blue-50 dark:bg-blue-900/20 items-center justify-center border-blue-100 dark:border-blue-800/50"
                                        >
                                            <Ionicons name="chatbubble" size={hScale(18)} color={isDark ? "#60a5fa" : "#2563eb"} />
                                        </TouchableOpacity>
 
                                        {trip.status === 'completed' && (
                                            <TouchableOpacity
                                                onPress={() => {
                                                    setSelectedPassenger({
                                                        id: booking.passenger_id,
                                                        name: booking.passenger?.full_name || 'Passenger'
                                                    });
                                                    setRatePassengerModalVisible(true);
                                                }}
                                                style={{ paddingHorizontal: hScale(16), paddingVertical: vScale(8), borderRadius: hScale(12), borderWidth: 1 }}
                                                className="bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-800/50"
                                            >
                                                <Text style={{ fontSize: hScale(12) }} className="font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">Rate</Text>
                                            </TouchableOpacity>
                                        )}
                                    </View>
                                </Animated.View>
                            ))}
                        </Animated.View>
                    )}
 
                    <Animated.View
                        entering={FadeInDown.delay(500)}
                        style={{ gap: vScale(16), marginBottom: vScale(40) }}
                    >
                        <TouchableOpacity
                            style={{ height: vScale(64), borderRadius: hScale(24), gap: hScale(12) }}
                            className="flex-row items-center justify-center bg-blue-600 active:bg-blue-700 shadow-lg shadow-blue-500/20"
                            onPress={() => router.push(`/chat/${id}?userId=${isDriver ? 'passenger' : trip.driver?.user_id}&userName=${isDriver ? 'Passenger' : trip.driver?.user?.full_name}` as any)}
                        >
                            <Ionicons name="chatbubble" size={hScale(20)} color="white" />
                            <Text style={{ fontSize: hScale(18) }} className="font-black text-white">
                                Chat with {isDriver ? 'Passenger' : 'Driver'}
                            </Text>
                        </TouchableOpacity>
 
                        {(trip.status === 'ongoing' || trip.status === 'confirmed') && (
                            <EmergencyButton tripId={id as string} style={{ marginTop: 0 }} />
                        )}
                    </Animated.View>

                    {(trip.status === 'ongoing' || trip.status === 'confirmed') && (
                        <SafetyCheckIn tripId={id as string} style={{ marginBottom: vScale(20) }} />
                    )}
 
                    <SimilarTripsMobile
                        trips={similarTrips || []}
                        onSelect={(newId) => router.push(`/trip/${newId}`)}
                    />
 
                    <View style={{ marginTop: vScale(32), gap: vScale(20) }}>
                        <RideInsuranceCard />
 
                        <TouchableOpacity
                            style={{ height: vScale(56), borderRadius: hScale(20), gap: hScale(12), borderWidth: 1 }}
                            className="flex-row items-center justify-center bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                            onPress={() => setShowSafetyTips(true)}
                        >
                            <Ionicons name="shield-checkmark" size={hScale(20)} color={isDark ? "#60a5fa" : "#2563eb"} />
                            <Text style={{ fontSize: hScale(12) }} className="text-blue-600 dark:text-blue-400 font-black uppercase tracking-widest">Read Safety Guidelines</Text>
                        </TouchableOpacity>
                    </View>
                </Animated.View>
            </ScrollView>

            <SafetyTipsModal
                visible={showSafetyTips}
                onClose={() => setShowSafetyTips(false)}
            />

            <FareBreakdownModal
                visible={showFareBreakdown || showReceipt}
                onClose={() => {
                    setShowFareBreakdown(false);
                    setShowReceipt(false);
                }}
                trip={trip}
                booking={bookings?.find((b: any) => b.passenger_id === user?.id)}
            />

            <SplitFareModal
                isVisible={showSplitFare}
                onClose={() => setShowSplitFare(false)}
                bookingId={bookings?.find((b: any) => b.passenger_id === user?.id)?.id || ''}
                totalAmount={trip?.price_per_seat * seatsToBook || 0}
            />

            <BookingConfirmationModal
                visible={showBookingConfirmation}
                onClose={() => setShowBookingConfirmation(false)}
                onConfirm={() => {
                    setShowBookingConfirmation(false);
                    bookingMutation.mutate();
                }}
                trip={{
                    pickupLocation: trip.pickup_location,
                    dropLocation: trip.drop_location,
                    departureTime: trip.departure_time,
                    pricePerSeat: trip.price_per_seat,
                }}
                seatsToBook={seatsToBook}
                totalAmount={trip.price_per_seat * seatsToBook}
            />

            {showDriverVerification && trip && (
                <DriverVerificationModal
                    isVisible={showDriverVerification}
                    onClose={() => setShowDriverVerification(false)}
                    driver={{
                        id: trip.driver_id,
                        name: trip.driver?.full_name || 'Driver',
                        photo: trip.driver?.avatar_url,
                        vehicle_make: trip.driver_details?.vehicle_make || 'Vehicle',
                        vehicle_model: trip.driver_details?.vehicle_model || '',
                        vehicle_plate: trip.driver_details?.vehicle_plate || 'N/A'
                    }}
                    onVerify={() => {
                        setIsDriverVerified(true);
                        // Trigger auto-share only if not already shared
                        SafetyService.shareTripWithContacts(
                            bookings?.find((b: any) => b.passenger_id === user?.id)?.id || '',
                            user?.id || '',
                            [] // Backend will fetch primary contacts if empty, but we can pass them here if we had them
                        );
                    }}
                />
            )}

            {selectedPassenger && (
                <RatePassengerModal
                    visible={ratePassengerModalVisible}
                    onClose={() => setRatePassengerModalVisible(false)}
                    tripId={id as string}
                    passengerId={selectedPassenger.id}
                    passengerName={selectedPassenger.name}
                />
            )}

            <EditTripModal
                isOpen={showEditTripModal}
                onClose={() => setShowEditTripModal(false)}
                trip={trip}
            />



            <TipDriverModal
                visible={showTipModal}
                onClose={() => setShowTipModal(false)}
                tripId={trip.id}
                driverId={trip.driver_id}
                driverName={trip.driver?.full_name || 'Driver'}
            />

            {!isDriver && trip.status === 'upcoming' && (
                <View style={{ padding: hScale(24), borderTopWidth: 1, gap: hScale(16) }} className="border-slate-100 dark:border-slate-800 flex-row items-center bg-white dark:bg-slate-900 shadow-2xl">
                    <View className="flex-[0.8]">
                        <SeatSelector
                            availableSeats={trip.available_seats}
                            selectedSeats={seatsToBook}
                            onSelectSeats={setSeatsToBook}
                        />
                    </View>
                    <TouchableOpacity
                        style={{ height: vScale(64), borderRadius: hScale(24) }}
                        className="flex-1 bg-blue-600 justify-center items-center shadow-lg shadow-blue-500/20 active:bg-blue-700"
                        onPress={() => setShowBookingConfirmation(true)}
                    >
                        <Text style={{ fontSize: hScale(18) }} className="text-white font-black tracking-tight">
                            Book • ₹{trip.price_per_seat * seatsToBook}
                        </Text>
                    </TouchableOpacity>
                </View>
            )}

            {isDriver && (
                <View style={{ padding: hScale(24), borderTopWidth: 1, gap: hScale(16) }} className="border-slate-100 dark:border-slate-800 flex-row items-center bg-white dark:bg-slate-900 shadow-2xl">
                    {trip.status === 'upcoming' || trip.status === 'confirmed' ? (
                        <>
                            <TouchableOpacity
                                style={{ width: hScale(64), height: hScale(64), borderRadius: hScale(24), borderWidth: 1 }}
                                className="bg-slate-100 dark:bg-slate-800 justify-center items-center border-slate-200 dark:border-slate-700"
                                onPress={() => setShowEditTripModal(true)}
                            >
                                <Ionicons name="create-outline" size={hScale(24)} color={isDark ? "#94a3b8" : "#1f2937"} />
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={{ height: vScale(64), borderRadius: hScale(24), gap: hScale(12) }}
                                className="flex-1 bg-emerald-600 flex-row justify-center items-center shadow-lg shadow-emerald-500/20 active:bg-emerald-700"
                                onPress={() => updateStatusMutation.mutate('ongoing')}
                            >
                                <Ionicons name="play" size={hScale(24)} color="white" fill="white" />
                                <Text style={{ fontSize: hScale(18) }} className="text-white font-black tracking-tight">Start Trip</Text>
                            </TouchableOpacity>
                        </>
                    ) : trip.status === 'ongoing' ? (
                        <View style={{ flexDirection: 'row', gap: hScale(16), width: '100%' }}>
                            <TouchableOpacity
                                style={{ height: vScale(64), borderRadius: hScale(24), gap: hScale(12) }}
                                className="flex-1 bg-blue-600 flex-row justify-center items-center shadow-lg shadow-blue-500/20 active:bg-blue-700"
                                onPress={() => openMap(parseFloat(trip.drop_lat), parseFloat(trip.drop_lng), 'Destination')}
                            >
                                <Ionicons name="navigate" size={hScale(24)} color="white" />
                                <Text style={{ fontSize: hScale(18) }} className="text-white font-black tracking-tight">Navigate</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={{ height: vScale(64), borderRadius: hScale(24), gap: hScale(12) }}
                                className="flex-1 bg-rose-600 flex-row justify-center items-center shadow-lg shadow-rose-500/20 active:bg-rose-700"
                                onPress={() => updateStatusMutation.mutate('completed')}
                            >
                                <Ionicons name="stop" size={hScale(24)} color="white" fill="white" />
                                <Text style={{ fontSize: hScale(18) }} className="text-white font-black tracking-tight">End Trip</Text>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <View style={{ height: vScale(64), borderRadius: hScale(24), borderWidth: 1 }} className="flex-1 bg-slate-100 dark:bg-slate-800 justify-center items-center border-slate-200 dark:border-slate-700">
                            <Text style={{ fontSize: hScale(18) }} className="text-slate-500 dark:text-slate-400 font-black uppercase tracking-widest">Trip {trip.status}</Text>
                        </View>
                    )}
                </View>
            )}

            {!isDriver && trip.status === 'completed' && (
                <View style={{ padding: hScale(24), borderTopWidth: 1, gap: hScale(16) }} className="border-slate-100 dark:border-slate-800 flex-row items-center bg-white dark:bg-slate-900 shadow-2xl">
                    <TouchableOpacity
                        style={{ height: vScale(56), borderRadius: hScale(16), borderWidth: 1 }}
                        className="flex-1 bg-white dark:bg-slate-900 border-blue-500 dark:border-blue-400 justify-center items-center active:bg-blue-50 dark:active:bg-blue-900/20"
                        onPress={() => setShowReceipt(true)}
                    >
                        <Text style={{ fontSize: hScale(14) }} className="text-blue-600 dark:text-blue-400 font-black uppercase tracking-widest">
                            Receipt
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={{ height: vScale(56), borderRadius: hScale(16), gap: hScale(8) }}
                        className="flex-1 bg-blue-600 flex-row justify-center items-center shadow-lg shadow-blue-500/20 active:bg-blue-700"
                        onPress={() => setShowTipModal(true)}
                    >
                        <Ionicons name="heart" size={hScale(18)} color="white" />
                        <Text style={{ fontSize: hScale(14) }} className="text-white font-black uppercase tracking-widest">Tip Driver</Text>
                    </TouchableOpacity>
                </View>
            )}
        </SafeAreaView>
    );
};

export default TripDetailsScreen;
