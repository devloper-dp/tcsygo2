import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Alert, Share } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { Map, Marker } from '../../components/Map';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { TripTimelineMobile, DriverVerificationMobile, SimilarTripsMobile } from '../../components/TripDetailsComponents';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BookingConfirmationModal, SeatSelector } from '../../components/BookingComponents';
import { EmergencyButton } from '../../components/EmergencyButton';


const TripDetailsScreen = () => {
    const router = useRouter();
    const { id } = useLocalSearchParams();
    const { user } = useAuth();
    const [seatsToBook, setSeatsToBook] = useState(1);
    const [isSaved, setIsSaved] = useState(false);
    const [showBookingConfirmation, setShowBookingConfirmation] = useState(false);

    // Check if trip is saved
    useEffect(() => {
        const checkSaved = async () => {
            try {
                const saved = await AsyncStorage.getItem('saved_trips');
                if (saved) {
                    const savedTrips = JSON.parse(saved);
                    setIsSaved(savedTrips.includes(id));
                }
            } catch (e) {
                console.error('Failed to check saved status:', e);
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
                    driver:users(*)
                `)
                .eq('id', id)
                .single();
            if (error) throw error;
            return data;
        },
    });

    const { data: similarTrips } = useQuery({
        queryKey: ['similar-trips', trip?.pickup_location, trip?.drop_location],
        queryFn: async () => {
            if (!trip) return [];
            return [
                {
                    id: 'mock-1',
                    pickup_location: trip.pickup_location,
                    drop_location: trip.drop_location,
                    price_per_seat: (trip.price_per_seat || 0) - 50,
                    departure_time: new Date(Date.now() + 86400000).toISOString(),
                    driver_rating: 4.7
                },
                {
                    id: 'mock-2',
                    pickup_location: trip.pickup_location,
                    drop_location: trip.drop_location,
                    price_per_seat: (trip.price_per_seat || 0) + 100,
                    departure_time: new Date(Date.now() + 172800000).toISOString(),
                    driver_rating: 4.9
                }
            ];
        },
        enabled: !!trip
    });

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
        onSuccess: (data, status) => {
            Alert.alert('Success', `Trip ${status === 'ongoing' ? 'Started' : 'Ended'}`);
        },
        onError: (error: any) => {
            Alert.alert('Error', error.message || 'Failed to update trip status');
        }
    });

    const [driverLocation, setDriverLocation] = useState<{ lat: number, lng: number } | null>(null);

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
            await Share.share({
                message: `Check out this trip from ${trip.pickup_location} to ${trip.drop_location} on ${new Date(trip.departure_time).toLocaleDateString()} for ₹${trip.price_per_seat}/seat. Book now on TCSYGO!`,
                title: 'Share Trip',
            });
        } catch (error) {
            console.error('Share failed:', error);
        }
    };

    const handleSaveToggle = async () => {
        try {
            const saved = await AsyncStorage.getItem('saved_trips');
            let savedTrips = saved ? JSON.parse(saved) : [];

            if (isSaved) {
                savedTrips = savedTrips.filter((tripId: string) => tripId !== id);
                setIsSaved(false);
                Alert.alert('Removed', 'Trip removed from saved list');
            } else {
                savedTrips.push(id);
                setIsSaved(true);
                Alert.alert('Saved', 'Trip saved for later');
            }

            await AsyncStorage.setItem('saved_trips', JSON.stringify(savedTrips));
        } catch (e) {
            Alert.alert('Error', 'Failed to save trip');
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

    const isDriver = user?.id === trip.driver_id;

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
                        />
                        <Marker
                            coordinate={{ latitude: parseFloat(trip.drop_lat), longitude: parseFloat(trip.drop_lng) }}
                            title="Drop"
                        />
                        {driverLocation && (
                            <Marker
                                coordinate={{ latitude: driverLocation.lat, longitude: driverLocation.lng }}
                                title="Driver"
                            >
                                <View style={styles.driverMarker}>
                                    <Ionicons name="car" size={20} color="#3b82f6" />
                                </View>
                            </Marker>
                        )}
                    </Map>
                </View>

                <View style={styles.content}>
                    <View style={styles.driverCard}>
                        <View style={styles.driverInfo}>
                            <View style={styles.avatar}>
                                <Text style={styles.avatarText}>{trip.driver?.full_name?.charAt(0)}</Text>
                            </View>
                            <View>
                                <Text style={styles.driverName}>{trip.driver?.full_name}</Text>
                                <DriverVerificationMobile
                                    rating={4.8}
                                    totalTrips={124}
                                    isVerified={true}
                                />
                            </View>
                        </View>
                        <View style={styles.priceContainer}>
                            <Text style={styles.price}>₹{trip.price_per_seat}</Text>
                            <Text style={styles.priceLabel}>per seat</Text>
                        </View>
                    </View>

                    <View style={styles.detailsList}>
                        <View style={styles.detailItem}>
                            <Ionicons name="location-outline" size={24} color="#3b82f6" />
                            <View style={styles.detailTextContainer}>
                                <Text style={styles.detailLabel}>Pickup</Text>
                                <Text style={styles.detailValue}>{trip.pickup_location}</Text>
                            </View>
                        </View>
                        <View style={styles.detailItem}>
                            <Ionicons name="flag-outline" size={24} color="#ef4444" />
                            <View style={styles.detailTextContainer}>
                                <Text style={styles.detailLabel}>Drop-off</Text>
                                <Text style={styles.detailValue}>{trip.drop_location}</Text>
                            </View>
                        </View>
                        <View style={styles.detailItem}>
                            <Ionicons name="calendar-outline" size={24} color="#6b7280" />
                            <View style={styles.detailTextContainer}>
                                <Text style={styles.detailLabel}>Departure</Text>
                                <Text style={styles.detailValue}>
                                    {new Date(trip.departure_time).toLocaleString()}
                                </Text>
                            </View>
                        </View>
                        <View style={styles.detailItem}>
                            <Ionicons name="people-outline" size={24} color="#6b7280" />
                            <View style={styles.detailTextContainer}>
                                <Text style={styles.detailLabel}>Available Seats</Text>
                                <Text style={styles.detailValue}>{trip.available_seats} remaining</Text>
                            </View>
                        </View>
                    </View>

                    {trip.preferences && (
                        <View style={styles.preferences}>
                            <Text style={styles.sectionTitle}>Preferences</Text>
                            <View style={styles.badgeContainer}>
                                {trip.preferences.smoking && <View style={styles.badge}><Text style={styles.badgeText}>Smoking Allowed</Text></View>}
                                {trip.preferences.pets && <View style={styles.badge}><Text style={styles.badgeText}>Pets Allowed</Text></View>}
                                {trip.preferences.music && <View style={styles.badge}><Text style={styles.badgeText}>Music Allowed</Text></View>}
                            </View>
                        </View>
                    )}

                    <TripTimelineMobile
                        pickup={trip.pickup_location}
                        drop={trip.drop_location}
                        departureTime={trip.departure_time}
                    />

                    {/* Action Buttons */}
                    <View style={styles.actionButtons}>
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
                    </View>

                    <SimilarTripsMobile
                        trips={similarTrips || []}
                        onSelect={(newId) => router.push(`/trip/${newId}`)}
                    />
                </View>
            </ScrollView>

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

            {isDriver && (
                <View style={styles.footer}>
                    {trip.status === 'upcoming' || trip.status === 'confirmed' ? (
                        <TouchableOpacity
                            style={[styles.bookBtn, { backgroundColor: '#22c55e' }]}
                            onPress={() => updateStatusMutation.mutate('ongoing')}
                        >
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                <Ionicons name="play" size={20} color="white" />
                                <Text style={styles.bookBtnText}>Start Trip</Text>
                            </View>
                        </TouchableOpacity>
                    ) : trip.status === 'ongoing' ? (
                        <TouchableOpacity
                            style={[styles.bookBtn, { backgroundColor: '#ef4444' }]}
                            onPress={() => updateStatusMutation.mutate('completed')}
                        >
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                <Ionicons name="stop" size={20} color="white" />
                                <Text style={styles.bookBtnText}>End Trip</Text>
                            </View>
                        </TouchableOpacity>
                    ) : (
                        <View style={[styles.bookBtn, { backgroundColor: '#9ca3af' }]}>
                            <Text style={styles.bookBtnText}>Trip {trip.status}</Text>
                        </View>
                    )}
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
});

export default TripDetailsScreen;
