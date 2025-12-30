import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { MapPin, Clock, Zap, IndianRupee } from 'lucide-react-native';
import { RideService, FareEstimate } from '@/services/RideService';
import { useAuth } from '@/contexts/AuthContext';
import { router } from 'expo-router';

interface InstantBookingProps {
    pickup: {
        lat: number;
        lng: number;
        address: string;
    };
    drop: {
        lat: number;
        lng: number;
        address: string;
    };
    onBookingComplete?: (bookingId: string) => void;
}

export const InstantBooking: React.FC<InstantBookingProps> = ({
    pickup,
    drop,
    onBookingComplete
}) => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [estimating, setEstimating] = useState(true);
    const [fareEstimate, setFareEstimate] = useState<FareEstimate | null>(null);
    const [driversNearby, setDriversNearby] = useState<number>(0);

    useEffect(() => {
        loadFareEstimate();
        checkDriverAvailability();
    }, [pickup, drop]);

    const loadFareEstimate = async () => {
        try {
            setEstimating(true);
            const estimate = await RideService.estimateFare(pickup, drop);
            setFareEstimate(estimate);
        } catch (error) {
            console.error('Error estimating fare:', error);
            Alert.alert('Error', 'Failed to estimate fare. Please try again.');
        } finally {
            setEstimating(false);
        }
    };

    const checkDriverAvailability = async () => {
        try {
            // Check for nearby drivers within 5km radius
            const { MapService } = await import('@/services/MapService');
            const nearby = await MapService.getNearbyDrivers(pickup, 5000);
            setDriversNearby(nearby.length);
        } catch (error) {
            console.error('Error checking driver availability:', error);
        }
    };

    const handleInstantBook = async () => {
        if (!user) {
            Alert.alert('Authentication Required', 'Please login to book a ride.');
            router.push('/login');
            return;
        }

        if (!fareEstimate) {
            Alert.alert('Error', 'Fare estimate not available. Please try again.');
            return;
        }

        if (driversNearby === 0) {
            Alert.alert(
                'No Drivers Available',
                'There are no drivers nearby at the moment. Would you like to schedule this ride for later?',
                [
                    { text: 'Cancel', style: 'cancel' },
                    {
                        text: 'Schedule Ride',
                        onPress: () => router.push({
                            pathname: '/create-trip',
                            params: {
                                pickup_lat: pickup.lat,
                                pickup_lng: pickup.lng,
                                pickup_location: pickup.address,
                                drop_lat: drop.lat,
                                drop_lng: drop.lng,
                                drop_location: drop.address,
                                schedule: 'true'
                            }
                        })
                    }
                ]
            );
            return;
        }

        try {
            setLoading(true);

            // Create instant booking
            const booking = await RideService.bookRide({
                pickup_location: pickup.address,
                pickup_lat: pickup.lat,
                pickup_lng: pickup.lng,
                drop_location: drop.address,
                drop_lat: drop.lat,
                drop_lng: drop.lng,
                price_per_seat: fareEstimate.estimatedPrice,
                total_amount: fareEstimate.estimatedPrice,
                status: 'pending'
            });

            // Navigate to trip details
            if (onBookingComplete) {
                onBookingComplete(booking.id);
            } else {
                router.push(`/trip/${booking.id}`);
            }

            Alert.alert(
                'Booking Confirmed!',
                'Finding a driver near you...',
                [{ text: 'OK' }]
            );
        } catch (error: any) {
            console.error('Error booking ride:', error);
            Alert.alert('Booking Failed', error.message || 'Failed to book ride. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    if (estimating) {
        return (
            <View style={styles.container}>
                <ActivityIndicator size="large" color="#6366f1" />
                <Text style={styles.loadingText}>Calculating fare...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* Fare Estimate Card */}
            <View style={styles.fareCard}>
                <View style={styles.fareHeader}>
                    <Zap size={24} color="#f59e0b" fill="#f59e0b" />
                    <Text style={styles.fareTitle}>Instant Booking</Text>
                </View>

                {fareEstimate && (
                    <>
                        <View style={styles.priceContainer}>
                            <IndianRupee size={32} color="#1f2937" />
                            <Text style={styles.priceText}>{fareEstimate.estimatedPrice}</Text>
                            {fareEstimate.surgeMultiplier > 1 && (
                                <View style={styles.surgeBadge}>
                                    <Text style={styles.surgeText}>
                                        {fareEstimate.surgeMultiplier}x
                                    </Text>
                                </View>
                            )}
                        </View>

                        <View style={styles.detailsRow}>
                            <View style={styles.detailItem}>
                                <MapPin size={16} color="#6b7280" />
                                <Text style={styles.detailText}>
                                    {fareEstimate.distanceKm} km
                                </Text>
                            </View>
                            <View style={styles.detailItem}>
                                <Clock size={16} color="#6b7280" />
                                <Text style={styles.detailText}>
                                    ~{fareEstimate.durationMins} mins
                                </Text>
                            </View>
                        </View>

                        {fareEstimate.surgeMultiplier > 1 && (
                            <View style={styles.surgeAlert}>
                                <Text style={styles.surgeAlertText}>
                                    ⚡ High demand - {fareEstimate.surgeMultiplier}x surge pricing active
                                </Text>
                            </View>
                        )}
                    </>
                )}

                {/* Driver Availability */}
                <View style={styles.availabilityContainer}>
                    <View style={[
                        styles.availabilityDot,
                        { backgroundColor: driversNearby > 0 ? '#10b981' : '#ef4444' }
                    ]} />
                    <Text style={styles.availabilityText}>
                        {driversNearby > 0
                            ? `${driversNearby} driver${driversNearby > 1 ? 's' : ''} nearby`
                            : 'No drivers available nearby'
                        }
                    </Text>
                </View>
            </View>

            {/* Book Now Button */}
            <TouchableOpacity
                style={[
                    styles.bookButton,
                    (loading || driversNearby === 0) && styles.bookButtonDisabled
                ]}
                onPress={handleInstantBook}
                disabled={loading || !fareEstimate}
            >
                {loading ? (
                    <ActivityIndicator size="small" color="#fff" />
                ) : (
                    <>
                        <Zap size={20} color="#fff" fill="#fff" />
                        <Text style={styles.bookButtonText}>
                            {driversNearby > 0 ? 'Book Instantly' : 'Schedule Ride'}
                        </Text>
                    </>
                )}
            </TouchableOpacity>

            {/* Alternative: Schedule for Later */}
            {driversNearby > 0 && (
                <TouchableOpacity
                    style={styles.scheduleButton}
                    onPress={() => router.push({
                        pathname: '/create-trip',
                        params: {
                            pickup_lat: pickup.lat,
                            pickup_lng: pickup.lng,
                            pickup_location: pickup.address,
                            drop_lat: drop.lat,
                            drop_lng: drop.lng,
                            drop_location: drop.address,
                            schedule: 'true'
                        }
                    })}
                >
                    <Clock size={18} color="#6366f1" />
                    <Text style={styles.scheduleButtonText}>Schedule for Later</Text>
                </TouchableOpacity>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        padding: 16,
        backgroundColor: '#fff',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 5,
    },
    loadingText: {
        marginTop: 12,
        fontSize: 14,
        color: '#6b7280',
        textAlign: 'center',
    },
    fareCard: {
        backgroundColor: '#f9fafb',
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
    },
    fareHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    fareTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1f2937',
        marginLeft: 8,
    },
    priceContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    priceText: {
        fontSize: 40,
        fontWeight: '800',
        color: '#1f2937',
        marginLeft: 4,
    },
    surgeBadge: {
        backgroundColor: '#fef3c7',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
        marginLeft: 12,
    },
    surgeText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#f59e0b',
    },
    detailsRow: {
        flexDirection: 'row',
        gap: 24,
        marginBottom: 12,
    },
    detailItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    detailText: {
        fontSize: 14,
        color: '#6b7280',
        fontWeight: '500',
    },
    surgeAlert: {
        backgroundColor: '#fef3c7',
        padding: 12,
        borderRadius: 8,
        marginTop: 8,
    },
    surgeAlertText: {
        fontSize: 13,
        color: '#92400e',
        fontWeight: '600',
    },
    availabilityContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 12,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#e5e7eb',
    },
    availabilityDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginRight: 8,
    },
    availabilityText: {
        fontSize: 14,
        color: '#4b5563',
        fontWeight: '500',
    },
    bookButton: {
        backgroundColor: '#6366f1',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 16,
        borderRadius: 12,
        marginBottom: 12,
    },
    bookButtonDisabled: {
        backgroundColor: '#9ca3af',
    },
    bookButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
    },
    scheduleButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 12,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: '#6366f1',
    },
    scheduleButtonText: {
        color: '#6366f1',
        fontSize: 15,
        fontWeight: '600',
    },
});
