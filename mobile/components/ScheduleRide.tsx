import React, { useState } from 'react';
import { View, TouchableOpacity, StyleSheet, Alert, Platform } from 'react-native';
import { Text } from '@/components/ui/text';
import { Calendar, Clock, MapPin, IndianRupee, Check } from 'lucide-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { RideService, FareEstimate } from '@/services/RideService';
import { useAuth } from '@/contexts/AuthContext';
import { router } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
 
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
    const { theme } = useTheme();
    const isDark = theme === 'dark';
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
                                pickupLocation: pickup.address,
                                pickupLat: pickup.lat,
                                pickupLng: pickup.lng,
                                dropLocation: drop.address,
                                dropLat: drop.lat,
                                dropLng: drop.lng,
                                fare: fareEstimate.estimatedPrice,
                                totalAmount: fareEstimate.estimatedPrice,
                                status: 'scheduled',
                                scheduled_time: scheduledDateTime.toISOString()
                            } as any);
 
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
        <View className="p-4 bg-white dark:bg-slate-950 rounded-[32px] border border-slate-100 dark:border-slate-800 shadow-sm">
            {/* Header */}
            <View className="flex-row items-center mb-8 bg-indigo-50 dark:bg-indigo-900/10 p-4 rounded-2xl border border-indigo-100 dark:border-indigo-900/20">
                <View className="w-10 h-10 rounded-full bg-indigo-500/10 items-center justify-center">
                    <Calendar size={20} color="#6366f1" />
                </View>
                <Text className="text-xl font-black text-indigo-900 dark:text-indigo-400 ml-4 tracking-tight">Schedule Your Ride</Text>
            </View>
 
            {/* Route Summary */}
            <View className="bg-slate-50 dark:bg-slate-900/50 rounded-[28px] p-6 mb-8 border border-slate-100 dark:border-slate-800/30">
                <View className="flex-row items-center gap-4">
                    <View className="w-3 h-3 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-900" />
                    <Text className="flex-1 text-sm font-black text-slate-700 dark:text-slate-300" numberOfLines={1}>
                        {pickup.address}
                    </Text>
                </View>
                <View className="ml-1 w-0.5 h-6 bg-slate-200 dark:bg-slate-700 my-2" />
                <View className="flex-row items-center gap-4">
                    <View className="w-3 h-3 rounded-full bg-rose-500 border-2 border-white dark:border-slate-900" />
                    <Text className="flex-1 text-sm font-black text-slate-700 dark:text-slate-300" numberOfLines={1}>
                        {drop.address}
                    </Text>
                </View>
            </View>
 
            {/* Date & Time Selection */}
            <View className="flex-row gap-4 mb-8">
                {/* Date Selector */}
                <TouchableOpacity
                    className="flex-1 rounded-3xl p-5 border-2 border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 active:bg-slate-50 dark:active:bg-slate-800"
                    onPress={() => setShowDatePicker(true)}
                >
                    <View className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/30 items-center justify-center mb-4">
                        <Calendar size={20} color="#6366f1" />
                    </View>
                    <Text className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Date</Text>
                    <Text className="text-base font-black text-slate-900 dark:text-white">
                        {formatDate(selectedDate)}
                    </Text>
                </TouchableOpacity>
 
                {/* Time Selector */}
                <TouchableOpacity
                    className="flex-1 rounded-3xl p-5 border-2 border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 active:bg-slate-50 dark:active:bg-slate-800"
                    onPress={() => setShowTimePicker(true)}
                >
                    <View className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/30 items-center justify-center mb-4">
                        <Clock size={20} color="#f59e0b" />
                    </View>
                    <Text className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Time</Text>
                    <Text className="text-base font-black text-slate-900 dark:text-white">
                        {formatTime(selectedTime)}
                    </Text>
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
            <View className="bg-slate-50 dark:bg-slate-900/50 rounded-[28px] p-6 mb-8 border border-slate-100 dark:border-slate-800/30">
                <View className="flex-row justify-between items-center mb-3">
                    <Text className="text-sm font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Estimated Fare</Text>
                    <View className="flex-row items-center">
                        <Text className="text-base font-black text-slate-900 dark:text-white mr-1">₹</Text>
                        <Text className="text-2xl font-black text-slate-900 dark:text-white">{fareEstimate.estimatedPrice}</Text>
                    </View>
                </View>
                <Text className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-tighter">
                    {fareEstimate.distanceKm} km • ~{fareEstimate.durationMins} mins travel time
                </Text>
            </View>
 
            {/* Info Banner */}
            <View className="flex-row items-center gap-3 bg-emerald-50 dark:bg-emerald-950/20 p-5 rounded-2xl mb-8 border border-emerald-100 dark:border-emerald-900/20">
                <View className="w-8 h-8 rounded-full bg-emerald-500/10 items-center justify-center">
                    <Check size={16} color="#10b981" />
                </View>
                <Text className="flex-1 text-xs font-medium text-emerald-700 dark:text-emerald-400 leading-4">
                    We'll find a driver for you 15 minutes before your scheduled pickup time
                </Text>
            </View>
 
            {/* Schedule Button */}
            <TouchableOpacity
                className={`flex-row items-center justify-center gap-3 h-16 rounded-[24px] shadow-lg shadow-indigo-500/20 ${loading ? 'bg-slate-200 dark:bg-slate-800 opacity-50 shadow-none' : 'bg-indigo-600 active:bg-indigo-700'}`}
                onPress={handleScheduleRide}
                disabled={loading}
            >
                <Calendar size={20} color="#fff" />
                <Text className="text-white font-black text-lg">
                    {loading ? 'Scheduling...' : 'Schedule Ride'}
                </Text>
            </TouchableOpacity>
        </View>
    );
};
 
const styles = StyleSheet.create({});
