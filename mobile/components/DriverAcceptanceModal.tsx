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
import { useTheme } from '@/contexts/ThemeContext';
 
export function DriverAcceptanceModal() {
    const { user } = useAuth();
    const router = useRouter();
    const { theme } = useTheme();
    const isDark = theme === 'dark';
 
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
            <View className="flex-1 bg-black/60 justify-end p-5">
                <Card className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                    <View className="flex-row justify-between items-center mb-6">
                        <View className="flex-row items-center gap-2.5">
                            <View className="w-3 h-3 rounded-full bg-red-100 dark:bg-red-900/40 justify-center items-center">
                                <View className="w-2 h-2 rounded-full bg-red-500" />
                            </View>
                            <Text className="text-lg font-bold text-slate-900 dark:text-white">New Ride Request</Text>
                        </View>
                        <Text className="text-sm font-bold text-red-500">30s</Text>
                    </View>
 
                    <View className="flex-row items-center bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl mb-6">
                        <View className="w-11 h-11 rounded-full bg-blue-600 justify-center items-center mr-3">
                            <Text className="text-white text-lg font-bold">
                                {bookingDetails.passenger?.full_name?.charAt(0) || 'P'}
                            </Text>
                        </View>
                        <View className="flex-1">
                            <Text className="text-base font-bold text-slate-900 dark:text-white">{bookingDetails.passenger?.full_name || 'Passenger'}</Text>
                            <View className="flex-row items-center gap-1 mt-0.5">
                                <Ionicons name="star" size={14} color="#f59e0b" />
                                <Text className="text-xs text-slate-500 dark:text-slate-400">{bookingDetails.passenger?.rating || 'New'}</Text>
                            </View>
                        </View>
                        <View className="items-end">
                            <Text className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">You Earn</Text>
                            <Text className="text-xl font-bold text-emerald-600 dark:text-emerald-400">₹{Math.round(bookingDetails.total_amount * 0.8)}</Text>
                        </View>
                    </View>
 
                    <View className="mb-8">
                        <View className="flex-row items-center gap-3">
                            <View className="w-2 h-2 rounded-full bg-emerald-500" />
                            <Text className="text-sm text-slate-600 dark:text-slate-400 font-medium flex-1" numberOfLines={1}>{bookingDetails.pickup_location}</Text>
                        </View>
                        <View className="w-[1px] h-3 bg-slate-200 dark:bg-slate-800 ml-1 my-1" />
                        <View className="flex-row items-center gap-3">
                            <View className="w-2 h-2 rounded-full bg-red-500" />
                            <Text className="text-sm text-slate-600 dark:text-slate-400 font-medium flex-1" numberOfLines={1}>{bookingDetails.drop_location}</Text>
                        </View>
                    </View>
 
                    <View className="flex-row gap-3">
                        <TouchableOpacity
                            className="flex-1 h-14 justify-center items-center rounded-2xl bg-slate-100 dark:bg-slate-800 active:bg-slate-200 dark:active:bg-slate-700"
                            onPress={handleDecline}
                            disabled={loading}
                        >
                            <Text className="text-base font-bold text-slate-600 dark:text-slate-400">Decline</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            className="flex-[2] h-14 justify-center items-center rounded-2xl bg-blue-600 active:bg-blue-700 shadow-lg shadow-blue-500/20"
                            onPress={handleAccept}
                            disabled={loading}
                        >
                            {loading ? (
                                <ActivityIndicator color="white" />
                            ) : (
                                <Text className="text-white font-bold text-base">Accept Ride</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </Card>
            </View>
        </Modal>
    );
}
 
const styles = StyleSheet.create({});
