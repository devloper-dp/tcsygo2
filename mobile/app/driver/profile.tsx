import { View, ScrollView, TouchableOpacity, Alert, StatusBar, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
    User,
    Settings,
    DollarSign,
    Car,
    Bell,
    HelpCircle,
    LogOut,
    ChevronRight,
    Star,
    MapPin,
    Shield,
} from 'lucide-react-native';
import { Text } from '@/components/ui/text';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/contexts/ThemeContext';
import { useResponsive } from '@/hooks/useResponsive';
 
export default function DriverProfile() {
    const router = useRouter();
    const { user, signOut } = useAuth();
    const { t } = useTranslation();
    const { theme, isDark } = useTheme();
    const { hScale, vScale, spacing } = useResponsive();
 
    const { data: driver } = useQuery({
        queryKey: ['driver-profile', user?.id],
        queryFn: async () => {
            if (!user) return null;
            const { data, error } = await supabase
                .from('drivers')
                .select('*')
                .eq('user_id', user.id)
                .limit(1)
                .maybeSingle();
            if (error) return null;
            return data;
        },
        enabled: !!user,
    });
 
    const { data: earnings } = useQuery({
        queryKey: ['driver-earnings-total', driver?.id],
        queryFn: async () => {
            if (!driver) return 0;
            const { data, error } = await supabase
                .from('trips')
                .select('price')
                .eq('driver_id', driver.id)
                .eq('status', 'completed');
            if (error || !data) return 0;
            return data.reduce((sum: number, t: any) => sum + (t.price || 0), 0);
        },
        enabled: !!driver,
    });
 
    const handleSignOut = () => {
        Alert.alert(
            t('settings.logout'),
            t('settings.logout_confirm'),
            [
                { text: t('settings.cancel'), style: 'cancel' },
                {
                    text: t('settings.logout'),
                    style: 'destructive',
                    onPress: async () => {
                        await signOut();
                        router.replace('/login');
                    },
                },
            ]
        );
    };
 
    const menuItems = [
        { icon: User, label: t('profile.edit_profile'), route: '/profile/edit', color: isDark ? '#818cf8' : '#6366f1', bg: isDark ? 'bg-indigo-900/20' : 'bg-indigo-50' },
        { icon: DollarSign, label: t('profile.earnings'), route: '/profile/earnings', color: isDark ? '#4ade80' : '#16a34a', bg: isDark ? 'bg-emerald-900/20' : 'bg-emerald-50' },
        { icon: Car, label: t('profile.my_vehicles'), route: '/profile/vehicles', color: isDark ? '#fbbf24' : '#f59e0b', bg: isDark ? 'bg-amber-900/20' : 'bg-amber-50' },
        { icon: Bell, label: t('profile.notifications'), route: '/profile/notifications', color: isDark ? '#60a5fa' : '#3b82f6', bg: isDark ? 'bg-blue-900/20' : 'bg-blue-50' },
        { icon: Shield, label: t('profile.safety_center'), route: '/safety-center', color: isDark ? '#22d3ee' : '#06b6d4', bg: isDark ? 'bg-cyan-900/20' : 'bg-cyan-50' },
        { icon: HelpCircle, label: t('profile.help_support'), route: '/profile/help', color: isDark ? '#94a3b8' : '#64748b', bg: isDark ? 'bg-slate-800' : 'bg-slate-50' },
        { icon: Settings, label: t('profile.settings'), route: '/profile/settings', color: isDark ? '#94a3b8' : '#475569', bg: isDark ? 'bg-slate-800' : 'bg-slate-100' },
    ];
 
    if (!user) return null;
 
    return (
        <View className="flex-1 bg-white dark:bg-slate-950">
            <StatusBar barStyle="light-content" backgroundColor={isDark ? "#1e1b4b" : "#4f46e5"} />
 
            {/* Header */}
            <View style={{ paddingBottom: vScale(32), borderBottomLeftRadius: hScale(40), borderBottomRightRadius: hScale(40) }} className="bg-indigo-600 dark:bg-indigo-950 shadow-lg shadow-indigo-500/20 overflow-hidden">
                <SafeAreaView edges={['top']} style={{ paddingHorizontal: spacing.xl, paddingTop: vScale(16) }}>
                    {/* Avatar & Info */}
                    <View style={{ alignItems: 'center', paddingVertical: vScale(24) }}>
                        <View style={{ width: hScale(112), height: hScale(112), borderRadius: hScale(56), borderWidth: 4, marginBottom: vScale(16) }} className="bg-indigo-200 dark:bg-indigo-900/50 items-center justify-center border-white/20 dark:border-indigo-800/50 shadow-xl overflow-hidden">
                            {user.profilePhoto ? (
                                <Image source={{ uri: user.profilePhoto }} className="w-full h-full" resizeMode="cover" />
                            ) : (
                                <Text style={{ fontSize: hScale(36) }} className="text-indigo-600 dark:text-indigo-400 font-black uppercase tracking-tighter">
                                    {user.fullName?.charAt(0) || 'D'}
                                </Text>
                            )}
                        </View>
                        <Text style={{ fontSize: hScale(24), marginBottom: vScale(4) }} className="text-white font-black uppercase tracking-tight">{user.fullName}</Text>
                        <Text style={{ fontSize: hScale(14), marginBottom: vScale(24) }} className="text-indigo-100/80 dark:text-indigo-300/80 font-medium uppercase tracking-widest">{user.email}</Text>
 
                        {/* Driver Badge */}
                        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: hScale(16), paddingVertical: vScale(6), borderWidth: 1 }} className="bg-white/20 dark:bg-white/10 rounded-full backdrop-blur-md border-white/10">
                            <Car size={hScale(14)} color="#a5b4fc" />
                            <Text style={{ fontSize: hScale(10), marginLeft: hScale(8) }} className="text-white font-black uppercase tracking-widest">{t('profile.driver')}</Text>
                        </View>
                    </View>
 
                    {/* Stats Row */}
                    <View style={{ flexDirection: 'row', padding: spacing.xl, marginTop: vScale(16), borderRadius: hScale(32), borderWidth: 1 }} className="bg-white/10 dark:bg-slate-900/40 backdrop-blur-xl border-white/10 dark:border-white/5">
                        <View className="flex-1 items-center">
                            <Star size={hScale(20)} color="#fbbf24" fill="#fbbf24" />
                            <Text style={{ fontSize: hScale(20), marginTop: vScale(8) }} className="text-white font-black tracking-tighter">
                                {driver?.rating ? Number(driver.rating).toFixed(1) : '—'}
                            </Text>
                            <Text style={{ fontSize: hScale(8), marginTop: vScale(4) }} className="text-indigo-200/60 dark:text-indigo-400/60 font-black uppercase tracking-widest">{t('profile.rating')}</Text>
                        </View>
                        <View style={{ width: 1, height: vScale(40) }} className="bg-white/10 self-center" />
                        <View className="flex-1 items-center">
                            <MapPin size={hScale(20)} color="#4ade80" />
                            <Text style={{ fontSize: hScale(20), marginTop: vScale(8) }} className="text-white font-black tracking-tighter">
                                {driver?.total_trips ?? 0}
                            </Text>
                            <Text style={{ fontSize: hScale(8), marginTop: vScale(4) }} className="text-indigo-200/60 dark:text-indigo-400/60 font-black uppercase tracking-widest">{t('profile.trips')}</Text>
                        </View>
                        <View style={{ width: 1, height: vScale(40) }} className="bg-white/10 self-center" />
                        <View className="flex-1 items-center">
                            <DollarSign size={hScale(20)} color="#60a5fa" />
                            <Text style={{ fontSize: hScale(20), marginTop: vScale(8) }} className="text-white font-black tracking-tighter">
                                ₹{earnings ?? 0}
                            </Text>
                            <Text style={{ fontSize: hScale(8), marginTop: vScale(4) }} className="text-indigo-200/60 dark:text-indigo-400/60 font-black uppercase tracking-widest">{t('profile.earned')}</Text>
                        </View>
                    </View>
                </SafeAreaView>
            </View>
 
            {/* Menu */}
            <ScrollView
                className="flex-1"
                contentContainerStyle={{ padding: spacing.xl, paddingBottom: vScale(100) }}
                showsVerticalScrollIndicator={false}
            >
                <View style={{ borderRadius: hScale(32), borderWidth: 1 }} className="bg-white dark:bg-slate-900 overflow-hidden shadow-sm border-slate-100/60 dark:border-slate-800">
                    {menuItems.map((item, index) => {
                        const Icon = item.icon;
                        return (
                            <View key={item.route}>
                                <TouchableOpacity
                                    onPress={() => router.push(item.route as any)}
                                    activeOpacity={0.7}
                                    style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.xl, paddingVertical: vScale(20) }}
                                >
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.lg }}>
                                        <View style={{ width: hScale(48), height: hScale(48), borderRadius: hScale(16) }} className={`items-center justify-center ${item.bg}`}>
                                            <Icon size={hScale(22)} color={item.color} strokeWidth={2.5} />
                                        </View>
                                        <Text style={{ fontSize: hScale(16) }} className="font-bold text-slate-800 dark:text-slate-200 tracking-tight">{item.label}</Text>
                                    </View>
                                    <ChevronRight size={hScale(18)} color={isDark ? "#334155" : "#cbd5e1"} />
                                </TouchableOpacity>
                                {index < menuItems.length - 1 && (
                                    <View style={{ height: 1, marginHorizontal: spacing.xl }} className="bg-slate-50 dark:bg-slate-800" />
                                )}
                            </View>
                        );
                    })}
                </View>
 
                {/* Logout */}
                <TouchableOpacity
                    onPress={handleSignOut}
                    activeOpacity={0.7}
                    style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: vScale(32), padding: spacing.xl, borderRadius: hScale(24), borderWidth: 1 }}
                    className="bg-red-50 dark:bg-red-900/10 border-red-100 dark:border-red-900/20"
                >
                    <LogOut size={hScale(18)} color="#ef4444" strokeWidth={2.5} />
                    <Text style={{ fontSize: hScale(14), marginLeft: hScale(12) }} className="text-red-500 font-black uppercase tracking-widest">{t('settings.logout')}</Text>
                </TouchableOpacity>
 
                <Text style={{ fontSize: hScale(10), marginTop: vScale(40), marginBottom: vScale(16) }} className="text-center text-slate-400 dark:text-slate-600 font-black uppercase tracking-widest">TCSYGO Driver v1.0.0 • Build 2024.1</Text>
            </ScrollView>
        </View>
    );
}
