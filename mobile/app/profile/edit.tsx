import React, { useState, useEffect } from 'react';
import { View, ScrollView, TouchableOpacity, Alert, ActivityIndicator, Image, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import { Text } from '@/components/ui/text';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/contexts/ThemeContext';
import { useResponsive } from '@/hooks/useResponsive';
 
export default function EditProfileScreen() {
    const router = useRouter();
    const { user, updateProfile } = useAuth();
    const { t } = useTranslation();
    const { theme, isDark } = useTheme();
    const { hScale, vScale, spacing, fontSize } = useResponsive();
 
    const [fullName, setFullName] = useState(user?.fullName || '');
    const [phone, setPhone] = useState(user?.phone || '');
    const [bio, setBio] = useState('');
    const [loading, setLoading] = useState(false);
 
    useEffect(() => {
        if (user) {
            setFullName(user.fullName || '');
            setPhone(user.phone || '');
        }
    }, [user]);
 
    const handleSave = async () => {
        if (!fullName.trim()) {
            Alert.alert(t('common.error'), t('profile.name_required'));
            return;
        }
 
        try {
            setLoading(true);
            await updateProfile({
                fullName,
                phone,
                bio,
            });
 
            Alert.alert(t('common.success'), t('profile.save_success'), [
                { text: 'OK', onPress: () => router.back() }
            ]);
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to update profile');
        } finally {
            setLoading(false);
        }
    };
 
    return (
        <SafeAreaView className="flex-1 bg-white dark:bg-slate-950">
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
                <Text style={{ fontSize: fontSize.xl }} className="font-black text-slate-900 dark:text-white uppercase tracking-tighter">{t('profile.edit_profile')}</Text>
                <View style={{ width: hScale(40) }} />
            </View>
 
            <ScrollView 
                contentContainerStyle={{ padding: spacing.xl, paddingBottom: vScale(100) }}
                showsVerticalScrollIndicator={false}
            >
                {/* Avatar Section */}
                <View style={{ marginBottom: vScale(40) }} className="items-center">
                    <View style={{ width: hScale(112), height: hScale(112), borderWidth: 4 }} className="rounded-full bg-indigo-500 dark:bg-indigo-600 justify-center items-center shadow-xl shadow-indigo-500/20 border-white dark:border-slate-800 relative overflow-hidden">
                        {user?.profilePhoto ? (
                            <Image source={{ uri: user.profilePhoto }} className="w-full h-full" resizeMode="cover" />
                        ) : (
                            <Text style={{ fontSize: hScale(48) }} className="text-white font-black uppercase tracking-tighter">{fullName?.charAt(0) || 'U'}</Text>
                        )}
 
                        <TouchableOpacity style={{ width: hScale(40), height: hScale(40), borderWidth: 3 }} className="absolute bottom-0 right-0 bg-slate-900 dark:bg-slate-700 rounded-full justify-center items-center border-white dark:border-slate-800 shadow-md">
                            <Ionicons name="camera" size={hScale(18)} color="white" />
                        </TouchableOpacity>
                    </View>
                    <Text style={{ fontSize: hScale(10), marginTop: vScale(16) }} className="font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Change Profile Picture</Text>
                </View>
 
                <View style={{ gap: spacing.lg }}>
                    <View style={{ gap: spacing.xs }}>
                        <Text style={{ fontSize: hScale(10), marginLeft: spacing.xs }} className="font-black text-slate-500 dark:text-slate-500 uppercase tracking-widest">{t('profile.full_name')}</Text>
                        <Input
                            value={fullName}
                            onChangeText={setFullName}
                            placeholder={t('profile.enter_name')}
                            style={{ height: vScale(56), borderRadius: hScale(20), paddingHorizontal: spacing.xl }}
                            className="font-bold text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-900 border-slate-100 dark:border-slate-800 shadow-sm"
                            placeholderTextColor={isDark ? "#475569" : "#94a3b8"}
                        />
                    </View>
 
                    <View style={{ gap: spacing.xs }}>
                        <Text style={{ fontSize: hScale(10), marginLeft: spacing.xs }} className="font-black text-slate-500 dark:text-slate-500 uppercase tracking-widest">{t('profile.email_readonly')}</Text>
                        <Input
                            value={user?.email}
                            editable={false}
                            style={{ height: vScale(56), borderRadius: hScale(20), paddingHorizontal: spacing.xl, borderWidth: 1 }}
                            className="font-bold text-slate-400 dark:text-slate-600 bg-slate-50/50 dark:bg-slate-900/50 border-slate-100 dark:border-slate-800/50"
                        />
                    </View>
 
                    <View style={{ gap: spacing.xs }}>
                        <Text style={{ fontSize: hScale(10), marginLeft: spacing.xs }} className="font-black text-slate-500 dark:text-slate-500 uppercase tracking-widest">{t('profile.phone_number')}</Text>
                        <Input
                            value={phone}
                            onChangeText={setPhone}
                            placeholder={t('profile.enter_phone')}
                            keyboardType="phone-pad"
                            style={{ height: vScale(56), borderRadius: hScale(20), paddingHorizontal: spacing.xl }}
                            className="font-bold text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-900 border-slate-100 dark:border-slate-800 shadow-sm"
                            placeholderTextColor={isDark ? "#475569" : "#94a3b8"}
                        />
                    </View>
 
                    <Button
                        style={{ marginTop: vScale(32), height: vScale(64), borderRadius: hScale(24) }}
                        className="bg-slate-900 dark:bg-white shadow-xl shadow-slate-900/10 dark:shadow-none"
                        onPress={handleSave}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color={isDark ? "#0f172a" : "#fff"} />
                        ) : (
                            <Text style={{ fontSize: fontSize.base }} className="text-white dark:text-slate-900 font-black uppercase tracking-widest">{t('save')}</Text>
                        )}
                    </Button>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}
