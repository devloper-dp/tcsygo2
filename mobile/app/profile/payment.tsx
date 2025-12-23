import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

export default function PaymentMethodsScreen() {
    const router = useRouter();
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [transactions, setTransactions] = useState<any[]>([]);

    useEffect(() => {
        if (user) {
            fetchTransactions();
        }
    }, [user]);

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
                .order('createdAt', { ascending: false });

            if (data) {
                setTransactions(data);
            }
        } catch (error) {
            console.error('Error fetching transactions:', error);
        } finally {
            setLoading(false);
        }
    };

    const paymentMethods = [
        { id: '1', type: 'UPI', label: 'Google Pay / PhonePe', icon: 'qr-code-outline' },
        { id: '2', type: 'Card', label: 'Visa ending in 4242', icon: 'card-outline' },
    ];

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
                <Text style={styles.sectionTitle}>Saved Methods</Text>
                <View style={styles.methodsList}>
                    {paymentMethods.map((method) => (
                        <TouchableOpacity key={method.id} style={styles.methodItem}>
                            <View style={styles.methodLeft}>
                                <Ionicons name={method.icon as any} size={24} color="#4b5563" />
                                <Text style={styles.methodLabel}>{method.label}</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
                        </TouchableOpacity>
                    ))}
                    <TouchableOpacity style={styles.addMethodBtn}>
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
});
