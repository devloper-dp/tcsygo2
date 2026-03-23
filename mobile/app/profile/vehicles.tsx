import React, { useState, useEffect } from 'react';
import { View, ScrollView, TouchableOpacity, Alert, ActivityIndicator, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Text } from '@/components/ui/text';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useTheme } from '@/contexts/ThemeContext';
import { useResponsive } from '@/hooks/useResponsive';
 
export default function MyVehiclesScreen() {
    const router = useRouter();
    const { user } = useAuth();
    const { theme, isDark } = useTheme();
    const { hScale, vScale, spacing, fontSize } = useResponsive();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [driverProfile, setDriverProfile] = useState<any>(null);
 
    const [formData, setFormData] = useState({
        vehicleMake: '',
        vehicleModel: '',
        vehicleYear: '',
        vehicleColor: '',
        vehiclePlate: '',
    });
 
    useEffect(() => {
        if (user) {
            fetchDriverProfile();
        }
    }, [user]);
 
    const fetchDriverProfile = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('drivers')
                .select('*')
                .eq('userId', user?.id)
                .single();
 
            if (data) {
                setDriverProfile(data);
                setFormData({
                    vehicleMake: data.vehicleMake || '',
                    vehicleModel: data.vehicleModel || '',
                    vehicleYear: String(data.vehicleYear || ''),
                    vehicleColor: data.vehicleColor || '',
                    vehiclePlate: data.vehiclePlate || '',
                });
            }
        } catch (error) {
            console.error('Error fetching driver profile:', error);
        } finally {
            setLoading(false);
        }
    };
 
    const handleSave = async () => {
        if (!formData.vehicleMake || !formData.vehicleModel || !formData.vehiclePlate) {
            Alert.alert('Error', 'Please fill in required vehicle details');
            return;
        }
 
        try {
            setSaving(true);
            const { error } = await supabase
                .from('drivers')
                .update({
                    vehicleMake: formData.vehicleMake,
                    vehicleModel: formData.vehicleModel,
                    vehicleYear: parseInt(formData.vehicleYear) || null,
                    vehicleColor: formData.vehicleColor,
                    vehiclePlate: formData.vehiclePlate,
                })
                .eq('userId', user?.id);
 
            if (error) throw error;
            Alert.alert('Success', 'Vehicle information updated successfully');
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to update vehicle information');
        } finally {
            setSaving(false);
        }
    };
 
    if (loading) {
        return (
            <SafeAreaView style={{ gap: spacing.lg }} className="flex-1 bg-white dark:bg-slate-950 justify-center items-center">
                <ActivityIndicator size="large" color={isDark ? "#ffffff" : "#3b82f6"} />
                <Text style={{ fontSize: hScale(10) }} className="text-slate-500 dark:text-slate-500 font-black uppercase tracking-widest">Accessing Hangar State...</Text>
            </SafeAreaView>
        );
    }
 
    if (!driverProfile && user?.role === 'passenger') {
        return (
            <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-950" edges={['top']}>
            <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
            <View style={{ paddingHorizontal: spacing.xl, paddingVertical: vScale(16), borderBottomWidth: 1 }} className="flex-row items-center justify-between border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-sm z-10">
                <TouchableOpacity onPress={() => router.back()} style={{ width: hScale(40), height: hScale(40) }} className="rounded-full bg-slate-50 dark:bg-slate-900 items-center justify-center">
                    <Ionicons name="arrow-back" size={hScale(24)} color={isDark ? "#f8fafc" : "#1e293b"} />
                </TouchableOpacity>
                <Text style={{ fontSize: fontSize.xl }} className="font-black text-slate-900 dark:text-white uppercase tracking-tighter">My Vehicles</Text>
                <View style={{ width: hScale(40) }} />
            </View>
            <View style={{ padding: spacing.xxl }} className="flex-1 justify-center items-center opacity-40">
                <View style={{ width: hScale(96), height: hScale(96), marginBottom: vScale(32) }} className="bg-slate-100 dark:bg-slate-900 rounded-full items-center justify-center">
                    <Ionicons name="car" size={hScale(48)} color={isDark ? "#94a3b8" : "#64748b"} />
                </View>
                <Text style={{ fontSize: fontSize.xxl }} className="font-black text-slate-900 dark:text-white uppercase tracking-tighter text-center">Registration Required</Text>
                <Text style={{ fontSize: fontSize.xs, marginTop: vScale(12), lineHeight: vScale(20), maxWidth: hScale(240) }} className="font-medium text-slate-500 dark:text-slate-500 text-center uppercase tracking-widest">
                    You need to elevate your account to Driver status to manage vehicle assets.
                </Text>
                <TouchableOpacity 
                    style={{ marginTop: vScale(48), height: vScale(64), borderRadius: hScale(24) }}
                    className="bg-slate-900 dark:bg-white w-full items-center justify-center shadow-lg shadow-slate-900/10" 
                    onPress={() => router.push('/become-driver')}
                >
                    <Text style={{ fontSize: fontSize.base }} className="text-white dark:text-slate-900 font-black uppercase tracking-widest">Upgrade to Driver</Text>
                </TouchableOpacity>
            </View>
            </SafeAreaView>
        );
    }
 
    return (
        <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-950" edges={['top']}>
            <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
            
            <View style={{ paddingHorizontal: spacing.xl, paddingVertical: vScale(16), borderBottomWidth: 1 }} className="flex-row items-center justify-between border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-sm z-10">
                <TouchableOpacity 
                    onPress={() => router.back()} 
                    style={{ width: hScale(40), height: hScale(40) }}
                    className="rounded-full bg-slate-50 dark:bg-slate-900 items-center justify-center active:bg-slate-100 dark:active:bg-slate-800"
                >
                    <Ionicons name="arrow-back" size={hScale(24)} color={isDark ? "#f8fafc" : "#1e293b"} />
                </TouchableOpacity>
                <Text style={{ fontSize: fontSize.xl }} className="font-black text-slate-900 dark:text-white uppercase tracking-tighter">My Vehicle</Text>
                <View style={{ width: hScale(40) }} />
            </View>
 
            <ScrollView 
                contentContainerStyle={{ padding: spacing.xl, paddingBottom: vScale(100) }}
                showsVerticalScrollIndicator={false}
            >
                <Card style={{ padding: spacing.xl, borderRadius: hScale(32), marginBottom: vScale(40), borderWidth: 1 }} className="flex-row items-center justify-between bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 shadow-sm">
                    <View style={{ gap: spacing.xs }}>
                        <Text style={{ fontSize: hScale(10) }} className="font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Asset Integrity</Text>
                        <View style={{ alignSelf: 'flex-start', paddingHorizontal: spacing.lg, paddingVertical: vScale(6), borderRadius: hScale(12), borderWidth: 1 }} className={`${driverProfile?.verificationStatus === 'verified' ? 'bg-green-50 dark:bg-green-900/20 border-green-100 dark:border-green-900/30' : 'bg-amber-50 dark:bg-amber-900/20 border-amber-100 dark:border-amber-900/30'}`}>
                            <Text style={{ fontSize: hScale(10) }} className={`font-black uppercase tracking-widest ${driverProfile?.verificationStatus === 'verified' ? 'text-green-600 dark:text-green-500' : 'text-amber-600 dark:text-amber-500'}`}>
                                {driverProfile?.verificationStatus?.toUpperCase() || 'PENDING VERIFICATION'}
                            </Text>
                        </View>
                    </View>
                    <View style={{ width: hScale(56), height: hScale(56), borderRadius: hScale(16) }} className="bg-slate-50 dark:bg-slate-800 items-center justify-center">
                        <Ionicons
                            name={driverProfile?.verificationStatus === 'verified' ? "shield-checkmark" : "time"}
                            size={hScale(32)}
                            color={driverProfile?.verificationStatus === 'verified' ? "#22c55e" : "#f59e0b"}
                        />
                    </View>
                </Card>
 
                <View style={{ gap: spacing.lg }}>
                    <View style={{ flexDirection: 'row', gap: spacing.lg }}>
                        <View style={{ flex: 1, gap: spacing.xs }}>
                            <Text style={{ fontSize: hScale(10), marginLeft: spacing.xs }} className="font-black text-slate-500 dark:text-slate-500 uppercase tracking-widest">Make</Text>
                            <Input
                                value={formData.vehicleMake}
                                onChangeText={(text) => setFormData({ ...formData, vehicleMake: text })}
                                placeholder="TOYOTA"
                                style={{ height: vScale(56), borderRadius: hScale(20), paddingHorizontal: spacing.xl }}
                                className="font-bold text-slate-900 dark:text-white bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 shadow-sm"
                                placeholderTextColor={isDark ? "#475569" : "#94a3b8"}
                            />
                        </View>
                        <View style={{ flex: 1, gap: spacing.xs }}>
                            <Text style={{ fontSize: hScale(10), marginLeft: spacing.xs }} className="font-black text-slate-500 dark:text-slate-500 uppercase tracking-widest">Model</Text>
                            <Input
                                value={formData.vehicleModel}
                                onChangeText={(text) => setFormData({ ...formData, vehicleModel: text })}
                                placeholder="COROLLA"
                                style={{ height: vScale(56), borderRadius: hScale(20), paddingHorizontal: spacing.xl }}
                                className="font-bold text-slate-900 dark:text-white bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 shadow-sm"
                                placeholderTextColor={isDark ? "#475569" : "#94a3b8"}
                            />
                        </View>
                    </View>
 
                    <View style={{ flexDirection: 'row', gap: spacing.lg }}>
                        <View style={{ flex: 1, gap: spacing.xs }}>
                            <Text style={{ fontSize: hScale(10), marginLeft: spacing.xs }} className="font-black text-slate-500 dark:text-slate-500 uppercase tracking-widest">Year</Text>
                            <Input
                                value={formData.vehicleYear}
                                onChangeText={(text) => setFormData({ ...formData, vehicleYear: text })}
                                placeholder="2024"
                                keyboardType="numeric"
                                style={{ height: vScale(56), borderRadius: hScale(20), paddingHorizontal: spacing.xl }}
                                className="font-bold text-slate-900 dark:text-white bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 shadow-sm"
                                placeholderTextColor={isDark ? "#475569" : "#94a3b8"}
                            />
                        </View>
                        <View style={{ flex: 1, gap: spacing.xs }}>
                            <Text style={{ fontSize: hScale(10), marginLeft: spacing.xs }} className="font-black text-slate-500 dark:text-slate-500 uppercase tracking-widest">Color</Text>
                            <Input
                                value={formData.vehicleColor}
                                onChangeText={(text) => setFormData({ ...formData, vehicleColor: text })}
                                placeholder="METALLIC GREY"
                                style={{ height: vScale(56), borderRadius: hScale(20), paddingHorizontal: spacing.xl }}
                                className="font-bold text-slate-900 dark:text-white bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 shadow-sm"
                                placeholderTextColor={isDark ? "#475569" : "#94a3b8"}
                            />
                        </View>
                    </View>
 
                    <View style={{ gap: spacing.xs }}>
                        <Text style={{ fontSize: hScale(10), marginLeft: spacing.xs }} className="font-black text-slate-500 dark:text-slate-500 uppercase tracking-widest">Secure Plate Registry</Text>
                        <Input
                            value={formData.vehiclePlate}
                            onChangeText={(text) => setFormData({ ...formData, vehiclePlate: text })}
                            placeholder="KA-01-AB-1234"
                            autoCapitalize="characters"
                            style={{ height: vScale(56), borderRadius: hScale(20), paddingHorizontal: spacing.xl }}
                            className="font-bold text-slate-900 dark:text-white bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 shadow-sm"
                            placeholderTextColor={isDark ? "#475569" : "#94a3b8"}
                        />
                    </View>
 
                    <TouchableOpacity
                        style={{ height: vScale(64), borderRadius: hScale(24), marginTop: vScale(24) }}
                        className={`items-center justify-center ${saving ? 'bg-slate-100 dark:bg-slate-800' : 'bg-slate-900 dark:bg-white shadow-lg shadow-slate-900/10'}`}
                        onPress={handleSave}
                        disabled={saving}
                    >
                        {saving ? (
                            <ActivityIndicator color={isDark ? "#3b82f6" : "#64748b"} />
                        ) : (
                            <Text style={{ fontSize: fontSize.base }} className="text-white dark:text-slate-900 font-black uppercase tracking-widest">Update Registry</Text>
                        )}
                    </TouchableOpacity>
 
                    <View style={{ borderRadius: hScale(28), padding: spacing.xl, marginTop: vScale(16), borderWidth: 1 }} className="bg-slate-100 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800/50 opacity-40">
                        <Text style={{ fontSize: hScale(9), lineHeight: vScale(16) }} className="font-black text-slate-500 text-center uppercase tracking-widest">
                            Changes to vehicle details may trigger a manual audit of your professional documents.
                        </Text>
                    </View>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}
