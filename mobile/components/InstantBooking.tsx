import React, { useState, useEffect } from 'react';
import { View, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { Text } from '@/components/ui/text';
import { MapPin, Clock, Zap, IndianRupee } from 'lucide-react-native';
import { RideService, FareEstimate } from '@/services/RideService';
import { useAuth } from '@/contexts/AuthContext';
import { router } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
 
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
    const { theme } = useTheme();
    const isDark = theme === 'dark';
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
                pickupLocation: pickup.address,
                pickupLat: pickup.lat,
                pickupLng: pickup.lng,
                dropLocation: drop.address,
                dropLat: drop.lat,
                dropLng: drop.lng,
                fare: fareEstimate.estimatedPrice,
                totalAmount: fareEstimate.estimatedPrice,
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
            <View className="p-10 items-center justify-center bg-white dark:bg-slate-900 rounded-t-[32px]">
                <ActivityIndicator size="large" color="#6366f1" />
                <Text className="mt-4 text-sm font-bold text-slate-500 dark:text-slate-400 text-center">Calculating premium fare...</Text>
            </View>
        );
    }
 
    return (
        <View className="p-8 bg-white dark:bg-slate-900 rounded-t-[32px] shadow-2xl">
            {/* Fare Estimate Card */}
            <View className="bg-slate-50 dark:bg-slate-800/40 rounded-[28px] p-6 mb-8 border border-slate-100 dark:border-slate-800/30">
                <View className="flex-row items-center mb-6">
                    <View className="w-10 h-10 rounded-2xl bg-amber-500/10 items-center justify-center border border-amber-500/20">
                        <Zap size={24} color="#f59e0b" fill="#f59e0b" />
                    </View>
                    <Text className="text-xl font-black text-slate-900 dark:text-white ml-3 tracking-tight">Instant Booking</Text>
                </View>
 
                {fareEstimate && (
                    <>
                        <View className="flex-row items-end mb-6">
                            <Text className="text-2xl font-black text-slate-900 dark:text-white mb-2 mr-1">₹</Text>
                            <Text className="text-5xl font-black text-slate-900 dark:text-white tracking-tighter">{fareEstimate.estimatedPrice}</Text>
                            {fareEstimate.surgeMultiplier > 1 && (
                                <View className="bg-amber-100 dark:bg-amber-900/30 px-3 py-1 rounded-full ml-4 mb-2">
                                    <Text className="text-sm font-black text-amber-700 dark:text-amber-400">
                                        {fareEstimate.surgeMultiplier}x Surge
                                    </Text>
                                </View>
                            )}
                        </View>
 
                        <View className="flex-row gap-6 mb-6">
                            <View className="flex-row items-center gap-2">
                                <View className="w-8 h-8 rounded-full bg-slate-200/50 dark:bg-slate-700/50 items-center justify-center">
                                    <MapPin size={14} color={isDark ? "#94a3b8" : "#64748b"} />
                                </View>
                                <Text className="text-sm font-black text-slate-600 dark:text-slate-400">
                                    {fareEstimate.distanceKm} km
                                </Text>
                            </View>
                            <View className="flex-row items-center gap-2">
                                <View className="w-8 h-8 rounded-full bg-slate-200/50 dark:bg-slate-700/50 items-center justify-center">
                                    <Clock size={14} color={isDark ? "#94a3b8" : "#64748b"} />
                                </View>
                                <Text className="text-sm font-black text-slate-600 dark:text-slate-400">
                                    ~{fareEstimate.durationMins} mins
                                </Text>
                            </View>
                        </View>
 
                        {fareEstimate.surgeMultiplier > 1 && (
                            <View className="bg-amber-50 dark:bg-amber-950/20 p-4 rounded-2xl mb-2 border border-amber-100 dark:border-amber-900/20">
                                <Text className="text-xs font-black text-amber-700 dark:text-amber-500 leading-4">
                                    ⚡ High demand period - surge pricing applied for faster driver allocation
                                </Text>
                            </View>
                        )}
                    </>
                )}
 
                {/* Driver Availability */}
                <View className="flex-row items-center mt-6 pt-6 border-t border-slate-200 dark:border-slate-700/50">
                    <View className={`w-2 h-2 rounded-full mr-3 ${driversNearby > 0 ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                    <Text className="text-sm font-bold text-slate-500 dark:text-slate-400">
                        {driversNearby > 0
                            ? `${driversNearby} Driver${driversNearby > 1 ? 's' : ''} available nearby`
                            : 'No drivers available in your vicinity'
                        }
                    </Text>
                </View>
            </View>
 
            {/* Action Buttons */}
            <View className="gap-4">
                <TouchableOpacity
                    className={`flex-row h-16 rounded-[24px] items-center justify-center gap-3 shadow-lg shadow-blue-500/20 ${(loading || driversNearby === 0) ? 'bg-slate-200 dark:bg-slate-800 opacity-50 shadow-none' : 'bg-blue-600 active:bg-blue-700'}`}
                    onPress={handleInstantBook}
                    disabled={loading || !fareEstimate}
                >
                    {loading ? (
                        <ActivityIndicator size="small" color="#fff" />
                    ) : (
                        <>
                            <Zap size={20} color="#fff" fill="#fff" />
                            <Text className="text-white font-black text-lg">
                                {driversNearby > 0 ? 'Book Instantly' : 'No Drivers Available'}
                            </Text>
                        </>
                    )}
                </TouchableOpacity>
 
                <TouchableOpacity
                    className="flex-row h-16 rounded-[24px] items-center justify-center gap-3 border-2 border-blue-600 dark:border-blue-500 bg-white dark:bg-slate-900"
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
                    <Clock size={20} color={isDark ? "#3b82f6" : "#2563eb"} />
                    <Text className="text-blue-600 dark:text-blue-500 font-black text-lg">Schedule for Later</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};
 
const styles = StyleSheet.create({});
