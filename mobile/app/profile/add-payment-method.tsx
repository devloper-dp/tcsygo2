import { useState } from 'react';
import { View, ScrollView, TouchableOpacity, Alert, ActivityIndicator, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { queryClient } from '@/lib/queryClient';
import { Text } from '@/components/ui/text';
import { Input } from '@/components/ui/input';
import { useTheme } from '@/contexts/ThemeContext';
import { Button } from '@/components/ui/button';
import { useResponsive } from '@/hooks/useResponsive';
 
export default function AddPaymentMethodScreen() {
    const router = useRouter();
    const { user } = useAuth();
    const { theme, isDark } = useTheme();
    const { hScale, vScale, spacing, fontSize } = useResponsive();
    const [cardNumber, setCardNumber] = useState('');
    const [cardholderName, setCardholderName] = useState('');
    const [expiryMonth, setExpiryMonth] = useState('');
    const [expiryYear, setExpiryYear] = useState('');
    const [cvv, setCvv] = useState('');
    const [isDefault, setIsDefault] = useState(false);
 
    const addPaymentMutation = useMutation({
        mutationFn: async () => {
            if (!cardNumber || !cardholderName || !expiryMonth || !expiryYear || !cvv) {
                throw new Error('All fields are required');
            }
 
            const cleanCardNumber = cardNumber.replace(/\s/g, '');
            if (cleanCardNumber.length < 13 || cleanCardNumber.length > 19) {
                throw new Error('Invalid card number');
            }
 
            const month = parseInt(expiryMonth);
            const year = parseInt(expiryYear);
            if (month < 1 || month > 12) {
                throw new Error('Invalid expiry month');
            }
            const currentYear = new Date().getFullYear() % 100;
            if (year < currentYear) {
                throw new Error('Card has expired');
            }
 
            if (cvv.length < 3 || cvv.length > 4) {
                throw new Error('Invalid CVV');
            }
 
            const cardBrand = detectCardBrand(cleanCardNumber);
            const lastFour = cleanCardNumber.slice(-4);
 
            if (isDefault) {
                await supabase
                    .from('payment_methods')
                    .update({ is_default: false })
                    .eq('user_id', user?.id);
            }
 
            const { error } = await supabase
                .from('payment_methods')
                .insert({
                    user_id: user?.id,
                    type: 'card',
                    last_four: lastFour,
                    card_brand: cardBrand,
                    is_default: isDefault,
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
        if (cardNumber.startsWith('4')) return 'visa';
        if (cardNumber.startsWith('5')) return 'mastercard';
        if (cardNumber.startsWith('3')) return 'amex';
        if (cardNumber.startsWith('6')) return 'discover';
        return 'unknown';
    };
 
    const formatCardNumber = (text: string) => {
        const cleaned = text.replace(/\D/g, '');
        const formatted = cleaned.match(/.{1,4}/g)?.join(' ') || cleaned;
        setCardNumber(formatted);
    };
 
    const handleSubmit = () => {
        addPaymentMutation.mutate();
    };
 
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
                <Text style={{ fontSize: fontSize.xl }} className="font-black text-slate-900 dark:text-white uppercase tracking-tighter">Add Card</Text>
                <View style={{ width: hScale(40) }} />
            </View>
 
            <ScrollView 
                style={{ flex: 1, paddingHorizontal: spacing.xl, paddingTop: vScale(24) }}
                contentContainerStyle={{ paddingBottom: vScale(120) }}
                showsVerticalScrollIndicator={false}
            >
                <View style={{ borderRadius: hScale(28), padding: spacing.xl, marginBottom: vScale(32), gap: spacing.md, borderWidth: 1 }} className="flex-row bg-blue-50/50 dark:bg-blue-900/10 border-blue-100/50 dark:border-blue-900/20">
                    <Ionicons name="shield-checkmark" size={hScale(24)} color={isDark ? "#60a5fa" : "#3b82f6"} strokeWidth={3} />
                    <View className="flex-1">
                        <Text style={{ fontSize: hScale(10), marginBottom: vScale(4) }} className="font-black text-blue-800 dark:text-blue-400 uppercase tracking-widest">Encrypted Transit</Text>
                        <Text style={{ fontSize: hScale(10), lineHeight: vScale(16) }} className="font-bold text-blue-600 dark:text-blue-500/80 uppercase tracking-tighter">
                            Your card information is vaulted with industry-standard encryption. We never store CVV codes or full numbers.
                        </Text>
                    </View>
                </View>
 
                <View style={{ borderRadius: hScale(40), padding: spacing.xxl, borderWidth: 1, marginBottom: vScale(24) }} className="bg-white dark:bg-slate-900 shadow-sm border-slate-100 dark:border-slate-800">
                    <View style={{ marginBottom: vScale(24), gap: spacing.xs }}>
                        <Text style={{ fontSize: hScale(10), marginLeft: spacing.xs }} className="font-black text-slate-500 dark:text-slate-500 uppercase tracking-widest">Card Number</Text>
                        <Input
                            placeholder="1234 5678 9012 3456"
                            value={cardNumber}
                            onChangeText={formatCardNumber}
                            keyboardType="numeric"
                            maxLength={19}
                            style={{ height: vScale(56), borderRadius: hScale(20), paddingHorizontal: spacing.xl, borderWidth: 1 }}
                            className="font-bold text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-950 border-slate-100 dark:border-slate-800/50"
                            placeholderTextColor={isDark ? "#475569" : "#94a3b8"}
                        />
                    </View>
 
                    <View style={{ marginBottom: vScale(24), gap: spacing.xs }}>
                        <Text style={{ fontSize: hScale(10), marginLeft: spacing.xs }} className="font-black text-slate-500 dark:text-slate-500 uppercase tracking-widest">Cardholder Name</Text>
                        <Input
                            placeholder="EX: JOHNATHAN DOE"
                            value={cardholderName}
                            onChangeText={setCardholderName}
                            autoCapitalize="characters"
                            style={{ height: vScale(56), borderRadius: hScale(20), paddingHorizontal: spacing.xl, borderWidth: 1 }}
                            className="font-bold text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-950 border-slate-100 dark:border-slate-800/50"
                            placeholderTextColor={isDark ? "#475569" : "#94a3b8"}
                        />
                    </View>
 
                    <View style={{ flexDirection: 'row', marginBottom: vScale(32), gap: spacing.lg }}>
                        <View style={{ flex: 1, gap: spacing.xs }}>
                            <Text style={{ fontSize: hScale(10), marginLeft: spacing.xs }} className="font-black text-slate-500 dark:text-slate-500 uppercase tracking-widest">Month</Text>
                            <Input
                                placeholder="MM"
                                value={expiryMonth}
                                onChangeText={setExpiryMonth}
                                keyboardType="numeric"
                                maxLength={2}
                                style={{ height: vScale(56), borderRadius: hScale(20), paddingHorizontal: spacing.xl, borderWidth: 1 }}
                                className="font-bold text-center text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-950 border-slate-100 dark:border-slate-800/50"
                                placeholderTextColor={isDark ? "#475569" : "#94a3b8"}
                            />
                        </View>
  
                        <View style={{ flex: 1, gap: spacing.xs }}>
                            <Text style={{ fontSize: hScale(10), marginLeft: spacing.xs }} className="font-black text-slate-500 dark:text-slate-500 uppercase tracking-widest">Year</Text>
                            <Input
                                placeholder="YY"
                                value={expiryYear}
                                onChangeText={setExpiryYear}
                                keyboardType="numeric"
                                maxLength={2}
                                style={{ height: vScale(56), borderRadius: hScale(20), paddingHorizontal: spacing.xl, borderWidth: 1 }}
                                className="font-bold text-center text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-950 border-slate-100 dark:border-slate-800/50"
                                placeholderTextColor={isDark ? "#475569" : "#94a3b8"}
                            />
                        </View>
  
                        <View style={{ flex: 1, gap: spacing.xs }}>
                            <Text style={{ fontSize: hScale(10), marginLeft: spacing.xs }} className="font-black text-slate-500 dark:text-slate-500 uppercase tracking-widest">CVV</Text>
                            <Input
                                placeholder="***"
                                value={cvv}
                                onChangeText={setCvv}
                                keyboardType="numeric"
                                maxLength={4}
                                secureTextEntry
                                style={{ height: vScale(56), borderRadius: hScale(20), paddingHorizontal: spacing.xl, borderWidth: 1 }}
                                className="font-bold text-center text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-950 border-slate-100 dark:border-slate-800/50"
                                placeholderTextColor={isDark ? "#475569" : "#94a3b8"}
                            />
                        </View>
                    </View>
 
                    <TouchableOpacity
                        style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: vScale(8), paddingVertical: vScale(8) }}
                        onPress={() => setIsDefault(!isDefault)}
                    >
                        <Ionicons
                            name={isDefault ? 'checkbox' : 'square'}
                            size={hScale(24)}
                            color={isDefault ? '#3b82f6' : (isDark ? '#1e293b' : '#e2e8f0')}
                        />
                        <Text style={{ fontSize: fontSize.xs }} className="font-black text-slate-700 dark:text-slate-300 uppercase tracking-tight">Set as default payment method</Text>
                    </TouchableOpacity>
                </View>
 
                <View style={{ paddingHorizontal: spacing.xl, opacity: 0.4 }}>
                    <Text style={{ fontSize: hScale(9), lineHeight: vScale(16) }} className="font-extrabold text-slate-500 text-center uppercase tracking-widest">
                        By adding this method, you authorize TCSYGO to verify and vault your info. 
                        All transactions are processed via Razorpay Secure.
                    </Text>
                </View>
            </ScrollView>
 
            <View style={{ padding: spacing.xl, borderTopWidth: 1 }} className="bg-white dark:bg-slate-950 border-slate-100 dark:border-slate-800 shadow-xl">
                <Button
                    style={{ height: vScale(64), borderRadius: hScale(24) }}
                    className={addPaymentMutation.isPending ? 'bg-slate-100 dark:bg-slate-900' : 'bg-slate-900 dark:bg-white shadow-lg shadow-blue-500/10'}
                    onPress={handleSubmit}
                    disabled={addPaymentMutation.isPending}
                >
                    {addPaymentMutation.isPending ? (
                        <ActivityIndicator size="small" color={isDark ? "#3b82f6" : "#64748b"} />
                    ) : (
                        <Text style={{ fontSize: fontSize.base }} className="text-white dark:text-slate-900 font-black uppercase tracking-widest">Authorize & Add Card</Text>
                    )}
                </Button>
            </View>
        </SafeAreaView>
    );
}
