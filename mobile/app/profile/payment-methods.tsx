import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { queryClient } from '@/lib/queryClient';

interface PaymentMethod {
    id: string;
    type: string;
    lastFour: string;
    cardBrand: string;
    isDefault: boolean;
}

export default function PaymentMethodsScreen() {
    const router = useRouter();
    const { user } = useAuth();

    const { data: paymentMethods } = useQuery<PaymentMethod[]>({
        queryKey: ['payment-methods', user?.id],
        queryFn: async () => {
            if (!user) return [];
            const { data, error } = await supabase
                .from('payment_methods')
                .select('*')
                .eq('user_id', user.id)
                .order('is_default', { ascending: false });

            if (error) throw error;
            return data.map((pm: any) => ({
                id: pm.id,
                type: pm.type,
                lastFour: pm.last_four,
                cardBrand: pm.card_brand,
                isDefault: pm.is_default,
            }));
        },
        enabled: !!user,
    });

    const setDefaultMutation = useMutation({
        mutationFn: async (methodId: string) => {
            // First, unset all defaults
            await supabase
                .from('payment_methods')
                .update({ is_default: false })
                .eq('user_id', user?.id);

            // Then set the new default
            const { error } = await supabase
                .from('payment_methods')
                .update({ is_default: true })
                .eq('id', methodId);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['payment-methods'] });
            Alert.alert('Success', 'Default payment method updated');
        },
        onError: () => {
            Alert.alert('Error', 'Failed to update default payment method');
        },
    });

    const deleteMutation = useMutation({
        mutationFn: async (methodId: string) => {
            const { error } = await supabase
                .from('payment_methods')
                .delete()
                .eq('id', methodId);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['payment-methods'] });
            Alert.alert('Success', 'Payment method removed');
        },
        onError: () => {
            Alert.alert('Error', 'Failed to remove payment method');
        },
    });

    const handleDelete = (methodId: string, isDefault: boolean) => {
        if (isDefault) {
            Alert.alert('Cannot Delete', 'Please set another card as default before deleting this one.');
            return;
        }

        Alert.alert(
            'Remove Payment Method',
            'Are you sure you want to remove this payment method?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Remove',
                    style: 'destructive',
                    onPress: () => deleteMutation.mutate(methodId),
                },
            ]
        );
    };

    const getCardIcon = (brand: string) => {
        const icons: Record<string, any> = {
            visa: 'card',
            mastercard: 'card',
            amex: 'card',
            discover: 'card',
        };
        return icons[brand.toLowerCase()] || 'card';
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={24} color="#1f2937" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Payment Methods</Text>
                <TouchableOpacity onPress={() => router.push('/profile/add-payment-method' as any)}>
                    <Ionicons name="add-circle-outline" size={24} color="#3b82f6" />
                </TouchableOpacity>
            </View>

            <ScrollView style={styles.content}>
                {paymentMethods && paymentMethods.length > 0 ? (
                    paymentMethods.map((method) => (
                        <View key={method.id} style={styles.methodCard}>
                            <View style={styles.methodInfo}>
                                <View style={styles.cardIcon}>
                                    <Ionicons name={getCardIcon(method.cardBrand)} size={32} color="#3b82f6" />
                                </View>
                                <View style={styles.cardDetails}>
                                    <Text style={styles.cardBrand}>{method.cardBrand.toUpperCase()}</Text>
                                    <Text style={styles.cardNumber}>•••• {method.lastFour}</Text>
                                    {method.isDefault && (
                                        <View style={styles.defaultBadge}>
                                            <Text style={styles.defaultText}>Default</Text>
                                        </View>
                                    )}
                                </View>
                            </View>

                            <View style={styles.methodActions}>
                                {!method.isDefault && (
                                    <TouchableOpacity
                                        style={styles.actionButton}
                                        onPress={() => setDefaultMutation.mutate(method.id)}
                                    >
                                        <Text style={styles.actionText}>Set Default</Text>
                                    </TouchableOpacity>
                                )}
                                <TouchableOpacity
                                    style={[styles.actionButton, styles.deleteButton]}
                                    onPress={() => handleDelete(method.id, method.isDefault)}
                                >
                                    <Ionicons name="trash-outline" size={18} color="#ef4444" />
                                </TouchableOpacity>
                            </View>
                        </View>
                    ))
                ) : (
                    <View style={styles.emptyState}>
                        <Ionicons name="card-outline" size={64} color="#9ca3af" />
                        <Text style={styles.emptyTitle}>No Payment Methods</Text>
                        <Text style={styles.emptyText}>Add a payment method to book trips faster</Text>
                        <TouchableOpacity
                            style={styles.addButton}
                            onPress={() => router.push('/profile/add-payment-method' as any)}
                        >
                            <Ionicons name="add" size={20} color="white" />
                            <Text style={styles.addButtonText}>Add Payment Method</Text>
                        </TouchableOpacity>
                    </View>
                )}

                <View style={styles.infoCard}>
                    <Ionicons name="shield-checkmark" size={24} color="#22c55e" />
                    <View style={styles.infoContent}>
                        <Text style={styles.infoTitle}>Secure Payments</Text>
                        <Text style={styles.infoText}>
                            Your payment information is encrypted and securely stored. We never store your full card number.
                        </Text>
                    </View>
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
        padding: 16,
        backgroundColor: 'white',
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1f2937',
    },
    content: {
        flex: 1,
        padding: 16,
    },
    methodCard: {
        backgroundColor: 'white',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    methodInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    cardIcon: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: '#eff6ff',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    cardDetails: {
        flex: 1,
    },
    cardBrand: {
        fontSize: 14,
        fontWeight: '600',
        color: '#1f2937',
        marginBottom: 4,
    },
    cardNumber: {
        fontSize: 16,
        color: '#6b7280',
    },
    defaultBadge: {
        backgroundColor: '#dbeafe',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
        alignSelf: 'flex-start',
        marginTop: 6,
    },
    defaultText: {
        fontSize: 11,
        fontWeight: '600',
        color: '#3b82f6',
    },
    methodActions: {
        flexDirection: 'row',
        gap: 8,
    },
    actionButton: {
        flex: 1,
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 8,
        backgroundColor: '#f3f4f6',
        alignItems: 'center',
        justifyContent: 'center',
    },
    actionText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#3b82f6',
    },
    deleteButton: {
        flex: 0,
        paddingHorizontal: 12,
    },
    emptyState: {
        alignItems: 'center',
        paddingVertical: 60,
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#1f2937',
        marginTop: 16,
    },
    emptyText: {
        fontSize: 14,
        color: '#6b7280',
        marginTop: 8,
        textAlign: 'center',
    },
    addButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: '#3b82f6',
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 8,
        marginTop: 24,
    },
    addButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600',
    },
    infoCard: {
        flexDirection: 'row',
        backgroundColor: '#f0fdf4',
        borderRadius: 12,
        padding: 16,
        marginTop: 24,
        gap: 12,
    },
    infoContent: {
        flex: 1,
    },
    infoTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#166534',
        marginBottom: 4,
    },
    infoText: {
        fontSize: 12,
        color: '#15803d',
        lineHeight: 18,
    },
});
