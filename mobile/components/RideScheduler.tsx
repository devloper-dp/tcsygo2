import React, { useState } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Modal,
    ScrollView,
    Alert,
} from 'react-native';
import { Calendar, Clock, X, Check, AlertCircle } from 'lucide-react-native';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import DateTimePicker from '@react-native-community/datetimepicker';
import { RideService } from '@/services/RideService';
import { useAuth } from '@/contexts/AuthContext';

interface RideSchedulerProps {
    visible: boolean;
    onClose: () => void;
    pickupLocation: string;
    dropLocation: string;
    pickupCoords: { lat: number; lng: number };
    dropCoords: { lat: number; lng: number };
    vehicleType: string;
    price: number;
    onScheduleComplete: (bookingId: string) => void;
}

export const RideScheduler: React.FC<RideSchedulerProps> = ({
    visible,
    onClose,
    pickupLocation,
    dropLocation,
    pickupCoords,
    dropCoords,
    vehicleType,
    price,
    onScheduleComplete,
}) => {
    const { user } = useAuth();
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());
    const [selectedTime, setSelectedTime] = useState<Date>(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [showTimePicker, setShowTimePicker] = useState(false);
    const [loading, setLoading] = useState(false);

    const minDate = new Date();
    const maxDate = new Date();
    maxDate.setDate(maxDate.getDate() + 30); // Allow scheduling up to 30 days in advance

    const handleScheduleRide = async () => {
        if (!user) {
            Alert.alert('Error', 'Please login to schedule a ride');
            return;
        }

        // Combine date and time
        const scheduledDateTime = new Date(selectedDate);
        scheduledDateTime.setHours(selectedTime.getHours());
        scheduledDateTime.setMinutes(selectedTime.getMinutes());

        // Validate scheduled time is in the future
        const now = new Date();
        const minScheduleTime = new Date(now.getTime() + 30 * 60000); // At least 30 minutes from now

        if (scheduledDateTime < minScheduleTime) {
            Alert.alert(
                'Invalid Time',
                'Please schedule your ride at least 30 minutes in advance'
            );
            return;
        }

        setLoading(true);

        try {
            const booking = await RideService.bookRide({
                pickup_location: pickupLocation,
                drop_location: dropLocation,
                pickup_lat: pickupCoords.lat,
                pickup_lng: pickupCoords.lng,
                drop_lat: dropCoords.lat,
                drop_lng: dropCoords.lng,
                status: 'scheduled',
                price_per_seat: price,
                total_amount: price,
                scheduled_time: scheduledDateTime.toISOString(),
                preferences: {
                    vehicle_type: vehicleType,
                },
            });

            // Schedule notification reminder
            await scheduleRideReminder(booking.id, scheduledDateTime);

            Alert.alert(
                'Ride Scheduled!',
                `Your ride has been scheduled for ${scheduledDateTime.toLocaleString()}`,
                [
                    {
                        text: 'OK',
                        onPress: () => {
                            onScheduleComplete(booking.id);
                            onClose();
                        },
                    },
                ]
            );
        } catch (error: any) {
            console.error('Error scheduling ride:', error);
            Alert.alert('Error', 'Failed to schedule ride. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const scheduleRideReminder = async (bookingId: string, scheduledTime: Date) => {
        try {
            const { ScheduledRideManager } = await import('@/services/ScheduledRideManager');

            // Schedule notifications using ScheduledRideManager
            await ScheduledRideManager.scheduleNotifications(bookingId, scheduledTime);

            console.log('Ride reminders scheduled successfully');
        } catch (error) {
            console.error('Error scheduling ride reminders:', error);
        }
    };

    const formatDate = (date: Date): string => {
        return date.toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            year: 'numeric',
        });
    };

    const formatTime = (time: Date): string => {
        return time.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const getScheduledDateTime = (): Date => {
        const scheduledDateTime = new Date(selectedDate);
        scheduledDateTime.setHours(selectedTime.getHours());
        scheduledDateTime.setMinutes(selectedTime.getMinutes());
        return scheduledDateTime;
    };

    const isValidScheduleTime = (): boolean => {
        const scheduledDateTime = getScheduledDateTime();
        const now = new Date();
        const minScheduleTime = new Date(now.getTime() + 30 * 60000);
        return scheduledDateTime >= minScheduleTime;
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={true}
            onRequestClose={onClose}
        >
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    {/* Header */}
                    <View style={styles.header}>
                        <Text style={styles.headerTitle}>Schedule Your Ride</Text>
                        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                            <X size={24} color="#6b7280" />
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
                        {/* Trip Summary */}
                        <View style={styles.tripSummary}>
                            <View style={styles.locationRow}>
                                <View style={styles.locationDot} />
                                <Text style={styles.locationText} numberOfLines={1}>
                                    {pickupLocation}
                                </Text>
                            </View>
                            <View style={styles.locationDivider} />
                            <View style={styles.locationRow}>
                                <View style={[styles.locationDot, styles.locationDotDrop]} />
                                <Text style={styles.locationText} numberOfLines={1}>
                                    {dropLocation}
                                </Text>
                            </View>
                            <View style={styles.priceRow}>
                                <Text style={styles.vehicleType}>{vehicleType.toUpperCase()}</Text>
                                <Text style={styles.price}>₹{price}</Text>
                            </View>
                        </View>

                        {/* Date Selection */}
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Select Date</Text>
                            <TouchableOpacity
                                style={styles.selectionButton}
                                onPress={() => setShowDatePicker(!showDatePicker)}
                            >
                                <Calendar size={20} color="#3b82f6" />
                                <Text style={styles.selectionText}>{formatDate(selectedDate)}</Text>
                            </TouchableOpacity>

                            {showDatePicker && (
                                <View style={styles.pickerContainer}>
                                    <CalendarComponent
                                        selected={selectedDate}
                                        onSelect={(date) => {
                                            setSelectedDate(date || new Date());
                                            setShowDatePicker(false);
                                        }}
                                        minDate={minDate}
                                        maxDate={maxDate}
                                    />
                                </View>
                            )}
                        </View>

                        {/* Time Selection */}
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Select Time</Text>
                            <TouchableOpacity
                                style={styles.selectionButton}
                                onPress={() => setShowTimePicker(true)}
                            >
                                <Clock size={20} color="#3b82f6" />
                                <Text style={styles.selectionText}>{formatTime(selectedTime)}</Text>
                            </TouchableOpacity>

                            {showTimePicker && (
                                <DateTimePicker
                                    value={selectedTime}
                                    mode="time"
                                    is24Hour={false}
                                    display="default"
                                    onChange={(event, time) => {
                                        setShowTimePicker(false);
                                        if (time) {
                                            setSelectedTime(time);
                                        }
                                    }}
                                />
                            )}
                        </View>

                        {/* Scheduled Time Display */}
                        <View style={styles.scheduledTimeContainer}>
                            <Text style={styles.scheduledTimeLabel}>Scheduled for:</Text>
                            <Text style={styles.scheduledTime}>
                                {getScheduledDateTime().toLocaleString('en-US', {
                                    weekday: 'short',
                                    month: 'short',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                })}
                            </Text>
                        </View>

                        {/* Validation Warning */}
                        {!isValidScheduleTime() && (
                            <View style={styles.warningContainer}>
                                <AlertCircle size={16} color="#f59e0b" />
                                <Text style={styles.warningText}>
                                    Please schedule at least 30 minutes in advance
                                </Text>
                            </View>
                        )}

                        {/* Important Notes */}
                        <View style={styles.notesContainer}>
                            <Text style={styles.notesTitle}>Important Notes:</Text>
                            <View style={styles.noteItem}>
                                <Check size={16} color="#10b981" />
                                <Text style={styles.noteText}>
                                    Driver will be assigned 15 minutes before scheduled time
                                </Text>
                            </View>
                            <View style={styles.noteItem}>
                                <Check size={16} color="#10b981" />
                                <Text style={styles.noteText}>
                                    You'll receive a reminder 1 hour before your ride
                                </Text>
                            </View>
                            <View style={styles.noteItem}>
                                <Check size={16} color="#10b981" />
                                <Text style={styles.noteText}>
                                    Free cancellation up to 30 minutes before scheduled time
                                </Text>
                            </View>
                        </View>
                    </ScrollView>

                    {/* Footer */}
                    <View style={styles.footer}>
                        <TouchableOpacity
                            style={styles.cancelButton}
                            onPress={onClose}
                            disabled={loading}
                        >
                            <Text style={styles.cancelButtonText}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[
                                styles.scheduleButton,
                                (!isValidScheduleTime() || loading) && styles.scheduleButtonDisabled,
                            ]}
                            onPress={handleScheduleRide}
                            disabled={!isValidScheduleTime() || loading}
                        >
                            <Text style={styles.scheduleButtonText}>
                                {loading ? 'Scheduling...' : 'Schedule Ride'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        maxHeight: '90%',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#1f2937',
    },
    closeButton: {
        padding: 4,
    },
    scrollView: {
        padding: 20,
    },
    tripSummary: {
        backgroundColor: '#f9fafb',
        borderRadius: 12,
        padding: 16,
        marginBottom: 24,
    },
    locationRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    locationDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: '#3b82f6',
    },
    locationDotDrop: {
        backgroundColor: '#10b981',
    },
    locationText: {
        flex: 1,
        fontSize: 14,
        color: '#4b5563',
        fontWeight: '500',
    },
    locationDivider: {
        width: 2,
        height: 16,
        backgroundColor: '#d1d5db',
        marginLeft: 4,
        marginVertical: 4,
    },
    priceRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 12,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#e5e7eb',
    },
    vehicleType: {
        fontSize: 12,
        fontWeight: '700',
        color: '#6b7280',
    },
    price: {
        fontSize: 18,
        fontWeight: '800',
        color: '#1f2937',
    },
    section: {
        marginBottom: 20,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1f2937',
        marginBottom: 12,
    },
    selectionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        padding: 16,
        backgroundColor: '#f9fafb',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#e5e7eb',
    },
    selectionText: {
        fontSize: 16,
        color: '#1f2937',
        fontWeight: '600',
    },
    pickerContainer: {
        marginTop: 12,
    },
    scheduledTimeContainer: {
        backgroundColor: '#dbeafe',
        padding: 16,
        borderRadius: 12,
        marginBottom: 20,
    },
    scheduledTimeLabel: {
        fontSize: 12,
        color: '#1e40af',
        fontWeight: '600',
        marginBottom: 4,
    },
    scheduledTime: {
        fontSize: 18,
        color: '#1e3a8a',
        fontWeight: '800',
    },
    warningContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: '#fef3c7',
        padding: 12,
        borderRadius: 8,
        marginBottom: 20,
    },
    warningText: {
        flex: 1,
        fontSize: 13,
        color: '#92400e',
        fontWeight: '500',
    },
    notesContainer: {
        backgroundColor: '#f0fdf4',
        padding: 16,
        borderRadius: 12,
        marginBottom: 20,
    },
    notesTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: '#166534',
        marginBottom: 12,
    },
    noteItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 8,
        marginBottom: 8,
    },
    noteText: {
        flex: 1,
        fontSize: 13,
        color: '#166534',
        lineHeight: 18,
    },
    footer: {
        flexDirection: 'row',
        gap: 12,
        padding: 20,
        borderTopWidth: 1,
        borderTopColor: '#e5e7eb',
    },
    cancelButton: {
        flex: 1,
        padding: 16,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: '#e5e7eb',
        alignItems: 'center',
    },
    cancelButtonText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#6b7280',
    },
    scheduleButton: {
        flex: 1,
        padding: 16,
        borderRadius: 12,
        backgroundColor: '#3b82f6',
        alignItems: 'center',
    },
    scheduleButtonDisabled: {
        backgroundColor: '#9ca3af',
    },
    scheduleButtonText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#fff',
    },
});
