import { View, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Text } from '@/components/ui/text';
import { Card } from '@/components/ui/card';
import { useTheme } from '@/contexts/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
 
interface QuickAction {
    id: string;
    title: string;
    description: string;
    icon: keyof typeof Ionicons.glyphMap;
    route: string;
    color: string;
}
 
// Quick actions configuration
const QUICK_ACTIONS_CONFIG: QuickAction[] = [
    {
        id: 'search',
        title: 'Find a Ride',
        description: 'Search for available trips',
        icon: 'search',
        route: '/search',
        color: '#3b82f6',
    },
    {
        id: 'create',
        title: 'Offer a Ride',
        description: 'Create a new trip',
        icon: 'car',
        route: '/create-trip',
        color: '#10b981',
    },
];
 
interface QuickActionsProps {
    onAction?: (action: string, data?: any) => void;
    recentRide?: { destination: string; time: string };
    savedPlaces?: any[];
}
 
export function QuickActions({ onAction, recentRide, savedPlaces }: QuickActionsProps) {
    const router = useRouter();
    const { isDark } = useTheme();
 
    return (
        <View className="mb-8">
            <Text className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[2px] mb-6 px-1">
                Mission Control
            </Text>
            <View className="flex-row flex-wrap gap-4">
                {QUICK_ACTIONS_CONFIG.map((action) => (
                    <TouchableOpacity
                        key={action.id}
                        className="flex-1 bg-white dark:bg-slate-900 rounded-[28px] p-6 items-center justify-center border border-slate-100 dark:border-slate-800 shadow-sm active:bg-slate-50 dark:active:bg-slate-800"
                        onPress={() => router.push(action.route as any)}
                        activeOpacity={0.7}
                    >
                        <View 
                            className="w-14 h-14 rounded-2xl items-center justify-center mb-4 shadow-sm"
                            style={{ backgroundColor: isDark ? `${action.color}20` : `${action.color}10` }}
                        >
                            <Ionicons name={action.icon} size={28} color={action.color} />
                        </View>
                        <Text className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-tighter">
                            {action.title}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>
        </View>
    );
}
 
interface PopularRoute {
    id: string;
    from: string;
    to: string;
    tripCount: number;
    avgPrice: number;
}
 
export function PopularRoutesMobile() {
    const router = useRouter();
    const { isDark } = useTheme();
 
    const { data: routes, isLoading } = useQuery<PopularRoute[]>({
        queryKey: ['popular-routes-mobile'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('trips')
                .select('pickup_location, drop_location, price_per_seat')
                .eq('status', 'completed')
                .order('created_at', { ascending: false })
                .limit(150);
 
            if (error) throw error;
 
            const routeMap = new Map<string, { from: string; to: string; count: number; totalPrice: number }>();
 
            data?.forEach((trip: any) => {
                const key = `${trip.pickup_location}|${trip.drop_location}`;
                const existing = routeMap.get(key);
                const price = parseFloat(trip.price_per_seat) || 0;
 
                if (existing) {
                    existing.count += 1;
                    existing.totalPrice += price;
                } else {
                    routeMap.set(key, {
                        from: trip.pickup_location,
                        to: trip.drop_location,
                        count: 1,
                        totalPrice: price
                    });
                }
            });
 
            return Array.from(routeMap.values())
                .map((route, index) => ({
                    id: String(index + 1),
                    from: route.from,
                    to: route.to,
                    tripCount: route.count,
                    avgPrice: Math.round(route.totalPrice / route.count)
                }))
                .sort((a, b) => b.tripCount - a.tripCount)
                .slice(0, 3);
        },
        staleTime: 1000 * 60 * 30,
    });
 
    const handleRoutePress = (route: PopularRoute) => {
        router.push({
            pathname: '/search',
            params: {
                pickup: route.from,
                drop: route.to,
            },
        });
    };
 
    if (isLoading || !routes || routes.length === 0) {
        return null;
    }
 
    return (
        <View className="mb-10">
            <View className="flex-row items-center justify-between mb-6 px-1">
                <Text className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[2px]">
                    Trending Corridors
                </Text>
                <View className="flex-row items-center gap-2">
                    <Ionicons name="trending-up" size={14} color={isDark ? "#60a5fa" : "#2563eb"} />
                    <Text className="text-[8px] font-extrabold text-blue-600 dark:text-blue-500 uppercase tracking-widest">Live Activity</Text>
                </View>
            </View>
            <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false} 
                contentContainerStyle={{ paddingRight: 24, gap: 16 }}
            >
                {routes.map((route) => (
                    <TouchableOpacity
                        key={route.id}
                        className="w-72 bg-white dark:bg-slate-900 rounded-[32px] p-6 border border-slate-100 dark:border-slate-800 shadow-sm active:opacity-80"
                        onPress={() => handleRoutePress(route)}
                        activeOpacity={0.8}
                    >
                        <View className="mb-6">
                            <View className="flex-row items-start gap-4 mb-2">
                                <View className="mt-1 w-2.5 h-2.5 rounded-full bg-emerald-500 dark:bg-emerald-400 border-2 border-white dark:border-slate-900 shadow-sm" />
                                <Text className="flex-1 text-sm font-bold text-slate-500 dark:text-slate-500 uppercase tracking-tight" numberOfLines={1}>
                                    {route.from.split(',')[0]}
                                </Text>
                            </View>
 
                            <View className="ml-[4px] h-4 border-l-2 border-slate-100 dark:border-slate-800/50 border-dashed my-1" />
 
                            <View className="flex-row items-start gap-4">
                                <View className="mt-1 w-2.5 h-2.5 rounded-full bg-blue-500 dark:bg-blue-400 border-2 border-white dark:border-slate-900 shadow-sm" />
                                <Text className="flex-1 text-base font-black text-slate-900 dark:text-white uppercase tracking-tighter" numberOfLines={1}>
                                    {route.to.split(',')[0]}
                                </Text>
                            </View>
                        </View>
                        
                        <View className="flex-row justify-between items-center pt-5 border-t border-slate-50 dark:border-slate-800/50">
                            <View className="flex-row items-center gap-2">
                                <View className="w-6 h-6 rounded-lg bg-slate-50 dark:bg-slate-800 items-center justify-center">
                                    <Ionicons name="car" size={12} color={isDark ? "#475569" : "#94a3b8"} />
                                </View>
                                <Text className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                                    {route.tripCount} MISSIONS
                                </Text>
                            </View>
                            <View className="bg-blue-600 dark:bg-blue-500 px-4 py-2 rounded-2xl shadow-lg shadow-blue-500/20">
                                <Text className="text-white font-black text-sm tracking-tighter">
                                    ₹{route.avgPrice}
                                </Text>
                            </View>
                        </View>
                    </TouchableOpacity>
                ))}
            </ScrollView>
        </View>
    );
}
 
const styles = StyleSheet.create({});
