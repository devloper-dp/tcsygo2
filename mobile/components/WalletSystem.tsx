import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Modal, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { Card } from '@/components/ui/card'; // Assuming this exists or using View/StyleSheet
import { useTranslation } from 'react-i18next';

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
        <View style={styles.transactionItem}>
            <View>
                <Text style={styles.txDesc}>{item.description}</Text>
                <Text style={styles.txDate}>{new Date(item.created_at).toLocaleDateString()}</Text>
            </View>
            <Text style={[styles.txAmount, item.type === 'credit' ? styles.credit : styles.debit]}>
                {item.type === 'credit' ? '+' : '-'}₹{item.amount}
            </Text>
        </View>
    );

    if (!wallet && loading) {
        return <Text style={{ padding: 16 }}>Loading Wallet...</Text>;
    }

    return (
        <View style={[styles.container, style]}>
            {/* Balance Card */}
            <View style={styles.balanceCard}>
                <View>
                    <Text style={styles.balanceLabel}>Total Balance</Text>
                    <Text style={styles.balanceValue}>₹{wallet?.balance || 0}</Text>
                </View>
                <TouchableOpacity
                    style={styles.addBtn}
                    onPress={() => setShowAddMoney(true)}
                >
                    <Ionicons name="add" size={24} color="white" />
                    <Text style={styles.addBtnText}>Add Money</Text>
                </TouchableOpacity>
            </View>

            {/* Transactions */}
            <View style={styles.txSection}>
                <Text style={styles.sectionTitle}>Recent Transactions</Text>
                <FlatList
                    data={transactions}
                    renderItem={renderTransaction}
                    keyExtractor={item => item.id}
                    scrollEnabled={false}
                    ListEmptyComponent={<Text style={styles.emptyText}>No recent transactions</Text>}
                />
            </View>

            {/* Simple Add Money Modal */}
            <Modal visible={showAddMoney} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Add Money to Wallet</Text>
                        <View style={styles.amountGrid}>
                            {[100, 200, 500, 1000].map(amt => (
                                <TouchableOpacity
                                    key={amt}
                                    style={styles.amtChip}
                                    onPress={() => addMoney(amt)}
                                >
                                    <Text style={styles.amtText}>₹{amt}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                        <TouchableOpacity style={styles.closeBtn} onPress={() => setShowAddMoney(false)}>
                            <Text style={styles.closeBtnText}>Cancel</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginBottom: 16,
    },
    balanceCard: {
        backgroundColor: '#1f2937', // Dark gray/black
        borderRadius: 12,
        padding: 20,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    balanceLabel: {
        color: '#9ca3af',
        fontSize: 14,
        marginBottom: 4,
    },
    balanceValue: {
        color: 'white',
        fontSize: 32,
        fontWeight: 'bold',
    },
    addBtn: {
        backgroundColor: '#3b82f6',
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 20,
    },
    addBtnText: {
        color: 'white',
        fontWeight: '600',
        marginLeft: 4,
    },
    txSection: {
        backgroundColor: 'white',
        borderRadius: 12,
        padding: 16,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 12,
        color: '#374151',
    },
    transactionItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#f3f4f6',
    },
    txDesc: {
        fontSize: 14,
        color: '#374151',
        fontWeight: '500',
    },
    txDate: {
        fontSize: 12,
        color: '#9ca3af',
    },
    txAmount: {
        fontSize: 16,
        fontWeight: '600',
    },
    credit: {
        color: '#10b981',
    },
    debit: {
        color: '#ef4444',
    },
    emptyText: {
        color: '#9ca3af',
        textAlign: 'center',
        fontStyle: 'italic',
        marginTop: 8,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: 'white',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 24,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 20,
        textAlign: 'center',
    },
    amountGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        justifyContent: 'center',
        marginBottom: 24,
    },
    amtChip: {
        backgroundColor: '#eff6ff',
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#bfdbfe',
    },
    amtText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#3b82f6',
    },
    closeBtn: {
        padding: 12,
        alignItems: 'center',
    },
    closeBtnText: {
        color: '#6b7280',
        fontSize: 16,
    },
});
