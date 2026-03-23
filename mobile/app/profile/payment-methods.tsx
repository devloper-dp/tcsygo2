import { View, ScrollView, TouchableOpacity, Alert, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { queryClient } from '@/lib/queryClient';
import { Text } from '@/components/ui/text';
import { useTheme } from '@/contexts/ThemeContext';
import { Card } from '@/components/ui/card';
import { useResponsive } from '@/hooks/useResponsive';
 
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
    const { theme, isDark } = useTheme();
    const { hScale, vScale, spacing, fontSize } = useResponsive();
 
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
            await supabase
                .from('payment_methods')
                .update({ is_default: false })
                .eq('user_id', user?.id);
 
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
        return 'card';
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
                <Text style={{ fontSize: fontSize.xl }} className="font-black text-slate-900 dark:text-white uppercase tracking-tighter">My Cards</Text>
                <TouchableOpacity 
                    onPress={() => router.push('/profile/add-payment-method' as any)}
                    style={{ width: hScale(40), height: hScale(40) }}
                    className="rounded-full bg-blue-50 dark:bg-blue-900/20 items-center justify-center active:bg-blue-100 dark:active:bg-blue-800/50"
                >
                    <Ionicons name="add" size={hScale(24)} color={isDark ? "#60a5fa" : "#3b82f6"} />
                </TouchableOpacity>
            </View>
 
            <ScrollView 
                style={{ flex: 1, paddingHorizontal: spacing.xl, paddingTop: vScale(24) }}
                contentContainerStyle={{ paddingBottom: vScale(100) }}
                showsVerticalScrollIndicator={false}
            >
                {paymentMethods && paymentMethods.length > 0 ? (
                     paymentMethods.map((method) => (
                        <Card key={method.id} style={{ padding: spacing.xl, borderRadius: hScale(32), marginBottom: vScale(16), borderWidth: 1 }} className="bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 shadow-sm">
                            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: vScale(24) }}>
                                <View style={{ width: hScale(56), height: hScale(56), borderRadius: hScale(16), marginRight: spacing.lg, borderWidth: 1 }} className="bg-slate-50 dark:bg-slate-800 justify-center items-center border-slate-100 dark:border-slate-700">
                                    <Ionicons name="card" size={hScale(28)} color={isDark ? "#f8fafc" : "#4b5563"} />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={{ fontSize: fontSize.sm }} className="font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">{method.cardBrand.toUpperCase()}</Text>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: vScale(4) }}>
                                        <Text style={{ fontSize: fontSize.lg }} className="font-black text-slate-900 dark:text-white uppercase tracking-tighter">•••• {method.lastFour}</Text>
                                        {method.isDefault && (
                                            <View style={{ paddingHorizontal: spacing.sm, paddingVertical: vScale(4), borderRadius: hScale(8), marginLeft: spacing.lg, borderWidth: 1 }} className="bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-900/30">
                                                <Text style={{ fontSize: hScale(10) }} className="font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest">Primary</Text>
                                            </View>
                                        )}
                                    </View>
                                </View>
                            </View>
 
                            <View style={{ flexDirection: 'row', gap: spacing.md }}>
                                {!method.isDefault && (
                                    <TouchableOpacity
                                        style={{ height: vScale(48), borderRadius: hScale(16), borderWidth: 1 }}
                                        className="flex-1 bg-slate-50 dark:bg-slate-800 items-center justify-center border-slate-100 dark:border-slate-700"
                                        onPress={() => setDefaultMutation.mutate(method.id)}
                                    >
                                        <Text style={{ fontSize: fontSize.xs }} className="font-black text-slate-800 dark:text-slate-200 uppercase tracking-widest">Set Default</Text>
                                    </TouchableOpacity>
                                )}
                                <TouchableOpacity
                                    style={{ width: hScale(48), height: vScale(48), borderRadius: hScale(16), borderWidth: 1 }}
                                    className="bg-red-50 dark:bg-red-900/20 items-center justify-center border-red-100 dark:border-red-900/30"
                                    onPress={() => handleDelete(method.id, method.isDefault)}
                                >
                                    <Ionicons name="trash-outline" size={hScale(20)} color="#ef4444" />
                                </TouchableOpacity>
                            </View>
                        </Card>
                    ))
                ) : (
                    <View style={{ paddingVertical: vScale(80) }} className="items-center opacity-30">
                        <Ionicons name="card-outline" size={hScale(80)} color={isDark ? "#94a3b8" : "#cbd5e1"} />
                        <Text style={{ fontSize: fontSize.xl, marginTop: vScale(24) }} className="font-black text-slate-900 dark:text-white uppercase tracking-widest">Digital Vault Empty</Text>
                        <Text style={{ fontSize: fontSize.xs, marginTop: vScale(8), maxWidth: hScale(200) }} className="font-medium text-slate-500 dark:text-slate-500 text-center">Add a secure payment method for faster bookings</Text>
                    </View>
                )}
 
                <TouchableOpacity
                    style={{ height: vScale(64), borderRadius: hScale(24), marginTop: vScale(16), gap: spacing.md }}
                    className="flex-row items-center bg-blue-500 shadow-lg shadow-blue-500/20 items-center justify-center"
                    onPress={() => router.push('/profile/add-payment-method' as any)}
                >
                    <Ionicons name="add" size={hScale(24)} color="white" strokeWidth={3} />
                    <Text style={{ fontSize: fontSize.base }} className="text-white font-black uppercase tracking-widest">Add Payment Method</Text>
                </TouchableOpacity>
 
                <View style={{ borderRadius: hScale(28), padding: spacing.xl, marginTop: vScale(40), gap: spacing.lg, borderWidth: 1 }} className="flex-row bg-slate-100 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800/50 opacity-60">
                    <Ionicons name="shield-checkmark" size={hScale(24)} color={isDark ? "#4ade80" : "#22c55e"} />
                    <View className="flex-1">
                        <Text style={{ fontSize: hScale(10), marginBottom: vScale(4) }} className="font-black text-slate-800 dark:text-slate-200 uppercase tracking-widest">Encrypted Vault</Text>
                        <Text style={{ fontSize: hScale(10), lineHeight: vScale(16) }} className="font-bold text-slate-500 dark:text-slate-400 uppercase tracking-tighter">
                            Your payment information is end-to-end encrypted and securely stored. We never store full card numbers.
                        </Text>
                    </View>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}
