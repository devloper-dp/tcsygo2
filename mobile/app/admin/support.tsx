import React, { useState } from 'react';
import { View, FlatList, ActivityIndicator, TouchableOpacity, StatusBar } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from '@/components/ui/text';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Search, MessageSquare, Clock, CheckCircle2, AlertCircle } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { useResponsive } from '@/hooks/useResponsive';

export default function AdminSupportScreen() {
    const router = useRouter();
    const { hScale, vScale, spacing, fontSize: fontSizes } = useResponsive();
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'closed'>('all');

    const { data: tickets, isLoading } = useQuery({
        queryKey: ['admin-support'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('support_tickets')
                .select('*') // In real app, join with users
                .order('created_at', { ascending: false });

            if (error) {
                if (error.code === '42P01') return [];
                throw error;
            }
            return data;
        }
    });

    const filteredTickets = tickets?.filter(t =>
        (statusFilter === 'all' || t.status === statusFilter) &&
        (t.subject?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            t.description?.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    const renderItem = ({ item }: { item: any }) => (
        <TouchableOpacity activeOpacity={0.9} style={{ marginHorizontal: spacing.xl, marginBottom: vScale(16) }}>
            <View style={{ padding: spacing.xl, borderRadius: hScale(24), borderWidth: 1 }} className="bg-white shadow-sm border-slate-100">
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: vScale(8) }}>
                    <View style={{ flex: 1, marginRight: spacing.xl }}>
                        <Text style={{ fontSize: hScale(16), lineHeight: vScale(22) }} className="font-bold text-slate-900" numberOfLines={2}>{item.subject}</Text>
                        <Text style={{ fontSize: hScale(10), marginTop: vScale(4) }} className="text-slate-400">Ticket #{item.id.substring(0, 8).toUpperCase()}</Text>
                    </View>
                    <View style={{ paddingHorizontal: hScale(10), paddingVertical: vScale(4), borderRadius: hScale(12), borderWidth: 1 }} className={`${item.status === 'open' ? 'bg-red-50 border-red-100' : item.status === 'pending' ? 'bg-orange-50 border-orange-100' : 'bg-green-50 border-green-100'}`}>
                        <Text style={{ fontSize: hScale(10) }} className={`font-bold uppercase tracking-wider ${item.status === 'open' ? 'text-red-600' : item.status === 'pending' ? 'text-orange-600' : 'text-green-600'}`}>
                            {item.status}
                        </Text>
                    </View>
                </View>

                <Text style={{ fontSize: hScale(14), marginBottom: vScale(16) }} className="text-slate-500" numberOfLines={2}>{item.description}</Text>

                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: vScale(12), borderTopWidth: 1 }} className="border-slate-50">
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                        <Clock size={hScale(14)} color="#94a3b8" />
                        <Text style={{ fontSize: hScale(11) }} className="text-slate-400 font-medium">
                            {format(new Date(item.created_at), 'MMM d, h:mm a')}
                        </Text>
                    </View>
                    {item.user_email && (
                        <Text style={{ fontSize: hScale(11) }} className="text-blue-500 font-medium">{item.user_email}</Text>
                    )}
                </View>
            </View>
        </TouchableOpacity>
    );

    return (
        <View className="flex-1 bg-slate-50">
            <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
            <SafeAreaView className="flex-1" edges={['top']}>
                {/* Header */}
                <View style={{ paddingHorizontal: spacing.xl, paddingVertical: vScale(16), gap: spacing.lg, borderBottomWidth: 1 }} className="bg-white border-gray-50 flex-row items-center shadow-sm z-10">
                    <TouchableOpacity
                        onPress={() => router.back()}
                        style={{ width: hScale(40), height: hScale(40), borderRadius: hScale(20) }}
                        className="bg-slate-50 items-center justify-center active:bg-slate-100"
                    >
                        <ArrowLeft size={hScale(20)} color="#1e293b" />
                    </TouchableOpacity>
                    <View>
                        <Text style={{ fontSize: hScale(10) }} className="text-slate-500 font-bold uppercase tracking-wider">Help Desk</Text>
                        <Text style={{ fontSize: hScale(21) }} className="font-bold text-slate-900">Support Tickets</Text>
                    </View>
                </View>

                {/* Filters */}
                <View style={{ paddingHorizontal: spacing.xl, paddingVertical: vScale(16), gap: spacing.xl, borderBottomWidth: 1 }} className="bg-white border-slate-50">
                    <View style={{ flexDirection: 'row', alignItems: 'center', height: vScale(48), borderRadius: hScale(16), paddingHorizontal: spacing.lg, borderWidth: 1 }} className="bg-slate-50 border-slate-100">
                        <Search size={hScale(20)} className="text-slate-400 mr-2" />
                        <Input
                            placeholder="Search tickets..."
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                            style={{ fontSize: hScale(14) }}
                            className="flex-1 h-full border-0 bg-transparent font-medium text-slate-900 placeholder:text-slate-400"
                            placeholderTextColor="#94a3b8"
                        />
                    </View>

                    <View style={{ flexDirection: 'row', gap: spacing.md }}>
                        <TouchableOpacity
                            onPress={() => setStatusFilter('all')}
                            style={{ paddingHorizontal: hScale(16), paddingVertical: vScale(8), borderRadius: hScale(12), borderWidth: 1 }}
                            className={`${statusFilter === 'all' ? 'bg-slate-900 border-slate-900' : 'bg-white border-slate-200'}`}
                        >
                            <Text style={{ fontSize: hScale(11) }} className={`font-bold ${statusFilter === 'all' ? 'text-white' : 'text-slate-600'}`}>All</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={() => setStatusFilter('open')}
                            style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingHorizontal: hScale(16), paddingVertical: vScale(8), borderRadius: hScale(12), borderWidth: 1 }}
                            className={`${statusFilter === 'open' ? 'bg-red-50 border-red-200' : 'bg-white border-slate-200'}`}
                        >
                            <AlertCircle size={hScale(14)} color={statusFilter === 'open' ? '#dc2626' : '#64748b'} />
                            <Text style={{ fontSize: hScale(11) }} className={`font-bold ${statusFilter === 'open' ? 'text-red-700' : 'text-slate-600'}`}>Open</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={() => setStatusFilter('closed')}
                            style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingHorizontal: hScale(16), paddingVertical: vScale(8), borderRadius: hScale(12), borderWidth: 1 }}
                            className={`${statusFilter === 'closed' ? 'bg-green-50 border-green-200' : 'bg-white border-slate-200'}`}
                        >
                            <CheckCircle2 size={hScale(14)} color={statusFilter === 'closed' ? '#16a34a' : '#64748b'} />
                            <Text style={{ fontSize: hScale(11) }} className={`font-bold ${statusFilter === 'closed' ? 'text-green-700' : 'text-slate-600'}`}>Resolved</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {isLoading ? (
                    <View className="flex-1 justify-center items-center">
                        <ActivityIndicator size="large" color="#3b82f6" />
                    </View>
                ) : (
                    <FlatList
                        data={filteredTickets}
                        keyExtractor={item => item.id}
                        renderItem={renderItem}
                        contentContainerStyle={{ paddingBottom: 40, paddingTop: 20 }}
                        ListEmptyComponent={
                            <View style={{ paddingVertical: vScale(80) }} className="items-center opacity-60">
                                <View style={{ width: hScale(64), height: hScale(64), borderRadius: hScale(32), marginBottom: vScale(16) }} className="bg-slate-200 items-center justify-center">
                                    <MessageSquare size={hScale(32)} color="#64748b" />
                                </View>
                                <Text style={{ fontSize: hScale(18) }} className="text-slate-500 font-bold">No tickets found</Text>
                                <Text style={{ fontSize: hScale(14) }} className="text-slate-400">Everything is running smoothly</Text>
                            </View>
                        }
                    />
                )}
            </SafeAreaView>
        </View>
    );
}
