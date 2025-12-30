import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, FlatList, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

export default function PaymentMethodsScreen() {
    const router = useRouter();
    const { user } = useAuth();
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
                .order('is_default', { ascending: false }); // Default first

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
                // Wallet doesn't exist, create one
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

    const renderTransaction = ({ item }: { item: any }) => (
        <View style={styles.transactionItem}>
            <View style={styles.transactionLeft}>
                <View style={styles.transactionIcon}>
                    <Ionicons name="cash-outline" size={20} color="#3b82f6" />
                </View>
                <View>
                    <Text style={styles.transactionTitle}>
                        {item.booking?.trip?.pickupLocation} to {item.booking?.trip?.dropLocation}
                    </Text>
                    <Text style={styles.transactionDate}>
                        {new Date(item.createdAt).toLocaleDateString()}
                    </Text>
                </View>
            </View>
            <View style={styles.transactionRight}>
                <Text style={styles.transactionAmount}>₹{item.amount}</Text>
                <Text style={[
                    styles.transactionStatus,
                    item.status === 'completed' ? styles.statusSuccess : styles.statusPending
                ]}>
                    {item.status}
                </Text>
            </View>
        </View>
    );

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#1f2937" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Payment Methods</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                {/* Wallet Balance Card */}
                <View style={styles.walletCard}>
                    <View>
                        <Text style={styles.walletLabel}>TCSYGO Wallet</Text>
                        <Text style={styles.walletBalance}>₹{walletBalance.toFixed(2)}</Text>
                    </View>
                    <TouchableOpacity style={styles.topUpBtn} onPress={() => Alert.alert('Coming Soon', 'Top-up feature is coming soon!')}>
                        <Ionicons name="add" size={20} color="#fff" />
                        <Text style={styles.topUpText}>Top Up</Text>
                    </TouchableOpacity>
                </View>

                <Text style={styles.sectionTitle}>Saved Methods</Text>
                <View style={styles.methodsList}>
                    {paymentMethods.length > 0 ? (
                        paymentMethods.map((method) => (
                            <TouchableOpacity key={method.id} style={styles.methodItem}>
                                <View style={styles.methodLeft}>
                                    <Ionicons
                                        name={method.type === 'card' ? 'card-outline' : 'qr-code-outline'}
                                        size={24}
                                        color="#4b5563"
                                    />
                                    <View>
                                        <Text style={styles.methodLabel}>
                                            {method.type === 'card'
                                                ? `${method.card_brand?.toUpperCase() || 'Card'} ending in ${method.last_four}`
                                                : 'UPI Payment'}
                                        </Text>
                                        {method.is_default && (
                                            <Text style={styles.defaultBadge}>Default</Text>
                                        )}
                                    </View>
                                </View>
                                <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
                            </TouchableOpacity>
                        ))
                    ) : (
                        <View style={styles.emptyMethods}>
                            <Text style={styles.emptyText}>No saved payment methods</Text>
                        </View>
                    )}
                    <TouchableOpacity
                        style={styles.addMethodBtn}
                        onPress={() => router.push('/profile/add-payment-method')}
                    >
                        <Ionicons name="add-circle-outline" size={24} color="#3b82f6" />
                        <Text style={styles.addMethodText}>Add New Payment Method</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.historySection}>
                    <Text style={styles.sectionTitle}>Transaction History</Text>
                    {loading ? (
                        <ActivityIndicator style={{ marginTop: 20 }} color="#3b82f6" />
                    ) : transactions.length > 0 ? (
                        transactions.map((item) => (
                            <View key={item.id} style={styles.transactionWrapper}>
                                {renderTransaction({ item })}
                            </View>
                        ))
                    ) : (
                        <View style={styles.emptyHistory}>
                            <Ionicons name="receipt-outline" size={48} color="#d1d5db" />
                            <Text style={styles.emptyText}>No transactions yet</Text>
                        </View>
                    )}
                </View>
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
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#f3f4f6',
    },
    backButton: {
        padding: 4,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1f2937',
    },
    scrollContent: {
        padding: 20,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#1f2937',
        marginBottom: 12,
    },
    walletCard: {
        backgroundColor: '#1f2937',
        borderRadius: 16,
        padding: 20,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 5,
    },
    walletLabel: {
        color: '#9ca3af',
        fontSize: 14,
        marginBottom: 4
    },
    walletBalance: {
        color: 'white',
        fontSize: 28,
        fontWeight: 'bold'
    },
    topUpBtn: {
        backgroundColor: '#3b82f6',
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 24,
        gap: 4
    },
    topUpText: {
        color: 'white',
        fontWeight: '600',
        fontSize: 14
    },
    methodsList: {
        backgroundColor: '#fff',
        borderRadius: 12,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#e5e7eb',
        marginBottom: 30,
    },
    methodItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#f3f4f6',
    },
    methodLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    methodLabel: {
        fontSize: 16,
        color: '#374151',
    },
    addMethodBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        padding: 16,
    },
    addMethodText: {
        fontSize: 16,
        color: '#3b82f6',
        fontWeight: '600',
    },
    historySection: {
        flex: 1,
    },
    transactionWrapper: {
        backgroundColor: '#fff',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#e5e7eb',
        marginBottom: 12,
        overflow: 'hidden',
    },
    transactionItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
    },
    transactionLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        flex: 1,
    },
    transactionIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#eff6ff',
        justifyContent: 'center',
        alignItems: 'center',
    },
    transactionTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#1f2937',
        width: '90%',
    },
    transactionDate: {
        fontSize: 12,
        color: '#6b7280',
    },
    transactionRight: {
        alignItems: 'flex-end',
    },
    transactionAmount: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#1f2937',
    },
    transactionStatus: {
        fontSize: 10,
        fontWeight: 'bold',
        textTransform: 'uppercase',
    },
    statusSuccess: {
        color: '#166534',
    },
    statusPending: {
        color: '#92400e',
    },
    emptyHistory: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 40,
        gap: 12,
    },
    emptyText: {
        fontSize: 14,
        color: '#9ca3af',
    },
    defaultBadge: {
        fontSize: 10,
        color: '#22c55e',
        fontWeight: '600',
        marginTop: 2,
    },
    emptyMethods: {
        padding: 20,
        alignItems: 'center',
    }
});
