import { View, ScrollView, StatusBar, TouchableOpacity } from "react-native";
import { Link, Stack, useLocalSearchParams, useRouter } from "expo-router";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { Check, CheckCircle, ArrowRight, Home } from "lucide-react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "@/contexts/ThemeContext";
import { useResponsive } from "@/hooks/useResponsive";
 
export default function PaymentSuccess() {
    const { bookingId } = useLocalSearchParams();
    const router = useRouter();
    const { theme, isDark } = useTheme();
    const { hScale, vScale, spacing } = useResponsive();
 
    return (
        <View className="flex-1 bg-white dark:bg-slate-950">
            <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
            <Stack.Screen options={{ headerShown: false, gestureEnabled: false }} />
 
            <SafeAreaView style={{ flex: 1, justifyContent: 'space-between', padding: spacing.xl }}>
                <View style={{ alignItems: 'center', marginTop: vScale(48) }}>
                    <View style={{ width: hScale(96), height: hScale(96), borderRadius: hScale(48), borderWidth: 8 }} className="bg-green-500 items-center justify-center shadow-xl shadow-green-500/20 mb-8 border-green-100 dark:border-green-900/30">
                        <Check size={hScale(48)} color="white" strokeWidth={4} />
                    </View>
 
                    <Text style={{ fontSize: hScale(30), marginBottom: vScale(12) }} className="font-black text-slate-900 dark:text-white text-center uppercase tracking-tighter">Payment Successful!</Text>
                    <Text style={{ fontSize: hScale(14), lineHeight: vScale(24), maxWidth: '85%' }} className="text-center text-slate-500 dark:text-slate-400 font-medium">
                        Your booking has been confirmed. Your ride is ready to go!
                    </Text>
 
                    {bookingId && (
                        <View style={{ paddingHorizontal: hScale(24), paddingVertical: vScale(10), borderRadius: hScale(16), marginTop: vScale(32), borderWidth: 1 }} className="bg-slate-50 dark:bg-slate-900 border-slate-100 dark:border-slate-800">
                            <Text style={{ fontSize: hScale(10) }} className="font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-center">Reference: {bookingId.toString().slice(0, 12).toUpperCase()}</Text>
                        </View>
                    )}
                </View>
 
                <View style={{ padding: spacing.xl, borderRadius: hScale(40), borderWidth: 1 }} className="bg-slate-50 dark:bg-slate-900 border-slate-100 dark:border-slate-800/50 shadow-sm">
                    <Text style={{ fontSize: hScale(20), marginBottom: vScale(12) }} className="font-black text-slate-900 dark:text-white uppercase tracking-tight">What's Next?</Text>
                    <Text style={{ fontSize: hScale(14), lineHeight: vScale(24), marginBottom: vScale(32) }} className="text-slate-500 dark:text-slate-400 font-medium">
                        Your driver has been notified and is on their way. We've sent the trip details to your email.
                    </Text>
 
                    <View style={{ gap: spacing.md }}>
                        <Button
                            style={{ height: vScale(64), borderRadius: hScale(24) }}
                            className="bg-slate-900 dark:bg-white shadow-lg shadow-slate-900/10 dark:shadow-none justify-center items-center flex-row"
                            onPress={() => router.push('/trips')}
                        >
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: hScale(12) }}>
                                <Text style={{ fontSize: hScale(14) }} className="text-white dark:text-slate-900 font-black uppercase tracking-widest">View My Trips</Text>
                                <ArrowRight size={hScale(20)} color={isDark ? "#0f172a" : "#fff"} strokeWidth={3} />
                            </View>
                        </Button>
 
                        <Button
                            style={{ height: vScale(64), borderRadius: hScale(24), borderWidth: 1 }}
                            className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 justify-center items-center flex-row"
                            onPress={() => router.push('/')}
                        >
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: hScale(12) }}>
                                <Home size={hScale(20)} color={isDark ? "#94a3b8" : "#64748b"} strokeWidth={2.5} />
                                <Text style={{ fontSize: hScale(14) }} className="text-slate-600 dark:text-slate-400 font-black uppercase tracking-widest">Back to Home</Text>
                            </View>
                        </Button>
                    </View>
                </View>
            </SafeAreaView>
        </View>
    );
}
