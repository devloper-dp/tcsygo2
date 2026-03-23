import { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, Modal, TextInput, ActivityIndicator, Alert } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/contexts/ThemeContext';
import { useResponsive } from '@/hooks/useResponsive';
import { Ionicons } from '@expo/vector-icons';
 
// Payment methods configuration for Razorpay
const PAYMENT_METHODS_CONFIG = [
    { id: 'upi', label: 'UPI (GPay, PhonePe)', icon: 'logo-google' as const },
    { id: 'card', label: 'Credit / Debit Card', icon: 'card-outline' as const },
    { id: 'netbanking', label: 'Net Banking', icon: 'business-outline' as const },
    { id: 'wallet', label: 'Wallets', icon: 'wallet-outline' as const },
];
 
export function PaymentMethodSelectorMobile({ selectedMethod, onSelect }: { selectedMethod: string, onSelect: (id: string) => void }) {
    const { theme, isDark, colors } = useTheme();
    const { hScale, vScale, spacing } = useResponsive();
    const methods = PAYMENT_METHODS_CONFIG;
 
    return (
        <View style={{ marginTop: vScale(8), marginBottom: vScale(24) }}>
            {methods.map((method) => (
                <TouchableOpacity
                    key={method.id}
                    style={{ 
                        flexDirection: 'row', 
                        alignItems: 'center', 
                        borderRadius: hScale(24), 
                        padding: spacing.xl, 
                        marginBottom: vScale(16), 
                        borderWidth: 1, 
                        gap: spacing.lg 
                    }}
                    className={selectedMethod === method.id 
                        ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-400' 
                        : 'border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm shadow-slate-200/50 dark:shadow-none'
                    }
                    onPress={() => onSelect(method.id)}
                >
                    <View style={{ width: hScale(48), height: hScale(48), borderRadius: hScale(16) }} className={`justify-center items-center shadow-sm ${
                        selectedMethod === method.id ? 'bg-blue-600' : 'bg-blue-50 dark:bg-blue-900/30'
                    }`}>
                        <Ionicons
                            name={method.icon as any}
                            size={hScale(24)}
                            color={selectedMethod === method.id ? '#fff' : (isDark ? '#60a5fa' : '#3b82f6')}
                        />
                    </View>
                    <Text style={{ fontSize: hScale(16) }} className={`flex-1 font-bold tracking-tight ${
                        selectedMethod === method.id ? 'text-blue-700 dark:text-blue-400' : 'text-slate-800 dark:text-slate-200'
                    }`}>
                        {method.label}
                    </Text>
                    <Ionicons
                        name={selectedMethod === method.id ? 'radio-button-on' : 'radio-button-off'}
                        size={hScale(22)}
                        color={selectedMethod === method.id ? (isDark ? '#60a5fa' : '#3b82f6') : (isDark ? '#334155' : '#e2e8f0')}
                    />
                </TouchableOpacity>
            ))}
 
            {/* Auto Pay & Split Fare Links */}
            <View style={{ marginTop: vScale(16), gap: spacing.md }}>
                <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', padding: spacing.xl, borderRadius: hScale(28), borderWidth: 1 }} className="bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 shadow-sm">
                    <View style={{ width: hScale(40), height: hScale(40), borderRadius: hScale(16) }} className="bg-amber-50 dark:bg-amber-900/20 items-center justify-center">
                        <Ionicons name="flash" size={hScale(20)} color="#f59e0b" />
                    </View>
                    <Text style={{ fontSize: hScale(16), marginLeft: hScale(16) }} className="font-bold text-slate-800 dark:text-slate-200">Set up Auto Pay</Text>
                    <Ionicons name="chevron-forward" size={hScale(16)} color={isDark ? "#475569" : "#cbd5e1"} style={{ marginLeft: 'auto' }} />
                </TouchableOpacity>
 
                <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', padding: spacing.xl, borderRadius: hScale(28), borderWidth: 1 }} className="bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 shadow-sm">
                    <View style={{ width: hScale(40), height: hScale(40), borderRadius: hScale(16) }} className="bg-indigo-50 dark:bg-indigo-900/20 items-center justify-center">
                        <Ionicons name="people" size={hScale(20)} color="#6366f1" />
                    </View>
                    <Text style={{ fontSize: hScale(16), marginLeft: hScale(16) }} className="font-bold text-slate-800 dark:text-slate-200">Split Fare</Text>
                    <Ionicons name="chevron-forward" size={hScale(16)} color={isDark ? "#475569" : "#cbd5e1"} style={{ marginLeft: 'auto' }} />
                </TouchableOpacity>
            </View>
        </View>
    );
}
 
