import { View, StyleSheet, ScrollView, TouchableOpacity, Image, Alert, ActivityIndicator, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import * as ImagePicker from 'expo-image-picker';
import { decode } from 'base64-arraybuffer';
import { useState } from 'react';
import { ProfileCompletionMobile, AccountDeletionMobile } from '@/components/ProfileComponents';
import { Text } from '@/components/ui/text';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/contexts/ThemeContext';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { StatusBar } from 'react-native';
import { useResponsive } from '@/hooks/useResponsive';

const { width } = Dimensions.get('window');

export default function ProfileScreen() {
    const { user, signOut } = useAuth();
    const { t } = useTranslation();
    const { theme } = useTheme();
    const isDark = theme === 'dark';
    const { hScale, vScale, spacing, fontSize } = useResponsive();
    const router = useRouter();
    const [uploadingPhoto, setUploadingPhoto] = useState(false);

    const { data: driverProfile } = useQuery({
        queryKey: ['driver-profile', user?.id],
        queryFn: async () => {
            if (!user) return null;
            const { data, error } = await supabase
                .from('drivers')
                .select('*')
                .eq('user_id', user.id)
                .single();
            if (error) return null;
            return data;
        },
        enabled: !!user
    });

    const { data: wallet } = useQuery({
        queryKey: ['wallet-balance', user?.id],
        queryFn: async () => {
            if (!user) return null;
            const { data, error } = await supabase
                .from('wallets')
                .select('balance')
                .eq('user_id', user.id)
                .single();
            if (error) return { balance: 0 };
            return data;
        },
        enabled: !!user,
        refetchInterval: 30000, // Refresh every 30s
    });

    const handlePhotoUpload = async () => {
        try {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission needed', 'Please grant camera roll permissions to upload a photo.');
                return;
            }

            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.5,
                base64: true,
            });

            if (result.canceled || !result.assets[0].base64) return;

            setUploadingPhoto(true);

            try {
                const fileExt = result.assets[0].uri.split('.').pop();
                const fileName = `${user?.id}-${Date.now()}.${fileExt}`;
                const filePath = `avatars/${fileName}`;

                const { error: uploadError } = await supabase.storage
                    .from('profile-photos')
                    .upload(filePath, decode(result.assets[0].base64), {
                        contentType: `image/${fileExt}`,
                        upsert: true
                    });

                if (uploadError) throw uploadError;

                const { data } = supabase.storage
                    .from('profile-photos')
                    .getPublicUrl(filePath);

                const { error: updateError } = await supabase
                    .from('users')
                    .update({ profile_photo: data.publicUrl })
                    .eq('id', user?.id);

                if (updateError) throw updateError;

                Alert.alert('Success', 'Profile photo updated successfully!');
                router.replace('/(tabs)/profile');
            } catch (uploadError) {
                console.log('Upload failed, using fallback', uploadError);
                const fallbackUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.fullName || 'User')}&size=200&background=3b82f6&color=fff`;
                const { error: updateError } = await supabase
                    .from('users')
                    .update({ profile_photo: fallbackUrl })
                    .eq('id', user?.id);

                if (!updateError) {
                    Alert.alert('Success', 'Profile photo updated!');
                    router.replace('/(tabs)/profile');
                }
            }
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to upload photo');
        } finally {
            setUploadingPhoto(false);
        }
    };

    const menuGroups = [
        {
            title: t('profile.account'),
            items: [
                { icon: 'person-outline', label: t('profile.edit_profile'), route: '/profile/edit', color: '#4f46e5' },
                ...(driverProfile ? [{ icon: 'cash-outline', label: t('profile.earnings'), route: '/profile/earnings', color: '#10b981' }] : []),
                { icon: 'car-outline', label: t('profile.my_vehicles'), route: '/profile/vehicles', color: '#f59e0b' },
                { icon: 'settings-outline', label: t('profile.ride_preferences'), route: '/profile/preferences', color: '#10b981' },
                { icon: 'wallet-outline', label: t('profile.wallet_payments'), route: '/profile/wallet', color: '#ec4899' },
            ]
        },
        {
            title: t('profile.general'),
            items: [
                { icon: 'gift-outline', label: t('profile.refer_earn'), route: '/profile/referrals', color: '#8b5cf6' },
                { icon: 'bar-chart-outline', label: t('profile.ride_stats'), route: '/profile/stats', color: '#f59e0b' },
                { icon: 'shield-checkmark-outline', label: t('profile.safety_center'), route: '/safety-center', color: '#06b6d4' },
                { icon: 'notifications-outline', label: t('profile.notifications'), route: '/profile/notifications', color: '#6366f1' },
            ]
        },
        {
            title: t('profile.support'),
            items: [
                { icon: 'help-circle-outline', label: t('profile.help_support'), route: '/profile/help', color: '#64748b' },
                { icon: 'settings-outline', label: t('profile.settings'), route: '/profile/settings', color: '#475569' },
            ]
        }
    ];

    if (!user) return null;

    return (
        <View className="flex-1 bg-slate-50 dark:bg-slate-950">
            <StatusBar barStyle="light-content" />
            {/* Header Section */}
            <View style={{ borderBottomLeftRadius: hScale(32), borderBottomRightRadius: hScale(32) }} className="overflow-hidden bg-indigo-600 shadow-lg z-10">
                <LinearGradient
                    colors={['#4338ca', '#312e81']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    className="absolute inset-0"
                />

                {/* Decorative Circles */}
                <View className="absolute -top-20 -right-20 w-64 h-64 bg-white/5 rounded-full blur-3xl" />
                <View className="absolute top-10 -left-10 w-40 h-40 bg-indigo-400/10 rounded-full blur-2xl" />

                <SafeAreaView edges={['top']} style={{ paddingHorizontal: spacing.xl, paddingTop: vScale(8), paddingBottom: vScale(32) }}>
                    <Animated.View
                        entering={FadeInDown.delay(100).springify()}
                        style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: vScale(16) }}
                    >
                        <TouchableOpacity
                            onPress={handlePhotoUpload}
                            disabled={uploadingPhoto}
                            className="relative shadow-xl"
                            activeOpacity={0.9}
                        >
                            <View style={{ width: hScale(96), height: hScale(96), borderWidth: 4 }} className="rounded-full bg-indigo-50 justify-center items-center border-white/20 shadow-inner overflow-hidden">
                                {user.profilePhoto ? (
                                    <Image source={{ uri: user.profilePhoto }} className="w-full h-full" resizeMode="cover" />
                                ) : (
                                    <View className="w-full h-full bg-indigo-100 items-center justify-center">
                                        <Text style={{ fontSize: hScale(36) }} className="text-indigo-600 font-bold">{user.fullName?.charAt(0) || 'U'}</Text>
                                    </View>
                                )}
                                {uploadingPhoto && (
                                    <View className="absolute inset-0 bg-black/40 justify-center items-center">
                                        <ActivityIndicator color="#fff" />
                                    </View>
                                )}
                            </View>
                            <View style={{ width: hScale(32), height: hScale(32), borderWidth: 2 }} className="absolute bottom-0 right-0 rounded-full bg-white justify-center items-center shadow-md border-indigo-50">
                                <Ionicons name="camera" size={hScale(16)} color="#4f46e5" />
                            </View>
                        </TouchableOpacity>

                        <View style={{ flex: 1, marginLeft: hScale(20), justifyContent: 'center' }}>
                            <Text style={{ fontSize: fontSize.xxl, marginBottom: vScale(4) }} className="font-bold text-white shadow-sm">{user.fullName}</Text>
                            <Text style={{ fontSize: fontSize.sm, marginBottom: vScale(12) }} className="text-indigo-200 font-medium">{user.email}</Text>
 
                            {driverProfile ? (
                                <View className="flex-row items-center">
                                    <View style={{ paddingHorizontal: hScale(12), paddingVertical: vScale(4) }} className="flex-row items-center bg-white/20 rounded-full backdrop-blur-md">
                                        <Ionicons name="star" size={hScale(14)} color="#fbbf24" style={{ marginRight: hScale(4) }} />
                                        <Text style={{ fontSize: fontSize.xs }} className="font-bold text-white">{driverProfile?.rating || 'New'}</Text>
                                    </View>
                                    <View style={{ paddingHorizontal: hScale(12), paddingVertical: vScale(4), marginLeft: hScale(8) }} className="flex-row items-center bg-white/10 rounded-full backdrop-blur-md">
                                        <Text style={{ fontSize: fontSize.xs }} className="font-medium text-indigo-100">{driverProfile?.total_trips || 0} {t('profile.trips')}</Text>
                                    </View>
                                </View>
                            ) : (
                                <View style={{ paddingHorizontal: hScale(12), paddingVertical: vScale(4) }} className="flex-row items-center bg-white/10 rounded-full self-start backdrop-blur-md">
                                    <Ionicons name="person" size={hScale(12)} color="#ddd6fe" style={{ marginRight: hScale(6) }} />
                                    <Text style={{ fontSize: fontSize.xs }} className="font-medium text-indigo-100">{t('profile.passenger')}</Text>
                                </View>
                            )}
                        </View>
                    </Animated.View>
                </SafeAreaView>
            </View>

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: vScale(120) }}
                style={{ flex: 1, marginTop: -vScale(24) }}
            >
                <View style={{ paddingHorizontal: spacing.lg, paddingTop: vScale(16) }}>
                    {/* Stats Cards - Floating overlapping header */}
                    <Animated.View
                        entering={FadeInUp.delay(200).springify()}
                        style={{ padding: spacing.lg, marginBottom: vScale(24), borderRadius: hScale(16), borderWidth: 1, marginHorizontal: hScale(4) }}
                        className="flex-row items-center bg-white dark:bg-slate-900 shadow-xl shadow-indigo-100/50 dark:shadow-none border-gray-100 dark:border-slate-800"
                    >
                        <View className="flex-1 items-center">
                            <View style={{ width: hScale(40), height: hScale(40), marginBottom: vScale(8) }} className="rounded-full bg-blue-50 dark:bg-blue-900/20 items-center justify-center">
                                <Ionicons name="car" size={hScale(20)} color="#3b82f6" />
                            </View>
                            <Text style={{ fontSize: fontSize.lg }} className="font-bold text-gray-900 dark:text-white">{driverProfile?.total_trips || 0}</Text>
                            <Text style={{ fontSize: hScale(10) }} className="font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider">{t('profile.trips')}</Text>
                        </View>
                        <View style={{ width: 1, height: vScale(40) }} className="bg-gray-100 dark:bg-slate-800" />
                        <View className="flex-1 items-center">
                            <View style={{ width: hScale(40), height: hScale(40), marginBottom: vScale(8) }} className="rounded-full bg-amber-50 dark:bg-amber-900/20 items-center justify-center">
                                <Ionicons name="star" size={hScale(20)} color="#f59e0b" />
                            </View>
                            <Text style={{ fontSize: fontSize.lg }} className="font-bold text-gray-900 dark:text-white">{driverProfile?.rating || '-'}</Text>
                            <Text style={{ fontSize: hScale(10) }} className="font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider">{t('profile.rating')}</Text>
                        </View>
                        <View style={{ width: 1, height: vScale(40) }} className="bg-gray-100 dark:bg-slate-800" />
                        <TouchableOpacity
                            className="flex-1 items-center"
                            onPress={() => router.push('/profile/wallet')}
                            activeOpacity={0.7}
                        >
                            <View style={{ width: hScale(40), height: hScale(40), marginBottom: vScale(8) }} className="rounded-full bg-green-50 dark:bg-green-900/20 items-center justify-center">
                                <Ionicons name="wallet" size={hScale(20)} color="#10b981" />
                            </View>
                            <Text style={{ fontSize: fontSize.lg }} className="font-bold text-gray-900 dark:text-white">₹{wallet?.balance?.toFixed(0) || '0'}</Text>
                            <Text style={{ fontSize: hScale(10) }} className="font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider">{t('profile.wallet')}</Text>
                        </TouchableOpacity>
                    </Animated.View>

                    {/* Profile Completion */}
                    <Animated.View entering={FadeInDown.delay(300).duration(500)}>
                        <ProfileCompletionMobile
                            user={user as any}
                            isDriver={!!driverProfile}
                            driverProfile={driverProfile}
                        />
                    </Animated.View>

                    {/* Menu Items Grouped */}
                    {menuGroups.map((group, groupIndex) => (
                        <Animated.View
                            key={group.title}
                            entering={FadeInDown.delay(400 + (groupIndex * 100)).duration(500)}
                            style={{ marginBottom: vScale(24) }}
                        >
                            <Text style={{ fontSize: hScale(10), marginBottom: vScale(12), marginLeft: hScale(8) }} className="font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest">{group.title}</Text>
                            <View style={{ borderRadius: hScale(16), borderWidth: 1 }} className="bg-white dark:bg-slate-900 overflow-hidden shadow-sm border-gray-100 dark:border-slate-800">
                                {group.items.map((item: any, index: number) => (
                                    <TouchableOpacity
                                        key={index}
                                        style={{ padding: spacing.lg, borderBottomWidth: index !== group.items.length - 1 ? 1 : 0 }}
                                        className={`flex-row justify-between items-center active:bg-gray-50 dark:active:bg-slate-800 border-gray-50 dark:border-slate-800`}
                                        onPress={() => router.push(item.route)}
                                        activeOpacity={0.7}
                                    >
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.lg }}>
                                            <View style={{ width: hScale(40), height: hScale(40), borderRadius: hScale(12) }} className="justify-center items-center bg-gray-50 dark:bg-slate-800" >
                                                <Ionicons name={item.icon} size={hScale(20)} color={item.color} />
                                            </View>
                                            <Text style={{ fontSize: fontSize.base }} className="font-semibold text-gray-700 dark:text-slate-200">{item.label}</Text>
                                        </View>
                                        <View className="flex-row items-center">
                                            {/* Optional: Add badges here if needed */}
                                            <Ionicons name="chevron-forward" size={hScale(18)} color={isDark ? "#334155" : "#e2e8f0"} />
                                        </View>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </Animated.View>
                    ))}

                    <Animated.View entering={FadeInDown.delay(700).duration(500)} style={{ marginBottom: vScale(16) }}>
                        <AccountDeletionMobile
                            onDelete={() => {
                                Alert.alert(
                                    'Confirm Deletion',
                                    'Are you sure you want to delete your account? This action is permanent.',
                                    [
                                        { text: 'Cancel', style: 'cancel' },
                                        {
                                            text: 'Delete',
                                            style: 'destructive',
                                            onPress: async () => Alert.alert('Deleted', 'Account deletion initiated')
                                        }
                                    ]
                                );
                            }}
                        />
                    </Animated.View>

                    <Animated.View entering={FadeInDown.delay(800).duration(500)}>
                        <TouchableOpacity
                            style={{ padding: spacing.lg, borderRadius: hScale(16), borderWidth: 1 }}
                            className="flex-row items-center justify-center bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-800 shadow-sm active:bg-gray-50 dark:active:bg-slate-800"
                            onPress={signOut}
                            activeOpacity={0.7}
                        >
                            <Ionicons name="log-out-outline" size={hScale(20)} color="#ef4444" style={{ marginRight: hScale(8) }} />
                            <Text style={{ fontSize: fontSize.sm }} className="font-bold text-red-500">{t('settings.logout')}</Text>
                        </TouchableOpacity>
                        <Text style={{ fontSize: hScale(10), marginTop: vScale(24), marginBottom: vScale(32) }} className="text-center text-gray-300 dark:text-slate-600">Version 1.0.0 • Build 2024.1</Text>
                    </Animated.View>

                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    // Keep any necessary styles here if Tailwind defaults aren't enough
});



