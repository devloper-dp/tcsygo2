import { useState, useEffect } from 'react';
import { View, ScrollView, RefreshControl, ActivityIndicator, Image, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Text } from '@/components/ui/text';
import { Card } from '@/components/ui/card';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/contexts/ThemeContext';
import { StatusBar } from 'react-native';

interface RideStats {
    totalRides: number;
    totalDistance: number;
    totalSpent: number;
    totalSaved: number;
    averageRating: number;
    favoriteRoute: string;
}

export default function RideStatsScreen() {
    const router = useRouter();
    const { user } = useAuth();
    const { theme, isDark } = useTheme();
    const [stats, setStats] = useState<RideStats>({
        totalRides: 0,
        totalDistance: 0,
        totalSpent: 0,
        totalSaved: 0,
        averageRating: 0,
        favoriteRoute: '',
    });
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        if (user) {
            fetchStatistics();
        }
    }, [user]);

    const fetchStatistics = async () => {
        if (!user) return;
        try {
            // Fetch all completed bookings
            const { data: bookings, error } = await supabase
                .from('bookings')
                .select(`
                    *,
                    trips (
                        distance,
                        price_per_seat
                    ),
                    payments (
                        amount
                    )
                `)
                .eq('passenger_id', user.id)
                .eq('status', 'completed');

            if (error) throw error;

            // Fetch ratings received
            const { data: ratings } = await supabase
                .from('ratings')
                .select('rating')
                .eq('to_user_id', user.id);

            let averageRating = 0;
            if (ratings && ratings.length > 0) {
                const totalRating = ratings.reduce((sum, r) => sum + r.rating, 0);
                averageRating = totalRating / ratings.length;
            }

            if (bookings && bookings.length > 0) {
                const totalRides = bookings.length;
                const totalDistance = bookings.reduce((sum, b: any) => sum + (parseFloat(b.trips?.distance || '0')), 0);
                const totalSpent = bookings.reduce((sum, b: any) => sum + (parseFloat(b.payments?.[0]?.amount || '0')), 0);

                // Estimate savings (comparing with solo cab ride @ ~15/km)
                const estimatedSoloCost = totalDistance * 15;
                const totalSaved = Math.max(0, estimatedSoloCost - totalSpent);

                // Calculate favorite route
                const routeCounts: Record<string, number> = {};
                bookings.forEach((b: any) => {
                    const route = `${b.pickup_location} → ${b.drop_location}`;
                    routeCounts[route] = (routeCounts[route] || 0) + 1;
                });
                const favoriteRoute = Object.entries(routeCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'None yet';

                setStats({
                    totalRides,
                    totalDistance,
                    totalSpent,
                    totalSaved,
                    averageRating,
                    favoriteRoute,
                });
            } else {
                setStats(prev => ({ ...prev, averageRating }));
            }
        } catch (error) {
            console.error('Error fetching stats:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        fetchStatistics();
    };

    const getMilestone = () => {
        if (stats.totalRides >= 100) return { text: 'Century Rider', icon: '🏆', color: 'from-amber-400 to-amber-600', textColor: 'text-amber-800' };
        if (stats.totalRides >= 50) return { text: 'Frequent Rider', icon: '⭐', color: 'from-blue-400 to-blue-600', textColor: 'text-blue-800' };
        if (stats.totalRides >= 10) return { text: 'Regular Rider', icon: '🎯', color: 'from-green-400 to-green-600', textColor: 'text-green-800' };
        return { text: 'New Rider', icon: '🚀', color: 'from-gray-400 to-gray-600', textColor: 'text-gray-800' };
    };

    const milestone = getMilestone();

    if (loading && !refreshing) {
        return (
            <SafeAreaView className="flex-1 bg-white dark:bg-slate-950 justify-center items-center">
                <ActivityIndicator size="large" color={isDark ? "#ffffff" : "#3b82f6"} />
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-950" edges={['top']}>
            <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
            <View className="flex-row items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-sm z-10">
                <TouchableOpacity 
                    onPress={() => router.back()} 
                    className="w-10 h-10 rounded-full bg-slate-50 dark:bg-slate-900 items-center justify-center active:bg-slate-100 dark:active:bg-slate-800"
                >
                    <Ionicons name="arrow-back" size={24} color={isDark ? "#f8fafc" : "#1e293b"} />
                </TouchableOpacity>
                <Text className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Your Journey</Text>
                <View className="w-10" />
            </View>

            <ScrollView 
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={isDark ? "#fff" : "#3b82f6"} />} 
                className="flex-1"
                contentContainerStyle={{ padding: 24, paddingBottom: 100 }}
                showsVerticalScrollIndicator={false}
            >
                {/* Milestone Card */}
                <Card className="p-8 bg-white dark:bg-slate-900 rounded-[40px] mb-8 border border-slate-100 dark:border-slate-800 shadow-sm relative overflow-hidden">
                    <View className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full -mr-16 -mt-16" />
                    
                    <View className="flex-row justify-between items-center mb-6">
                        <View className="flex-row items-center gap-4">
                            <View className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-900/20 justify-center items-center">
                                <Ionicons name="stats-chart" size={28} color={isDark ? "#60a5fa" : "#3b82f6"} strokeWidth={3} />
                            </View>
                            <View>
                                <Text className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Ride Stats</Text>
                                <Text className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-1">Impact Record</Text>
                            </View>
                        </View>
                        <View className="bg-slate-50 dark:bg-slate-950 px-4 py-2 rounded-2xl border border-slate-100 dark:border-slate-800 flex-row items-center gap-2">
                            <Text className="text-lg">{milestone.icon}</Text>
                            <Text className={`text-[10px] font-black uppercase tracking-widest ${milestone.textColor}`}>{milestone.text}</Text>
                        </View>
                    </View>

                    {stats.totalRides < 100 && (
                        <View>
                            <View className="flex-row justify-between mb-3 px-1">
                                <Text className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Next Evolution</Text>
                                <Text className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest">
                                    {stats.totalRides}/{stats.totalRides < 10 ? 10 : stats.totalRides < 50 ? 50 : 100} rides
                                </Text>
                            </View>
                            <View className="h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                <View
                                    className="h-full bg-blue-500 rounded-full"
                                    style={{ width: `${(stats.totalRides / (stats.totalRides < 10 ? 10 : stats.totalRides < 50 ? 50 : 100)) * 100}%` }}
                                />
                            </View>
                        </View>
                    )}
                </Card>

                {/* Grid Stats */}
                <View className="flex-row flex-wrap gap-4 mb-8">
                    <Card className="w-[47.5%] p-6 bg-white dark:bg-slate-900 rounded-[32px] border border-slate-100 dark:border-slate-800 shadow-sm">
                        <View className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-900/20 justify-center items-center mb-4">
                            <Ionicons name="car-sport" size={24} color={isDark ? "#60a5fa" : "#3b82f6"} />
                        </View>
                        <Text className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">{stats.totalRides}</Text>
                        <Text className="text-[10px] font-black text-slate-400 dark:text-slate-500 mt-1 uppercase tracking-widest">Total Rides</Text>
                    </Card>
                    <Card className="w-[47.5%] p-6 bg-white dark:bg-slate-900 rounded-[32px] border border-slate-100 dark:border-slate-800 shadow-sm">
                        <View className="w-12 h-12 rounded-2xl bg-green-50 dark:bg-green-900/20 justify-center items-center mb-4">
                            <Ionicons name="map" size={24} color={isDark ? "#4ade80" : "#16a34a"} />
                        </View>
                        <Text className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">{stats.totalDistance.toFixed(0)}</Text>
                        <Text className="text-[10px] font-black text-slate-400 dark:text-slate-500 mt-1 uppercase tracking-widest">Km Traveled</Text>
                    </Card>
                    <Card className="w-[47.5%] p-6 bg-white dark:bg-slate-900 rounded-[32px] border border-slate-100 dark:border-slate-800 shadow-sm">
                        <View className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-900/20 justify-center items-center mb-4">
                            <Ionicons name="wallet" size={24} color={isDark ? "#fbbf24" : "#d97706"} />
                        </View>
                        <Text className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">₹{stats.totalSaved.toFixed(0)}</Text>
                        <Text className="text-[10px] font-black text-slate-400 dark:text-slate-500 mt-1 uppercase tracking-widest">Money Saved</Text>
                    </Card>
                    <Card className="w-[47.5%] p-6 bg-white dark:bg-slate-900 rounded-[32px] border border-slate-100 dark:border-slate-800 shadow-sm">
                        <View className="w-12 h-12 rounded-2xl bg-purple-50 dark:bg-purple-900/20 justify-center items-center mb-4">
                            <Ionicons name="star" size={24} color={isDark ? "#a78bfa" : "#9333ea"} />
                        </View>
                        <Text className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">{stats.averageRating.toFixed(1)}</Text>
                        <Text className="text-[10px] font-black text-slate-400 dark:text-slate-500 mt-1 uppercase tracking-widest">Avg Rating</Text>
                    </Card>
                </View>

                {/* Detailed Breakdown */}
                <Card className="p-8 bg-white dark:bg-slate-900 rounded-[32px] mb-10 border border-slate-100 dark:border-slate-800 shadow-sm">
                    <Text className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[2px] mb-8 px-1">Detailed Ledger</Text>
                    <View className="gap-5">
                        <View className="flex-row justify-between border-b border-slate-50 dark:border-slate-800/50 pb-4">
                            <Text className="text-sm font-bold text-slate-500 dark:text-slate-500 uppercase tracking-tight">Total Investment</Text>
                            <Text className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tighter">₹{stats.totalSpent.toFixed(2)}</Text>
                        </View>
                        <View className="flex-row justify-between border-b border-slate-50 dark:border-slate-800/50 pb-4">
                            <Text className="text-sm font-bold text-slate-500 dark:text-slate-500 uppercase tracking-tight">Avg / Operation</Text>
                            <Text className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tighter">
                                ₹{stats.totalRides > 0 ? (stats.totalSpent / stats.totalRides).toFixed(2) : '0.00'}
                            </Text>
                        </View>
                        <View>
                            <Text className="text-sm font-bold text-slate-500 dark:text-slate-500 uppercase tracking-tight mb-4">High Frequency Route</Text>
                            <View className="bg-slate-50 dark:bg-slate-950 p-6 rounded-[24px] border border-slate-100 dark:border-slate-800 border-dashed">
                                <Text className="text-xs font-black text-slate-900 dark:text-slate-200 uppercase tracking-tighter text-center">
                                    {stats.favoriteRoute || 'ESTABLISHING DATA CONNECTIVITY...'}
                                </Text>
                            </View>
                        </View>
                    </View>
                </Card>
            </ScrollView>
        </SafeAreaView>
    );
}
