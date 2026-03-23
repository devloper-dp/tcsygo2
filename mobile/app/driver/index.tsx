import { View, ScrollView, TouchableOpacity, RefreshControl, StatusBar, Switch, Alert, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
    Bell,
    Settings,
    CheckCircle2,
    Moon,
    Plus,
    Car,
    DollarSign,
    CreditCard,
    MapPin,
    ChevronRight,
    Loader2,
    ArrowUpRight,
    User
} from 'lucide-react-native';
import { Text } from '@/components/ui/text';
import { Card } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { RideRequestsList } from '@/components/driver/RideRequestsList';
import { DriverAcceptanceModal } from '@/components/DriverAcceptanceModal';
import { useTheme } from '@/contexts/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';
import { useResponsive } from '@/hooks/useResponsive';
 
export default function DriverDashboard() {
    const router = useRouter();
    const { user } = useAuth();
    const { theme, isDark, colors } = useTheme();
    const { hScale, vScale, spacing } = useResponsive();
    const [refreshing, setRefreshing] = useState(false);
 
    const { data: driver, refetch } = useQuery({
        queryKey: ['driver-profile', user?.id],
        queryFn: async () => {
            if (!user) return null;
            const { data, error } = await supabase
                .from('drivers')
                .select('*')
                .eq('user_id', user.id)
                .limit(1)
                .maybeSingle();
 
            if (error) {
                console.error('Error fetching driver:', error);
                return null;
            }
            return data;
        },
        enabled: !!user
    });
 
    const { data: stats } = useQuery({
        queryKey: ['driver-dashboard-stats', driver?.id],
        queryFn: async () => {
            if (!driver) return null;
 
            // Get active trips count
            const { count: activeTrips } = await supabase
                .from('trips')
                .select('*', { count: 'exact', head: true })
                .eq('driver_id', driver.id)
                .eq('status', 'scheduled');
 
            // Get earnings (mock calculation for now, would sum payments)
            return {
                activeTrips: activeTrips || 0,
                rating: 4.9,
                earnings: 1250,
            };
        },
        enabled: !!driver
    });
 
    const toggleAvailability = async () => {
        if (!driver) return;
 
        const newStatus = !driver.is_available;
        const { error } = await supabase
            .from('drivers')
            .update({ is_available: newStatus })
            .eq('id', driver.id);
 
        if (error) {
            Alert.alert("Error", "Failed to update status");
        } else {
            refetch();
        }
    };
 
    const onRefresh = async () => {
        setRefreshing(true);
        await refetch();
        setRefreshing(false);
    };
 
    const QuickAction = ({ title, icon: Icon, color, bg, darkBg, onPress }: any) => (
        <TouchableOpacity
            onPress={onPress}
            activeOpacity={0.8}
            style={{ flex: 1, minWidth: '45%', marginBottom: vScale(16) }}
        >
            <View style={{ padding: spacing.xl, borderRadius: hScale(24), height: vScale(140) }} className="bg-white dark:bg-slate-900 shadow-sm border border-slate-100/60 dark:border-slate-800 items-start justify-between relative overflow-hidden">
                <View style={{ width: hScale(48), height: hScale(48), borderRadius: hScale(16), marginBottom: vScale(8) }} className={`items-center justify-center ${isDark ? darkBg : bg}`}>
                    <Icon size={hScale(22)} color={color} strokeWidth={2.5} />
                </View>
                <View style={{ position: 'absolute', right: -hScale(15), top: -vScale(15), opacity: 0.05, transform: [{ scale: 1.5 }] }}>
                    <Icon size={hScale(80)} color={color} />
                </View>
 
                <View className="w-full">
                    <Text style={{ fontSize: hScale(17), lineHeight: vScale(24) }} className="font-bold text-slate-800 dark:text-white tracking-tight">{title}</Text>
                    <View className="flex-row items-center justify-between mt-2 w-full">
                        <View style={{ paddingHorizontal: hScale(8), paddingVertical: vScale(4) }} className="bg-slate-50 dark:bg-slate-800/50 rounded-full">
                            <Text style={{ fontSize: hScale(10) }} className="text-slate-400 dark:text-slate-500 font-black uppercase tracking-widest">Tap to open</Text>
                        </View>
                        <View style={{ width: hScale(24), height: hScale(24), borderRadius: hScale(12) }} className="bg-slate-50 dark:bg-slate-800 items-center justify-center border border-slate-100 dark:border-slate-700">
                            <ChevronRight size={hScale(12)} color={isDark ? "#94a3b8" : "#cbd5e1"} />
                        </View>
                    </View>
                </View>
            </View>
        </TouchableOpacity>
    );
 
    return (
        <View className="flex-1 bg-slate-50 dark:bg-slate-950">
            <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={isDark ? "#020617" : "#ffffff"} />
 
            {/* Premium Header */}
            <View style={{ paddingHorizontal: spacing.xl, paddingBottom: vScale(16), paddingTop: vScale(8), borderBottomWidth: 1 }} className="bg-white dark:bg-slate-950 border-slate-100 dark:border-slate-900 shadow-sm z-10">
                <SafeAreaView edges={['top']} className="flex-row justify-between items-center">
                    <TouchableOpacity 
                        onPress={() => router.push('/driver/profile')}
                        style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}
                        className="active:opacity-70"
                    >
                        <View style={{ width: hScale(40), height: hScale(40), borderRadius: hScale(20), borderWidth: 1 }} className="bg-slate-100 dark:bg-slate-900 items-center justify-center border-slate-200 dark:border-slate-800 overflow-hidden">
                            <Text style={{ fontSize: hScale(18) }} className="text-slate-600 dark:text-slate-400 font-black">{user?.fullName?.charAt(0) || 'D'}</Text>
                        </View>
                        <View>
                            <Text style={{ fontSize: hScale(10) }} className="text-slate-500 dark:text-slate-500 font-black uppercase tracking-widest">Good Morning</Text>
                            <Text style={{ fontSize: hScale(18) }} className="font-black text-slate-900 dark:text-white leading-tight">{user?.fullName?.split(' ')[0]}</Text>
                        </View>
                    </TouchableOpacity>
                    <View className="flex-row items-center gap-2">
                        <TouchableOpacity
                            onPress={() => router.push('/notifications')}
                            style={{ width: hScale(40), height: hScale(40), borderRadius: hScale(20), borderWidth: 1 }}
                            className="bg-slate-50 dark:bg-slate-900 border-slate-100 dark:border-slate-800 items-center justify-center active:bg-slate-100 dark:active:bg-slate-800"
                        >
                            <Bell size={hScale(20)} color={isDark ? "#94a3b8" : "#64748b"} />
                            <View style={{ position: 'absolute', top: vScale(10), right: hScale(12), width: hScale(8), height: hScale(8), borderRadius: hScale(4), borderWidth: 2 }} className="bg-red-500 border-white dark:border-slate-950" />
                        </TouchableOpacity>
                    </View>
                </SafeAreaView>
            </View>
 
            <ScrollView
                style={{ flex: 1, paddingHorizontal: spacing.xl }}
                contentContainerStyle={{ paddingBottom: vScale(100), paddingTop: vScale(24) }}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={isDark ? "#94a3b8" : "#64748b"} />}
                showsVerticalScrollIndicator={false}
            >
                {/* Status Card */}
                <View style={{ marginBottom: vScale(32), borderRadius: hScale(24), overflow: 'hidden' }} className="shadow-lg shadow-blue-500/10">
                    <LinearGradient
                        colors={driver?.is_available ? ['#2563eb', '#1d4ed8'] : (isDark ? ['#1e293b', '#0f172a'] : ['#475569', '#334155'])}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={{ padding: spacing.xl }}
                    >
                        <View className="flex-row items-center justify-between mb-4">
                            <View style={{ paddingHorizontal: hScale(12), paddingVertical: vScale(6), gap: spacing.xs }} className="flex-row items-center bg-white/20 rounded-full backdrop-blur-md">
                                {driver?.is_available ? (
                                    <View style={{ width: hScale(10), height: hScale(10) }} className="rounded-full bg-green-400 shadow-sm shadow-green-400" />
                                ) : (
                                    <View style={{ width: hScale(10), height: hScale(10) }} className="rounded-full bg-slate-400" />
                                )}
                                <Text style={{ fontSize: hScale(10) }} className="text-white font-black uppercase tracking-widest">
                                    {driver?.is_available ? 'Online' : 'Offline'}
                                </Text>
                            </View>
                            <Switch
                                value={driver?.is_available || false}
                                onValueChange={toggleAvailability}
                                trackColor={{ false: '#94a3b8', true: '#4ade80' }}
                                thumbColor={'#ffffff'}
                                ios_backgroundColor="#94a3b8"
                            />
                        </View>
 
                        <View>
                            <Text style={{ fontSize: hScale(24) }} className="text-white font-black uppercase tracking-tighter">
                                {driver?.is_available ? 'Ready for Rides' : 'You are Offline'}
                            </Text>
                            <Text style={{ fontSize: hScale(14), marginTop: vScale(4), lineHeight: vScale(20) }} className="text-white/80 font-medium">
                                {driver?.is_available
                                    ? 'Notifications are on. Stay alert for requests.'
                                    : 'Go online to start receiving ride requests.'}
                            </Text>
                        </View>
                    </LinearGradient>
                </View>
 
                {/* Dashboard Stats */}
                <View style={{ flexDirection: 'row', gap: spacing.md, marginBottom: vScale(32) }}>
                    <View className="flex-1 shadow-sm">
                        <View style={{ padding: spacing.xl, borderRadius: hScale(32), height: vScale(144), justifyContent: 'space-between' }} className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 relative overflow-hidden">
                            <View style={{ position: 'absolute', right: -hScale(10), top: -vScale(10), padding: spacing.xl, opacity: 0.03 }}>
                                <CreditCard size={hScale(80)} color={isDark ? "#fff" : "#000"} />
                            </View>
                            <View>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginBottom: vScale(8) }}>
                                    <View style={{ width: hScale(28), height: hScale(28), borderRadius: hScale(12) }} className="bg-green-50 dark:bg-green-900/20 items-center justify-center">
                                        <DollarSign size={hScale(14)} color="#16a34a" />
                                    </View>
                                    <Text style={{ fontSize: hScale(10) }} className="text-slate-500 dark:text-slate-500 font-black uppercase tracking-widest">Earnings</Text>
                                </View>
                                <Text style={{ fontSize: hScale(24) }} className="text-slate-900 dark:text-white font-black tracking-tight">₹{stats?.earnings || 0}</Text>
                            </View>
                            <View className="flex-row items-center">
                                <View style={{ paddingHorizontal: hScale(6), paddingVertical: vScale(2) }} className="bg-green-100 dark:bg-green-900/30 flex-row items-center rounded-md">
                                    <ArrowUpRight size={hScale(10)} color={isDark ? "#4ade80" : "#15803d"} />
                                    <Text style={{ fontSize: hScale(10) }} className="text-green-700 dark:text-green-400 font-black ml-0.5">+12%</Text>
                                </View>
                                <Text style={{ fontSize: hScale(10), marginLeft: hScale(8) }} className="text-slate-400 dark:text-slate-600 font-bold uppercase tracking-tighter">this week</Text>
                            </View>
                        </View>
                    </View>
 
                    <View className="flex-1 shadow-sm">
                        <View style={{ padding: spacing.xl, borderRadius: hScale(32), height: vScale(144), justifyContent: 'space-between' }} className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 relative overflow-hidden">
                            <View style={{ position: 'absolute', right: -hScale(10), top: -vScale(10), padding: spacing.xl, opacity: 0.03 }}>
                                <Car size={hScale(80)} color={isDark ? "#fff" : "#000"} />
                            </View>
                            <View>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginBottom: vScale(8) }}>
                                    <View style={{ width: hScale(28), height: hScale(28), borderRadius: hScale(12) }} className="bg-blue-50 dark:bg-blue-900/20 items-center justify-center">
                                        <MapPin size={hScale(14)} color="#2563eb" />
                                    </View>
                                    <Text style={{ fontSize: hScale(10) }} className="text-slate-500 dark:text-slate-500 font-black uppercase tracking-widest">Trips</Text>
                                </View>
                                <Text style={{ fontSize: hScale(24) }} className="text-slate-900 dark:text-white font-black tracking-tight">{stats?.activeTrips || 0}</Text>
                            </View>
                            <View className="flex-row items-center">
                                <View style={{ paddingHorizontal: hScale(8), paddingVertical: vScale(2) }} className="bg-blue-100 dark:bg-blue-900/30 rounded-md">
                                    <Text style={{ fontSize: hScale(10) }} className="text-blue-600 dark:text-blue-400 font-black uppercase tracking-widest">Active Now</Text>
                                </View>
                            </View>
                        </View>
                    </View>
                </View>
 
                {/* Ride Requests Section */}
                {driver?.is_available && (
                    <View style={{ marginBottom: vScale(32) }}>
                        <View className="flex-row justify-between items-end mb-4 px-1">
                            <Text style={{ fontSize: hScale(20) }} className="font-black text-slate-900 dark:text-white uppercase tracking-tighter">Ride Requests</Text>
                            <TouchableOpacity onPress={() => router.push('/driver/requests')}>
                                <Text style={{ fontSize: hScale(12) }} className="text-blue-600 dark:text-blue-400 font-bold uppercase tracking-widest">View All</Text>
                            </TouchableOpacity>
                        </View>
                        <RideRequestsList />
                    </View>
                )}
 
                {/* Quick Actions Grid */}
                <Text style={{ fontSize: hScale(20), marginBottom: vScale(16) }} className="font-black text-slate-900 dark:text-white px-1 uppercase tracking-tighter">Quick Actions</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md }}>
                    <QuickAction
                        title="New Trip"
                        icon={Plus}
                        color={isDark ? "#60a5fa" : "#2563eb"}
                        bg="bg-blue-50"
                        darkBg="bg-blue-900/20"
                        onPress={() => router.push('/create-trip')}
                    />
                    <QuickAction
                        title="My Trips"
                        icon={Car}
                        color={isDark ? "#a78bfa" : "#7c3aed"}
                        bg="bg-violet-50"
                        darkBg="bg-violet-900/20"
                        onPress={() => router.push('/driver/trips')}
                    />
                    <QuickAction
                        title="Earnings"
                        icon={DollarSign}
                        color={isDark ? "#4ade80" : "#16a34a"}
                        bg="bg-green-50"
                        darkBg="bg-green-900/20"
                        onPress={() => router.push('/profile/earnings')}
                    />
                    <QuickAction
                        title="Profile"
                        icon={User}
                        color={isDark ? "#94a3b8" : "#64748b"}
                        bg="bg-slate-100"
                        darkBg="bg-slate-800"
                        onPress={() => router.push('/driver/profile')}
                    />
                </View>
 
            </ScrollView>
        </View>
    );
}
