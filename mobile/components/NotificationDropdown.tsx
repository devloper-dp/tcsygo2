import { View, TouchableOpacity } from 'react-native';
import { Text } from '@/components/ui/text';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Bell } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
 
export function NotificationDropdown() {
    const router = useRouter();
    const { user } = useAuth();
    const { theme } = useTheme();
    const isDark = theme === 'dark';
 
    const { data: unreadCount } = useQuery({
        queryKey: ['notifications-unread-count', user?.id],
        queryFn: async () => {
            if (!user) return 0;
            const { count, error } = await supabase
                .from('notifications')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', user.id)
                .eq('is_read', false);
 
            if (error) return 0;
            return count || 0;
        },
        refetchInterval: 30000,
        enabled: !!user,
    });
 
    const badgeCount = unreadCount && unreadCount > 0 ? unreadCount : 0;
    const badgeLabel = badgeCount > 99 ? '99+' : String(badgeCount);
 
    return (
        <TouchableOpacity
            onPress={() => router.push('/notifications')}
            className="w-12 h-12 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 items-center justify-center active:bg-slate-50 dark:active:bg-slate-800 shadow-sm relative"
            accessibilityLabel={`Notifications${badgeCount > 0 ? `, ${badgeCount} unread` : ''}`}
            accessibilityRole="button"
        >
            <Bell size={22} color={isDark ? "#94a3b8" : "#64748b"} />
            {badgeCount > 0 ? (
                <View
                    className="absolute -top-1.5 -right-1.5 bg-rose-500 border-2 border-white dark:border-slate-900 rounded-full min-w-[20px] h-5 px-1 items-center justify-center shadow-sm shadow-rose-500/20"
                >
                    <Text className="text-white text-[10px] font-black leading-none">
                        {badgeLabel}
                    </Text>
                </View>
            ) : null}
        </TouchableOpacity>
    );
}
