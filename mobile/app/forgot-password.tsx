import { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, SafeAreaView } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/contexts/ThemeContext';
import { useResponsive } from '@/hooks/useResponsive';
 
export default function ForgotPasswordScreen() {
    const router = useRouter();
    const { resetPassword } = useAuth();
    const { theme, isDark, colors } = useTheme();
    const { hScale, vScale, spacing, fontSize } = useResponsive();
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [sent, setSent] = useState(false);
 
    const handleSubmit = async () => {
        if (!email) return;
 
        setLoading(true);
        try {
            await resetPassword(email);
            setSent(true);
        } catch (error) {
            console.error('Password reset error:', error);
        } finally {
            setLoading(false);
        }
    };
 
    if (sent) {
        return (
            <SafeAreaView className="flex-1 bg-white dark:bg-slate-950">
                <View style={{ paddingHorizontal: spacing.lg, paddingVertical: vScale(12), borderBottomWidth: 1 }} className="border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-950">
                    <TouchableOpacity onPress={() => router.back()} style={{ padding: spacing.xs }}>
                        <Ionicons name="arrow-back" size={hScale(24)} color={isDark ? "#f8fafc" : "#1f2937"} />
                    </TouchableOpacity>
                </View>
 
                <View style={{ padding: spacing.xl }} className="items-center flex-1 justify-center">
                    <View style={{ width: hScale(96), height: hScale(96), borderRadius: hScale(48), marginBottom: vScale(24), borderWidth: 1 }} className="bg-blue-100 dark:bg-blue-900/20 justify-center items-center border-blue-200 dark:border-blue-800/50">
                        <Ionicons name="mail-outline" size={hScale(48)} color={isDark ? "#60a5fa" : "#3b82f6"} />
                    </View>
 
                    <Text style={{ fontSize: fontSize.xxl, marginBottom: vScale(8) }} className="font-black text-slate-900 dark:text-white text-center">Check your email</Text>
                    <Text style={{ fontSize: fontSize.base, marginBottom: vScale(32), lineHeight: vScale(24) }} className="text-slate-500 dark:text-slate-400 text-center font-medium">
                        We've sent a password reset link to <Text style={{ color: colors.primary }} className="font-bold">{email}</Text>
                    </Text>
 
                    <Button
                        onPress={() => router.push('/login')}
                        variant="outline"
                        style={{ width: '100%', height: vScale(56), borderRadius: hScale(16), borderWidth: 1 }}
                        className="border-slate-200 dark:border-slate-800"
                    >
                        <Text style={{ color: colors.primary, fontSize: fontSize.sm }} className="font-black uppercase tracking-widest">Back to login</Text>
                    </Button>
                </View>
            </SafeAreaView>
        );
    }
 
    return (
        <SafeAreaView className="flex-1 bg-white dark:bg-slate-950">
            <View style={{ paddingHorizontal: spacing.lg, paddingVertical: vScale(12), borderBottomWidth: 1 }} className="border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-950">
                <TouchableOpacity onPress={() => router.back()} style={{ padding: spacing.xs }}>
                    <Ionicons name="arrow-back" size={hScale(24)} color={isDark ? "#f8fafc" : "#1f2937"} />
                </TouchableOpacity>
            </View>
 
            <ScrollView className="flex-1" contentContainerStyle={{ padding: spacing.xl, alignItems: 'center' }}>
                <Text style={{ fontSize: fontSize.xxl, marginBottom: vScale(8) }} className="font-black text-slate-900 dark:text-white text-center">Reset your password</Text>
                <Text style={{ fontSize: fontSize.base, marginBottom: vScale(32), lineHeight: vScale(24) }} className="text-slate-500 dark:text-slate-400 text-center font-medium">
                    Enter your email address and we'll send you a link to reset your password
                </Text>
 
                <View style={{ width: '100%', gap: spacing.xl }}>
                    <View style={{ gap: spacing.sm }}>
                        <Text style={{ fontSize: fontSize.sm, marginLeft: spacing.xs }} className="font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider">Email</Text>
                        <Input
                            placeholder="your@email.com"
                            value={email}
                            onChangeText={setEmail}
                            keyboardType="email-address"
                            autoCapitalize="none"
                            editable={!loading}
                            style={{ height: vScale(56), borderWidth: 1 }}
                            className="bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800"
                        />
                    </View>
 
                    <Button
                        onPress={handleSubmit}
                        disabled={!email || loading}
                        style={{ width: '100%', height: vScale(56), borderRadius: hScale(16), marginTop: vScale(8) }}
                        className="shadow-lg shadow-blue-500/20"
                    >
                        <Text style={{ fontSize: fontSize.sm }} className="text-white font-black uppercase tracking-widest">{loading ? 'Sending...' : 'Send reset link'}</Text>
                    </Button>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}
