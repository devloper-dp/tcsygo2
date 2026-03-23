import React, { useState } from 'react';
import {
    View,
    TouchableOpacity,
    StyleSheet,
    Modal,
    ScrollView,
    Alert,
} from 'react-native';
import { Text } from '@/components/ui/text';
import { Calendar, Clock, X, Check, AlertCircle } from 'lucide-react-native';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import DateTimePicker from '@react-native-community/datetimepicker';
import { RideService } from '@/services/RideService';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
 
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
    const { theme } = useTheme();
    const isDark = theme === 'dark';
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
            <View className="flex-1 justify-end bg-black/50">
                <View className="bg-white dark:bg-slate-900 border-t-2 border-slate-100 dark:border-slate-800 rounded-t-[32px] max-h-[90%] overflow-hidden shadow-2xl">
                    {/* Header */}
                    <View className="flex-row items-center justify-between p-6 border-b border-slate-100 dark:border-slate-800">
                        <Text className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Schedule Ride</Text>
                        <TouchableOpacity 
                            onPress={onClose} 
                            className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 items-center justify-center"
                        >
                            <X size={24} color={isDark ? "#94a3b8" : "#475569"} />
                        </TouchableOpacity>
                    </View>
 
                    <ScrollView className="p-6" showsVerticalScrollIndicator={false}>
                        {/* Trip Summary */}
                        <View className="bg-slate-50 dark:bg-slate-800/40 rounded-[28px] p-6 mb-8 border border-slate-100 dark:border-slate-800/30">
                            <View className="flex-row items-center gap-4 mb-3">
                                <View className="w-3 h-3 rounded-full bg-blue-500 border-2 border-white dark:border-slate-900 shadow-sm" />
                                <Text className="flex-1 text-sm font-bold text-slate-600 dark:text-slate-400" numberOfLines={1}>
                                    {pickupLocation}
                                </Text>
                            </View>
                            <View className="ml-1 w-0.5 h-6 bg-slate-200 dark:bg-slate-700 mb-3" />
                            <View className="flex-row items-center gap-4">
                                <View className="w-3 h-3 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-900 shadow-sm" />
                                <Text className="flex-1 text-sm font-bold text-slate-600 dark:text-slate-400" numberOfLines={1}>
                                    {dropLocation}
                                </Text>
                            </View>
                            <View className="flex-row items-center justify-between mt-6 pt-6 border-t border-slate-200 dark:border-slate-700/50">
                                <View className="bg-blue-100 dark:bg-blue-900/30 px-3 py-1.5 rounded-full">
                                    <Text className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest">{vehicleType}</Text>
                                </View>
                                <Text className="text-2xl font-black text-slate-900 dark:text-white">₹{price}</Text>
                            </View>
                        </View>
 
                        {/* Date Selection */}
                        <View className="mb-8">
                            <Text className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-4 ml-2">Select Date</Text>
                            <TouchableOpacity
                                className="flex-row items-center gap-4 p-5 bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-700 active:bg-slate-50 dark:active:bg-slate-800"
                                onPress={() => setShowDatePicker(!showDatePicker)}
                            >
                                <View className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/20 items-center justify-center">
                                    <Calendar size={20} color="#3b82f6" />
                                </View>
                                <Text className="text-base font-black text-slate-900 dark:text-white">{formatDate(selectedDate)}</Text>
                            </TouchableOpacity>
 
                            {showDatePicker && (
                                <View className="mt-4 p-4 bg-slate-50 dark:bg-slate-800/20 rounded-3xl border border-slate-100 dark:border-slate-800">
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
                        <View className="mb-8">
                            <Text className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-4 ml-2">Select Time</Text>
                            <TouchableOpacity
                                className="flex-row items-center gap-4 p-5 bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-700 active:bg-slate-50 dark:active:bg-slate-800"
                                onPress={() => setShowTimePicker(true)}
                            >
                                <View className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-900/20 items-center justify-center">
                                    <Clock size={20} color="#f59e0b" />
                                </View>
                                <Text className="text-base font-black text-slate-900 dark:text-white">{formatTime(selectedTime)}</Text>
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
 
                        {/* Summary Card */}
                        <View className="bg-blue-600 dark:bg-blue-700 p-8 rounded-[32px] mb-8 shadow-xl shadow-blue-500/20">
                            <Text className="text-[10px] font-black text-blue-100/70 uppercase tracking-widest mb-1">Ride Scheduled For</Text>
                            <Text className="text-2xl font-black text-white leading-8">
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
                            <View className="flex-row items-center gap-3 bg-rose-50 dark:bg-rose-950/20 p-4 rounded-2xl mb-8 border border-rose-100 dark:border-rose-900/20">
                                <AlertCircle size={18} color="#ef4444" />
                                <Text className="flex-1 text-xs font-bold text-rose-600 dark:text-rose-400">
                                    Please schedule at least 30 minutes in advance
                                </Text>
                            </View>
                        )}
 
                        {/* Important Notes */}
                        <View className="bg-emerald-50 dark:bg-emerald-950/20 p-6 rounded-[28px] mb-10 border border-emerald-100 dark:border-emerald-900/20">
                            <Text className="text-xs font-black text-emerald-700 dark:text-emerald-400 uppercase tracking-widest mb-4">Important Notes</Text>
                            <View className="gap-3">
                                {[
                                    'Driver assigned 15m before pickup',
                                    'Reminder sent 1 hour before ride',
                                    'Free cancellation up to 30m before'
                                ].map((note, i) => (
                                    <View key={i} className="flex-row items-center gap-3">
                                        <View className="w-5 h-5 rounded-full bg-emerald-500/10 items-center justify-center">
                                            <Check size={12} color="#10b981" />
                                        </View>
                                        <Text className="text-xs font-medium text-emerald-600/80 dark:text-emerald-500/80">{note}</Text>
                                    </View>
                                ))}
                            </View>
                        </View>
                    </ScrollView>
 
                    {/* Footer */}
                    <View className="flex-row gap-4 p-6 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800">
                        <TouchableOpacity
                            className="flex-1 h-16 rounded-[24px] bg-slate-50 dark:bg-slate-800 items-center justify-center border border-slate-100 dark:border-slate-800"
                            onPress={onClose}
                            disabled={loading}
                        >
                            <Text className="text-base font-black text-slate-500 dark:text-slate-400">Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            className={`flex-[1.5] h-16 rounded-[24px] items-center justify-center shadow-lg shadow-blue-500/20 ${(!isValidScheduleTime() || loading) ? 'bg-slate-200 dark:bg-slate-800 opacity-50 shadow-none' : 'bg-blue-600'}`}
                            onPress={handleScheduleRide}
                            disabled={!isValidScheduleTime() || loading}
                        >
                            <Text className="text-white font-black text-lg">
                                {loading ? 'Scheduling...' : 'Schedule Ride'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
};
 
const styles = StyleSheet.create({});
