import { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, StyleSheet, ActivityIndicator, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { useToast } from '@/components/ui/toast';
import { useTheme } from '@/contexts/ThemeContext';
import { useResponsive } from '@/hooks/useResponsive';

const LoginScreen = () => {
    const router = useRouter();
    const { signIn } = useAuth();
    const { toast } = useToast();
    const { theme, isDark } = useTheme();
    const { spacing, fontSize, hScale, vScale } = useResponsive();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const handleLogin = async () => {
        if (!email || !password) {
            toast({
                title: 'Error',
                description: 'Please fill in all fields',
                variant: 'destructive',
            });
            return;
        }

        try {
            setLoading(true);
            await signIn(email, password);
            toast({
                title: 'Welcome back!',
                description: 'You have successfully logged in.',
            });
            router.replace('/');
        } catch (err: any) {
            toast({
                title: 'Login failed',
                description: err.message || 'Login failed. Please check your credentials.',
                variant: 'destructive',
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView className="flex-1 bg-white dark:bg-slate-950">
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                className="flex-1"
            >
                <ScrollView contentContainerStyle={{ flexGrow: 1, padding: spacing.xl }}>
                    <View style={{ marginTop: vScale(40), marginBottom: vScale(40), alignItems: 'center' }}>
                        <View 
                            style={{ 
                                width: hScale(96), 
                                height: hScale(96), 
                                borderRadius: hScale(48) 
                            }} 
                            className="bg-blue-50 dark:bg-blue-900/20 justify-center items-center mb-6"
                        >
                            <Ionicons name="car-sport" size={hScale(50)} color={isDark ? "#60a5fa" : "#2563EB"} />
                        </View>
                        <Text style={{ fontSize: fontSize.xxl }} className="font-black text-slate-900 dark:text-white mb-2">Welcome Back</Text>
                        <Text style={{ fontSize: fontSize.base }} className="text-slate-500 dark:text-slate-400 text-center font-medium">Sign in to continue your journey</Text>
                    </View>

                    <View className="gap-5">
                        <View className="gap-2">
                            <Text style={{ fontSize: fontSize.sm }} className="font-black text-slate-700 dark:text-slate-300 ml-1 uppercase tracking-wider">Email</Text>
                            <View 
                                style={{ height: vScale(56) }}
                                className="flex-row items-center border border-slate-200 dark:border-slate-800 rounded-2xl px-4 bg-slate-50 dark:bg-slate-900/50"
                            >
                                <Ionicons name="mail-outline" size={hScale(20)} color={isDark ? "#94a3b8" : "#6B7280"} style={{ marginRight: 12 }} />
                                <TextInput
                                    value={email}
                                    onChangeText={setEmail}
                                    placeholder="Enter your email"
                                    keyboardType="email-address"
                                    autoCapitalize="none"
                                    style={{ fontSize: fontSize.base }}
                                    className="flex-1 text-slate-900 dark:text-white"
                                    placeholderTextColor={isDark ? "#475569" : "#9CA3AF"}
                                />
                            </View>
                        </View>

                        <View className="gap-2">
                            <Text style={{ fontSize: fontSize.sm }} className="font-black text-slate-700 dark:text-slate-300 ml-1 uppercase tracking-wider">Password</Text>
                            <View 
                                style={{ height: vScale(56) }}
                                className="flex-row items-center border border-slate-200 dark:border-slate-800 rounded-2xl px-4 bg-slate-50 dark:bg-slate-900/50"
                            >
                                <Ionicons name="lock-closed-outline" size={hScale(20)} color={isDark ? "#94a3b8" : "#6B7280"} style={{ marginRight: 12 }} />
                                <TextInput
                                    value={password}
                                    onChangeText={setPassword}
                                    placeholder="Enter your password"
                                    secureTextEntry={!showPassword}
                                    style={{ fontSize: fontSize.base }}
                                    className="flex-1 text-slate-900 dark:text-white"
                                    placeholderTextColor={isDark ? "#475569" : "#9CA3AF"}
                                />
                                <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                                    <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={hScale(20)} color={isDark ? "#94a3b8" : "#6B7280"} />
                                </TouchableOpacity>
                            </View>
                            <TouchableOpacity className="self-end mt-1" onPress={() => router.push('/forgot-password')}>
                                <Text style={{ fontSize: fontSize.sm }} className="text-blue-600 dark:text-blue-400 font-bold">Forgot Password?</Text>
                            </TouchableOpacity>
                        </View>

                        <TouchableOpacity
                            style={{ height: vScale(56) }}
                            className={`bg-blue-600 rounded-2xl justify-center items-center mt-4 shadow-lg shadow-blue-500/20 ${loading ? 'opacity-70' : ''}`}
                            onPress={handleLogin}
                            disabled={loading}
                        >
                            {loading ? (
                                <ActivityIndicator color="white" />
                            ) : (
                                <Text style={{ fontSize: fontSize.lg }} className="text-white font-black uppercase tracking-widest">Sign In</Text>
                            )}
                        </TouchableOpacity>

                        <View className="flex-row justify-center mt-5">
                            <Text style={{ fontSize: fontSize.sm }} className="text-slate-500 dark:text-slate-400 font-medium">Don't have an account? </Text>
                            <TouchableOpacity onPress={() => router.push('/signup')}>
                                <Text style={{ fontSize: fontSize.sm }} className="text-blue-600 dark:text-blue-400 font-bold">Sign Up</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

export default LoginScreen;
