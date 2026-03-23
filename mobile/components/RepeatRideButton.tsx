import { View, TouchableOpacity } from 'react-native';
import { Text } from '@/components/ui/text';
import { Card } from '@/components/ui/card';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { RideService } from '@/services/RideService';
import { useTheme } from '@/contexts/ThemeContext';
 
interface RepeatRideButtonProps {
    onPress?: (pickup: string, drop: string, pickupCoords: { lat: number; lng: number }, dropCoords: { lat: number; lng: number }) => void;
}
 
export function RepeatRideButton({ onPress }: RepeatRideButtonProps) {
    const { theme } = useTheme();
    const isDark = theme === 'dark';
    const [lastRide, setLastRide] = useState<any>(null);
    const [loading, setLoading] = useState(true);
 
    useEffect(() => {
        fetchLastRide();
    }, []);
 
    const fetchLastRide = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                setLoading(false);
                return;
            }
 
            const rides = await RideService.getRecentRides(user.id, 1);
            if (rides.length > 0) {
                setLastRide(rides[0]);
            }
        } catch (error) {
            console.error('Error fetching last ride:', error);
        } finally {
            setLoading(false);
        }
    };
 
    if (loading || !lastRide) {
        return null;
    }
 
    const handlePress = () => {
        if (onPress) {
            onPress(
                lastRide.pickup_location,
                lastRide.drop_location,
                { lat: lastRide.pickup_lat, lng: lastRide.pickup_lng },
                { lat: lastRide.drop_lat, lng: lastRide.drop_lng }
            );
        }
    };
 
    return (
        <Card className="p-6 mb-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[28px] shadow-sm">
            <TouchableOpacity onPress={handlePress} activeOpacity={0.8}>
                <View className="flex-row items-center gap-4">
                    <View className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-900/10 items-center justify-center border border-blue-100/50 dark:border-blue-900/20">
                        <Ionicons name="repeat" size={28} color="#3b82f6" />
                    </View>
                    <View className="flex-1">
                        <Text className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest mb-1">Quick Re-book</Text>
                        <Text className="text-lg font-black text-slate-900 dark:text-white mb-0.5">Repeat Last Ride</Text>
                        <Text className="text-xs font-medium text-slate-500 dark:text-slate-400" numberOfLines={1}>
                            to {lastRide.drop_location}
                        </Text>
                    </View>
                    <View className="w-10 h-10 rounded-full bg-slate-50 dark:bg-slate-800 items-center justify-center">
                        <Ionicons name="chevron-forward" size={20} color={isDark ? "#475569" : "#94a3b8"} />
                    </View>
                </View>
            </TouchableOpacity>
        </Card>
    );
}
