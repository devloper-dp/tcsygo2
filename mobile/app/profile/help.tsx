import React from 'react';
import { View, ScrollView, TouchableOpacity, Linking, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/text';
import { useTheme } from '@/contexts/ThemeContext';
import { Card } from '@/components/ui/card';
 
const FAQ_ITEMS = [
    {
        q: 'How do I book a trip?',
        a: 'Navigate to the Discovery console, input your terminal coordinates, select a matching vessel, and authorize the transaction through our secure gateway.'
    },
    {
        q: 'How do I become a driver?',
        a: 'Elevate your status through the Profile console. Access "Become a Driver" to initiate the professional vetting process and asset registration.'
    },
    {
        q: 'How are payments handled?',
        a: 'We utilize advanced cryptographic payment gateways like Razorpay for all credit/debit, UPI, and wallet transactions in real-time.'
    },
    {
        q: 'Can I cancel my booking?',
        a: 'Operations can be aborted via the "My Bookings" terminal. Note that protocol cancellation fees may apply based on temporal proximity to departure.'
    },
    {
        q: 'How do I contact support?',
        a: 'Our intelligence officers are available 24/7. Reach out via the secure mail or voice channels listed in this interface.'
    },
];
 
export default function HelpSupportScreen() {
    const router = useRouter();
    const { theme, isDark } = useTheme();
 
    return (
        <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-950" edges={['top']}>
            <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
            
            <View className="flex-row items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-sm z-10">
                <TouchableOpacity 
                    onPress={() => router.back()} 
                    className="w-10 h-10 rounded-full bg-slate-50 dark:bg-slate-900 items-center justify-center active:bg-slate-100 dark:active:bg-slate-800"
                >
                    <Ionicons name="arrow-back" size={24} color={isDark ? "#f8fafc" : "#1e293b"} />
                </TouchableOpacity>
                <Text className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Support</Text>
                <View className="w-10" />
            </View>
 
            <ScrollView 
                contentContainerStyle={{ padding: 24, paddingBottom: 100 }}
                showsVerticalScrollIndicator={false}
            >
                <View className="mb-10">
                    <Text className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[2px] mb-6 px-1">Direct Channels</Text>
                    <Card className="bg-white dark:bg-slate-900 rounded-[32px] border border-slate-100 dark:border-slate-800 overflow-hidden shadow-sm">
                        <TouchableOpacity
                            className="flex-row items-center gap-5 p-6 active:bg-slate-50 dark:active:bg-slate-800/50"
                            onPress={() => Linking.openURL('mailto:support@tcsygo.com')}
                        >
                            <View className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-900/20 justify-center items-center">
                                <Ionicons name="mail" size={24} color="#3b82f6" />
                            </View>
                            <View className="flex-1">
                                <Text className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Mail Transmission</Text>
                                <Text className="text-base font-black text-slate-900 dark:text-white uppercase tracking-tighter">support@tcsygo.com</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={20} color={isDark ? "#475569" : "#cbd5e1"} />
                        </TouchableOpacity>
                        
                        <View className="h-[1px] bg-slate-50 dark:bg-slate-800/50 mx-6" />
                        
                        <TouchableOpacity
                            className="flex-row items-center gap-5 p-6 active:bg-slate-50 dark:active:bg-slate-800/50"
                            onPress={() => Linking.openURL('tel:+919876543210')}
                        >
                            <View className="w-14 h-14 rounded-2xl bg-green-50 dark:bg-green-900/20 justify-center items-center">
                                <Ionicons name="call" size={24} color="#22c55e" />
                            </View>
                            <View className="flex-1">
                                <Text className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Voice Terminal</Text>
                                <Text className="text-base font-black text-slate-900 dark:text-white uppercase tracking-tighter">+91 98765 43210</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={20} color={isDark ? "#475569" : "#cbd5e1"} />
                        </TouchableOpacity>
                    </Card>
                </View>
 
                <View className="mb-10">
                    <Text className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[2px] mb-6 px-1">Common Queries</Text>
                    {FAQ_ITEMS.map((item, index) => (
                        <Card key={index} className="bg-white dark:bg-slate-900 rounded-[28px] p-6 mb-4 border border-slate-100 dark:border-slate-800 shadow-sm">
                            <Text className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight mb-2 leading-5">{item.q}</Text>
                            <Text className="text-[11px] font-medium text-slate-500 dark:text-slate-500 leading-5">{item.a}</Text>
                        </Card>
                    ))}
                </View>
 
                <TouchableOpacity 
                    className="bg-slate-900 dark:bg-white h-16 rounded-[24px] items-center justify-center mb-10 shadow-lg shadow-slate-900/10"
                >
                    <Text className="text-white dark:text-slate-900 font-black uppercase tracking-widest">Transmit Feedback</Text>
                </TouchableOpacity>
 
                <View className="px-10 opacity-30 mb-20">
                    <Text className="text-[9px] font-extrabold text-slate-500 text-center uppercase leading-4 tracking-widest">
                        By using the support system, you agree to our terms of service and communications policy.
                    </Text>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}
