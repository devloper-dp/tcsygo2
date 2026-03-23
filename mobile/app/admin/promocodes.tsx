import React, { useState } from 'react';
import { View, FlatList, ActivityIndicator, TouchableOpacity, StatusBar, Modal, ScrollView, Switch } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from '@/components/ui/text';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Ticket, Plus, Search, Trash2, Copy, Calendar, Percent, DollarSign, X } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { useResponsive } from '@/hooks/useResponsive';

export default function AdminPromoCodesScreen() {
    const router = useRouter();
    const queryClient = useQueryClient();
    const { hScale, vScale, spacing, fontSize: fontSizes } = useResponsive();
    const [searchQuery, setSearchQuery] = useState('');
    const [isCreateModalVisible, setIsCreateModalVisible] = useState(false);

    // New Promo Form State
    const [newCode, setNewCode] = useState('');
    const [discountAmount, setDiscountAmount] = useState('');
    const [discountType, setDiscountType] = useState<'percent' | 'fixed'>('percent');
    const [usageLimit, setUsageLimit] = useState('');

    const { data: promos, isLoading } = useQuery({
        queryKey: ['admin-promos'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('promo_codes')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) {
                // Return empty if table doesn't exist yet to prevent crash
                if (error.code === '42P01') return [];
                throw error;
            }
            return data;
        }
    });

    const createPromoMutation = useMutation({
        mutationFn: async () => {
            const { error } = await supabase.from('promo_codes').insert({
                code: newCode.toUpperCase(),
                discount_amount: parseFloat(discountAmount),
                discount_type: discountType,
                usage_limit: usageLimit ? parseInt(usageLimit) : null,
                expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days default
            });
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-promos'] });
            setIsCreateModalVisible(false);
            setNewCode('');
            setDiscountAmount('');
            setUsageLimit('');
        }
    });

    const deletePromoMutation = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase.from('promo_codes').delete().eq('id', id);
            if (error) throw error;
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-promos'] })
    });

    const filteredPromos = promos?.filter(p => p.code.toLowerCase().includes(searchQuery.toLowerCase()));

    const renderItem = ({ item }: { item: any }) => (
        <View style={{ marginHorizontal: spacing.xl, marginBottom: vScale(16), borderRadius: hScale(24), padding: spacing.xl, borderWidth: 1 }} className="bg-white shadow-sm border-slate-100 relative overflow-hidden">
            {/* Decorative Circles */}
            <View style={{ position: 'absolute', left: -hScale(12), top: '50%', marginTop: -hScale(12), width: hScale(24), height: hScale(24), borderRadius: hScale(12), borderRightWidth: 1 }} className="bg-slate-50 border-slate-100" />
            <View style={{ position: 'absolute', right: -hScale(12), top: '50%', marginTop: -hScale(12), width: hScale(24), height: hScale(24), borderRadius: hScale(12), borderLeftWidth: 1 }} className="bg-slate-50 border-slate-100" />

            <View className="flex-row justify-between items-start mb-3">
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
                    <View style={{ width: hScale(48), height: hScale(48), borderRadius: hScale(16), borderWidth: 1 }} className="bg-blue-50 items-center justify-center border-blue-100">
                        <Ticket size={hScale(24)} color="#3b82f6" />
                    </View>
                    <View>
                        <Text style={{ fontSize: hScale(20) }} className="font-black text-slate-900 tracking-wider">{item.code}</Text>
                        <Text style={{ fontSize: hScale(10) }} className="text-slate-400 font-bold uppercase">
                            {item.discount_type === 'percent' ? 'Percentage Discount' : 'Flat Discount'}
                        </Text>
                    </View>
                </View>
                <TouchableOpacity
                    onPress={() => deletePromoMutation.mutate(item.id)}
                    style={{ width: hScale(32), height: hScale(32), borderRadius: hScale(16) }}
                    className="bg-slate-50 items-center justify-center"
                >
                    <Trash2 size={hScale(14)} color="#ef4444" />
                </TouchableOpacity>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.lg, paddingVertical: vScale(12), borderTopWidth: 1 }} className="border-dashed border-slate-200">
                <View>
                    <Text style={{ fontSize: hScale(10), marginBottom: vScale(4) }} className="text-slate-400 font-medium">Benefit</Text>
                    <Text style={{ fontSize: hScale(18) }} className="font-bold text-green-600">
                        {item.discount_type === 'percent' ? `${item.discount_amount}% OFF` : `₹${item.discount_amount} OFF`}
                    </Text>
                </View>
                <View style={{ width: 1, height: vScale(32) }} className="bg-slate-100" />
                <View>
                    <Text style={{ fontSize: hScale(10), marginBottom: vScale(4) }} className="text-slate-400 font-medium">Expires</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
                        <Calendar size={hScale(12)} color="#64748b" />
                        <Text style={{ fontSize: hScale(14) }} className="font-bold text-slate-700">
                            {item.expires_at ? format(new Date(item.expires_at), 'dd MMM yyyy') : 'Never'}
                        </Text>
                    </View>
                </View>
                <View style={{ width: 1, height: vScale(32) }} className="bg-slate-100" />
                <View>
                    <Text style={{ fontSize: hScale(10), marginBottom: vScale(4) }} className="text-slate-400 font-medium">Used</Text>
                    <Text style={{ fontSize: hScale(14) }} className="font-bold text-slate-700">{item.times_used || 0} times</Text>
                </View>
            </View>
        </View>
    );

    return (
        <View className="flex-1 bg-slate-50">
            <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
            <SafeAreaView className="flex-1" edges={['top']}>
                {/* Header */}
                <View style={{ paddingHorizontal: spacing.xl, paddingVertical: vScale(16), borderBottomWidth: 1 }} className="bg-white border-gray-50 flex-row items-center justify-between shadow-sm z-10">
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.lg }}>
                        <TouchableOpacity
                            onPress={() => router.back()}
                            style={{ width: hScale(40), height: hScale(40), borderRadius: hScale(20) }}
                            className="bg-slate-50 items-center justify-center active:bg-slate-100"
                        >
                            <ArrowLeft size={hScale(20)} color="#1e293b" />
                        </TouchableOpacity>
                        <View>
                            <Text style={{ fontSize: hScale(10) }} className="text-slate-500 font-bold uppercase tracking-wider">Marketing</Text>
                            <Text style={{ fontSize: hScale(21) }} className="font-bold text-slate-900">Promo Codes</Text>
                        </View>
                    </View>
                    <TouchableOpacity
                        onPress={() => setIsCreateModalVisible(true)}
                        style={{ width: hScale(40), height: hScale(40), borderRadius: hScale(20) }}
                        className="bg-blue-600 items-center justify-center shadow-lg shadow-blue-200"
                    >
                        <Plus size={hScale(24)} color="white" />
                    </TouchableOpacity>
                </View>

                {/* Subheader / Search */}
                <View style={{ paddingHorizontal: spacing.xl, paddingVertical: vScale(16) }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', height: vScale(48), borderRadius: hScale(16), paddingHorizontal: spacing.lg, borderWidth: 1 }} className="bg-white border-slate-200 shadow-sm">
                        <Search size={hScale(20)} className="text-slate-400 mr-2" />
                        <Input
                            placeholder="Search coupon codes..."
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                            style={{ fontSize: hScale(14) }}
                            className="flex-1 h-full border-0 bg-transparent font-medium text-slate-900 placeholder:text-slate-400"
                            placeholderTextColor="#94a3b8"
                        />
                    </View>
                </View>

                {isLoading ? (
                    <View className="flex-1 justify-center items-center">
                        <ActivityIndicator size="large" color="#3b82f6" />
                    </View>
                ) : (
                    <FlatList
                        data={filteredPromos}
                        keyExtractor={item => item.id}
                        renderItem={renderItem}
                        contentContainerStyle={{ paddingBottom: 100 }}
                        ListEmptyComponent={
                            <View style={{ paddingVertical: vScale(80) }} className="items-center opacity-60">
                                <View style={{ width: hScale(64), height: hScale(64), borderRadius: hScale(32), marginBottom: vScale(16) }} className="bg-slate-200 items-center justify-center">
                                    <Ticket size={hScale(32)} color="#64748b" />
                                </View>
                                <Text style={{ fontSize: hScale(18) }} className="text-slate-500 font-bold">No active promos</Text>
                                <Text style={{ fontSize: hScale(14) }} className="text-slate-400">Create one to get started</Text>
                            </View>
                        }
                    />
                )}
            </SafeAreaView>

            {/* Create Modal */}
            <Modal
                visible={isCreateModalVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setIsCreateModalVisible(false)}
            >
                <View className="flex-1 bg-black/50 justify-end">
                    <View style={{ borderTopLeftRadius: hScale(24), borderTopRightRadius: hScale(24), padding: spacing.xl, minHeight: '60%' }} className="bg-white">
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: vScale(24) }}>
                            <Text style={{ fontSize: hScale(20) }} className="font-bold text-slate-900">New Promo Code</Text>
                            <TouchableOpacity onPress={() => setIsCreateModalVisible(false)} style={{ padding: spacing.sm, borderRadius: hScale(20) }} className="bg-slate-50">
                                <X size={hScale(20)} color="#64748b" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView className="flex-1">
                            <View style={{ gap: spacing.xl }}>
                                <View>
                                    <Text style={{ fontSize: hScale(14), marginBottom: vScale(8) }} className="font-bold text-slate-700">Coupon Code</Text>
                                    <Input
                                        placeholder="e.g. SUMMER50"
                                        value={newCode}
                                        onChangeText={text => setNewCode(text.toUpperCase())}
                                        style={{ height: vScale(56), borderRadius: hScale(12), fontSize: hScale(18) }}
                                        className="bg-slate-50 border-slate-200 font-bold"
                                        maxLength={10}
                                    />
                                    <Text style={{ fontSize: hScale(10), marginTop: vScale(4) }} className="text-slate-400">Codes are automatically uppercase.</Text>
                                </View>

                                <View style={{ flexDirection: 'row', gap: spacing.lg }}>
                                    <View className="flex-1">
                                        <Text style={{ fontSize: hScale(14), marginBottom: vScale(8) }} className="font-bold text-slate-700">Discount Value</Text>
                                        <Input
                                            placeholder="0"
                                            keyboardType="numeric"
                                            value={discountAmount}
                                            onChangeText={setDiscountAmount}
                                            style={{ height: vScale(56), borderRadius: hScale(12) }}
                                            className="bg-slate-50 border-slate-200"
                                        />
                                    </View>
                                    <View className="flex-1">
                                        <Text style={{ fontSize: hScale(14), marginBottom: vScale(8) }} className="font-bold text-slate-700">Type</Text>
                                        <View style={{ flexDirection: 'row', height: vScale(56), borderRadius: hScale(12), padding: spacing.xs, borderWidth: 1 }} className="bg-slate-50 border-slate-200">
                                            <TouchableOpacity
                                                onPress={() => setDiscountType('percent')}
                                                className={`flex-1 items-center justify-center rounded-lg ${discountType === 'percent' ? 'bg-white shadow-sm' : ''}`}
                                            >
                                                <Percent size={hScale(18)} color={discountType === 'percent' ? '#3b82f6' : '#94a3b8'} />
                                            </TouchableOpacity>
                                            <TouchableOpacity
                                                onPress={() => setDiscountType('fixed')}
                                                className={`flex-1 items-center justify-center rounded-lg ${discountType === 'fixed' ? 'bg-white shadow-sm' : ''}`}
                                            >
                                                <DollarSign size={hScale(18)} color={discountType === 'fixed' ? '#3b82f6' : '#94a3b8'} />
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                </View>

                                <View>
                                    <Text style={{ fontSize: hScale(14), marginBottom: vScale(8) }} className="font-bold text-slate-700">Usage Limit (Optional)</Text>
                                    <Input
                                        placeholder="Unlimited"
                                        keyboardType="numeric"
                                        value={usageLimit}
                                        onChangeText={setUsageLimit}
                                        style={{ height: vScale(56), borderRadius: hScale(12) }}
                                        className="bg-slate-50 border-slate-200"
                                    />
                                </View>
                            </View>
                        </ScrollView>

                        <Button
                            style={{ height: vScale(56), borderRadius: hScale(16), marginTop: vScale(16) }}
                            className="bg-slate-900 shadow-lg shadow-slate-300"
                            onPress={() => createPromoMutation.mutate()}
                            disabled={createPromoMutation.isPending || !newCode || !discountAmount}
                        >
                            {createPromoMutation.isPending ? (
                                <ActivityIndicator color="white" />
                            ) : (
                                <Text style={{ fontSize: hScale(18) }} className="text-white font-bold">Create Coupon</Text>
                            )}
                        </Button>
                    </View>
                </View>
            </Modal>
        </View>
    );
}
