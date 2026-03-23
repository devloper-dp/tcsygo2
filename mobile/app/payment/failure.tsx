import React from 'react';
import { View, TouchableOpacity, StatusBar } from 'react-native';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { AlertCircle, RefreshCcw, X } from 'lucide-react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import Animated, { FadeIn, SlideInUp } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/contexts/ThemeContext';
import { useResponsive } from '@/hooks/useResponsive';
 
export default function PaymentFailureScreen() {
    const router = useRouter();
    const { bookingId, error } = useLocalSearchParams();
    const { theme, isDark } = useTheme();
    const { hScale, vScale, spacing } = useResponsive();
 
    return (
        <View className="flex-1 bg-red-50 dark:bg-slate-950">
            <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={isDark ? "#020617" : "#fef2f2"} />
            <SafeAreaView style={{ flex: 1, justifyContent: 'center', padding: spacing.xl }}>
 
                <Animated.View entering={SlideInUp} style={{ padding: spacing.xl, borderRadius: hScale(40), alignItems: 'center', borderWidth: 1 }} className="bg-white dark:bg-slate-900 shadow-2xl shadow-red-500/10 border-slate-100 dark:border-slate-800">
                    <View style={{ width: hScale(96), height: hScale(96), borderRadius: hScale(48), borderWidth: 8, marginBottom: vScale(32) }} className="bg-red-100 dark:bg-red-900/20 items-center justify-center border-red-50 dark:border-red-900/10">
                        <X size={hScale(48)} color="#ef4444" strokeWidth={4} />
                    </View>
 
                    <Text style={{ fontSize: hScale(30), marginBottom: vScale(12) }} className="font-black text-slate-900 dark:text-white text-center uppercase tracking-tighter">Payment Failed</Text>
                    <Text style={{ fontSize: hScale(14), lineHeight: vScale(24), marginBottom: vScale(40), paddingHorizontal: hScale(8) }} className="text-center text-slate-500 dark:text-slate-400 font-medium">
                        We couldn't process your payment. Please try again or use a different payment method.
                        {error ? `\n\nError: ${error}` : ''}
                    </Text>
 
                    <Button
                        style={{ width: '100%', height: vScale(64), borderRadius: hScale(24), marginBottom: vScale(16) }}
                        className="bg-red-500 shadow-xl shadow-red-500/20 flex-row justify-center items-center"
                        onPress={() => router.replace(`/payment/${bookingId}`)}
                    >
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: hScale(12) }}>
                            <RefreshCcw size={hScale(20)} color="white" strokeWidth={3} />
                            <Text style={{ fontSize: hScale(14) }} className="text-white font-black uppercase tracking-widest">Try Again</Text>
                        </View>
                    </Button>
 
                    <TouchableOpacity
                        style={{ paddingVertical: vScale(16), marginTop: vScale(8) }}
                        onPress={() => router.replace('/')}
                    >
                        <Text style={{ fontSize: hScale(10) }} className="text-slate-400 dark:text-slate-600 font-black uppercase tracking-widest">Cancel & Go Home</Text>
                    </TouchableOpacity>
                </Animated.View>
            </SafeAreaView>
        </View>
    );
}
