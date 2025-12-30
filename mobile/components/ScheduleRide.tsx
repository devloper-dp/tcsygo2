import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, Platform } from 'react-native';
import { Calendar, Clock, MapPin, IndianRupee, Check } from 'lucide-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { RideService, FareEstimate } from '@/services/RideService';
import { useAuth } from '@/contexts/AuthContext';
import { router } from 'expo-router';

interface ScheduleRideProps {
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
    fareEstimate: FareEstimate;
    onScheduleComplete?: (bookingId: string) => void;
}

export const ScheduleRide: React.FC<ScheduleRideProps> = ({
    pickup,
    drop,
    fareEstimate,
    onScheduleComplete
}) => {
    const { user } = useAuth();
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());
    const [selectedTime, setSelectedTime] = useState<Date>(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [showTimePicker, setShowTimePicker] = useState(false);
    const [loading, setLoading] = useState(false);

    const minDate = new Date();
    const maxDate = new Date();
    maxDate.setDate(maxDate.getDate() + 7); // Allow scheduling up to 7 days in advance

    const handleDateChange = (event: any, date?: Date) => {
        setShowDatePicker(Platform.OS === 'ios');
        if (date) {
            setSelectedDate(date);
        }
    };

    const handleTimeChange = (event: any, time?: Date) => {
        setShowTimePicker(Platform.OS === 'ios');
        if (time) {
            setSelectedTime(time);
        }
    };

    const getScheduledDateTime = (): Date => {
        const scheduled = new Date(selectedDate);
        scheduled.setHours(selectedTime.getHours());
        scheduled.setMinutes(selectedTime.getMinutes());
        return scheduled;
    };

    const formatDate = (date: Date): string => {
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        if (date.toDateString() === today.toDateString()) {
            return 'Today';
        } else if (date.toDateString() === tomorrow.toDateString()) {
            return 'Tomorrow';
        } else {
            return date.toLocaleDateString('en-IN', {
                weekday: 'short',
                month: 'short',
                day: 'numeric'
            });
        }
    };

    const formatTime = (time: Date): string => {
        return time.toLocaleTimeString('en-IN', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });
    };

    const validateScheduleTime = (): boolean => {
        const scheduledDateTime = getScheduledDateTime();
        const now = new Date();
        const minScheduleTime = new Date(now.getTime() + 30 * 60000); // 30 minutes from now

        if (scheduledDateTime < minScheduleTime) {
            Alert.alert(
                'Invalid Time',
                'Please schedule at least 30 minutes in advance.'
            );
            return false;
        }

        if (scheduledDateTime > maxDate) {
            Alert.alert(
                'Invalid Date',
                'You can only schedule rides up to 7 days in advance.'
            );
            return false;
        }

        return true;
    };

    const handleScheduleRide = async () => {
        if (!user) {
            Alert.alert('Authentication Required', 'Please login to schedule a ride.');
            router.push('/login');
            return;
        }

        if (!validateScheduleTime()) {
            return;
        }

        const scheduledDateTime = getScheduledDateTime();

        Alert.alert(
            'Confirm Schedule',
            `Schedule ride for ${formatDate(selectedDate)} at ${formatTime(selectedTime)}?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Confirm',
                    onPress: async () => {
                        try {
                            setLoading(true);

                            const booking = await RideService.bookRide({
                                pickup_location: pickup.address,
                                pickup_lat: pickup.lat,
                                pickup_lng: pickup.lng,
                                drop_location: drop.address,
                                drop_lat: drop.lat,
                                drop_lng: drop.lng,
                                price_per_seat: fareEstimate.estimatedPrice,
                                total_amount: fareEstimate.estimatedPrice,
                                status: 'scheduled',
                                scheduled_time: scheduledDateTime.toISOString()
                            });

                            // Schedule notification reminder
                            await scheduleRideReminder(booking.id, scheduledDateTime);

                            if (onScheduleComplete) {
                                onScheduleComplete(booking.id);
                            } else {
                                router.push(`/trip/${booking.id}`);
                            }

                            Alert.alert(
                                'Ride Scheduled!',
                                `Your ride is scheduled for ${formatDate(selectedDate)} at ${formatTime(selectedTime)}. We'll notify you 15 minutes before.`,
                                [{ text: 'OK' }]
                            );
                        } catch (error: any) {
                            console.error('Error scheduling ride:', error);
                            Alert.alert('Scheduling Failed', error.message || 'Failed to schedule ride. Please try again.');
                        } finally {
                            setLoading(false);
                        }
                    }
                }
            ]
        );
    };

    const scheduleRideReminder = async (bookingId: string, scheduledTime: Date) => {
        try {
            const { NotificationService } = await import('@/services/NotificationService');

            // Schedule notification 15 minutes before ride
            const reminderTime = new Date(scheduledTime.getTime() - 15 * 60000);

            await NotificationService.scheduleNotification(
                'Ride Reminder',
                'Your scheduled ride is in 15 minutes. Get ready!',
                reminderTime,
                { bookingId, type: 'ride_reminder' }
            );
        } catch (error) {
            console.error('Error scheduling reminder:', error);
        }
    };

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <Calendar size={24} color="#6366f1" />
                <Text style={styles.headerTitle}>Schedule Your Ride</Text>
            </View>

            {/* Route Summary */}
            <View style={styles.routeCard}>
                <View style={styles.routeItem}>
                    <View style={[styles.routeDot, { backgroundColor: '#10b981' }]} />
                    <Text style={styles.routeText} numberOfLines={1}>
                        {pickup.address}
                    </Text>
                </View>
                <View style={styles.routeLine} />
                <View style={styles.routeItem}>
                    <View style={[styles.routeDot, { backgroundColor: '#ef4444' }]} />
                    <Text style={styles.routeText} numberOfLines={1}>
                        {drop.address}
                    </Text>
                </View>
            </View>

            {/* Date & Time Selection */}
            <View style={styles.selectionContainer}>
                {/* Date Selector */}
                <TouchableOpacity
                    style={styles.selectorButton}
                    onPress={() => setShowDatePicker(true)}
                >
                    <View style={styles.selectorIcon}>
                        <Calendar size={20} color="#6366f1" />
                    </View>
                    <View style={styles.selectorContent}>
                        <Text style={styles.selectorLabel}>Date</Text>
                        <Text style={styles.selectorValue}>
                            {formatDate(selectedDate)}
                        </Text>
                    </View>
                </TouchableOpacity>

                {/* Time Selector */}
                <TouchableOpacity
                    style={styles.selectorButton}
                    onPress={() => setShowTimePicker(true)}
                >
                    <View style={styles.selectorIcon}>
                        <Clock size={20} color="#6366f1" />
                    </View>
                    <View style={styles.selectorContent}>
                        <Text style={styles.selectorLabel}>Time</Text>
                        <Text style={styles.selectorValue}>
                            {formatTime(selectedTime)}
                        </Text>
                    </View>
                </TouchableOpacity>
            </View>

            {/* Date Picker */}
            {showDatePicker && (
                <DateTimePicker
                    value={selectedDate}
                    mode="date"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    onChange={handleDateChange}
                    minimumDate={minDate}
                    maximumDate={maxDate}
                />
            )}

            {/* Time Picker */}
            {showTimePicker && (
                <DateTimePicker
                    value={selectedTime}
                    mode="time"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    onChange={handleTimeChange}
                />
            )}

            {/* Fare Summary */}
            <View style={styles.fareCard}>
                <View style={styles.fareRow}>
                    <Text style={styles.fareLabel}>Estimated Fare</Text>
                    <View style={styles.fareAmount}>
                        <IndianRupee size={18} color="#1f2937" />
                        <Text style={styles.fareValue}>{fareEstimate.estimatedPrice}</Text>
                    </View>
                </View>
                <View style={styles.fareRow}>
                    <Text style={styles.fareSubtext}>
                        {fareEstimate.distanceKm} km • ~{fareEstimate.durationMins} mins
                    </Text>
                </View>
            </View>

            {/* Info Banner */}
            <View style={styles.infoBanner}>
                <Check size={16} color="#059669" />
                <Text style={styles.infoText}>
                    We'll find a driver for you 30 minutes before your scheduled time
                </Text>
            </View>

            {/* Schedule Button */}
            <TouchableOpacity
                style={[styles.scheduleButton, loading && styles.scheduleButtonDisabled]}
                onPress={handleScheduleRide}
                disabled={loading}
            >
                <Calendar size={20} color="#fff" />
                <Text style={styles.scheduleButtonText}>
                    {loading ? 'Scheduling...' : 'Schedule Ride'}
                </Text>
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        padding: 16,
        backgroundColor: '#fff',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#1f2937',
        marginLeft: 12,
    },
    routeCard: {
        backgroundColor: '#f9fafb',
        borderRadius: 12,
        padding: 16,
        marginBottom: 20,
    },
    routeItem: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    routeDot: {
        width: 12,
        height: 12,
        borderRadius: 6,
        marginRight: 12,
    },
    routeLine: {
        width: 2,
        height: 20,
        backgroundColor: '#d1d5db',
        marginLeft: 5,
        marginVertical: 4,
    },
    routeText: {
        flex: 1,
        fontSize: 14,
        color: '#4b5563',
        fontWeight: '500',
    },
    selectionContainer: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 20,
    },
    selectorButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f9fafb',
        borderRadius: 12,
        padding: 16,
        borderWidth: 2,
        borderColor: '#e5e7eb',
    },
    selectorIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#eef2ff',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    selectorContent: {
        flex: 1,
    },
    selectorLabel: {
        fontSize: 12,
        color: '#6b7280',
        marginBottom: 4,
    },
    selectorValue: {
        fontSize: 15,
        fontWeight: '600',
        color: '#1f2937',
    },
    fareCard: {
        backgroundColor: '#f9fafb',
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
    },
    fareRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    fareLabel: {
        fontSize: 14,
        color: '#6b7280',
        fontWeight: '500',
    },
    fareAmount: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    fareValue: {
        fontSize: 20,
        fontWeight: '700',
        color: '#1f2937',
        marginLeft: 4,
    },
    fareSubtext: {
        fontSize: 13,
        color: '#9ca3af',
    },
    infoBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#d1fae5',
        padding: 12,
        borderRadius: 8,
        marginBottom: 20,
        gap: 8,
    },
    infoText: {
        flex: 1,
        fontSize: 13,
        color: '#065f46',
        fontWeight: '500',
    },
    scheduleButton: {
        backgroundColor: '#6366f1',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 16,
        borderRadius: 12,
    },
    scheduleButtonDisabled: {
        backgroundColor: '#9ca3af',
    },
    scheduleButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
    },
});
