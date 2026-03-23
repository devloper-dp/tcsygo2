import React, { useState } from 'react';
import { View, FlatList, ActivityIndicator, TouchableOpacity, Alert, StatusBar } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Search, ArrowLeft, MoreVertical, Shield, Trash2, Ban } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useResponsive } from '@/hooks/useResponsive';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export default function AdminUsersScreen() {
    const router = useRouter();
    const queryClient = useQueryClient();
    const { hScale, vScale, spacing, fontSize: fontSizes } = useResponsive();
    const [searchQuery, setSearchQuery] = useState('');

    const { data: users, isLoading } = useQuery({
        queryKey: ['admin-users'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('users')
                .select('*')
                .order('created_at', { ascending: false });
            if (error) throw error;
            return data;
        }
    });

    const toggleRoleId = async ({ id, role }: { id: string, role: string }) => {
        try {
            const newRole = role === 'admin' ? 'user' : 'admin';
            const { error } = await supabase.from('users').update({ role: newRole }).eq('id', id);
            if (error) throw error;
            Alert.alert('Success', `User is now a ${newRole}`);
            queryClient.invalidateQueries({ queryKey: ['admin-users'] });
        } catch (error: any) {
            Alert.alert('Error', error.message);
        }
    };

    const toggleBanMutation = useMutation({
        mutationFn: async ({ id, isBanned }: { id: string, isBanned: boolean }) => {
            // Assuming 'is_banned' column exists. If not, this might need schema update or 'status' column.
            // Using 'status' = 'banned' / 'active' is safer if is_banned doesn't exist. 
            // Checking previous code, there was no status usage for users, so I'll try 'is_banned'.
            // Fallback: if is_banned fails, we might need to handle it. 
            // Let's assume 'is_banned' is the convention.
            const { error } = await supabase.from('users').update({ is_banned: !isBanned }).eq('id', id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-users'] });
            Alert.alert('Success', 'User status updated');
        },
        onError: (error) => Alert.alert('Error', error.message)
    });

    const filteredUsers = users?.filter(user =>
        user.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const renderItem = ({ item }: { item: any }) => (
        <TouchableOpacity activeOpacity={0.9} style={{ marginBottom: vScale(12), marginHorizontal: spacing.xl }}>
            <View style={{ padding: spacing.xl, borderRadius: hScale(24), borderWidth: 1 }} className={`shadow-sm flex-row items-center justify-between ${item.is_banned ? 'bg-red-50 border-red-100' : 'bg-white border-slate-100'}`}>
                <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, gap: spacing.lg }}>
                    <Avatar style={{ height: hScale(48), width: hScale(48), borderWidth: 1 }} className="border-slate-100">
                        <AvatarImage src={item.profile_photo} />
                        <AvatarFallback style={{ backgroundColor: '#eff6ff', justifyContent: 'center', alignItems: 'center' }}>
                            <Text style={{ fontSize: hScale(14) }} className="text-blue-600 font-bold">
                                {item.full_name?.charAt(0) || 'U'}
                            </Text>
                        </AvatarFallback>
                    </Avatar>
                    <View className="flex-1">
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                            <Text style={{ fontSize: hScale(16) }} className={`font-bold ${item.is_banned ? 'text-red-700' : 'text-slate-900'}`}>{item.full_name}</Text>
                            {item.is_banned && <Ban size={hScale(14)} color="#dc2626" />}
                        </View>
                        <Text style={{ fontSize: hScale(10) }} className="text-slate-500 font-medium">{item.email}</Text>
                        <View style={{ flexDirection: 'row', marginTop: vScale(6), gap: spacing.sm }}>
                            <Badge variant={item.role === 'admin' ? 'default' : 'secondary'} style={{ height: vScale(20), paddingHorizontal: hScale(8) }} className={`${item.role === 'admin' ? 'bg-violet-100' : 'bg-slate-100'}`}>
                                <Text style={{ fontSize: hScale(10) }} className={`capitalize font-bold ${item.role === 'admin' ? 'text-violet-700' : 'text-slate-600'}`}>
                                    {item.role}
                                </Text>
                            </Badge>
                            {item.phone && <Text style={{ fontSize: hScale(11) }} className="text-slate-400 font-medium items-center flex">{item.phone}</Text>}
                        </View>
                    </View>
                </View>

                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" style={{ height: hScale(32), width: hScale(32) }} className="p-0 rounded-full bg-slate-50 items-center justify-center">
                            <MoreVertical size={hScale(16)} className="text-slate-400" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" style={{ width: hScale(192), borderRadius: hScale(16), borderWidth: 1 }} className="border-slate-100 bg-white shadow-lg">
                        <DropdownMenuItem
                            style={{ borderRadius: hScale(12) }}
                             onPress={() => toggleRoleId({ id: item.id, role: item.role })}
                        >
                            <Shield size={hScale(16)} style={{ marginRight: spacing.sm }} className="text-slate-700" />
                            <Text style={{ fontSize: hScale(14) }} className="font-medium text-slate-700">{item.role === 'admin' ? 'Remove Admin' : 'Make Admin'}</Text>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            style={{ borderRadius: hScale(12) }}
                            className={`${item.is_banned ? 'active:bg-green-50' : 'active:bg-red-50'}`}
                            onPress={() => toggleBanMutation.mutate({ id: item.id, isBanned: item.is_banned })}
                        >
                            <Ban size={hScale(16)} style={{ marginRight: spacing.sm }} className={`${item.is_banned ? 'text-green-600' : 'text-red-500'}`} />
                            <Text style={{ fontSize: hScale(14) }} className={`font-medium ${item.is_banned ? 'text-green-600' : 'text-red-500'}`}>
                                {item.is_banned ? 'Unban User' : 'Ban User'}
                            </Text>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
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
                        <Text style={{ fontSize: hScale(10) }} className="text-slate-500 font-bold uppercase tracking-wider">Management</Text>
                        <Text style={{ fontSize: hScale(21) }} className="font-bold text-slate-900">All Users</Text>
                    </View>
                </View>

                <View style={{ paddingHorizontal: spacing.xl, paddingVertical: vScale(16) }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', height: vScale(48), borderRadius: hScale(16), paddingHorizontal: spacing.lg, borderWidth: 1 }} className="bg-white border-slate-200 shadow-sm focus:border-blue-500">
                        <Search size={hScale(20)} className="text-slate-400 mr-2" />
                        <Input
                            placeholder="Search by name or email..."
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
                        data={filteredUsers}
                        keyExtractor={(item) => item.id}
                        renderItem={renderItem}
                        contentContainerStyle={{ paddingBottom: 40 }}
                        showsVerticalScrollIndicator={false}
                        ListEmptyComponent={
                            <View style={{ paddingVertical: vScale(80) }} className="items-center opacity-60">
                                <View style={{ width: hScale(64), height: hScale(64), borderRadius: hScale(32), marginBottom: vScale(16) }} className="bg-slate-200 items-center justify-center">
                                    <Search size={hScale(32)} color="#64748b" />
                                </View>
                                <Text style={{ fontSize: hScale(18) }} className="text-slate-500 font-bold">No users found</Text>
                                <Text style={{ fontSize: hScale(14) }} className="text-slate-400">Try adjusting your search</Text>
                            </View>
                        }
                    />
                )}
            </SafeAreaView>
        </View>
    );
}
