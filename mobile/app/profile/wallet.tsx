import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { PaymentService, WalletBalance, WalletTransaction } from '@/services/PaymentService';

export default function WalletScreen() {
    const router = useRouter();
    const { user } = useAuth();
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

            // Fetch auto-pay settings
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
                    default_payment_method: 'card' // Default
                });
            if (error) throw error;
        } catch (error) {
            Alert.alert("Error", "Failed to update auto top-up settings");
            setAutoTopUp(!newState); // Revert
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

                            // 1. Create Order
                            const orderData = await PaymentService.createOrder(numAmount, 'INR', `wallet_${Date.now()}`);

                            // 2. Open Razorpay
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
                                theme: { color: '#3b82f6' }
                            };

                            RazorpayCheckout.open(options).then(async (data: any) => {
                                // 3. Verify and Update Wallet
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
            <View style={styles.center}>
                <ActivityIndicator size="large" color="#3b82f6" />
                <Text>Loading Wallet...</Text>
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color="#1f2937" />
                </TouchableOpacity>
                <Text variant="h3" style={styles.title}>My Wallet</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView
                style={styles.content}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                showsVerticalScrollIndicator={false}
            >
                <Card style={styles.balanceCard}>
                    <Text style={styles.balanceLabel}>Current Balance</Text>
                    <Text style={styles.balanceAmount}>₹{balance?.balance.toFixed(2) || '0.00'}</Text>
                    <Button
                        onPress={handleAddMoney}
                        size="lg"
                        className="mt-6 w-full bg-white"
                    >
                        <Ionicons name="add" size={24} color="#3b82f6" style={{ marginRight: 8 }} />
                        <Text style={{ color: '#3b82f6', fontWeight: 'bold' }}>Add Money</Text>
                    </Button>
                </Card>

                <Card style={styles.autoPayCard}>
                    <View style={styles.autoPayHeader}>
                        <View>
                            <Text style={styles.autoPayTitle}>Auto Top-up</Text>
                            <Text style={styles.autoPaySubtitle}>Automatically add money when balance is low</Text>
                        </View>
                        <TouchableOpacity
                            onPress={handleToggleAutoTopUp}
                            style={[styles.switch, autoTopUp && styles.switchOn]}
                        >
                            <View style={[styles.switchHandle, autoTopUp && styles.switchHandleOn]} />
                        </TouchableOpacity>
                    </View>

                    {autoTopUp && (
                        <View style={styles.autoPaySettings}>
                            <View style={styles.divider} />
                            <View style={styles.settingsRow}>
                                <Text style={styles.settingsLabel}>When balance is below</Text>
                                <Text style={styles.settingsValue}>₹{threshold}</Text>
                            </View>
                            <View style={styles.settingsRow}>
                                <Text style={styles.settingsLabel}>Add amount</Text>
                                <Text style={styles.settingsValue}>₹{topUpAmount}</Text>
                            </View>
                        </View>
                    )}
                </Card>

                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Transaction History</Text>
                </View>

                {transactions.length === 0 ? (
                    <View style={styles.emptyState}>
                        <Ionicons name="receipt-outline" size={48} color="#d1d5db" />
                        <Text style={styles.emptyText}>No transactions yet</Text>
                    </View>
                ) : (
                    transactions.map((tx) => (
                        <View key={tx.id} style={styles.txRow}>
                            <View style={[styles.txIcon, { backgroundColor: tx.type === 'credit' ? '#dcfce7' : '#fee2e2' }]}>
                                <Ionicons
                                    name={tx.type === 'credit' ? 'arrow-down' : 'arrow-up'}
                                    size={20}
                                    color={tx.type === 'credit' ? '#16a34a' : '#ef4444'}
                                />
                            </View>
                            <View style={styles.txDetails}>
                                <Text style={styles.txDesc}>{tx.description}</Text>
                                <Text style={styles.txDate}>{new Date(tx.created_at).toLocaleDateString()}</Text>
                            </View>
                            <Text style={[styles.txAmount, { color: tx.type === 'credit' ? '#16a34a' : '#ef4444' }]}>
                                {tx.type === 'credit' ? '+' : '-'} ₹{tx.amount.toFixed(2)}
                            </Text>
                        </View>
                    ))
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f9fafb',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: 'white',
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
    },
    backBtn: {
        padding: 4,
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1f2937',
    },
    content: {
        flex: 1,
        padding: 16,
    },
    balanceCard: {
        backgroundColor: '#3b82f6',
        padding: 24,
        borderRadius: 24,
        alignItems: 'center',
        marginBottom: 24,
    },
    balanceLabel: {
        color: 'rgba(255,255,255,0.8)',
        fontSize: 14,
        fontWeight: '500',
    },
    balanceAmount: {
        color: 'white',
        fontSize: 40,
        fontWeight: 'bold',
        marginTop: 8,
    },
    sectionHeader: {
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1f2937',
    },
    txRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'white',
        padding: 16,
        borderRadius: 16,
        marginBottom: 12,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    txIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    txDetails: {
        flex: 1,
        marginLeft: 12,
    },
    txDesc: {
        fontSize: 14,
        fontWeight: '600',
        color: '#1f2937',
    },
    txDate: {
        fontSize: 12,
        color: '#6b7280',
        marginTop: 2,
    },
    txAmount: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 12,
    },
    emptyState: {
        alignItems: 'center',
        marginTop: 40,
        gap: 12,
    },
    emptyText: {
        color: '#9ca3af',
        fontSize: 14,
    },
    autoPayCard: {
        padding: 20,
        borderRadius: 20,
        marginBottom: 24,
    },
    autoPayHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    autoPayTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#1f2937',
    },
    autoPaySubtitle: {
        fontSize: 12,
        color: '#6b7280',
        marginTop: 2,
    },
    switch: {
        width: 50,
        height: 28,
        borderRadius: 14,
        backgroundColor: '#e5e7eb',
        padding: 2,
    },
    switchOn: {
        backgroundColor: '#3b82f6',
    },
    switchHandle: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: 'white',
    },
    switchHandleOn: {
        transform: [{ translateX: 22 }],
    },
    autoPaySettings: {
        marginTop: 16,
    },
    divider: {
        height: 1,
        backgroundColor: '#f3f4f6',
        marginBottom: 16,
    },
    settingsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    settingsLabel: {
        fontSize: 14,
        color: '#4b5563',
    },
    settingsValue: {
        fontSize: 14,
        fontWeight: '600',
        color: '#1f2937',
    }
});
