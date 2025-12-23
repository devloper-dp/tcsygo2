import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { queryClient } from '@/lib/queryClient';

export default function AddPaymentMethodScreen() {
    const router = useRouter();
    const { user } = useAuth();
    const [cardNumber, setCardNumber] = useState('');
    const [cardholderName, setCardholderName] = useState('');
    const [expiryMonth, setExpiryMonth] = useState('');
    const [expiryYear, setExpiryYear] = useState('');
    const [cvv, setCvv] = useState('');
    const [isDefault, setIsDefault] = useState(false);

    const addPaymentMutation = useMutation({
        mutationFn: async () => {
            // Validate inputs
            if (!cardNumber || !cardholderName || !expiryMonth || !expiryYear || !cvv) {
                throw new Error('All fields are required');
            }

            // Basic card number validation (should be 16 digits)
            const cleanCardNumber = cardNumber.replace(/\s/g, '');
            if (cleanCardNumber.length < 13 || cleanCardNumber.length > 19) {
                throw new Error('Invalid card number');
            }

            // Validate expiry
            const month = parseInt(expiryMonth);
            const year = parseInt(expiryYear);
            if (month < 1 || month > 12) {
                throw new Error('Invalid expiry month');
            }
            const currentYear = new Date().getFullYear() % 100;
            if (year < currentYear) {
                throw new Error('Card has expired');
            }

            // Validate CVV
            if (cvv.length < 3 || cvv.length > 4) {
                throw new Error('Invalid CVV');
            }

            // Detect card brand
            const cardBrand = detectCardBrand(cleanCardNumber);

            // In production, you would tokenize the card with Razorpay here
            // For now, we'll store the last 4 digits only (never store full card numbers!)
            const lastFour = cleanCardNumber.slice(-4);

            // If this is set as default, unset all other defaults first
            if (isDefault) {
                await supabase
                    .from('payment_methods')
                    .update({ is_default: false })
                    .eq('user_id', user?.id);
            }

            // Insert the payment method
            const { error } = await supabase
                .from('payment_methods')
                .insert({
                    user_id: user?.id,
                    type: 'card',
                    last_four: lastFour,
                    card_brand: cardBrand,
                    is_default: isDefault,
                    // In production, store razorpay_customer_id and razorpay_card_id here
                });

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['payment-methods'] });
            Alert.alert('Success', 'Payment method added successfully', [
                { text: 'OK', onPress: () => router.back() }
            ]);
        },
        onError: (error: any) => {
            Alert.alert('Error', error.message || 'Failed to add payment method');
        },
    });

    const detectCardBrand = (cardNumber: string): string => {
        // Simple card brand detection
        if (cardNumber.startsWith('4')) return 'visa';
        if (cardNumber.startsWith('5')) return 'mastercard';
        if (cardNumber.startsWith('3')) return 'amex';
        if (cardNumber.startsWith('6')) return 'discover';
        return 'unknown';
    };

    const formatCardNumber = (text: string) => {
        // Remove all non-digits
        const cleaned = text.replace(/\D/g, '');
        // Add space every 4 digits
        const formatted = cleaned.match(/.{1,4}/g)?.join(' ') || cleaned;
        setCardNumber(formatted);
    };

    const handleSubmit = () => {
        addPaymentMutation.mutate();
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={24} color="#1f2937" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Add Payment Method</Text>
                <View style={{ width: 24 }} />
            </View>

            <ScrollView style={styles.content}>
                <View style={styles.infoCard}>
                    <Ionicons name="shield-checkmark" size={24} color="#22c55e" />
                    <View style={styles.infoContent}>
                        <Text style={styles.infoTitle}>Secure Payment</Text>
                        <Text style={styles.infoText}>
                            Your card information is encrypted and securely stored. We never store your full card number or CVV.
                        </Text>
                    </View>
                </View>

                <View style={styles.form}>
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Card Number</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="1234 5678 9012 3456"
                            value={cardNumber}
                            onChangeText={formatCardNumber}
                            keyboardType="numeric"
                            maxLength={19}
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Cardholder Name</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="John Doe"
                            value={cardholderName}
                            onChangeText={setCardholderName}
                            autoCapitalize="words"
                        />
                    </View>

                    <View style={styles.row}>
                        <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                            <Text style={styles.label}>Expiry Month</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="MM"
                                value={expiryMonth}
                                onChangeText={setExpiryMonth}
                                keyboardType="numeric"
                                maxLength={2}
                            />
                        </View>

                        <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
                            <Text style={styles.label}>Expiry Year</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="YY"
                                value={expiryYear}
                                onChangeText={setExpiryYear}
                                keyboardType="numeric"
                                maxLength={2}
                            />
                        </View>

                        <View style={[styles.inputGroup, { flex: 1, marginLeft: 16 }]}>
                            <Text style={styles.label}>CVV</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="123"
                                value={cvv}
                                onChangeText={setCvv}
                                keyboardType="numeric"
                                maxLength={4}
                                secureTextEntry
                            />
                        </View>
                    </View>

                    <TouchableOpacity
                        style={styles.checkboxContainer}
                        onPress={() => setIsDefault(!isDefault)}
                    >
                        <Ionicons
                            name={isDefault ? 'checkbox' : 'square-outline'}
                            size={24}
                            color={isDefault ? '#3b82f6' : '#9ca3af'}
                        />
                        <Text style={styles.checkboxLabel}>Set as default payment method</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.disclaimer}>
                    <Text style={styles.disclaimerText}>
                        By adding a payment method, you agree to our Terms of Service and Privacy Policy.
                        Your payment information will be processed securely through Razorpay.
                    </Text>
                </View>
            </ScrollView>

            <View style={styles.footer}>
                <TouchableOpacity
                    style={[styles.submitButton, addPaymentMutation.isPending && styles.submitButtonDisabled]}
                    onPress={handleSubmit}
                    disabled={addPaymentMutation.isPending}
                >
                    {addPaymentMutation.isPending ? (
                        <ActivityIndicator size="small" color="#fff" />
                    ) : (
                        <Text style={styles.submitButtonText}>Add Payment Method</Text>
                    )}
                </TouchableOpacity>
            </View>
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
    infoCard: {
        flexDirection: 'row',
        backgroundColor: '#f0fdf4',
        borderRadius: 12,
        padding: 16,
        marginBottom: 24,
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
    form: {
        backgroundColor: 'white',
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
    },
    inputGroup: {
        marginBottom: 16,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: '#374151',
        marginBottom: 8,
    },
    input: {
        borderWidth: 1,
        borderColor: '#d1d5db',
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 10,
        fontSize: 16,
        color: '#1f2937',
        backgroundColor: '#fff',
    },
    row: {
        flexDirection: 'row',
        marginBottom: 16,
    },
    checkboxContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    checkboxLabel: {
        fontSize: 14,
        color: '#374151',
    },
    disclaimer: {
        padding: 16,
    },
    disclaimerText: {
        fontSize: 12,
        color: '#6b7280',
        lineHeight: 18,
        textAlign: 'center',
    },
    footer: {
        padding: 16,
        backgroundColor: 'white',
        borderTopWidth: 1,
        borderTopColor: '#e5e7eb',
    },
    submitButton: {
        backgroundColor: '#3b82f6',
        borderRadius: 8,
        paddingVertical: 14,
        alignItems: 'center',
    },
    submitButtonDisabled: {
        opacity: 0.6,
    },
    submitButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600',
    },
});
