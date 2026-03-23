import { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, SafeAreaView } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { useToast } from '@/components/ui/toast';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/contexts/ThemeContext';
import { useResponsive } from '@/hooks/useResponsive';

const SignupScreen = () => {
    const router = useRouter();
    const { signUp } = useAuth();
    const { toast } = useToast();
    const { theme, isDark } = useTheme();
    const { spacing, fontSize, hScale, vScale } = useResponsive();

    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [phone, setPhone] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSignup = async () => {
        if (!fullName || !email || !password) {
            toast({
                title: 'Error',
                description: 'Please fill in all required fields',
                variant: 'destructive',
            });
            return;
        }

        if (password.length < 6) {
            toast({
                title: 'Invalid password',
                description: 'Password must be at least 6 characters long',
                variant: 'destructive',
            });
            return;
        }

        try {
            setLoading(true);
            await signUp(email, password, fullName, phone);

            toast({
                title: 'Account created!',
                description: 'Welcome to TCSYGO. Please check your email for verification.',
            });
            router.replace('/');
        } catch (err: any) {
            toast({
                title: 'Signup failed',
                description: err.message || 'Signup failed. Please try again.',
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
                    <TouchableOpacity
                        style={{ width: hScale(40), height: hScale(40), marginBottom: vScale(32) }}
                        className="rounded-full bg-slate-50 dark:bg-slate-900 items-center justify-center border border-slate-100 dark:border-slate-800"
                        onPress={() => router.canGoBack() && router.back()}
                    >
                        <Ionicons name="arrow-back" size={hScale(24)} color={isDark ? "#f8fafc" : "#1f2937"} />
                    </TouchableOpacity>

                    <View style={{ marginBottom: vScale(40) }}>
                        <Text style={{ fontSize: fontSize.xxl }} className="font-black text-slate-900 dark:text-white mb-2">Create Account</Text>
                        <Text style={{ fontSize: fontSize.base }} className="text-slate-500 dark:text-slate-400 font-medium">Join the TCSYGO community today</Text>
                    </View>

                    <View className="gap-5">
                        <View className="gap-2">
                            <Text style={{ fontSize: fontSize.sm }} className="font-black text-slate-700 dark:text-slate-300 ml-1 uppercase tracking-wider">Full Name</Text>
                            <View 
                                style={{ height: vScale(56) }}
                                className="flex-row items-center border border-slate-200 dark:border-slate-800 rounded-2xl px-4 bg-slate-50 dark:bg-slate-900/50"
                            >
                                <Ionicons name="person-outline" size={hScale(20)} color={isDark ? "#94a3b8" : "#6b7280"} style={{ marginRight: 12 }} />
                                <Input
                                    className="flex-1 text-slate-900 dark:text-white border-0 h-full bg-transparent"
                                    style={{ fontSize: fontSize.base }}
                                    placeholder="John Doe"
                                    value={fullName}
                                    onChangeText={setFullName}
                                    placeholderTextColor={isDark ? "#475569" : "#9CA3AF"}
                                />
                            </View>
                        </View>

                        <View className="gap-2">
                            <Text style={{ fontSize: fontSize.sm }} className="font-black text-slate-700 dark:text-slate-300 ml-1 uppercase tracking-wider">Email Address</Text>
                            <View 
                                style={{ height: vScale(56) }}
                                className="flex-row items-center border border-slate-200 dark:border-slate-800 rounded-2xl px-4 bg-slate-50 dark:bg-slate-900/50"
                            >
                                <Ionicons name="mail-outline" size={hScale(20)} color={isDark ? "#94a3b8" : "#6b7280"} style={{ marginRight: 12 }} />
                                <Input
                                    className="flex-1 text-slate-900 dark:text-white border-0 h-full bg-transparent"
                                    style={{ fontSize: fontSize.base }}
                                    placeholder="your@email.com"
                                    value={email}
                                    onChangeText={setEmail}
                                    autoCapitalize="none"
                                    keyboardType="email-address"
                                    placeholderTextColor={isDark ? "#475569" : "#9CA3AF"}
                                />
                            </View>
                        </View>

                        <View className="gap-2">
                            <Text style={{ fontSize: fontSize.sm }} className="font-black text-slate-700 dark:text-slate-300 ml-1 uppercase tracking-wider">Phone Number (Optional)</Text>
                            <View 
                                style={{ height: vScale(56) }}
                                className="flex-row items-center border border-slate-200 dark:border-slate-800 rounded-2xl px-4 bg-slate-50 dark:bg-slate-900/50"
                            >
                                <Ionicons name="call-outline" size={hScale(20)} color={isDark ? "#94a3b8" : "#6b7280"} style={{ marginRight: 12 }} />
                                <Input
                                    className="flex-1 text-slate-900 dark:text-white border-0 h-full bg-transparent"
                                    style={{ fontSize: fontSize.base }}
                                    placeholder="+91 98765 43210"
                                    value={phone}
                                    onChangeText={setPhone}
                                    keyboardType="phone-pad"
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
                                <Ionicons name="lock-closed-outline" size={hScale(20)} color={isDark ? "#94a3b8" : "#6b7280"} style={{ marginRight: 12 }} />
                                <Input
                                    className="flex-1 text-slate-900 dark:text-white border-0 h-full bg-transparent"
                                    style={{ fontSize: fontSize.base }}
                                    placeholder="••••••••"
                                    value={password}
                                    onChangeText={setPassword}
                                    secureTextEntry
                                    placeholderTextColor={isDark ? "#475569" : "#9CA3AF"}
                                />
                            </View>
                            <Text style={{ fontSize: hScale(10) }} className="text-slate-400 dark:text-slate-500 ml-1 uppercase font-black tracking-widest">
                                Must be at least 6 characters long
                            </Text>
                        </View>

                        <Text style={{ fontSize: fontSize.xs, marginTop: spacing.sm, paddingHorizontal: spacing.xxl }} className="text-center text-slate-500 dark:text-slate-400 leading-5 font-medium">
                            By signing up, you agree to our{' '}
                            <Text className="text-blue-500 dark:text-blue-400 font-bold">Terms of Service</Text> and{' '}
                            <Text className="text-blue-500 dark:text-blue-400 font-bold">Privacy Policy</Text>.
                        </Text>

                        <Button
                            onPress={handleSignup}
                            isLoading={loading}
                            style={{ height: vScale(56), marginTop: spacing.base }}
                            className="rounded-2xl shadow-lg shadow-blue-500/20"
                        >
                            <Text style={{ fontSize: fontSize.lg }} className="font-black text-white uppercase tracking-widest">Create Account</Text>
                        </Button>
                    </View>

                    <View style={{ marginTop: 'auto', paddingTop: spacing.xxl }} className="flex-row justify-center">
                        <Text style={{ fontSize: fontSize.sm }} className="text-slate-500 dark:text-slate-400 font-medium">Already have an account? </Text>
                        <TouchableOpacity onPress={() => router.push('/login' as any)}>
                            <Text style={{ fontSize: fontSize.sm }} className="text-blue-600 dark:text-blue-400 font-bold">Sign In</Text>
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

export default SignupScreen;
