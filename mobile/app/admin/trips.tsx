import React, { useState } from 'react';
import { View, FlatList, ActivityIndicator, TouchableOpacity, StatusBar } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Search, ArrowLeft, MapPin, Calendar, Clock, DollarSign, Navigation2, MoreVertical, Trash2 } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Alert } from 'react-native';
import { useResponsive } from '@/hooks/useResponsive';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export default function AdminTripsScreen() {
    const router = useRouter();
    const { hScale, vScale, spacing, fontSize: fontSizes } = useResponsive();
    const [searchQuery, setSearchQuery] = useState('');

    const { data: trips, isLoading } = useQuery({
        queryKey: ['admin-trips-full'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('trips')
                .select('*, driver:drivers(*, user:users(*))')
                .order('created_at', { ascending: false });
            if (error) throw error;
            return data;
        }
    });

    const filteredTrips = trips?.filter(trip =>
        trip.pickup_location?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        trip.drop_location?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        trip.driver?.user?.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const queryClient = useQueryClient(); // Add queryClient hook
    const cancelTripMutation = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase.from('trips').update({ status: 'cancelled' }).eq('id', id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-trips-full'] });
            Alert.alert('Success', 'Trip has been cancelled.');
        },
        onError: (e) => Alert.alert('Error', e.message)
    });

    const renderItem = ({ item }: { item: any }) => (
        <TouchableOpacity activeOpacity={0.9} style={{ marginBottom: vScale(16), marginHorizontal: spacing.xl }}>
            <View style={{ borderRadius: hScale(24), borderWidth: 1 }} className={`shadow-sm overflow-hidden ${item.status === 'cancelled' ? 'bg-slate-50 border-slate-200' : 'bg-white border-slate-100'}`}>
                {/* Status Bar */}
                <View style={{ height: vScale(6) }} className={`w-full ${item.status === 'ongoing' ? 'bg-green-500' : item.status === 'completed' ? 'bg-slate-300' : item.status === 'cancelled' ? 'bg-red-300' : 'bg-blue-500'}`} />

                <View style={{ padding: spacing.xl }}>
                    {/* Header: Driver & Date */}
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: vScale(16) }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
                            <Avatar style={{ height: hScale(40), width: hScale(40), borderWidth: 1 }} className="border-slate-100">
                                <AvatarImage src={item.driver?.user?.profile_photo} />
                                <AvatarFallback style={{ backgroundColor: '#f1f5f9', justifyContent: 'center', alignItems: 'center' }}>
                                    <View className="items-center justify-center">
                                      <Text style={{ fontSize: hScale(14) }} className="text-slate-600 font-medium">
                                          {item.driver?.user?.full_name?.charAt(0) || '?'}
                                      </Text>
                                    </View>
                                </AvatarFallback>
                            </Avatar>
                            <View>
                                <Text style={{ fontSize: hScale(14) }} className="font-bold text-slate-900">{item.driver?.user?.full_name || 'Unknown Driver'}</Text>
                                <Text style={{ fontSize: hScale(10) }} className="text-slate-400 font-medium">{format(new Date(item.created_at), 'PPP')}</Text>
                            </View>
                        </View>

                        {/* Admin Actions */}
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                            <View style={{ paddingHorizontal: hScale(10), paddingVertical: vScale(4), borderRadius: hScale(12), borderWidth: 1 }} className={`${item.status === 'ongoing' ? 'bg-green-50 border-green-100' : item.status === 'completed' ? 'bg-slate-50 border-slate-100' : item.status === 'cancelled' ? 'bg-red-50 border-red-100' : 'bg-blue-50 border-blue-100'}`}>
                                <Text style={{ fontSize: hScale(10) }} className={`uppercase font-bold tracking-wide ${item.status === 'ongoing' ? 'text-green-700' : item.status === 'completed' ? 'text-slate-500' : item.status === 'cancelled' ? 'text-red-700' : 'text-blue-700'}`}>
                                    {item.status}
                                </Text>
                            </View>

                            {item.status !== 'cancelled' && item.status !== 'completed' && (
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="sm" style={{ height: hScale(32), width: hScale(32) }} className="p-0 rounded-full bg-slate-50 items-center justify-center">
                                            <MoreVertical size={hScale(16)} className="text-slate-400" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" style={{ width: hScale(160), borderRadius: hScale(12), borderWidth: 1 }} className="border-slate-100 bg-white shadow-lg">
                                        <DropdownMenuItem
                                            style={{ borderRadius: hScale(8) }}
                                            className="active:bg-red-50"
                                            onPress={() => Alert.alert('Cancel Trip?', 'Are you sure you want to cancel this trip?', [
                                                { text: 'No', style: 'cancel' },
                                                { text: 'Yes, Cancel', style: 'destructive', onPress: () => cancelTripMutation.mutate(item.id) }
                                            ])}
                                        >
                                            <Trash2 size={hScale(16)} style={{ marginRight: spacing.sm }} className="text-red-500" />
                                            <Text style={{ fontSize: hScale(14) }} className="text-red-500 font-medium">Cancel Trip</Text>
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            )}
                        </View>
                    </View>

                    {/* Route */}
                    <View style={{ paddingLeft: hScale(16), borderLeftWidth: 2, marginLeft: hScale(6), gap: spacing.md, marginBottom: vScale(16) }} className="relative border-slate-100">
                        <View className="relative">
                            <View style={{ position: 'absolute', left: -hScale(21) - 1, top: vScale(4), width: hScale(12), height: hScale(12), borderRadius: hScale(6), borderWidth: 2 }} className={`border-white ring-2 ${item.status === 'cancelled' ? 'ring-slate-300 bg-slate-300' : 'ring-green-500 bg-green-500'}`} />
                            <Text style={{ fontSize: hScale(10), marginBottom: vScale(2) }} className="text-slate-400 font-bold uppercase tracking-wider">Pickup</Text>
                            <Text style={{ fontSize: hScale(14), lineHeight: vScale(20) }} className={`font-semibold ${item.status === 'cancelled' ? 'text-slate-400 line-through' : 'text-slate-800'}`} numberOfLines={2}>{item.pickup_location}</Text>
                        </View>
                        <View className="relative">
                            <View style={{ position: 'absolute', left: -hScale(21) - 1, top: vScale(4), width: hScale(12), height: hScale(12), borderRadius: hScale(6), borderWidth: 2 }} className={`border-white ring-2 ${item.status === 'cancelled' ? 'ring-slate-300 bg-slate-300' : 'ring-red-500 bg-red-500'}`} />
                            <Text style={{ fontSize: hScale(10), marginBottom: vScale(2) }} className="text-slate-400 font-bold uppercase tracking-wider">Dropoff</Text>
                            <Text style={{ fontSize: hScale(14), lineHeight: vScale(20) }} className={`font-semibold ${item.status === 'cancelled' ? 'text-slate-400 line-through' : 'text-slate-800'}`} numberOfLines={2}>{item.drop_location}</Text>
                        </View>
                    </View>

                    {/* Footer Stats */}
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingTop: vScale(16), borderTopWidth: 1, backgroundColor: 'rgba(248, 250, 252, 0.5)', marginHorizontal: -spacing.xl, marginBottom: -spacing.xl, paddingHorizontal: spacing.xl, paddingBottom: vScale(16), marginTop: vScale(4) }} className="border-slate-50">
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs, backgroundColor: '#ffffff', paddingHorizontal: hScale(12), paddingVertical: vScale(6), borderRadius: hScale(8), borderWidth: 1 }} className="border-slate-100 shadow-sm">
                            <DollarSign size={hScale(14)} className="text-emerald-600" />
                            <Text style={{ fontSize: hScale(14) }} className="font-bold text-slate-900">₹{item.price_per_seat}</Text>
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                            <Text style={{ fontSize: hScale(12) }} className="text-slate-400 font-medium">Seats:</Text>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs, backgroundColor: '#ffffff', paddingHorizontal: hScale(8), paddingVertical: vScale(4), borderRadius: hScale(6), borderWidth: 1 }} className="border-slate-100">
                                <UsersIcon size={hScale(12)} className="text-slate-600" />
                                <Text style={{ fontSize: hScale(12) }} className="font-bold text-slate-700">{item.available_seats}/{item.total_seats}</Text>
                            </View>
                        </View>
                    </View>
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
                        <Text style={{ fontSize: hScale(10) }} className="text-slate-500 font-bold uppercase tracking-wider">Logistics</Text>
                        <Text style={{ fontSize: hScale(21) }} className="font-bold text-slate-900">Trip Manifest</Text>
                    </View>
                </View>

                <View style={{ paddingHorizontal: spacing.xl, paddingVertical: vScale(16) }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', height: vScale(48), borderRadius: hScale(16), paddingHorizontal: spacing.lg, borderWidth: 1 }} className="bg-white border-slate-200 shadow-sm focus:border-blue-500">
                        <Search size={hScale(20)} className="text-slate-400 mr-2" />
                        <Input
                            placeholder="Search locations or drivers..."
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
                        <ActivityIndicator size="large" color="#0f172a" />
                    </View>
                ) : (
                    <FlatList
                        data={filteredTrips}
                        keyExtractor={(item) => item.id}
                        renderItem={renderItem}
                        contentContainerStyle={{ paddingBottom: 40 }}
                        showsVerticalScrollIndicator={false}
                        ListEmptyComponent={
                            <View style={{ paddingVertical: vScale(80) }} className="items-center opacity-60">
                                <View style={{ width: hScale(64), height: hScale(64), borderRadius: hScale(32), marginBottom: vScale(16) }} className="bg-slate-200 items-center justify-center">
                                    <Navigation2 size={hScale(32)} color="#64748b" />
                                </View>
                                <Text style={{ fontSize: hScale(18) }} className="text-slate-500 font-bold">No trips found</Text>
                            </View>
                        }
                    />
                )}
            </SafeAreaView>
        </View>
    );
}

// Helper icon
const UsersIcon = ({ size, className }: { size: number, className?: string }) => (
    <View style={{ width: size, height: size }} className={`items-center justify-center ${className}`}>
        {/* Simple visual representation if lucide icon isn't imported or needed inline */}
        <Text style={{ fontSize: size - 2, fontWeight: 'bold', color: 'inherit' }}>U</Text>
    </View>
);
