import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Linking, Alert, ActivityIndicator, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { SafetyCheckIn } from '@/components/SafetyCheckIn';
import { SafetyTipsModal } from '@/components/SafetyTipsModal';
import { RideInsuranceCard } from '@/components/RideInsuranceCard';
import { DriverVerification } from '@/components/DriverVerification';
import { useTheme } from '@/contexts/ThemeContext';
import { useResponsive } from '@/hooks/useResponsive';
 
export default function SafetyCenterScreen() {
    const router = useRouter();
    const { user } = useAuth();
    const { isDark } = useTheme();
    const { hScale, vScale, spacing, fontSize } = useResponsive();
    const [activeTrip, setActiveTrip] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [showTips, setShowTips] = useState(false);
    const [showVerification, setShowVerification] = useState(false);
 
    useEffect(() => {
        if (user) {
            fetchActiveTrip();
        }
    }, [user]);
 
    const fetchActiveTrip = async () => {
        try {
            const { data, error } = await supabase
                .from('trips')
                .select('*, driver:drivers(*, user:users(*))')
                .or(`passenger_id.eq.${user?.id},driver_id.eq.${user?.id}`)
                .eq('status', 'ongoing')
                .limit(1)
                .maybeSingle();
 
            if (!error && data) {
                setActiveTrip(data);
            }
        } catch (error) {
            console.error('Error fetching active trip:', error);
        } finally {
            setLoading(false);
        }
    };
 
    const handleEmergencyCall = () => {
        Alert.alert(
            "Emergency SOS",
            "Initialize Priority Voice Link with Police (100)?",
            [
                { text: "Abort", style: "cancel" },
                {
                    text: "Execute Call",
                    style: "destructive",
                    onPress: () => Linking.openURL('tel:100')
                }
            ]
        );
    };
 
    const safetyFeatures = [
        {
            title: 'Guardian Contacts',
            description: 'Automated status transmission to designated intelligence officers.',
            icon: 'people',
            action: () => router.push('/profile/emergency'),
            status: 'Setup'
        },
        {
            title: 'Protocol Tips',
            description: 'Established best practices for secure transit operations.',
            icon: 'bulb',
            action: () => setShowTips(true),
        },
        {
            title: 'Transit Insurance',
            description: 'Full spectral coverage for all mission contingencies.',
            icon: 'shield-checkmark',
            action: () => Alert.alert('Coverage Active', 'Every mission on TCSYGO is protected by our global insurance protocol.'),
        }
    ];
 
    return (
        <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-950" edges={['top']}>
            <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
            
            <View style={{ paddingHorizontal: spacing.xl, paddingVertical: vScale(20), borderBottomWidth: 1 }} className="flex-row justify-between items-center bg-white dark:bg-slate-950 border-slate-100 dark:border-slate-800 shadow-sm z-30">
                <TouchableOpacity 
                    onPress={() => router.back()} 
                    style={{ width: hScale(48), height: hScale(48), borderRadius: hScale(24), borderWidth: 1 }}
                    className="bg-slate-50 dark:bg-slate-900 items-center justify-center border-slate-100 dark:border-slate-800"
                >
                    <Ionicons name="arrow-back" size={hScale(24)} color={isDark ? "#f8fafc" : "#1e293b"} />
                </TouchableOpacity>
                <Text style={{ fontSize: fontSize.xl }} className="font-black text-slate-900 dark:text-white uppercase tracking-tighter">Safety Hub</Text>
                <View style={{ width: hScale(48) }} />
            </View>
 
            <ScrollView 
                className="flex-1" 
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ padding: spacing.xl, paddingBottom: vScale(100) }}
            >
                <View style={{ marginBottom: vScale(40) }} className="items-center">
                    <View style={{ width: hScale(80), height: hScale(80), borderRadius: hScale(32), marginBottom: vScale(24), borderWidth: 4 }} className="bg-blue-50 dark:bg-blue-900/10 justify-center items-center border-white dark:border-blue-900/30 shadow-xl">
                        <Ionicons name="shield-checkmark" size={hScale(40)} color="#3b82f6" />
                    </View>
                    <Text style={{ fontSize: fontSize.xxl, marginBottom: vScale(12), lineHeight: vScale(32), paddingHorizontal: spacing.lg }} className="font-black text-slate-900 dark:text-white text-center uppercase tracking-tighter">Encryption is Standard. Safety is Absolute.</Text>
                    <Text style={{ fontSize: hScale(10) }} className="font-black text-slate-400 dark:text-slate-500 text-center uppercase tracking-[2px]">Mission Control Safety Protocols Active</Text>
                </View>
 
                {/* Active Trip Monitoring */}
                <View style={{ marginBottom: vScale(40) }}>
                    <Text style={{ fontSize: hScale(10), marginBottom: vScale(24), paddingHorizontal: spacing.xs }} className="font-black text-slate-400 dark:text-slate-500 uppercase tracking-[2px]">Active Monitoring</Text>
                    {loading ? (
                        <View style={{ paddingVertical: vScale(40) }}>
                            <ActivityIndicator color="#3b82f6" />
                        </View>
                    ) : activeTrip ? (
                        <Card style={{ padding: spacing.xl, borderRadius: hScale(32), borderWidth: 1 }} className="bg-white dark:bg-slate-900 border border-blue-100 dark:border-blue-900/30 shadow-sm">
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: vScale(24) }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
                                    <View style={{ width: hScale(10), height: hScale(10), borderRadius: hScale(5) }} className="bg-green-500 shadow-lg shadow-green-500/50" />
                                    <Text style={{ fontSize: hScale(10) }} className="font-black text-green-600 dark:text-green-500 uppercase tracking-widest">Signal Locked • Live Monitoring</Text>
                                </View>
                                <View style={{ paddingHorizontal: spacing.md, paddingVertical: vScale(4), borderRadius: hScale(16), borderWidth: 1 }} className="bg-slate-50 dark:bg-slate-800 border-slate-100 dark:border-slate-700">
                                    <Text style={{ fontSize: hScale(9) }} className="font-black text-slate-500 dark:text-slate-400">ID: {activeTrip.id.substring(0, 8).toUpperCase()}</Text>
                                </View>
                            </View>
 
                            <View style={{ flexDirection: 'row', marginBottom: vScale(16) }}>
                                <TouchableOpacity
                                    onPress={() => setShowVerification(true)}
                                    style={{ paddingVertical: vScale(16), borderRadius: hScale(16), borderWidth: 1 }}
                                    className="flex-1 flex-row items-center justify-center bg-blue-50 dark:bg-blue-900/20 border-blue-100/50 dark:border-blue-900/30"
                                >
                                    <Ionicons name="scan" size={hScale(20)} color="#3b82f6" />
                                    <Text style={{ fontSize: fontSize.xs, marginLeft: spacing.md }} className="text-blue-600 dark:text-blue-400 font-black uppercase tracking-widest">Verify Driver</Text>
                                </TouchableOpacity>
                            </View>
 
                            <SafetyCheckIn
                                tripId={activeTrip.id}
                                style={{ marginTop: vScale(12), backgroundColor: 'transparent', borderWidth: 0 }}
                            />
                        </Card>
                    ) : (
                        <Card style={{ padding: spacing.xxl, borderRadius: hScale(32), borderWidth: 1 }} className="items-center justify-center border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/20 shadow-none">
                            <Ionicons name="shield-outline" size={hScale(48)} color={isDark ? "#1e293b" : "#cbd5e1"} strokeWidth={1} />
                            <Text style={{ fontSize: fontSize.sm, marginTop: vScale(24) }} className="font-black text-slate-400 dark:text-slate-600 uppercase tracking-widest">No Active Missions</Text>
                            <Text style={{ fontSize: hScale(10), marginTop: vScale(8) }} className="font-bold text-slate-400 dark:text-slate-700 uppercase tracking-wide">Protocols idle until deployment</Text>
                        </Card>
                    )}
                </View>
 
                {/* Emergency Section */}
                <View style={{ marginBottom: vScale(40) }}>
                    <Text style={{ fontSize: hScale(10), marginBottom: vScale(24), paddingHorizontal: spacing.xs }} className="font-black text-red-500 uppercase tracking-[2px]">Critical Intervention</Text>
                    <Card style={{ padding: spacing.xl, borderRadius: hScale(32), borderWidth: 1 }} className="bg-red-50 dark:bg-red-900/10 border-red-100 dark:border-red-900/30">
                        <TouchableOpacity 
                            style={{ paddingVertical: vScale(20), borderRadius: hScale(24), gap: spacing.lg, marginBottom: vScale(16) }}
                            className="bg-red-600 dark:bg-red-500 flex-row items-center justify-center shadow-xl shadow-red-500/30 active:opacity-90" 
                            onPress={handleEmergencyCall}
                        >
                            <Ionicons name="warning" size={hScale(24)} color="white" />
                            <Text style={{ fontSize: fontSize.xl }} className="text-white font-black uppercase tracking-widest">Emergency SOS</Text>
                        </TouchableOpacity>
                        <Text style={{ fontSize: hScale(9), lineHeight: vScale(16) }} className="font-black text-red-800 dark:text-red-400 text-center uppercase tracking-widest opacity-60">
                            Immediate distress signal initialization. mis-use subject to terminal deactivation.
                        </Text>
                    </Card>
                </View>
 
                {/* Features Grid */}
                <View style={{ marginBottom: vScale(40) }}>
                    <Text style={{ fontSize: hScale(10), marginBottom: vScale(24), paddingHorizontal: spacing.xs }} className="font-black text-slate-400 dark:text-slate-500 uppercase tracking-[2px]">Auxiliary Support</Text>
                    <View style={{ gap: spacing.md }}>
                        {safetyFeatures.map((feature, index) => (
                            <TouchableOpacity 
                                key={index} 
                                style={{ padding: spacing.xl, borderRadius: hScale(28), borderWidth: 1 }}
                                className="flex-row items-center bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 shadow-sm active:bg-slate-50 dark:active:bg-slate-800" 
                                onPress={feature.action}
                            >
                                <View style={{ width: hScale(56), height: hScale(56), borderRadius: hScale(16), marginRight: spacing.xl }} className={`justify-center items-center ${feature.title === 'Protocol Tips' ? 'bg-amber-100 dark:bg-amber-900/20' : 'bg-blue-50 dark:bg-blue-900/20'}`}>
                                    <Ionicons
                                        name={feature.icon as any}
                                        size={hScale(24)}
                                        color={feature.title === 'Protocol Tips' ? '#f59e0b' : '#3b82f6'}
                                    />
                                </View>
                                <View className="flex-1">
                                    <Text style={{ fontSize: fontSize.base, marginBottom: vScale(4), lineHeight: vScale(16) }} className="font-black text-slate-900 dark:text-white uppercase tracking-tighter">{feature.title}</Text>
                                    <Text style={{ fontSize: hScale(10), lineHeight: vScale(16) }} className="font-medium text-slate-500 dark:text-slate-500 tracking-wide uppercase opacity-80">{feature.description}</Text>
                                </View>
                                <Ionicons name="chevron-forward" size={hScale(18)} color={isDark ? "#334155" : "#cbd5e1"} />
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>
 
                <View style={{ marginBottom: vScale(40) }}>
                    <RideInsuranceCard />
                </View>
            </ScrollView>
 
            <SafetyTipsModal visible={showTips} onClose={() => setShowTips(false)} />
 
            {activeTrip && activeTrip.driver && (
                <DriverVerification
                    visible={showVerification}
                    onClose={() => setShowVerification(false)}
                    driver={{
                        name: activeTrip.driver.user.fullName,
                        photoUrl: activeTrip.driver.user.profilePhoto,
                        rating: activeTrip.driver.rating || 'New',
                        trips: activeTrip.driver.total_trips || 0,
                        plateNumber: activeTrip.driver.vehicle_plate_number || activeTrip.driver.license_number,
                        vehicleModel: activeTrip.driver.vehicle_model || 'Standard',
                        vehicleColor: activeTrip.driver.vehicle_color || 'Neutral'
                    }}
                    onVerified={() => {
                        setShowVerification(false);
                        Alert.alert('Protocol Confirmed', 'Driver credentials verified successfully.');
                    }}
                />
            )}
        </SafeAreaView>
    );
}