export function PromoCodeDialogMobile({
    visible,
    onClose,
    onApply
}: {
    visible: boolean;
    onClose: () => void;
    onApply: (code: string, discount: number, id: string) => void;
}) {
    const { theme, isDark } = useTheme();
    const { hScale, vScale, spacing } = useResponsive();
    const [code, setCode] = useState('');
    const [loadingApply, setLoadingApply] = useState(false);
 
    const { data: availableOffers, isLoading: isLoadingOffers } = useQuery({
        queryKey: ['promo-codes'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('promo_codes')
                .select('*')
                .eq('is_active', true)
                .order('created_at', { ascending: false });
 
            if (error) throw error;
            return (data || []).map((m: any) => ({
                id: m.id,
                code: m.code,
                discount: parseFloat(m.discount_value),
                description: m.discount_type === 'percentage' ? `${m.discount_value}% off` : `₹${m.discount_value} off`,
                discountType: m.discount_type
            }));
        },
        enabled: visible
    });
 
    const handleApply = () => {
        if (!code) return;
        setLoadingApply(true);
 
        const offer = availableOffers?.find(o => o.code.toUpperCase() === code.toUpperCase());
        if (offer) {
            onApply(offer.code, offer.discount, offer.id);
            onClose();
        } else {
            Alert.alert('Invalid Code', 'Invalid or expired promo code');
        }
        setLoadingApply(false);
    };
 
    return (
        <Modal visible={visible} animationType="slide" transparent>
            <View className="flex-1 bg-black/60 justify-end">
                <View style={{ borderTopLeftRadius: hScale(40), borderTopRightRadius: hScale(40), padding: spacing.xl, minHeight: vScale(500) }} className="bg-white dark:bg-slate-950 shadow-2xl">
                    <View style={{ width: hScale(48), height: vScale(6), marginBottom: vScale(32) }} className="bg-slate-200 dark:bg-slate-800 rounded-full self-center" />
                    
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: vScale(32) }}>
                        <Text style={{ fontSize: hScale(24) }} className="font-black text-slate-900 dark:text-white uppercase tracking-tighter">Apply Promo Code</Text>
                        <TouchableOpacity 
                            onPress={onClose}
                            style={{ width: hScale(40), height: hScale(40), borderRadius: hScale(20), borderWidth: 1 }}
                            className="bg-slate-50 dark:bg-slate-900 items-center justify-center border-slate-100 dark:border-slate-800"
                        >
                            <Ionicons name="close" size={hScale(24)} color={isDark ? "#f8fafc" : "#1e293b"} />
                        </TouchableOpacity>
                    </View>
 
                    <View style={{ flexDirection: 'row', marginBottom: vScale(32), gap: spacing.md }}>
                        <TextInput
                            style={{ flex: 1, height: vScale(56), borderRadius: hScale(24), paddingHorizontal: hScale(24), fontSize: hScale(16), borderWidth: 1 }}
                            className="font-bold text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-900 shadow-inner border-slate-100 dark:border-slate-800"
                            placeholder="Enter code (e.g. FIRST50)"
                            placeholderTextColor={isDark ? "#475569" : "#94a3b8"}
                            value={code}
                            onChangeText={setCode}
                            autoCapitalize="characters"
                        />
                        <TouchableOpacity
                            disabled={!code || loadingApply}
                            onPress={handleApply}
                            style={{ paddingHorizontal: hScale(32), height: vScale(56), borderRadius: hScale(24) }}
                            className={`justify-center items-center shadow-lg ${!code || loadingApply ? 'bg-slate-100 dark:bg-slate-800 shadow-none' : 'bg-slate-900 dark:bg-white shadow-blue-500/10'}`}
                        >
                             {loadingApply ? (
                                <ActivityIndicator color={isDark ? "#3b82f6" : "#64748b"} />
                             ) : (
                                <Text style={{ fontSize: hScale(14) }} className={`font-black uppercase tracking-widest ${!code || loadingApply ? 'text-slate-400 dark:text-slate-600' : 'text-white dark:text-slate-900'}`}>Apply</Text>
                             )}
                        </TouchableOpacity>
                    </View>
 
                    <Text style={{ fontSize: hScale(10), marginBottom: vScale(20), paddingHorizontal: hScale(4) }} className="font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Available Offers</Text>
                    {isLoadingOffers ? (
                        <View className="flex-1 items-center justify-center">
                            <ActivityIndicator color={isDark ? "#ffffff" : "#3b82f6"} />
                        </View>
                    ) : (
                        <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
                            {availableOffers && availableOffers.length > 0 ? (
                                availableOffers.map((offer) => (
                                    <TouchableOpacity
                                        key={offer.id}
                                        style={{ padding: spacing.xl, borderRadius: hScale(32), marginBottom: vScale(16), borderWidth: 1 }}
                                        className="bg-white dark:bg-slate-900 shadow-sm border-slate-100 dark:border-slate-800"
                                        onPress={() => setCode(offer.code)}
                                    >
                                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                            <View style={{ paddingHorizontal: hScale(12), paddingVertical: vScale(4), borderRadius: hScale(8), borderWidth: 1 }} className="bg-amber-100 dark:bg-amber-900/30 border-amber-200 dark:border-amber-900/50">
                                                <Text style={{ fontSize: hScale(12) }} className="font-black text-amber-800 dark:text-amber-400 uppercase tracking-widest">{offer.code}</Text>
                                            </View>
                                            <Ionicons name="arrow-forward-circle" size={hScale(24)} color={isDark ? "#475569" : "#e2e8f0"} />
                                        </View>
                                        <Text style={{ fontSize: hScale(18), marginTop: vScale(16) }} className="font-black text-slate-900 dark:text-white uppercase tracking-tight">{offer.description}</Text>
                                        <Text style={{ fontSize: hScale(12), marginTop: vScale(4) }} className="font-medium text-slate-500 dark:text-slate-500">Tap to apply this code to your booking</Text>
                                    </TouchableOpacity>
                                ))
                            ) : (
                                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', marginTop: vScale(40), opacity: 0.3 }}>
                                    <Ionicons name="ticket-outline" size={hScale(64)} color={isDark ? "#94a3b8" : "#cbd5e1"} />
                                    <Text style={{ fontSize: hScale(14), marginTop: vScale(16) }} className="text-slate-400 dark:text-slate-600 font-black text-center uppercase tracking-widest">No offers available</Text>
                                </View>
                            )}
                        </ScrollView>
                    )}
                </View>
            </View>
        </Modal>
    );
}
