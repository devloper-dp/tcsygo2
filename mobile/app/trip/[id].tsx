import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Alert, Share, Platform, Linking, ActivityIndicator } from 'react-native';
import Animated, { FadeIn, FadeInDown, SlideInDown, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { Map, Marker, Polyline } from '../../components/Map';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { TripTimelineMobile, DriverVerificationMobile, SimilarTripsMobile } from '../../components/TripDetailsComponents';
import { BookingConfirmationModal, SeatSelector } from '../../components/BookingComponents';
import { locationTrackingService } from '@/lib/location-tracking';
import { RatePassengerModal } from '../../components/RatePassengerModal';
import { EmergencyButton } from '../../components/EmergencyButton';
import { saveTrip, unsaveTrip, isTripSaved } from '@/lib/savedTrips';
import { EditTripModal } from '../../components/EditTripModal';
import { SafetyCheckIn } from '../../components/SafetyCheckIn';
import { RideInsuranceCard } from '../../components/RideInsuranceCard';
import { SafetyTipsModal } from '../../components/SafetyTipsModal';
import { GeofenceAlerts } from '../../components/GeofenceAlerts';
import { SplitFareModal } from '../../components/SplitFareModal';
import { FareBreakdownModal } from '@/components/FareBreakdownModal';
import { TipDriverModal } from '@/components/TipDriverModal';
import { PaymentService } from '@/services/PaymentService';
import { DriverVerificationModal } from '@/components/DriverVerificationModal';
import { SafetyService } from '@/services/SafetyService';
import { logger } from '@/services/LoggerService';
import { NotificationService } from '@/services/NotificationService';
import { useRef } from 'react';
import { DriverArrivalTimer } from '../../components/DriverArrivalTimer';
import { TripReplay } from '../../components/TripReplay';

const TripDetailsScreen = () => {
    const router = useRouter();
    const { id } = useLocalSearchParams();
    const { user } = useAuth();
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
    // ... rest of state

    // For Driver Rating Passengers
    const [ratePassengerModalVisible, setRatePassengerModalVisible] = useState(false);
    const [selectedPassenger, setSelectedPassenger] = useState<{ id: string, name: string } | null>(null);

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
                    driver:users(*),
                    driver_details:drivers(*)
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
                    seats_booked: seatsToBook,
                    total_amount: (trip.price_per_seat * seatsToBook),
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
            Alert.alert('Booking Failed', error.message || 'Please try again');
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
                        await NotificationService.sendDriverArrival(booking.passenger_id, trip.driver?.full_name || 'Driver', 0);
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
                    Alert.alert('Success', 'Trip Started. Location sharing is active.');
                } catch (e: any) {
                    Alert.alert('Warning', 'Trip started but failed to start location tracking: ' + e.message);
                }
            } else if (status === 'completed') {
                await locationTrackingService.stopTracking();

                // Process auto-payments for all bookings
                try {
                    const { settled, failed } = await PaymentService.settleTripPayments(id as string);
                    if (failed > 0) {
                        Alert.alert('Trip Ended', `Trip completed successfully. ${settled} payments settled, ${failed} payments pending.`);
                    } else {
                        Alert.alert('Trip Ended', 'Trip completed and all payments have been settled.');
                    }
                } catch (paymentError: any) {
                    console.error('Error in auto-pay settlement:', paymentError);
                    Alert.alert('Trip Ended', 'Trip completed, but auto-payment settlement failed. Passengers can pay manually.');
                }
            } else {
                Alert.alert('Success', `Trip ${status}`);
            }
        },
        onError: (error: any) => {
            Alert.alert('Error', error.message || 'Failed to update trip status');
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
                NotificationService.sendDriverArrival(user.id, trip.driver?.full_name || 'Driver', 0);
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
                Alert.alert('Saved', 'Trip saved for later');
            }
        } catch (e) {
            Alert.alert('Error', 'Failed to update saved status');
        }
    };

    if (isLoading) {
        return (
            <View style={styles.loading}>
                <Text>Loading trip details...</Text>
            </View>
        );
    }

    if (isError || !trip) {
        return (
            <View style={styles.errorContainer}>
                <Ionicons name="alert-circle" size={48} color="#ef4444" />
                <Text style={styles.errorTitle}>Oops! Something went wrong</Text>
                <Text style={styles.errorText}>
                    {error instanceof Error ? error.message : "Failed to load trip details. Please check your connection."}
                </Text>
                <TouchableOpacity
                    style={styles.retryBtn}
                    onPress={() => router.back()}
                >
                    <Text style={styles.retryBtnText}>Go Back</Text>
                </TouchableOpacity>
            </View>
        );
    }

    // isDriver is already defined at the top of the component

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={24} color="#1f2937" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Trip Details</Text>
                <View style={styles.headerActions}>
                    <TouchableOpacity onPress={handleShare} style={styles.iconBtn}>
                        <Ionicons name="share-outline" size={24} color="#1f2937" />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={handleSaveToggle} style={styles.iconBtn}>
                        <Ionicons
                            name={isSaved ? "bookmark" : "bookmark-outline"}
                            size={24}
                            color={isSaved ? "#3b82f6" : "#1f2937"}
                        />
                    </TouchableOpacity>
                </View>
            </View>

            <ScrollView style={styles.scrollView}>
                <View style={styles.mapContainer}>
                    {trip.status === 'completed' && trip.route ? (
                        <TripReplay
                            route={trip.route.map((p: any) => ({ latitude: p.lat, longitude: p.lng }))}
                            pickup={{ latitude: parseFloat(trip.pickup_lat), longitude: parseFloat(trip.pickup_lng) }}
                            drop={{ latitude: parseFloat(trip.drop_lat), longitude: parseFloat(trip.drop_lng) }}
                            style={styles.map}
                        />
                    ) : (
                        <Map
                            style={styles.map}
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
                                    strokeWidth={4}
                                />
                            ) : null}

                            {driverLocation && (
                                <Marker
                                    coordinate={{ latitude: driverLocation.lat, longitude: driverLocation.lng }}
                                    title={`${trip.driver?.full_name || 'Driver'}`}
                                >
                                    <View style={styles.driverMarker}>
                                        <Ionicons name="car" size={24} color="#3b82f6" />
                                    </View>
                                </Marker>
                            )}
                            {trip.route_polyline && (
                                <Polyline
                                    coordinates={JSON.parse(trip.route_polyline)}
                                    strokeWidth={4}
                                    strokeColor="#3b82f6"
                                />
                            )}
                        </Map>
                    )}

                    {eta && !isDriver && (
                        <Animated.View entering={FadeInDown} style={styles.arrivalOverlay}>
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
                                <View style={styles.arrivalBadge}>
                                    <Text style={styles.arrivalTitle}>Driver</Text>
                                    <Text style={styles.arrivalTime}>{eta}</Text>
                                </View>
                            )}
                        </Animated.View>
                    )}
                </View>

                <Animated.View entering={FadeInDown.delay(100)} style={styles.content}>
                    <View style={styles.driverCard}>
                        <View style={styles.driverInfo}>
                            <View style={styles.avatar}>
                                {trip.driver?.avatar_url ? (
                                    <Image source={{ uri: trip.driver.avatar_url }} style={styles.avatar} />
                                ) : (
                                    <Text style={styles.avatarText}>{trip.driver?.full_name?.charAt(0) || 'D'}</Text>
                                )}
                            </View>
                            <View>
                                <Text style={styles.driverName}>{trip.driver?.full_name || 'Verified Driver'}</Text>
                                <View style={styles.rating}>
                                    <Ionicons name="star" size={14} color="#fbbf24" />
                                    <Text style={styles.ratingText}>4.8 (120 rides)</Text>
                                </View>
                            </View>
                        </View>
                        <View style={styles.priceContainer}>
                            <Text style={styles.priceLabel}>Price per seat</Text>
                            <Text style={styles.price}>₹{trip.price_per_seat}</Text>
                        </View>
                    </View>

                    <View style={styles.detailsList}>
                        <View style={styles.detailItem}>
                            <Ionicons name="location-outline" size={24} color="#6b7280" />
                            <View style={styles.detailTextContainer}>
                                <Text style={styles.detailLabel}>Pickup</Text>
                                <TouchableOpacity onPress={() => openMap(parseFloat(trip.pickup_lat), parseFloat(trip.pickup_lng), 'Pickup')}>
                                    <Text style={styles.detailValue}>{trip.pickup_location}</Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                        <View style={styles.detailItem}>
                            <Ionicons name="flag-outline" size={24} color="#6b7280" />
                            <View style={styles.detailTextContainer}>
                                <Text style={styles.detailLabel}>Drop-off</Text>
                                <TouchableOpacity onPress={() => openMap(parseFloat(trip.drop_lat), parseFloat(trip.drop_lng), 'Drop')}>
                                    <Text style={styles.detailValue}>{trip.drop_location}</Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                        <View style={styles.detailItem}>
                            <Ionicons name="time-outline" size={24} color="#6b7280" />
                            <View style={styles.detailTextContainer}>
                                <Text style={styles.detailLabel}>Departure</Text>
                                <Text style={styles.detailValue}>
                                    {new Date(trip.departure_time).toLocaleDateString()} at {new Date(trip.departure_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </Text>
                            </View>
                        </View>

                        <View style={styles.detailItem}>
                            <Ionicons name="car-outline" size={24} color="#6b7280" />
                            <View style={styles.detailTextContainer}>
                                <Text style={styles.detailLabel}>Vehicle</Text>
                                <Text style={styles.detailValue}>{trip.vehicle_model} • {trip.vehicle_number}</Text>
                            </View>
                        </View>
                    </View>

                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Ride Preferences</Text>
                        <View style={styles.badgeContainer}>
                            {trip.preferences?.smoking_allowed && (
                                <View style={styles.badge}><Text style={styles.badgeText}>Smoking Allowed</Text></View>
                            )}
                            {trip.preferences?.pets_allowed && (
                                <View style={styles.badge}><Text style={styles.badgeText}>Pets Allowed</Text></View>
                            )}
                            {trip.preferences?.music_choice && (
                                <View style={styles.badge}><Text style={styles.badgeText}>{trip.preferences.music_choice}</Text></View>
                            )}
                            {!trip.preferences && <Text style={styles.detailLabel}>No special preferences</Text>}
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
                            style={styles.section}
                        >
                            <Text style={styles.sectionTitle}>Passengers ({bookings.length})</Text>
                            {bookings.map((booking: any, index: number) => (
                                <Animated.View
                                    key={booking.id}
                                    entering={FadeInDown.delay(300 + index * 100)}
                                    style={styles.passengerCard}
                                >
                                    <View style={styles.passengerInfo}>
                                        <View style={styles.passengerAvatar}>
                                            <Text style={styles.passengerAvatarText}>
                                                {booking.passenger?.full_name?.charAt(0) || 'P'}
                                            </Text>
                                        </View>
                                        <View>
                                            <Text style={styles.passengerName}>{booking.passenger?.full_name || 'Passenger'}</Text>
                                            <Text style={styles.passengerSeats}>{booking.seats_booked} seats • {booking.status}</Text>
                                        </View>
                                    </View>

                                    <View style={styles.passengerActions}>
                                        <TouchableOpacity
                                            onPress={() => router.push(`/chat/${id}?userId=${booking.passenger_id}&userName=${booking.passenger?.full_name}` as any)}
                                            style={styles.actionIcon}
                                        >
                                            <Ionicons name="chatbubble-outline" size={20} color="#3b82f6" />
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
                                                style={styles.rateButton}
                                            >
                                                <Text style={styles.rateButtonText}>Rate</Text>
                                            </TouchableOpacity>
                                        )}
                                    </View>
                                </Animated.View>
                            ))}
                        </Animated.View>
                    )}

                    <Animated.View
                        entering={FadeInDown.delay(500)}
                        style={styles.actionButtons}
                    >
                        <TouchableOpacity
                            style={styles.chatButton}
                            onPress={() => router.push(`/chat/${id}?userId=${isDriver ? 'passenger' : trip.driver_id}&userName=${isDriver ? 'Passenger' : trip.driver?.full_name}` as any)}
                        >
                            <Ionicons name="chatbubble-outline" size={20} color="#3b82f6" />
                            <Text style={styles.chatButtonText}>
                                Chat with {isDriver ? 'Passenger' : 'Driver'}
                            </Text>
                        </TouchableOpacity>

                        {(trip.status === 'ongoing' || trip.status === 'confirmed') && (
                            <EmergencyButton tripId={id as string} style={styles.emergencyBtn} />
                        )}
                    </Animated.View>

                    {(trip.status === 'ongoing' || trip.status === 'confirmed') && (
                        <SafetyCheckIn tripId={id as string} style={{ marginBottom: 20 }} />
                    )}

                    <SimilarTripsMobile
                        trips={similarTrips || []}
                        onSelect={(newId) => router.push(`/trip/${newId}`)}
                    />

                    <View style={{ marginTop: 20, gap: 16 }}>
                        <RideInsuranceCard />

                        <TouchableOpacity
                            style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 12, backgroundColor: '#eff6ff', borderRadius: 8, gap: 8 }}
                            onPress={() => setShowSafetyTips(true)}
                        >
                            <Ionicons name="shield-checkmark-outline" size={20} color="#3b82f6" />
                            <Text style={{ color: '#3b82f6', fontWeight: '600' }}>Read Safety Guidelines</Text>
                        </TouchableOpacity>
                    </View>
                </Animated.View>
            </ScrollView>

            <SafetyTipsModal
                visible={showSafetyTips}
                onClose={() => setShowSafetyTips(false)}
            />

            <SplitFareModal
                visible={showSplitFare}
                onClose={() => setShowSplitFare(false)}
                bookingId={bookings?.find((b: any) => b.passenger_id === user?.id)?.id || ''}
                totalAmount={trip?.price_per_seat * seatsToBook || 0}
            />

            <BookingConfirmationModal
                visible={showBookingConfirmation}
                onClose={() => setShowBookingConfirmation(false)}
                onConfirm={() => {
                    setShowBookingConfirmation(false);
                    bookingMutation.mutate(undefined, {
                        onSuccess: () => {
                            // After successful booking, show verification if trip is starting soon
                            // and trigger auto-share logic
                            setShowDriverVerification(true);
                            logger.info('Booking successful, showing driver verification');
                        }
                    });
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
                    visible={showDriverVerification}
                    onClose={() => setShowDriverVerification(false)}
                    bookingId={bookings?.find((b: any) => b.passenger_id === user?.id)?.id || ''}
                    driver={{
                        id: trip.driver_id,
                        name: trip.driver?.full_name || 'Driver',
                        photo: trip.driver?.avatar_url,
                        vehicle_make: trip.driver_details?.vehicle_make || 'Vehicle',
                        vehicle_model: trip.driver_details?.vehicle_model || '',
                        vehicle_plate: trip.driver_details?.vehicle_plate || 'N/A'
                    }}
                    onVerified={() => {
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

            <FareBreakdownModal
                visible={showReceipt}
                onClose={() => setShowReceipt(false)}
                trip={trip}
                booking={bookings?.find((b: any) => b.passenger_id === user?.id)} // For passengers
            />

            <TipDriverModal
                visible={showTipModal}
                onClose={() => setShowTipModal(false)}
                tripId={trip.id}
                driverId={trip.driver_id}
                driverName={trip.driver?.full_name || 'Driver'}
            />

            {!isDriver && trip.status === 'upcoming' && (
                <View style={styles.footer}>
                    <SeatSelector
                        availableSeats={trip.available_seats}
                        selectedSeats={seatsToBook}
                        onSelectSeats={setSeatsToBook}
                    />
                    <TouchableOpacity
                        style={styles.bookBtn}
                        onPress={() => setShowBookingConfirmation(true)}
                    >
                        <Text style={styles.bookBtnText}>
                            Book for ₹{trip.price_per_seat * seatsToBook}
                        </Text>
                    </TouchableOpacity>
                </View>
            )}

            {isDriver && (
                <View style={styles.footer}>
                    {trip.status === 'upcoming' || trip.status === 'confirmed' ? (
                        <>
                            <TouchableOpacity
                                style={[styles.bookBtn, { backgroundColor: 'white', borderWidth: 1, borderColor: '#e5e7eb', flex: 0.3 }]}
                                onPress={() => setShowEditTripModal(true)}
                            >
                                <Ionicons name="create-outline" size={24} color="#1f2937" />
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.bookBtn, { backgroundColor: '#22c55e' }]}
                                onPress={() => updateStatusMutation.mutate('ongoing')}
                            >
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                    <Ionicons name="play" size={20} color="white" />
                                    <Text style={styles.bookBtnText}>Start Trip</Text>
                                </View>
                            </TouchableOpacity>
                        </>
                    ) : trip.status === 'ongoing' ? (
                        <View style={{ flexDirection: 'row', gap: 12, width: '100%' }}>
                            <TouchableOpacity
                                style={[styles.bookBtn, { backgroundColor: '#3b82f6', flex: 1 }]}
                                onPress={() => openMap(parseFloat(trip.drop_lat), parseFloat(trip.drop_lng), 'Destination')}
                            >
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                    <Ionicons name="navigate" size={20} color="white" />
                                    <Text style={styles.bookBtnText}>Navigate</Text>
                                </View>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.bookBtn, { backgroundColor: '#ef4444', flex: 1 }]}
                                onPress={() => updateStatusMutation.mutate('completed')}
                            >
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                    <Ionicons name="stop" size={20} color="white" />
                                    <Text style={styles.bookBtnText}>End Trip</Text>
                                </View>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <View style={[styles.bookBtn, { backgroundColor: '#9ca3af' }]}>
                            <Text style={styles.bookBtnText}>Trip {trip.status}</Text>
                        </View>
                    )}
                </View>
            )}

            {!isDriver && trip.status === 'completed' && (
                <View style={styles.footer}>
                    <TouchableOpacity
                        style={[styles.bookBtn, { backgroundColor: 'white', borderWidth: 1, borderColor: '#3b82f6' }]}
                        onPress={() => setShowReceipt(true)}
                    >
                        <Text style={[styles.bookBtnText, { color: '#3b82f6' }]}>
                            Receipt
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.bookBtn, { backgroundColor: '#3b82f6' }]}
                        onPress={() => setShowTipModal(true)}
                    >
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <Ionicons name="heart" size={20} color="white" />
                            <Text style={styles.bookBtnText}>Tip Driver</Text>
                        </View>
                    </TouchableOpacity>
                </View>
            )}
        </SafeAreaView>
    );
};


