import { View, TouchableOpacity, ScrollView } from 'react-native';
import { Text } from '@/components/ui/text';
import { Card } from '@/components/ui/card';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/contexts/ThemeContext';
 
interface FavoriteRoute {
    id: string;
    name: string;
    pickup_location: string;
    drop_location: string;
    pickup_lat: number;
    pickup_lng: number;
    drop_lat: number;
    drop_lng: number;
}
 
interface FavoriteRoutesProps {
    onRouteSelect?: (route: FavoriteRoute) => void;
}
 
export function FavoriteRoutes({ onRouteSelect }: FavoriteRoutesProps) {
    const { theme } = useTheme();
    const isDark = theme === 'dark';
    const [favorites, setFavorites] = useState<FavoriteRoute[]>([]);
    const [loading, setLoading] = useState(true);
 
    useEffect(() => {
        fetchFavorites();
    }, []);
 
    const fetchFavorites = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                setLoading(false);
                return;
            }
 
            const { data, error } = await supabase
                .from('favorite_routes')
                .select('*')
                .eq('user_id', user.id)
                .limit(3);
 
            if (error) throw error;
            setFavorites(data || []);
        } catch (error) {
            console.error('Error fetching favorites:', error);
        } finally {
            setLoading(false);
        }
    };
 
    if (loading || favorites.length === 0) {
        return null;
    }
 
    return (
        <Card className="p-5 mb-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm">
            <View className="flex-row items-center justify-between mb-5">
                <Text className="font-bold text-lg text-slate-900 dark:text-white">Favorite Routes</Text>
                <Ionicons name="heart" size={20} color={isDark ? "#f43f5e" : "#ef4444"} />
            </View>
            <View className="gap-4">
                {favorites.map((route) => (
                    <TouchableOpacity
                        key={route.id}
                        onPress={() => onRouteSelect?.(route)}
                        activeOpacity={0.7}
                    >
                        <View className="flex-row items-center gap-4 p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-50 dark:border-slate-800/50">
                            <View className="bg-blue-50 dark:bg-blue-900/20 p-2 rounded-xl">
                                <Ionicons name="location" size={20} color={isDark ? "#60a5fa" : "#3b82f6"} />
                            </View>
                            <View className="flex-1">
                                <Text className="font-bold text-sm text-slate-800 dark:text-slate-200" numberOfLines={1}>
                                    {route.name || route.drop_location}
                                </Text>
                                <Text className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1" numberOfLines={1}>
                                    From {route.pickup_location}
                                </Text>
                            </View>
                            <Ionicons name="chevron-forward" size={18} color={isDark ? "#334155" : "#cbd5e1"} />
                        </View>
                    </TouchableOpacity>
                ))}
            </View>
        </Card>
    );
}
