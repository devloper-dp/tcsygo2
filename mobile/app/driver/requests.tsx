import React, { useState } from 'react';
import { View, ScrollView, RefreshControl, TouchableOpacity, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/text';
import { RideRequestsList } from '@/components/driver/RideRequestsList';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/contexts/ThemeContext';
import { useResponsive } from '@/hooks/useResponsive';
 
export default function RideRequestsScreen() {
    const router = useRouter();
    const { t } = useTranslation();
    const { theme, isDark, colors } = useTheme();
    const { hScale, vScale, spacing } = useResponsive();
    const queryClient = useQueryClient();
    const [refreshing, setRefreshing] = useState(false);
 
    const onRefresh = async () => {
        setRefreshing(true);
        await queryClient.invalidateQueries({ queryKey: ['pending-requests'] });
        setRefreshing(false);
    };
 
    return (
        <SafeAreaView className="flex-1 bg-white dark:bg-slate-950">
            <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
            
            {/* Header */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.xl, paddingVertical: vScale(16), borderBottomWidth: 1 }} className="bg-white dark:bg-slate-950 border-slate-100 dark:border-slate-800 shadow-sm z-10">
                <TouchableOpacity 
                    onPress={() => router.back()} 
                    style={{ width: hScale(40), height: hScale(40), borderRadius: hScale(20) }}
                    className="bg-slate-50 dark:bg-slate-900 items-center justify-center active:bg-slate-100 dark:active:bg-slate-800"
                >
                    <Ionicons name="arrow-back" size={hScale(24)} color={isDark ? "#f8fafc" : "#1e293b"} />
                </TouchableOpacity>
                <Text style={{ fontSize: hScale(20) }} className="font-black text-slate-900 dark:text-white uppercase tracking-tighter">{t('driver.ride_requests')}</Text>
                <View style={{ width: hScale(40) }} />
            </View>
 
            <ScrollView
                className="flex-1"
                contentContainerStyle={{ padding: spacing.xl }}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={isDark ? "#94a3b8" : "#64748b"} />}
                showsVerticalScrollIndicator={false}
            >
                <View style={{ marginBottom: vScale(24), paddingHorizontal: hScale(4) }}>
                    <Text style={{ fontSize: hScale(14) }} className="font-black text-slate-500 dark:text-slate-500 uppercase tracking-widest">
                        {t('driver.showing_pending_requests')}
                    </Text>
                </View>
 
                <RideRequestsList />
            </ScrollView>
        </SafeAreaView>
    );
}
