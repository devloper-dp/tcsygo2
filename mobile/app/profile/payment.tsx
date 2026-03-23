import React, { useState, useCallback } from 'react';
import { View, ScrollView, TouchableOpacity, ActivityIndicator, Alert, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Text } from '@/components/ui/text';
import { useTheme } from '@/contexts/ThemeContext';
import { Card } from '@/components/ui/card';
 
export default function PaymentMethodsScreen() {
    const router = useRouter();
    const { user } = useAuth();
    const { theme, isDark, colors } = useTheme();
    const [loading, setLoading] = useState(true);
    const [transactions, setTransactions] = useState<any[]>([]);
    const [walletBalance, setWalletBalance] = useState<number>(0);
    const [paymentMethods, setPaymentMethods] = useState<any[]>([]);
 
    useFocusEffect(
        useCallback(() => {
            if (user) {
                fetchWalletBalance();
                fetchTransactions();
                fetchPaymentMethods();
            }
        }, [user])
    );
 
    const fetchPaymentMethods = async () => {
        try {
            const { data, error } = await supabase
                .from('payment_methods')
                .select('*')
                .eq('user_id', user?.id)
                .order('is_default', { ascending: false });
 
            if (data) {
                setPaymentMethods(data);
            }
        } catch (error) {
            console.error('Error fetching payment methods:', error);
        }
    };
 
    const fetchWalletBalance = async () => {
        try {
            const { data, error } = await supabase
                .from('wallets')
                .select('balance')
                .eq('user_id', user?.id)
                .single();
 
            if (data) {
                setWalletBalance(data.balance);
            } else if (error && error.code === 'PGRST116') {
                await supabase.from('wallets').insert({ user_id: user?.id, balance: 0 });
                setWalletBalance(0);
            }
        } catch (error) {
            console.error('Error fetching wallet:', error);
        }
    };
 
    const fetchTransactions = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('payments')
                .select(`
                    *,
                    booking:bookings(
                        id,
                        trip:trips(
                            pickupLocation,
                            dropLocation
                        )
                    )
                `)
                .order('created_at', { ascending: false });
 
            if (data) {
                setTransactions(data);
            }
        } catch (error) {
            console.error('Error fetching transactions:', error);
        } finally {
            setLoading(false);
        }
    };
 
    return (
        <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-950" edges={['top']}>
            <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
            
            {/* Header */}
            <View className="flex-row items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-sm z-10">
                <TouchableOpacity 
                    onPress={() => router.back()} 
                    className="w-10 h-10 rounded-full bg-slate-50 dark:bg-slate-900 items-center justify-center active:bg-slate-100 dark:active:bg-slate-800"
                >
                    <Ionicons name="arrow-back" size={24} color={isDark ? "#f8fafc" : "#1e293b"} />
                </TouchableOpacity>
                <Text className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Payments</Text>
                <View className="w-10" />
            </View>
 
            <ScrollView 
                contentContainerStyle={{ padding: 24, paddingBottom: 100 }}
                showsVerticalScrollIndicator={false}
            >
                {/* Wallet Balance Card */}
                <Card className="bg-slate-900 dark:bg-white p-6 rounded-[32px] flex-row justify-between items-center mb-8 shadow-xl shadow-slate-900/10 dark:shadow-none relative overflow-hidden">
                    <View className="absolute top-0 right-0 w-32 h-32 bg-white/5 dark:bg-slate-100/50 rounded-full -mr-16 -mt-16" />
                    <View>
                        <Text className="text-slate-400 dark:text-slate-500 text-[10px] font-black uppercase tracking-widest mb-1">TCSYGO WALLET</Text>
                        <Text className="text-white dark:text-slate-900 text-3xl font-black uppercase tracking-tighter">₹{walletBalance.toFixed(2)}</Text>
                    </View>
                    <TouchableOpacity
                        className="bg-blue-500 dark:bg-slate-900 flex-row items-center px-6 py-3 rounded-[20px] gap-2 shadow-lg shadow-blue-500/20 dark:shadow-none"
                        onPress={() => router.push('/profile/wallet')}
                    >
                        <Ionicons name="add" size={20} color="#fff" strokeWidth={3} />
                        <Text className="text-white font-black uppercase tracking-widest text-xs">Top Up</Text>
                    </TouchableOpacity>
                </Card>
 
                <View className="flex-row justify-between items-center mb-4 px-1">
                    <Text className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Saved Methods</Text>
                </View>
                
                <View className="bg-white dark:bg-slate-900 rounded-[32px] overflow-hidden border border-slate-100 dark:border-slate-800 shadow-sm mb-10">
                    {paymentMethods.length > 0 ? (
                        paymentMethods.map((method, index) => (
                            <TouchableOpacity 
                                key={method.id} 
                                className={`flex-row items-center justify-between p-5 ${index !== paymentMethods.length - 1 ? 'border-b border-slate-50 dark:border-slate-800/50' : ''}`}
                            >
                                <View className="flex-row items-center gap-4">
                                    <View className="w-11 h-11 rounded-2xl bg-slate-50 dark:bg-slate-800 items-center justify-center">
                                        <Ionicons
                                            name={method.type === 'card' ? 'card-outline' : 'qr-code-outline'}
                                            size={22}
                                            color={isDark ? "#f8fafc" : "#4b5563"}
                                        />
                                    </View>
                                    <View>
                                        <Text className="text-base font-bold text-slate-800 dark:text-slate-200 tracking-tight">
                                            {method.type === 'card'
                                                ? `${method.card_brand?.toUpperCase() || 'Card'} ending in ${method.last_four}`
                                                : 'UPI Payment'}
                                        </Text>
                                        {method.is_default && (
                                            <Text className="text-[10px] text-green-600 dark:text-green-500 font-black uppercase tracking-widest mt-1">Primary Method</Text>
                                        )}
                                    </View>
                                </View>
                                <Ionicons name="chevron-forward" size={18} color={isDark ? "#334155" : "#cbd5e1"} />
                            </TouchableOpacity>
                        ))
                    ) : (
                        <View className="p-8 items-center bg-slate-50/50 dark:bg-slate-900/50">
                            <Text className="text-xs font-bold text-slate-400 dark:text-slate-600 uppercase tracking-widest text-center">No saved payment methods</Text>
                        </View>
                    )}
                    <TouchableOpacity
                        className="flex-row items-center justify-center gap-3 p-5 bg-blue-50/30 dark:bg-blue-900/10 border-t border-slate-50 dark:border-slate-800"
                        onPress={() => router.push('/profile/add-payment-method')}
                    >
                        <Ionicons name="add-circle" size={24} color={isDark ? "#60a5fa" : "#3b82f6"} />
                        <Text className="text-sm font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest">Connect New Method</Text>
                    </TouchableOpacity>
                </View>
 
                <View className="flex-row justify-between items-center mb-6 px-1">
                    <Text className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Transaction History</Text>
                </View>
 
                {loading ? (
                    <View className="py-10 items-center">
                        <ActivityIndicator color={isDark ? "#fff" : "#3b82f6"} />
                    </View>
                ) : transactions.length > 0 ? (
                    <View className="gap-4">
                        {transactions.map((item) => (
                            <View key={item.id} className="bg-white dark:bg-slate-900 rounded-[28px] border border-slate-100 dark:border-slate-800 overflow-hidden shadow-sm">
                                <View className="flex-row justify-between items-center p-5">
                                    <View className="flex-row items-center flex-1 gap-4">
                                        <View className={`w-12 h-12 rounded-2xl ${item.status === 'completed' ? 'bg-green-50 dark:bg-green-900/20' : 'bg-amber-50 dark:bg-amber-900/20'} justify-center items-center`}>
                                            <Ionicons name="cash-outline" size={22} color={item.status === 'completed' ? '#16a34a' : '#d97706'} />
                                        </View>
                                        <View className="flex-1 pr-2">
                                            <Text className="text-sm font-bold text-slate-800 dark:text-slate-200 tracking-tight" numberOfLines={1}>
                                                {item.booking?.trip?.pickupLocation} to {item.booking?.trip?.dropLocation}
                                            </Text>
                                            <Text className="text-[10px] font-black text-slate-400 dark:text-slate-500 mt-1 uppercase tracking-widest">
                                                {new Date(item.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                                            </Text>
                                        </View>
                                    </View>
                                    <View className="items-end">
                                        <Text className="text-base font-black text-slate-900 dark:text-white uppercase tracking-tighter">₹{item.amount}</Text>
                                        <Text className={`text-[9px] font-black uppercase mt-1 px-2 py-0.5 rounded-md ${item.status === 'completed' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'}`}>
                                            {item.status}
                                        </Text>
                                    </View>
                                </View>
                            </View>
                        ))}
                    </View>
                ) : (
                    <View className="items-center justify-center py-16 gap-4 opacity-30">
                        <Ionicons name="receipt-outline" size={64} color={isDark ? "#94a3b8" : "#cbd5e1"} />
                        <Text className="text-xs font-black text-slate-400 dark:text-slate-600 uppercase tracking-widest text-center">No transaction records</Text>
                    </View>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}
