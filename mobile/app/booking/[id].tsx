import { useState } from 'react';
import { View, ScrollView, TouchableOpacity, Image, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, CheckCircle2, MapPin, Calendar, Users, IndianRupee, Split, Navigation, MessageCircle } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { SplitFareModal } from '@/components/SplitFareModal';
import { Text } from '@/components/ui/text';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/contexts/ThemeContext';
import { useResponsive } from '@/hooks/useResponsive';
 
const BookingDetailsScreen = () => {
    const router = useRouter();
    const { id } = useLocalSearchParams();
    const { theme, isDark } = useTheme();
    const { hScale, vScale, spacing, fontSize: fontSizes } = useResponsive();
    const [showSplitModal, setShowSplitModal] = useState(false);
 
    const { data: booking, isLoading, isError, error } = useQuery({
        queryKey: ['booking', id],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('bookings')
                .select(`
                    *,
                    trip:trips(*, driver:users(*))
                `)
                .eq('id', id)
                .single();
            if (error) throw error;
            return data;
        },
    });
 
    if (isLoading) {
        return (
            <SafeAreaView className="flex-1 bg-white dark:bg-slate-950 justify-center items-center">
                <Text style={{ fontSize: hScale(12) }} className="text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest">Loading booking...</Text>
            </SafeAreaView>
        );
    }
 
    if (isError || !booking) {
        return (
            <SafeAreaView style={{ padding: spacing.xl }} className="flex-1 bg-white dark:bg-slate-950 justify-center items-center">
                <View style={{ marginBottom: vScale(32), opacity: 0.2 }}>
                    <Navigation size={hScale(80)} color={isDark ? "#fff" : "#64748b"} />
                </View>
                <Text style={{ fontSize: hScale(24), marginTop: vScale(16), marginBottom: vScale(8) }} className="font-black text-slate-900 dark:text-white uppercase tracking-tighter">Booking Not Found</Text>
                <Text style={{ fontSize: hScale(16), marginBottom: vScale(40), lineHeight: vScale(24) }} className="text-slate-500 dark:text-slate-400 text-center font-medium">
                    We couldn't locate the booking details. It might have been cancelled or doesn't exist.
                </Text>
                <Button
                    style={{ width: '100%', height: vScale(56), borderRadius: hScale(16) }}
                    className="bg-slate-900 dark:bg-white"
                    onPress={() => router.back()}
                >
                    <Text style={{ fontSize: hScale(14) }} className="text-white dark:text-slate-900 font-black uppercase tracking-widest">Go Back</Text>
                </Button>
            </SafeAreaView>
        );
    }
 
    const { trip } = booking;
 
    return (
        <View className="flex-1 bg-slate-50 dark:bg-slate-950">
            <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
 
            {/* Header */}
            <View style={{ paddingHorizontal: spacing.xl, paddingVertical: vScale(16), borderBottomWidth: 1 }} className="bg-white dark:bg-slate-950 border-slate-100 dark:border-slate-800 shadow-sm z-10">
                <SafeAreaView edges={['top']} className="flex-row items-center">
                    <TouchableOpacity 
                        onPress={() => router.back()} 
                        style={{ width: hScale(40), height: hScale(40), borderRadius: hScale(20), marginRight: spacing.lg }}
                        className="bg-slate-50 dark:bg-slate-900 items-center justify-center active:bg-slate-100 dark:active:bg-slate-800"
                    >
                        <ArrowLeft size={hScale(20)} color={isDark ? "#f8fafc" : "#1e293b"} />
                    </TouchableOpacity>
                    <Text style={{ fontSize: hScale(21) }} className="font-black text-slate-900 dark:text-white uppercase tracking-tighter">Booking Details</Text>
                </SafeAreaView>
            </View>
 
            <ScrollView style={{ flex: 1, paddingHorizontal: spacing.xl, paddingTop: vScale(24) }} contentContainerStyle={{ paddingBottom: vScale(140) }} showsVerticalScrollIndicator={false}>
 
                {/* Success Banner */}
                <View style={{ alignItems: 'center', marginBottom: vScale(40), marginTop: vScale(8) }}>
                    <View style={{ width: hScale(80), height: hScale(80), borderRadius: hScale(40), marginBottom: vScale(20), borderWidth: 4 }} className="bg-green-50 dark:bg-green-900/20 items-center justify-center border-green-100 dark:border-green-800/30">
                        <CheckCircle2 size={hScale(40)} color="#16a34a" strokeWidth={3} />
                    </View>
                    <Text style={{ fontSize: hScale(30), marginBottom: vScale(8) }} className="font-black text-slate-900 dark:text-white uppercase tracking-tight">Booking Confirmed!</Text>
                    <Text style={{ fontSize: hScale(16) }} className="font-medium text-slate-500 dark:text-slate-400">Your seat has been reserved.</Text>
                </View>
 
                {/* Trip Route Card */}
                <View style={{ padding: spacing.xl, borderRadius: hScale(32), borderWidth: 1, marginBottom: vScale(24) }} className="bg-white dark:bg-slate-900 shadow-sm border-slate-100 dark:border-slate-800">
                    <Text style={{ fontSize: hScale(10), marginBottom: vScale(24) }} className="font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Route Info</Text>
 
                    <View style={{ gap: spacing.xl, marginBottom: vScale(24), position: 'relative' }}>
                        {/* Connector */}
                        <View style={{ position: 'absolute', left: hScale(9.5), top: vScale(12), bottom: 0, width: 1 }} className="bg-slate-200 dark:bg-slate-800" />
 
                        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing.lg }}>
                            <View style={{ width: hScale(20), height: hScale(20), borderRadius: hScale(10), borderWidth: 2, marginTop: vScale(2), zIndex: 10 }} className="bg-slate-900 dark:bg-white border-white dark:border-slate-900" />
                            <View className="flex-1">
                                <Text style={{ fontSize: hScale(10), marginBottom: vScale(4) }} className="font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Pickup</Text>
                                <Text style={{ fontSize: hScale(18), lineHeight: vScale(24) }} className="font-bold text-slate-900 dark:text-slate-200">{trip.pickup_location}</Text>
                            </View>
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing.lg }}>
                            <View style={{ width: hScale(20), height: hScale(20), borderRadius: hScale(10), borderWidth: 2, marginTop: vScale(2), zIndex: 10 }} className="bg-red-500 border-white dark:border-slate-900" />
                            <View className="flex-1">
                                <Text style={{ fontSize: hScale(10), marginBottom: vScale(4) }} className="font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Dropoff</Text>
                                <Text style={{ fontSize: hScale(18), lineHeight: vScale(24) }} className="font-bold text-slate-900 dark:text-slate-200">{trip.drop_location}</Text>
                            </View>
                        </View>
                    </View>
 
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.lg, borderRadius: hScale(16), borderWidth: 1 }} className="bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-800/50">
                        <Calendar size={hScale(18)} color={isDark ? "#94a3b8" : "#64748b"} />
                        <Text style={{ fontSize: hScale(14) }} className="font-bold text-slate-600 dark:text-slate-300">
                            {new Date(trip.departure_time).toLocaleString([], { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </Text>
                    </View>
                </View>
 
                {/* Booking Stats Grid */}
                <View style={{ flexDirection: 'row', gap: spacing.lg, marginBottom: vScale(24) }}>
                    <View style={{ flex: 1, padding: spacing.xl, borderRadius: hScale(32), borderWidth: 1, minHeight: vScale(140), justifyContent: 'space-between' }} className="bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 shadow-sm">
                        <View style={{ width: hScale(48), height: hScale(48), borderRadius: hScale(16), marginBottom: vScale(16) }} className="bg-blue-50 dark:bg-blue-900/20 items-center justify-center">
                            <Users size={hScale(24)} color="#3b82f6" />
                        </View>
                        <View>
                            <Text style={{ fontSize: hScale(10), marginBottom: vScale(4) }} className="font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Seats</Text>
                            <Text style={{ fontSize: hScale(24) }} className="font-black text-slate-900 dark:text-white uppercase tracking-tighter">{booking.seats_booked}</Text>
                        </View>
                    </View>
                    <View style={{ flex: 1, padding: spacing.xl, borderRadius: hScale(32), borderWidth: 1, minHeight: vScale(140), justifyContent: 'space-between' }} className="bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 shadow-sm">
                        <View style={{ width: hScale(48), height: hScale(48), borderRadius: hScale(16), marginBottom: vScale(16) }} className="bg-green-50 dark:bg-green-900/20 items-center justify-center">
                            <IndianRupee size={hScale(24)} color="#22c55e" />
                        </View>
                        <View>
                            <Text style={{ fontSize: hScale(10), marginBottom: vScale(4) }} className="font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Total</Text>
                            <Text style={{ fontSize: hScale(24) }} className="font-black text-slate-900 dark:text-white uppercase tracking-tighter">₹{booking.total_amount}</Text>
                        </View>
                    </View>
                </View>
 
                {/* Split Action */}
                <TouchableOpacity
                    style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.xl, borderRadius: hScale(16), borderWidth: 1, marginBottom: vScale(24) }}
                    className="bg-violet-50 dark:bg-violet-900/10 border-violet-100 dark:border-violet-900/20"
                    onPress={() => setShowSplitModal(true)}
                >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xl }}>
                        <View style={{ width: hScale(48), height: hScale(48), borderRadius: hScale(16) }} className="bg-violet-100 dark:bg-violet-900/30 items-center justify-center">
                            <Split size={hScale(24)} color={isDark ? "#a78bfa" : "#7c3aed"} strokeWidth={2.5} />
                        </View>
                        <View>
                            <Text style={{ fontSize: hScale(16) }} className="font-bold text-slate-900 dark:text-white tracking-tight">Split cost with friends?</Text>
                            <Text style={{ fontSize: hScale(12) }} className="font-medium text-slate-500 dark:text-slate-400">Share the ride fare easily</Text>
                        </View>
                    </View>
                    <View style={{ paddingHorizontal: hScale(12), paddingVertical: vScale(6), borderRadius: hScale(8), borderWidth: 1 }} className="bg-white dark:bg-white/10 border-slate-100 dark:border-white/10">
                        <Text style={{ fontSize: hScale(10) }} className="font-black text-violet-600 dark:text-violet-400 uppercase tracking-widest">SPLIT</Text>
                    </View>
                </TouchableOpacity>
 
                {/* Driver Card */}
                <View style={{ padding: spacing.xl, borderRadius: hScale(32), borderWidth: 1, marginBottom: vScale(24) }} className="bg-white dark:bg-slate-900 shadow-sm border-slate-100 dark:border-slate-800">
                    <Text style={{ fontSize: hScale(10), marginBottom: vScale(24) }} className="font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Driver Details</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.lg }}>
                        <View style={{ width: hScale(64), height: hScale(64), borderRadius: hScale(32), borderWidth: 2 }} className="bg-slate-100 dark:bg-slate-800 overflow-hidden border-slate-50 dark:border-slate-700 shadow-sm">
                            {trip.driver?.avatar_url ? (
                                <Image source={{ uri: trip.driver.avatar_url }} style={{ width: '100%', height: '100%' }} />
                            ) : (
                                <View style={{ width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' }} className="bg-slate-200 dark:bg-slate-800">
                                    <Text style={{ fontSize: hScale(24) }} className="font-black text-slate-400 dark:text-slate-600 uppercase tracking-tighter">{trip.driver?.full_name?.charAt(0) || 'D'}</Text>
                                </View>
                            )}
                        </View>
                        <View className="flex-1">
                            <Text style={{ fontSize: hScale(18), lineHeight: vScale(24) }} className="font-black text-slate-900 dark:text-white tracking-tight">{trip.driver?.full_name || 'Driver'}</Text>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: vScale(4) }}>
                                <View style={{ width: hScale(8), height: hScale(8), borderRadius: hScale(4) }} className="bg-green-500 ring-4 ring-green-100 dark:ring-green-900/20" />
                                <Text style={{ fontSize: hScale(10) }} className="font-black text-slate-500 dark:text-slate-500 uppercase tracking-widest">Verified Driver</Text>
                            </View>
                        </View>
                        <TouchableOpacity style={{ width: hScale(48), height: hScale(48), borderRadius: hScale(16), borderWidth: 1 }} className="bg-slate-50 dark:bg-slate-800 items-center justify-center border-slate-100 dark:border-slate-700 active:bg-slate-100 dark:active:bg-slate-700">
                            <MessageCircle size={hScale(24)} color={isDark ? "#94a3b8" : "#64748b"} />
                        </TouchableOpacity>
                    </View>
                </View>
 
            </ScrollView>
 
            {/* Bottom Actions */}
            <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: spacing.xl, borderTopWidth: 1 }} className="bg-white dark:bg-slate-950 border-slate-100 dark:border-slate-900 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
                <View style={{ flexDirection: 'row', gap: spacing.lg }}>
                    <Button
                        style={{ flex: 1, height: vScale(56), borderRadius: hScale(16) }}
                        className="bg-green-600 shadow-lg shadow-green-500/20"
                        onPress={() => router.push(`/track/${trip.id}` as any)}
                    >
                        <Text style={{ fontSize: hScale(14) }} className="text-white font-black uppercase tracking-widest">Track Ride</Text>
                    </Button>
                    <Button
                        style={{ flex: 1, height: vScale(56), borderRadius: hScale(16) }}
                        className="bg-slate-900 dark:bg-white shadow-lg shadow-slate-300 dark:shadow-none"
                        onPress={() => router.replace('/trips' as any)}
                    >
                        <Text style={{ fontSize: hScale(14) }} className="text-white dark:text-slate-900 font-black uppercase tracking-widest">My Trips</Text>
                    </Button>
                </View>
            </View>
 
            <SplitFareModal
                isVisible={showSplitModal}
                onClose={() => setShowSplitModal(false)}
                totalAmount={parseFloat(booking.total_amount)}
                bookingId={id as string}
            />
        </View>
    );
};
 
export default BookingDetailsScreen;
