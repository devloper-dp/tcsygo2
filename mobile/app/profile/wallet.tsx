import React, { useState, useEffect } from 'react';
import { View, ScrollView, TouchableOpacity, ActivityIndicator, Alert, RefreshControl, StatusBar, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { PaymentService, WalletBalance, WalletTransaction } from '@/services/PaymentService';
import { useTheme } from '@/contexts/ThemeContext';
import { useResponsive } from '@/hooks/useResponsive';
 
export default function WalletScreen() {
    const router = useRouter();
    const { user } = useAuth();
    const { theme, isDark, colors } = useTheme();
    const { hScale, vScale, mScale, spacing, fontSize } = useResponsive();
    const [balance, setBalance] = useState<WalletBalance | null>(null);
    const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [autoTopUp, setAutoTopUp] = useState(false);
    const [threshold, setThreshold] = useState(500);
    const [topUpAmount, setTopUpAmount] = useState(1000);
 
    useEffect(() => {
        if (user) {
            fetchWalletData();
        }
    }, [user]);
 
    const fetchWalletData = async () => {
        if (!user) return;
        setLoading(true);
        try {
            const [bal, txs] = await Promise.all([
                PaymentService.getWalletBalance(user.id),
                PaymentService.getWalletTransactions(user.id)
            ]);
            setBalance(bal);
            setTransactions(txs);
 
            const { data: settings } = await supabase
                .from('auto_pay_settings')
                .select('*')
                .eq('user_id', user.id)
                .single();
 
            if (settings) {
                setAutoTopUp(settings.enabled);
                setThreshold(settings.threshold || 500);
                setTopUpAmount(settings.top_up_amount || 1000);
            }
        } catch (error) {
            console.error('Error fetching wallet data:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };
 
    const handleToggleAutoTopUp = async () => {
        if (!user) return;
        const newState = !autoTopUp;
        setAutoTopUp(newState);
        try {
            const { error } = await supabase
                .from('auto_pay_settings')
                .upsert({
                    user_id: user.id,
                    enabled: newState,
                    threshold,
                    top_up_amount: topUpAmount,
                    default_payment_method: 'card'
                });
            if (error) throw error;
        } catch (error) {
            Alert.alert("Error", "Failed to update auto top-up settings");
            setAutoTopUp(!newState);
        }
    };
 
    const onRefresh = () => {
        setRefreshing(true);
        fetchWalletData();
    };
 
    const handleAddMoney = () => {
        Alert.prompt(
            "Add Money",
            "Enter amount to add to your wallet (₹)",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Add",
                    onPress: async (amount: string | undefined) => {
                        if (!amount || isNaN(Number(amount))) {
                            Alert.alert("Invalid Amount", "Please enter a valid number");
                            return;
                        }
                        const numAmount = Number(amount);
                        try {
                            setLoading(true);
 
                            const orderData = await PaymentService.createOrder(numAmount, 'INR', `wallet_${Date.now()}`);
 
                            const RazorpayCheckout = (await import('react-native-razorpay')).default;
                            const options = {
                                description: 'Wallet Recharge',
                                image: 'https://tcsygo.app/logo.png',
                                currency: 'INR',
                                key: process.env.EXPO_PUBLIC_RAZORPAY_KEY_ID,
                                amount: orderData.amount,
                                name: 'TCSYGO',
                                order_id: orderData.id,
                                prefill: {
                                    email: user?.email || '',
                                    contact: user?.phone || '',
                                    name: user?.fullName || 'Passenger'
                                },
                                theme: { color: isDark ? '#ffffff' : '#3b82f6' }
                            };
 
                            RazorpayCheckout.open(options).then(async (data: any) => {
                                const result = await PaymentService.addMoneyToWallet(user!.id, numAmount, data.razorpay_payment_id);
 
                                if (result) {
                                    Alert.alert("Success", `₹${numAmount} added to your wallet!`);
                                    fetchWalletData();
                                } else {
                                    throw new Error("Failed to add money");
                                }
                            }).catch((error: any) => {
                                console.error('Razorpay Error:', error);
                                Alert.alert(`Error: ${error.code}`, error.description);
                            });
 
                        } catch (error: any) {
                            Alert.alert("Error", error.message || "Failed to add money");
                        } finally {
                            setLoading(false);
                        }
                    }
                }
            ],
            "plain-text",
            "",
            "number-pad"
        );
    };
 
    if (loading && !refreshing) {
        return (
            <SafeAreaView style={{ gap: spacing.lg }} className="flex-1 bg-white dark:bg-slate-950 justify-center items-center">
                <ActivityIndicator size="large" color={isDark ? "#ffffff" : "#3b82f6"} />
                <Text style={{ fontSize: hScale(10) }} className="text-slate-500 dark:text-slate-500 font-black uppercase tracking-widest">Accessing Secure Wallet...</Text>
            </SafeAreaView>
        );
    }
 
    return (
        <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-950" edges={['top']}>
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
                <Text style={{ fontSize: fontSize.xl }} className="font-black text-slate-900 dark:text-white uppercase tracking-tighter">My Wallet</Text>
                <View style={{ width: hScale(40) }} />
            </View>
 
            <ScrollView
                style={{ flex: 1, paddingHorizontal: spacing.xl, paddingTop: spacing.xl }}
                contentContainerStyle={{ paddingBottom: vScale(100) }}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={isDark ? "#fff" : "#3b82f6"} />}
                showsVerticalScrollIndicator={false}
            >
                {/* Wallet Balance Card */}
                <Card style={{ padding: spacing.xxl, borderRadius: hScale(40), marginBottom: vScale(32) }} className="bg-slate-900 dark:bg-white items-center shadow-xl shadow-slate-900/10 dark:shadow-none relative overflow-hidden">
                    <View style={{ width: hScale(128), height: hScale(128), marginRight: hScale(-64), marginTop: vScale(-64) }} className="absolute top-0 right-0 bg-white/5 dark:bg-slate-100/50 rounded-full" />
                    <Text style={{ fontSize: hScale(10), letterSpacing: 4 }} className="text-slate-400 dark:text-slate-500 font-black uppercase">Verified Balance</Text>
                    <Text style={{ fontSize: hScale(48), marginTop: vScale(12) }} className="text-white dark:text-slate-900 font-black uppercase tracking-tighter">₹{balance?.balance.toFixed(2) || '0.00'}</Text>
                    
                    <TouchableOpacity
                        onPress={handleAddMoney}
                        style={{ marginTop: vScale(32), height: vScale(64), borderRadius: hScale(24), gap: spacing.md }}
                        className="w-full bg-blue-500 dark:bg-slate-900 flex-row items-center justify-center shadow-lg shadow-blue-500/20"
                    >
                        <Ionicons name="add" size={hScale(24)} color="#ffffff" strokeWidth={3} />
                        <Text style={{ fontSize: fontSize.base }} className="text-white font-black uppercase tracking-widest">Recharge Wallet</Text>
                    </TouchableOpacity>
                </Card>
 
                {/* Auto Top-up Card */}
                <Card style={{ padding: spacing.xl, borderRadius: hScale(32), marginBottom: vScale(32), borderWidth: 1 }} className="p-6 bg-white dark:bg-slate-900 shadow-sm border-slate-100/60 dark:border-slate-800">
                    <View className="flex-row justify-between items-center">
                        <View style={{ flex: 1, paddingRight: spacing.lg }}>
                            <Text style={{ fontSize: fontSize.base }} className="font-black text-slate-900 dark:text-white uppercase tracking-tight">Auto Recharge</Text>
                            <Text style={{ fontSize: fontSize.xs, marginTop: vScale(4) }} className="font-medium text-slate-500 dark:text-slate-500">Smart recharge when balance drops</Text>
                        </View>
                        <Switch
                            value={autoTopUp}
                            onValueChange={handleToggleAutoTopUp}
                            trackColor={{ false: isDark ? "#1e293b" : "#e2e8f0", true: "#3b82f6" }}
                            thumbColor={"#ffffff"}
                        />
                    </View>
 
                    {autoTopUp && (
                        <View style={{ marginTop: vScale(24), paddingTop: vScale(24), borderTopWidth: 1 }} className="border-slate-50 dark:border-slate-800/50">
                            <View style={{ marginBottom: vScale(16) }} className="flex-row justify-between">
                                <Text style={{ fontSize: hScale(10) }} className="font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">When balance is below</Text>
                                <Text style={{ fontSize: fontSize.sm }} className="font-black text-slate-900 dark:text-white uppercase tracking-tighter">₹{threshold}</Text>
                            </View>
                            <View className="flex-row justify-between">
                                <Text style={{ fontSize: hScale(10) }} className="font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Add amount</Text>
                                <Text style={{ fontSize: fontSize.sm }} className="font-black text-slate-900 dark:text-white uppercase tracking-tighter">₹{topUpAmount}</Text>
                            </View>
                        </View>
                    )}
                </Card>
 
                {/* Transaction History */}
                <View style={{ marginBottom: vScale(24), paddingHorizontal: spacing.xs }} className="flex-row justify-between items-center">
                    <Text style={{ fontSize: hScale(10) }} className="font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Active Transactions</Text>
                </View>
 
                {transactions.length === 0 ? (
                    <View style={{ marginTop: vScale(48), paddingVertical: vScale(40) }} className="items-center opacity-30">
                        <Ionicons name="receipt-outline" size={hScale(64)} color={isDark ? "#94a3b8" : "#cbd5e1"} />
                        <Text style={{ fontSize: hScale(10), marginTop: vScale(16) }} className="text-slate-400 dark:text-slate-600 font-black uppercase tracking-widest">No transaction data</Text>
                    </View>
                ) : (
                    <View style={{ gap: spacing.md }}>
                        {transactions.map((tx) => (
                            <View key={tx.id} style={{ padding: spacing.xl, borderRadius: hScale(28), borderWidth: 1 }} className="flex-row items-center bg-white dark:bg-slate-900 shadow-sm border-slate-100/60 dark:border-slate-800">
                                <View style={{ width: hScale(48), height: hScale(48), borderRadius: hScale(16) }} className={`justify-center items-center ${tx.type === 'credit' ? 'bg-green-50 dark:bg-green-900/20' : 'bg-red-50 dark:bg-red-900/20'}`}>
                                    <Ionicons
                                        name={tx.type === 'credit' ? 'arrow-down' : 'arrow-up'}
                                        size={hScale(22)}
                                        color={tx.type === 'credit' ? '#16a34a' : '#ef4444'}
                                    />
                                </View>
                                <View style={{ flex: 1, marginLeft: spacing.xl, paddingRight: spacing.sm }}>
                                    <Text style={{ fontSize: fontSize.sm }} className="font-bold text-slate-800 dark:text-slate-200 tracking-tight" numberOfLines={1}>{tx.description}</Text>
                                    <Text style={{ fontSize: hScale(10), marginTop: vScale(4) }} className="font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">{new Date(tx.created_at).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}</Text>
                                </View>
                                <Text style={{ fontSize: fontSize.base }} className={`font-black uppercase tracking-tighter ${tx.type === 'credit' ? 'text-green-600' : 'text-red-500'}`}>
                                    {tx.type === 'credit' ? '+' : '-'} ₹{tx.amount.toFixed(2)}
                                </Text>
                            </View>
                        ))}
                    </View>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}
