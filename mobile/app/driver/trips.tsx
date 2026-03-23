import { useState } from 'react';
import { View, Text, FlatList, ActivityIndicator, ScrollView, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { MapPin, Calendar, Clock, DollarSign, Car } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { TouchableOpacity } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useResponsive } from '@/hooks/useResponsive';
 
export default function DriverTrips() {
    const { user } = useAuth();
    const router = useRouter();
    const { theme, isDark, colors } = useTheme();
    const { hScale, vScale, spacing } = useResponsive();
    const [activeFilter, setActiveFilter] = useState('All');
 
    const { data: trips, isLoading } = useQuery({
        queryKey: ['driver-trips', user?.id],
        queryFn: async () => {
            if (!user) return [];
            const { data, error } = await supabase
                .from('trips')
                .select('*')
                .eq('driver_id', user.id)
                .order('departure_time', { ascending: false });
 
            if (error) throw error;
            return data || [];
        },
        enabled: !!user
    });
 
    const filteredTrips = trips?.filter(t => {
        if (activeFilter === 'All') return true;
        if (activeFilter === 'Scheduled') return t.status === 'scheduled';
        if (activeFilter === 'Ongoing') return t.status === 'ongoing';
        if (activeFilter === 'Completed') return t.status === 'completed' || t.status === 'cancelled';
        return true;
    });
 
    const renderTrip = ({ item }: { item: any }) => (
        <TouchableOpacity onPress={() => router.push(`/trip/${item.id}`)} activeOpacity={0.9}>
            <View style={{ marginBottom: vScale(20), borderRadius: hScale(28) }} className="bg-white dark:bg-slate-900 shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
                {/* Header with Date and Price */}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.xl }} className="bg-slate-50/50 dark:bg-slate-800/30 border-b border-slate-100 dark:border-slate-800/50">
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
                        <View style={{ paddingHorizontal: hScale(10), paddingVertical: vScale(4), borderRadius: hScale(99) }} className={`${item.status === 'ongoing' ? 'bg-green-100 dark:bg-green-900/30' :
                            item.status === 'scheduled' ? 'bg-blue-100 dark:bg-blue-900/30' : 'bg-slate-100 dark:bg-slate-800'
                            }`}>
                            <Text style={{ fontSize: hScale(10) }} className={`font-black uppercase tracking-widest ${item.status === 'ongoing' ? 'text-green-700 dark:text-green-400' :
                                item.status === 'scheduled' ? 'text-blue-700 dark:text-blue-400' : 'text-slate-500 dark:text-slate-500'
                                }`}>{item.status}</Text>
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
                            <Calendar size={hScale(12)} color={isDark ? "#64748b" : "#94a3b8"} />
                            <Text style={{ fontSize: hScale(12) }} className="text-slate-500 dark:text-slate-500 font-bold">
                                {new Date(item.departure_time).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </Text>
                        </View>
                    </View>
                    <Text style={{ fontSize: hScale(20) }} className="font-black text-slate-900 dark:text-white uppercase tracking-tighter">₹{item.price_per_seat}</Text>
                </View>
 
                {/* Locations */}
                <View style={{ padding: spacing.xl, gap: spacing.lg }}>
                    <View style={{ paddingLeft: hScale(8), position: 'relative' }}>
                        {/* Timeline Line */}
                        <View style={{ position: 'absolute', left: hScale(13.5), top: vScale(8), bottom: vScale(8), width: 1 }} className="bg-slate-200 dark:bg-slate-800" />
 
                        <View style={{ gap: spacing.xl }}>
                            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing.lg }}>
                                <View style={{ width: hScale(12), height: hScale(12), borderRadius: hScale(6), borderWidth: 2, zIndex: 10, marginTop: vScale(4) }} className="bg-slate-900 dark:bg-white border-white dark:border-slate-900" />
                                <View className="flex-1">
                                    <Text style={{ fontSize: hScale(10), marginBottom: vScale(2) }} className="font-black text-slate-400 dark:text-slate-600 uppercase tracking-widest">Pickup</Text>
                                    <Text style={{ fontSize: hScale(15), lineHeight: vScale(20) }} className="font-bold text-slate-800 dark:text-slate-200">{item.pickup_location}</Text>
                                </View>
                            </View>
                            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing.lg }}>
                                <View style={{ width: hScale(12), height: hScale(12), borderRadius: hScale(6), borderWidth: 2, zIndex: 10, marginTop: vScale(4) }} className="bg-white dark:bg-slate-900 border-slate-900 dark:border-white" />
                                <View className="flex-1">
                                    <Text style={{ fontSize: hScale(10), marginBottom: vScale(2) }} className="font-black text-slate-400 dark:text-slate-600 uppercase tracking-widest">Dropoff</Text>
                                    <Text style={{ fontSize: hScale(15), lineHeight: vScale(20) }} className="font-bold text-slate-800 dark:text-slate-200">{item.drop_location}</Text>
                                </View>
                            </View>
                        </View>
                    </View>
 
                    {/* Stats */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingTop: vScale(8) }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingHorizontal: hScale(12), paddingVertical: vScale(8), borderRadius: hScale(12), borderWidth: 1 }} className="bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-800/50">
                            <Clock size={hScale(12)} color={isDark ? "#64748b" : "#94a3b8"} />
                            <Text style={{ fontSize: hScale(12) }} className="font-bold text-slate-600 dark:text-slate-400">
                                {new Date(item.departure_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </Text>
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingHorizontal: hScale(12), paddingVertical: vScale(8), borderRadius: hScale(12), borderWidth: 1 }} className="bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-800/50">
                            <Text style={{ fontSize: hScale(10) }} className="text-slate-400 dark:text-slate-500 font-black uppercase tracking-widest">Seats</Text>
                            <Text style={{ fontSize: hScale(12) }} className="font-black text-slate-900 dark:text-white uppercase tracking-tighter">{item.available_seats}/{item.total_seats}</Text>
                        </View>
                        <View className="flex-1" />
                    </View>
 
                    {item.status === 'ongoing' && (
                        <Button style={{ width: '100%', height: vScale(56), borderRadius: hScale(16) }} className="shadow-lg shadow-green-500/10 bg-green-600 active:bg-green-700" onPress={(e: any) => {
                            e.stopPropagation();
                            router.push(`/track/${item.id}`);
                        }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
                                <View style={{ width: hScale(10), height: hScale(10) }} className="bg-white rounded-full animate-pulse" />
                                <Text style={{ fontSize: hScale(14) }} className="text-white font-black uppercase tracking-widest">Track Live Trip</Text>
                            </View>
                        </Button>
                    )}
                </View>
            </View>
        </TouchableOpacity>
    );
 
    const FilterPill = ({ label }: { label: string }) => (
        <TouchableOpacity
            onPress={() => setActiveFilter(label)}
            style={{ marginRight: hScale(8), paddingHorizontal: hScale(24), paddingVertical: vScale(10), borderRadius: hScale(99), borderWidth: 1 }}
            className={`${activeFilter === label
                ? 'bg-slate-900 dark:bg-white border-slate-900 dark:border-white shadow-md shadow-slate-200 dark:shadow-none'
                : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800'
                }`}
        >
            <Text style={{ fontSize: hScale(12) }} className={`font-black uppercase tracking-widest ${activeFilter === label ? 'text-white dark:text-slate-900' : 'text-slate-500 dark:text-slate-500'
                }`}>
                {label}
            </Text>
        </TouchableOpacity>
    );
 
    return (
        <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-950" edges={['top']}>
            <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
            {/* Header */}
            <View style={{ paddingHorizontal: spacing.xl, paddingTop: vScale(16), paddingBottom: vScale(24), borderBottomWidth: 1 }} className="border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-sm z-10">
                <Text style={{ fontSize: hScale(30), marginBottom: vScale(24) }} className="font-black text-slate-900 dark:text-white uppercase tracking-tighter">My Trips</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} className="overflow-visible">
                    {['All', 'Scheduled', 'Ongoing', 'Completed'].map(f => (
                        <FilterPill key={f} label={f} />
                    ))}
                </ScrollView>
            </View>
 
            {isLoading ? (
                <View className="flex-1 items-center justify-center">
                    <ActivityIndicator size="large" color={isDark ? "#ffffff" : "#0f172a"} />
                </View>
            ) : (
                <FlatList
                    data={filteredTrips}
                    keyExtractor={(item) => item.id}
                    renderItem={renderTrip}
                    contentContainerStyle={{ padding: spacing.xl, paddingBottom: vScale(100) }}
                    showsVerticalScrollIndicator={false}
                    ListEmptyComponent={
                        <View style={{ alignItems: 'center', marginTop: vScale(80), opacity: 0.3 }}>
                            <Car size={hScale(80)} color={isDark ? "#94a3b8" : "#cbd5e1"} strokeWidth={1} />
                            <Text style={{ fontSize: hScale(18), marginTop: vScale(24) }} className="text-slate-400 dark:text-slate-600 font-black uppercase tracking-widest">No trips found</Text>
                        </View>
                    }
                />
            )}
        </SafeAreaView>
    );
}