const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'white',
    },
    loading: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
        backgroundColor: 'white',
    },
    errorTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#1f2937',
        marginTop: 16,
        marginBottom: 8,
    },
    errorText: {
        fontSize: 16,
        color: '#6b7280',
        textAlign: 'center',
        marginBottom: 24,
    },
    retryBtn: {
        backgroundColor: '#3b82f6',
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 8,
    },
    retryBtnText: {
        color: 'white',
        fontWeight: '600',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#f3f4f6',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1f2937',
    },
    headerActions: {
        flexDirection: 'row',
        gap: 12,
    },
    iconBtn: {
        padding: 4,
    },
    scrollView: {
        flex: 1,
    },
    mapContainer: {
        height: 200,
        backgroundColor: '#f3f4f6',
    },
    map: {
        ...StyleSheet.absoluteFillObject,
    },
    content: {
        padding: 20,
    },
    driverCard: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        backgroundColor: '#f9fafb',
        borderRadius: 16,
        marginBottom: 24,
    },
    driverInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    avatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#3b82f6',
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarText: {
        color: 'white',
        fontSize: 20,
        fontWeight: 'bold',
    },
    driverName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#1f2937',
    },
    rating: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    ratingText: {
        fontSize: 12,
        color: '#6b7280',
    },
    priceContainer: {
        alignItems: 'flex-end',
    },
    price: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#3b82f6',
    },
    priceLabel: {
        fontSize: 12,
        color: '#6b7280',
    },
    detailsList: {
        gap: 20,
        marginBottom: 24,
    },
    detailItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    detailTextContainer: {
        flex: 1,
    },
    detailLabel: {
        fontSize: 12,
        color: '#6b7280',
        marginBottom: 2,
    },
    detailValue: {
        fontSize: 16,
        color: '#1f2937',
        fontWeight: '500',
    },
    preferences: {
        marginTop: 8,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#1f2937',
        marginBottom: 12,
    },
    badgeContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    badge: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        backgroundColor: '#eff6ff',
        borderRadius: 20,
    },
    badgeText: {
        color: '#3b82f6',
        fontSize: 12,
        fontWeight: '500',
    },
    footer: {
        padding: 20,
        borderTopWidth: 1,
        borderTopColor: '#f3f4f6',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    seatsPicker: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    seatsLabel: {
        fontSize: 14,
        fontWeight: '500',
        color: '#1f2937',
    },
    navBtn: {
        padding: 4,
    },
    arrivalOverlay: {
        position: 'absolute',
        top: 16,
        left: 16,
        right: 16,
        alignItems: 'center',
    },
    arrivalBadge: {
        backgroundColor: '#1f2937',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 24,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    arrivalTitle: {
        color: 'white',
        fontSize: 14,
        fontWeight: '600',
    },
    arrivalTime: {
        color: '#60a5fa',
        fontSize: 14,
        fontWeight: 'bold',
    },
    stepper: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#e5e7eb',
        borderRadius: 8,
    },
    stepBtn: {
        padding: 8,
    },
    seatsCount: {
        paddingHorizontal: 12,
        fontSize: 16,
        fontWeight: '600',
    },
    bookBtn: {
        flex: 1,
        backgroundColor: '#3b82f6',
        height: 52,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    bookBtnText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
    driverMarker: {
        backgroundColor: 'white',
        padding: 5,
        borderRadius: 20,
        borderWidth: 2,
        borderColor: '#3b82f6',
    },
    actionButtons: {
        marginTop: 24,
        marginBottom: 24,
        gap: 12,
    },
    chatButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#eff6ff',
        padding: 16,
        borderRadius: 12,
        gap: 8,
        borderWidth: 1,
        borderColor: '#3b82f6',
    },
    chatButtonText: {
        color: '#3b82f6',
        fontSize: 16,
        fontWeight: '600',
    },
    emergencyBtn: {
        marginTop: 0,
    },
    section: {
        marginBottom: 24,
    },
    passengerCard: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#f9fafb',
        padding: 12,
        borderRadius: 12,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: '#f3f4f6',
    },
    passengerInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    passengerAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#e5e7eb',
        justifyContent: 'center',
        alignItems: 'center',
    },
    passengerAvatarText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#6b7280',
    },
    passengerName: {
        fontSize: 14,
        fontWeight: '600',
        color: '#1f2937',
    },
    passengerSeats: {
        fontSize: 12,
        color: '#6b7280',
    },
    passengerActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    actionIcon: {
        padding: 4,
    },
    rateButton: {
        backgroundColor: '#eff6ff',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#3b82f6',
    },
    rateButtonText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#3b82f6',
    },
});

export default TripDetailsScreen;
