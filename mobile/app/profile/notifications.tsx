import React, { useState, useEffect } from 'react';
import { View, Switch, TouchableOpacity, ScrollView, Alert, ActivityIndicator, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import { saveNotificationPreferences, getNotificationPreferences } from '@/lib/notifications';
import { Text } from '@/components/ui/text';
import { Card } from '@/components/ui/card';
import { useTheme } from '@/contexts/ThemeContext';
import { useResponsive } from '@/hooks/useResponsive';
 
export default function NotificationsScreen() {
    const router = useRouter();
    const { user } = useAuth();
    const { theme, isDark } = useTheme();
    const { hScale, vScale, spacing, fontSize } = useResponsive();
    const [loading, setLoading] = useState(false);
    const [preferences, setPreferences] = useState({
        messages: true,
        trips: true,
        bookings: true,
        payments: true,
        marketing: false,
    });
 
    useEffect(() => {
        if (user) {
            setLoading(true);
            getNotificationPreferences(user.id).then(prefs => {
                if (prefs) {
                    setPreferences(prefs);
                }
                setLoading(false);
            }).catch(() => setLoading(false));
        }
    }, [user]);
 
    const togglePreference = async (key: keyof typeof preferences) => {
        if (!user) return;
 
        const newPrefs = { ...preferences, [key]: !preferences[key] };
        setPreferences(newPrefs);
 
        try {
            await saveNotificationPreferences(user.id, newPrefs);
        } catch (error) {
            Alert.alert('Error', 'Failed to save preferences');
            setPreferences(preferences);
        }
    };
 
    if (loading) {
        return (
            <SafeAreaView style={{ gap: spacing.lg }} className="flex-1 bg-white dark:bg-slate-950 justify-center items-center">
                <ActivityIndicator size="large" color={isDark ? "#ffffff" : "#3b82f6"} />
                <Text style={{ fontSize: hScale(10) }} className="text-slate-500 dark:text-slate-500 font-black uppercase tracking-widest">Configuring Streams...</Text>
            </SafeAreaView>
        );
    }
 
    const SettingSection = ({ title, children }: { title: string, children: React.ReactNode }) => (
        <View style={{ marginBottom: vScale(32) }}>
            <Text style={{ fontSize: hScale(10), marginBottom: vScale(16), paddingHorizontal: spacing.xs }} className="font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">{title}</Text>
            <Card style={{ borderRadius: hScale(32), borderWidth: 1 }} className="bg-white dark:bg-slate-900 overflow-hidden border-slate-100 dark:border-slate-800 shadow-sm">
                {children}
            </Card>
        </View>
    );
 
    const ToggleItem = ({ label, description, value, onToggle, last = false }: { label: string, description: string, value: boolean, onToggle: () => void, last?: boolean }) => (
        <View style={{ padding: spacing.xl, borderBottomWidth: last ? 0 : 1 }} className={`flex-row items-center justify-between ${!last ? 'border-slate-50 dark:border-slate-800/50' : ''}`}>
            <View style={{ flex: 1, marginRight: spacing.xl }}>
                <Text style={{ fontSize: fontSize.base }} className="font-bold text-slate-900 dark:text-white tracking-tight">{label}</Text>
                <Text style={{ fontSize: fontSize.xs, marginTop: vScale(4), lineHeight: vScale(16) }} className="font-medium text-slate-500 dark:text-slate-500">{description}</Text>
            </View>
            <Switch
                value={value}
                onValueChange={onToggle}
                trackColor={{ false: isDark ? "#1e293b" : "#e2e8f0", true: "#3b82f6" }}
                thumbColor={"#ffffff"}
            />
        </View>
    );
 
    return (
        <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-950" edges={['top']}>
            <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
            
            {/* Header */}
            <View style={{ paddingHorizontal: spacing.xl, paddingVertical: vScale(16), borderBottomWidth: 1 }} className="flex-row items-center justify-between border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-sm z-10">
                <TouchableOpacity 
                    onPress={() => router.back()} 
                    style={{ width: hScale(40), height: hScale(40) }}
                    className="rounded-full bg-slate-50 dark:bg-slate-900 items-center justify-center active:bg-slate-100 dark:active:bg-slate-800"
                >
                    <Ionicons name="arrow-back" size={hScale(24)} color={isDark ? "#f8fafc" : "#1e293b"} />
                </TouchableOpacity>
                <Text style={{ fontSize: fontSize.xl }} className="font-black text-slate-900 dark:text-white uppercase tracking-tighter">Notifications</Text>
                <View style={{ width: hScale(40) }} />
            </View>
 
            <ScrollView 
                contentContainerStyle={{ padding: spacing.xl, paddingBottom: vScale(100) }}
                showsVerticalScrollIndicator={false}
            >
                <SettingSection title="Alert Channels">
                    <ToggleItem 
                        label="Trip Intelligence" 
                        description="Real-time updates on active rides and status changes." 
                        value={preferences.trips} 
                        onToggle={() => togglePreference('trips')} 
                    />
                    <ToggleItem 
                        label="Booking Requests" 
                        description="Instant alerts for new incoming ride opportunities." 
                        value={preferences.bookings} 
                        onToggle={() => togglePreference('bookings')} 
                    />
                    <ToggleItem 
                        label="Secure Messages" 
                        description="Direct communication from drivers or passengers." 
                        value={preferences.messages} 
                        onToggle={() => togglePreference('messages')} 
                        last
                    />
                </SettingSection>
 
                <SettingSection title="Financial Events">
                    <ToggleItem 
                        label="Payouts & Ledger" 
                        description="Audit trails for processed payments and wallet top-ups." 
                        value={preferences.payments} 
                        onToggle={() => togglePreference('payments')} 
                        last
                    />
                </SettingSection>
 
                <SettingSection title="Market Intelligence">
                    <ToggleItem 
                        label="Exclusive Perks" 
                        description="Unlock seasonal discounts and premium feature updates." 
                        value={preferences.marketing} 
                        onToggle={() => togglePreference('marketing')} 
                        last
                    />
                </SettingSection>
 
                <View style={{ borderRadius: hScale(28), padding: spacing.xl, marginTop: vScale(16), borderWidth: 1 }} className="bg-slate-100 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800/50 opacity-40">
                    <Text style={{ fontSize: hScale(9), lineHeight: vScale(16) }} className="font-black text-slate-500 text-center uppercase tracking-[2px]">
                        Data sync frequency is determined by your system OS settings.
                    </Text>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}
