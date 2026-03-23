import { View, ScrollView, TouchableOpacity, Alert, Switch, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronRight, ArrowLeft, Globe, Moon, FileText, Shield, LogOut, Trash2 } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useTranslation } from 'react-i18next';
import { LanguageSelector } from '@/components/LanguageSelector';
import { Text } from '@/components/ui/text';
import { Card } from '@/components/ui/card';
import { useResponsive } from '@/hooks/useResponsive';
 
export default function SettingsScreen() {
    const router = useRouter();
    const { signOut } = useAuth();
    const { t } = useTranslation();
    const { theme, setThemeMode, isDark } = useTheme();
    const { hScale, vScale, spacing, fontSize } = useResponsive();
 
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
                    }
                },
            ]
        );
    };
 
    const SettingItem = ({ icon: Icon, label, color = "#64748b", bg = "bg-slate-50 dark:bg-slate-800", children, onPress, danger }: any) => (
        <TouchableOpacity
            style={{ padding: spacing.xl }}
            className="flex-row items-center justify-between active:bg-slate-50 dark:active:bg-slate-800/50"
            onPress={onPress}
            activeOpacity={onPress ? 0.7 : 1}
        >
            <View style={{ gap: spacing.lg }} className="flex-row items-center">
                <View style={{ width: hScale(44), height: hScale(44), borderRadius: hScale(16) }} className={`items-center justify-center ${bg}`}>
                    <Icon size={hScale(22)} color={danger ? "#ef4444" : color} strokeWidth={2.5} />
                </View>
                <Text style={{ fontSize: fontSize.base }} className={`font-bold tracking-tight ${danger ? 'text-red-500' : 'text-slate-900 dark:text-slate-100'}`}>{label}</Text>
            </View>
            <View style={{ gap: spacing.md }} className="flex-row items-center">
                {children}
                {onPress && !children && <ChevronRight size={hScale(18)} color={isDark ? "#334155" : "#cbd5e1"} />}
            </View>
        </TouchableOpacity>
    );
 
    return (
        <View className="flex-1 bg-slate-50 dark:bg-slate-950">
            <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
 
            {/* Header */}
            <View style={{ paddingHorizontal: spacing.xl, paddingVertical: vScale(16), borderBottomWidth: 1 }} className="bg-white dark:bg-slate-950 border-slate-100 dark:border-slate-800 shadow-sm z-10">
                <SafeAreaView edges={['top']} className="flex-row items-center">
                    <TouchableOpacity
                        onPress={() => router.back()}
                        style={{ width: hScale(40), height: hScale(40), marginRight: spacing.lg }}
                        className="rounded-full bg-slate-50 dark:bg-slate-900 items-center justify-center active:bg-slate-100 dark:active:bg-slate-800"
                    >
                        <ArrowLeft size={hScale(24)} color={isDark ? "#f8fafc" : "#1e293b"} />
                    </TouchableOpacity>
                    <Text style={{ fontSize: fontSize.xl }} className="font-black text-slate-900 dark:text-white uppercase tracking-tighter">{t('settings.title')}</Text>
                </SafeAreaView>
            </View>
 
            <ScrollView 
                contentContainerStyle={{ padding: spacing.xl, paddingBottom: vScale(100) }}
                showsVerticalScrollIndicator={false}
            >
                {/* Preferences Section */}
                <View style={{ marginBottom: vScale(32) }}>
                    <Text style={{ fontSize: hScale(10), marginBottom: vScale(16), paddingHorizontal: spacing.xs }} className="font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">{t('settings.preferences')}</Text>
                    <Card style={{ borderRadius: hScale(32), borderWidth: 1 }} className="bg-white dark:bg-slate-900 overflow-hidden border-slate-100 dark:border-slate-800 shadow-sm">
                        <SettingItem icon={Globe} label={t('settings.language')} color="#3b82f6" bg="bg-blue-50 dark:bg-blue-900/20">
                            <LanguageSelector />
                        </SettingItem>
                        <View style={{ height: 1, marginHorizontal: spacing.xl }} className="bg-slate-50 dark:bg-slate-800/50" />
                        <SettingItem icon={Moon} label={t('settings.dark_mode')} color="#8b5cf6" bg="bg-violet-50 dark:bg-violet-900/20">
                            <Switch
                                value={isDark}
                                onValueChange={(val) => setThemeMode(val ? 'dark' : 'light')}
                                trackColor={{ false: isDark ? '#1e293b' : '#e2e8f0', true: '#8b5cf6' }}
                                thumbColor={"#ffffff"}
                            />
                        </SettingItem>
                    </Card>
                </View>
 
                {/* Legal Section */}
                <View style={{ marginBottom: vScale(32) }}>
                    <Text style={{ fontSize: hScale(10), marginBottom: vScale(16), paddingHorizontal: spacing.xs }} className="font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">{t('settings.legal')}</Text>
                    <Card style={{ borderRadius: hScale(32), borderWidth: 1 }} className="bg-white dark:bg-slate-900 overflow-hidden border-slate-100 dark:border-slate-800 shadow-sm">
                        <SettingItem icon={FileText} label={t('settings.terms_of_service')} color="#64748b" bg="bg-slate-50 dark:bg-slate-800" onPress={() => { }} />
                        <View style={{ height: 1, marginHorizontal: spacing.xl }} className="bg-slate-50 dark:bg-slate-800/50" />
                        <SettingItem icon={Shield} label={t('settings.privacy_policy')} color="#64748b" bg="bg-slate-50 dark:bg-slate-800" onPress={() => { }} />
                    </Card>
                </View>
 
                {/* Danger Zone */}
                <View style={{ marginBottom: vScale(32) }}>
                    <Text style={{ fontSize: hScale(10), marginBottom: vScale(16), paddingHorizontal: spacing.xs }} className="font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">{t('settings.danger_zone')}</Text>
                    <Card style={{ borderRadius: hScale(32), borderWidth: 1 }} className="bg-white dark:bg-slate-900 overflow-hidden border-slate-100 dark:border-slate-800 shadow-sm">
                        <SettingItem
                            icon={LogOut}
                            label={t('settings.logout')}
                            danger
                            bg="bg-red-50 dark:bg-red-900/20"
                            onPress={handleSignOut}
                        />
                        <View style={{ height: 1, marginHorizontal: spacing.xl }} className="bg-slate-50 dark:bg-slate-800/50" />
                        <SettingItem
                            icon={Trash2}
                            label={t('settings.delete_account')}
                            danger
                            bg="bg-red-50 dark:bg-red-900/20"
                            onPress={() => {
                                Alert.alert(
                                    'Delete Account',
                                    'This action is permanent and cannot be undone. Are you sure you want to delete your account?',
                                    [
                                        { text: 'Cancel', style: 'cancel' },
                                        {
                                            text: 'Delete',
                                            style: 'destructive',
                                            onPress: () => Alert.alert('Request Sent', 'Your account deletion request has been submitted.')
                                        },
                                    ]
                                );
                            }}
                        />
                    </Card>
                </View>
 
                {/* Version Info */}
                <View style={{ marginTop: vScale(24), marginBottom: vScale(40) }} className="items-center opacity-40">
                    <View style={{ width: hScale(56), height: hScale(56), borderRadius: hScale(16), marginBottom: vScale(16), borderWidth: 1 }} className="bg-slate-200 dark:bg-slate-800 items-center justify-center border-slate-100 dark:border-slate-700">
                        <View style={{ width: hScale(32), height: hScale(32) }} className="bg-slate-400 dark:bg-slate-600 rounded-xl" />
                    </View>
                    <Text style={{ fontSize: fontSize.xs }} className="font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">TCSYGO v1.0.0</Text>
                    <Text style={{ fontSize: hScale(10), marginTop: vScale(4) }} className="font-bold text-slate-400 dark:text-slate-600 uppercase tracking-tighter">Build 2024.102 Premium Edition</Text>
                </View>
 
            </ScrollView>
        </View>
    );
}
