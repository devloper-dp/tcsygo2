import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Users, Search, Trash2, Ban } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';

interface User {
    id: string;
    full_name: string;
    email: string;
    role: string;
    created_at: string;
}

export function UsersTab() {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('users')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setUsers(data || []);
        } catch (error) {
            console.error('Error fetching users:', error);
            Alert.alert('Error', 'Failed to load users');
        } finally {
            setLoading(false);
        }
    };

    const filteredUsers = users.filter(user =>
        user.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const renderUserItem = ({ item }: { item: User }) => (
        <Card className="mb-4">
            <CardContent className="flex-row items-center justify-between p-4">
                <View className="flex-1">
                    <Text className="text-lg font-bold text-foreground">{item.full_name || 'Unnamed User'}</Text>
                    <Text className="text-sm text-muted-foreground">{item.email}</Text>
                    <View className="flex-row mt-2">
                        <View className="bg-secondary px-2 py-1 rounded-md mr-2">
                            <Text className="text-xs text-secondary-foreground capitalize">{item.role}</Text>
                        </View>
                        <Text className="text-xs text-muted-foreground mt-1">
                            Joined: {new Date(item.created_at).toLocaleDateString()}
                        </Text>
                    </View>
                </View>
                <View className="flex-row gap-2">
                    {/* Placeholder actions */}
                    <Button variant="ghost" size="icon">
                        <Ban size={20} className="text-destructive" />
                    </Button>
                </View>
            </CardContent>
        </Card>
    );

    return (
        <View className="flex-1">
            <View className="flex-row items-center gap-2 mb-4">
                <View className="flex-1 flex-row items-center bg-secondary rounded-lg px-3 h-12">
                    <Search size={20} className="text-muted-foreground mr-2" />
                    <Input
                        placeholder="Search users..."
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        className="flex-1 h-full border-0 bg-transparent"
                    />
                </View>
            </View>

            {loading ? (
                <ActivityIndicator size="large" className="mt-8" />
            ) : (
                <FlatList
                    data={filteredUsers}
                    keyExtractor={(item) => item.id}
                    renderItem={renderUserItem}
                    ListEmptyComponent={
                        <Text className="text-center text-muted-foreground mt-8">No users found</Text>
                    }
                    contentContainerStyle={{ paddingBottom: 20 }}
                />
            )}
        </View>
    );
}
