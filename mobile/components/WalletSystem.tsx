import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, FlatList, Modal, Alert } from 'react-native';
import { Text } from '@/components/ui/text';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { Card } from '@/components/ui/card';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/contexts/ThemeContext';
 
interface WalletData {
    id: string;
    user_id: string;
    balance: number;
    currency: string;
}
 
interface Transaction {
    id: string;
    type: 'credit' | 'debit';
    amount: number;
    description: string;
    created_at: string;
}
 
export function WalletSystem({ userId, style }: { userId?: string, style?: any }) {
    const { t } = useTranslation();
    const { theme } = useTheme();
    const isDark = theme === 'dark';
 
    const [wallet, setWallet] = useState<WalletData | null>(null);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(false);
    const [showAddMoney, setShowAddMoney] = useState(false);
 
    useEffect(() => {
        if (userId) {
            fetchWalletData();
        }
    }, [userId]);
 
    const fetchWalletData = async () => {
        setLoading(true);
        try {
            // Fetch wallet
            let { data: walletData, error: walletError } = await supabase
                .from('wallets')
                .select('*')
                .eq('user_id', userId)
                .single();
 
            if (walletError && walletError.code === 'PGRST116') {
                // Create wallet if not exists
                const { data: newWallet, error: createError } = await supabase
                    .from('wallets')
                    .insert({
                        user_id: userId,
                        balance: 0,
                        currency: 'INR',
                    })
                    .select()
                    .single();
 
                if (createError) throw createError;
                walletData = newWallet;
            } else if (walletError) {
                throw walletError;
            }
 
            setWallet(walletData);
 
            // Fetch transactions
            if (walletData) {
                const { data: txData, error: txError } = await supabase
                    .from('wallet_transactions')
                    .select('*')
                    .eq('wallet_id', walletData.id)
                    .order('created_at', { ascending: false })
                    .limit(5);
 
                if (txError) throw txError;
                setTransactions(txData || []);
            }
 
        } catch (error) {
            console.error('Error fetching wallet:', error);
        } finally {
            setLoading(false);
        }
    };
 
    const addMoney = async (amount: number) => {
        if (!wallet) return;
 
        setLoading(true);
        try {
            // 1. Update balance
            const newBalance = wallet.balance + amount;
            const { error: updateError } = await supabase
                .from('wallets')
                .update({ balance: newBalance })
                .eq('id', wallet.id);
 
            if (updateError) throw updateError;
 
            // 2. Add transaction record
            const { error: txError } = await supabase
                .from('wallet_transactions')
                .insert({
                    wallet_id: wallet.id,
                    type: 'credit',
                    amount: amount,
                    description: 'Added via Mobile App',
                    status: 'completed'
                });
 
            if (txError) throw txError;
 
            Alert.alert('Success', `Added ₹${amount} to wallet!`);
            setShowAddMoney(false);
            fetchWalletData();
 
        } catch (error: any) {
            Alert.alert('Error', error.message);
        } finally {
            setLoading(false);
        }
    };
 
    const renderTransaction = ({ item }: { item: Transaction }) => (
        <View className="flex-row justify-between items-center py-4 border-b border-slate-50 dark:border-slate-800/50">
            <View className="flex-1 mr-4">
                <Text className="text-sm font-bold text-slate-800 dark:text-slate-200" numberOfLines={1}>{item.description}</Text>
                <Text className="text-xs font-medium text-slate-400 dark:text-slate-500 mt-1">{new Date(item.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</Text>
            </View>
            <View className="items-end">
                <Text className={`text-base font-black ${item.type === 'credit' ? 'text-emerald-500' : 'text-rose-500'}`}>
                    {item.type === 'credit' ? '+' : '-'}₹{item.amount}
                </Text>
                <Text className="text-[10px] font-bold text-slate-400 dark:text-slate-600 uppercase tracking-tighter mt-0.5">Completed</Text>
            </View>
        </View>
    );
 
    if (!wallet && loading) {
        return (
            <View className="p-8 items-center justify-center">
                <Text className="text-slate-400 font-medium">Loading Wallet...</Text>
            </View>
        );
    }
 
    return (
        <View style={[styles.container, style]}>
            {/* Balance Card - Premium Look */}
            <View className="bg-slate-900 border border-slate-800 rounded-[32px] p-8 flex-row justify-between items-center mb-6 shadow-xl shadow-slate-950/20">
                <View>
                    <Text className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-2">Total Balance</Text>
                    <Text className="text-white text-4xl font-black">₹{wallet?.balance || 0}</Text>
                </View>
                <TouchableOpacity
                    activeOpacity={0.8}
                    className="bg-blue-600 w-14 h-14 rounded-2xl items-center justify-center shadow-lg shadow-blue-500/20"
                    onPress={() => setShowAddMoney(true)}
                >
                    <Ionicons name="add" size={32} color="white" />
                </TouchableOpacity>
            </View>
 
            {/* Transactions Section */}
            <Card className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[32px] p-6 shadow-sm">
                <View className="flex-row justify-between items-center mb-6">
                    <Text className="text-lg font-bold text-slate-900 dark:text-white">Recent Activity</Text>
                    <TouchableOpacity>
                        <Text className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">See All</Text>
                    </TouchableOpacity>
                </View>
                <FlatList
                    data={transactions}
                    renderItem={renderTransaction}
                    keyExtractor={item => item.id}
                    scrollEnabled={false}
                    ListEmptyComponent={
                        <View className="py-8 items-center">
                            <Ionicons name="receipt-outline" size={32} color={isDark ? "#1e293b" : "#f1f5f9"} />
                            <Text className="text-slate-400 dark:text-slate-600 text-sm font-medium mt-2">No recent transactions</Text>
                        </View>
                    }
                />
            </Card>
 
            {/* Simple Add Money Modal */}
            <Modal visible={showAddMoney} transparent animationType="fade">
                <View className="flex-1 bg-black/60 justify-end">
                    <View className="bg-white dark:bg-slate-900 rounded-t-[40px] p-8 border-t border-slate-100 dark:border-slate-800">
                        <View className="w-12 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full self-center mb-8" />
                        <Text className="text-2xl font-black text-slate-900 dark:text-white mb-8 text-center">Add Funds</Text>
                        
                        <View className="flex-row flex-wrap gap-4 justify-center mb-10">
                            {[100, 200, 500, 1000].map(amt => (
                                <TouchableOpacity
                                    key={amt}
                                    className="bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 px-8 py-4 rounded-2xl min-w-[120px] items-center active:bg-blue-50 dark:active:bg-blue-900/10 active:border-blue-200 dark:active:border-blue-900/30 shadow-sm"
                                    onPress={() => addMoney(amt)}
                                >
                                    <Text className="text-xl font-bold text-slate-900 dark:text-white">₹{amt}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
 
                        <TouchableOpacity 
                            className="bg-slate-100 dark:bg-slate-800 h-14 rounded-2xl items-center justify-center" 
                            onPress={() => setShowAddMoney(false)}
                        >
                            <Text className="text-slate-500 dark:text-slate-400 font-bold">Cancel</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
}
 
const styles = StyleSheet.create({
    container: {
        flex: 1,
    }
});
