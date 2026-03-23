import React, { useState, useEffect } from 'react';
import { View, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, Bell, Calendar, Car, MessageCircle, DollarSign, AlertTriangle, Check, Trash2 } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { getNotificationHistory, markNotificationAsRead, markAllNotificationsAsRead, handleNotificationTap } from '@/lib/notifications';
import { format } from 'date-fns';
import { Text } from '@/components/ui/text';
import { useTheme } from '@/contexts/ThemeContext';
import { useResponsive } from '@/hooks/useResponsive';
 
export default function NotificationHistoryScreen() {
    const router = useRouter();
    const { user } = useAuth();
    const { theme, isDark } = useTheme();
    const { hScale, vScale, spacing, fontSize } = useResponsive();
    const [notifications, setNotifications] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
 
    const fetchNotifications = async () => {
        if (!user) return;
        try {
            const data = await getNotificationHistory(user.id);
            setNotifications(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };
 
    useEffect(() => {
        fetchNotifications();
    }, [user]);
 
    const handleRefresh = () => {
        setRefreshing(true);
        fetchNotifications();
    };
 
    const handleMarkAllRead = async () => {
        if (!user) return;
        await markAllNotificationsAsRead(user.id);
        fetchNotifications();
    };
 
    const handlePress = async (notification: any) => {
        if (!notification.is_read) {
            await markNotificationAsRead(notification.id);
            setNotifications(prev => prev.map(n => n.id === notification.id ? { ...n, is_read: true } : n));
        }
 
        if (notification.data) {
            handleNotificationTap(notification.data, router);
        }
    };
 
    const getIconConfig = (type: string) => {
        switch (type) {
            case 'booking': return { icon: Calendar, color: '#3b82f6', bg: isDark ? 'bg-blue-900/20' : 'bg-blue-50' };
            case 'trip': return { icon: Car, color: '#10b981', bg: isDark ? 'bg-green-900/20' : 'bg-green-50' };
            case 'message': return { icon: MessageCircle, color: '#818cf8', bg: isDark ? 'bg-indigo-900/20' : 'bg-indigo-50' };
            case 'payment': return { icon: DollarSign, color: '#f59e0b', bg: isDark ? 'bg-amber-900/20' : 'bg-amber-50' };
            case 'emergency': return { icon: AlertTriangle, color: '#ef4444', bg: isDark ? 'bg-red-900/20' : 'bg-red-50' };
            default: return { icon: Bell, color: '#94a3b8', bg: isDark ? 'bg-slate-900' : 'bg-slate-100' };
        }
    };
 
    return (
        <View className="flex-1 bg-slate-50 dark:bg-slate-950">
            <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
            <SafeAreaView className="flex-1" edges={['top']}>
                {/* Header */}
                <View style={{ paddingHorizontal: spacing.xl, paddingVertical: vScale(20), borderBottomWidth: 1 }} className="bg-white dark:bg-slate-950 border-slate-100 dark:border-slate-800 flex-row items-center justify-between shadow-sm z-30">
                    <View style={{ gap: spacing.lg }} className="flex-row items-center">
                        <TouchableOpacity
                            onPress={() => router.back()}
                            style={{ width: hScale(44), height: hScale(44), borderRadius: hScale(16), borderWidth: 1 }}
                            className="bg-slate-50 dark:bg-slate-900 items-center justify-center border-slate-100 dark:border-slate-800 active:bg-slate-100 dark:active:bg-slate-800"
                        >
                            <ArrowLeft size={hScale(22)} color={isDark ? "#f8fafc" : "#1e293b"} strokeWidth={2.5} />
                        </TouchableOpacity>
                        <View>
                            <Text style={{ fontSize: hScale(10) }} className="text-slate-400 dark:text-slate-500 font-black uppercase tracking-[2px]">Updates</Text>
                            <Text style={{ fontSize: fontSize.xl }} className="font-black text-slate-900 dark:text-white uppercase tracking-tighter">Terminal Feed</Text>
                        </View>
                    </View>
                    {notifications.length > 0 && (
                        <TouchableOpacity
                            onPress={handleMarkAllRead}
                            style={{ width: hScale(40), height: hScale(40), borderRadius: hScale(14) }}
                            className="bg-slate-900 dark:bg-white items-center justify-center shadow-lg shadow-slate-900/20"
                        >
                            <Check size={hScale(18)} color={isDark ? "#0f172a" : "#ffffff"} strokeWidth={3} />
                        </TouchableOpacity>
                    )}
                </View>
 
                {loading ? (
                    <View style={{ padding: spacing.xxl }} className="flex-1 justify-center items-center bg-slate-50 dark:bg-slate-950">
                        <ActivityIndicator size="large" color={isDark ? "#ffffff" : "#3b82f6"} />
                        <Text style={{ fontSize: hScale(10), marginTop: vScale(24) }} className="font-black text-slate-400 dark:text-slate-600 uppercase tracking-[2px]">Syncing Notifications...</Text>
                    </View>
                ) : (
                    <FlatList
                        data={notifications}
                        keyExtractor={item => item.id}
                        contentContainerStyle={{ padding: spacing.xl, paddingBottom: vScale(100) }}
                        showsVerticalScrollIndicator={false}
                        refreshControl={
                            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={isDark ? "#ffffff" : "#64748b"} />
                        }
                        ListEmptyComponent={
                            <View style={{ paddingVertical: vScale(96) }} className="items-center opacity-30">
                                <View style={{ width: hScale(96), height: hScale(96), borderRadius: hScale(32), marginBottom: vScale(40) }} className="bg-slate-100 dark:bg-slate-900 items-center justify-center">
                                    <Bell size={hScale(40)} color={isDark ? "#334155" : "#94a3b8"} strokeWidth={2} />
                                </View>
                                <Text style={{ fontSize: fontSize.xxl, marginBottom: vScale(16) }} className="font-black text-slate-900 dark:text-white uppercase tracking-tighter">Feed Offline</Text>
                                <Text style={{ fontSize: fontSize.xs, lineHeight: vScale(20) }} className="text-slate-500 dark:text-slate-500 text-center font-medium uppercase tracking-widest">No active transmissions detected at this time.</Text>
                            </View>
                        }
                        renderItem={({ item }) => {
                            const { icon: Icon, color, bg } = getIconConfig(item.type);
                            return (
                                <TouchableOpacity
                                    activeOpacity={0.8}
                                    onPress={() => handlePress(item)}
                                    style={{ marginBottom: vScale(20), padding: spacing.xl, borderRadius: hScale(32), borderWidth: 1 }}
                                    className={`transition-all ${!item.is_read 
                                        ? 'bg-white dark:bg-slate-900 border-blue-100 dark:border-blue-900/30 shadow-lg shadow-blue-500/5' 
                                        : 'bg-slate-100/50 dark:bg-slate-900/20 border-transparent opacity-60'}`}
                                >
                                    <View style={{ gap: spacing.xl }} className="flex-row">
                                        <View style={{ width: hScale(56), height: hScale(56), borderRadius: hScale(16) }} className={`${bg} items-center justify-center relative shadow-inner`}>
                                            <Icon size={hScale(24)} color={color} strokeWidth={2.5} />
                                            {!item.is_read && (
                                                <View style={{ top: vScale(-4), right: hScale(-4), width: hScale(16), height: hScale(16), borderWidth: 4 }} className="absolute bg-blue-600 rounded-full border-white dark:border-slate-900" />
                                            )}
                                        </View>
                                        <View className="flex-1">
                                            <View style={{ marginBottom: spacing.sm }} className="flex-row justify-between items-start">
                                                <Text style={{ fontSize: fontSize.base, marginRight: spacing.lg, lineHeight: vScale(20) }} className={`flex-1 uppercase tracking-tight ${!item.is_read ? 'font-black text-slate-900 dark:text-white' : 'font-bold text-slate-500 dark:text-slate-500'}`} numberOfLines={2}>
                                                    {item.title}
                                                </Text>
                                                <Text style={{ fontSize: hScale(9), paddingTop: vScale(4) }} className="text-slate-400 dark:text-slate-600 font-extrabold uppercase tracking-widest">
                                                    {format(new Date(item.created_at), 'MMM d')}
                                                </Text>
                                            </View>
                                            <Text style={{ fontSize: fontSize.xs, lineHeight: vScale(20) }} className={`font-medium ${!item.is_read ? 'text-slate-600 dark:text-slate-400' : 'text-slate-400 dark:text-slate-600'}`} numberOfLines={3}>
                                                {item.message}
                                            </Text>
                                        </View>
                                    </View>
                                </TouchableOpacity>
                            );
                        }}
                    />
                )}
            </SafeAreaView>
        </View>
    );
}
