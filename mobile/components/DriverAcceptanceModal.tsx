import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Modal, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Text } from './ui/text';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { RideService } from '@/services/RideService';
import { logger } from '@/services/LoggerService';
import { useRouter } from 'expo-router';

export function DriverAcceptanceModal() {
    const { user } = useAuth();
    const router = useRouter();
    const [visible, setVisible] = useState(false);
    const [bookingDetails, setBookingDetails] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [isDriver, setIsDriver] = useState(false);

    useEffect(() => {
        if (user) {
            checkIfDriver();
        }
    }, [user]);

    const checkIfDriver = async () => {
        try {
            const { data, error } = await supabase
                .from('drivers')
                .select('id, verification_status, is_available')
                .eq('user_id', user?.id)
                .single();

            if (data && data.verification_status === 'verified') {
                setIsDriver(true);
            }
        } catch (error) {
            logger.error('Error checking driver status:', error);
        }
    };

    useEffect(() => {
        if (!isDriver || !user) return;

        // Subscribe to real-time notifications
        const channel = supabase
            .channel(`driver-notifications-${user.id}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'notifications',
                    filter: `user_id=eq.${user.id}`,
                },
                (payload) => {
                    const notification = payload.new as any;
                    if (notification.type === 'booking_confirmation' && notification.data?.type === 'new_booking') {
                        fetchBookingDetails(notification.data.bookingId);
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [isDriver, user]);

    const fetchBookingDetails = async (bookingId: string) => {
        try {
            const { data: booking, error } = await supabase
                .from('bookings')
                .select('*, passenger:users(full_name, rating)')
                .eq('id', bookingId)
                .single();

            if (error) throw error;
            if (booking.status !== 'pending') return; // Already taken or cancelled

            setBookingDetails(booking);
            setVisible(true);

            // Auto close after 30 seconds if no action
            setTimeout(() => {
                setVisible(prev => {
                    if (prev && bookingDetails?.id === bookingId) return false;
                    return prev;
                });
            }, 30000);

        } catch (error) {
            logger.error('Error fetching booking details:', error);
        }
    };

    const handleAccept = async () => {
        if (!bookingDetails || !user) return;
        setLoading(true);
        try {
            const { data: driver } = await supabase
                .from('drivers')
                .select('id')
                .eq('user_id', user.id)
                .single();

            if (!driver) throw new Error('Driver profile not found');

            const result = await RideService.matchDriver(bookingDetails.id, driver.id);
            if (result.success) {
                setVisible(false);
                router.push(`/booking/${bookingDetails.id}`);
            } else {
                alert(result.error || 'Failed to accept ride. It might have been taken by another driver.');
                setVisible(false);
            }
        } catch (error: any) {
            logger.error('Error accepting ride:', error);
            alert(error.message || 'Something went wrong');
        } finally {
            setLoading(false);
        }
    };

    const handleDecline = () => {
        setVisible(false);
        setBookingDetails(null);
    };

    if (!visible || !bookingDetails) return null;

    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="slide"
        >
            <View style={styles.overlay}>
                <Card style={styles.content}>
                    <View style={styles.header}>
                        <View style={styles.titleRow}>
                            <View style={styles.pulseContainer}>
                                <View style={styles.pulseDot} />
                            </View>
                            <Text variant="h3" style={styles.title}>New Ride Request</Text>
                        </View>
                        <Text style={styles.timer}>30s</Text>
                    </View>

                    <View style={styles.passengerInfo}>
                        <View style={styles.avatar}>
                            <Text style={styles.avatarText}>
                                {bookingDetails.passenger?.full_name?.charAt(0) || 'P'}
                            </Text>
                        </View>
                        <View>
                            <Text style={styles.passengerName}>{bookingDetails.passenger?.full_name || 'Passenger'}</Text>
                            <View style={styles.ratingRow}>
                                <Ionicons name="star" size={14} color="#f59e0b" />
                                <Text style={styles.ratingText}>{bookingDetails.passenger?.rating || 'New'}</Text>
                            </View>
                        </View>
                        <View style={styles.priceContainer}>
                            <Text style={styles.priceLabel}>You Earn</Text>
                            <Text style={styles.price}>₹{Math.round(bookingDetails.total_amount * 0.8)}</Text>
                        </View>
                    </View>

                    <View style={styles.routeContainer}>
                        <View style={styles.routeRow}>
                            <View style={[styles.dot, { backgroundColor: '#10b981' }]} />
                            <Text style={styles.address} numberOfLines={1}>{bookingDetails.pickup_location}</Text>
                        </View>
                        <View style={styles.line} />
                        <View style={styles.routeRow}>
                            <View style={[styles.dot, { backgroundColor: '#ef4444' }]} />
                            <Text style={styles.address} numberOfLines={1}>{bookingDetails.drop_location}</Text>
                        </View>
                    </View>

                    <View style={styles.footer}>
                        <TouchableOpacity
                            style={styles.declineButton}
                            onPress={handleDecline}
                            disabled={loading}
                        >
                            <Text style={styles.declineText}>Decline</Text>
                        </TouchableOpacity>
                        <Button
                            style={styles.acceptButton}
                            onPress={handleAccept}
                            disabled={loading}
                        >
                            {loading ? (
                                <ActivityIndicator color="white" />
                            ) : (
                                <Text style={styles.acceptText}>Accept Ride</Text>
                            )}
                        </Button>
                    </View>
                </Card>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'flex-end',
        padding: 20,
    },
    content: {
        padding: 20,
        borderRadius: 24,
        backgroundColor: 'white',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    titleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1f2937',
    },
    pulseContainer: {
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: '#fee2e2',
        justifyContent: 'center',
        alignItems: 'center',
    },
    pulseDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#ef4444',
    },
    timer: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#ef4444',
    },
    passengerInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f9fafb',
        padding: 12,
        borderRadius: 16,
        marginBottom: 20,
    },
    avatar: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#3b82f6',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    avatarText: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
    },
    passengerName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1f2937',
    },
    ratingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    ratingText: {
        fontSize: 12,
        color: '#6b7280',
    },
    priceContainer: {
        marginLeft: 'auto',
        alignItems: 'flex-end',
    },
    priceLabel: {
        fontSize: 10,
        color: '#6b7280',
        textTransform: 'uppercase',
    },
    price: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#10b981',
    },
    routeContainer: {
        marginBottom: 24,
    },
    routeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    line: {
        width: 1,
        height: 12,
        backgroundColor: '#e5e7eb',
        marginLeft: 3,
        marginVertical: 4,
    },
    address: {
        fontSize: 14,
        color: '#4b5563',
        flex: 1,
    },
    footer: {
        flexDirection: 'row',
        gap: 12,
    },
    declineButton: {
        flex: 1,
        height: 52,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 12,
        backgroundColor: '#f3f4f6',
    },
    declineText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#4b5563',
    },
    acceptButton: {
        flex: 2,
        height: 52,
    },
    acceptText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    }
});
