import { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Bell } from 'lucide-react-native';
import { formatDistanceToNow } from 'date-fns';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

interface NotificationInterface {
    id: string;
    title: string;
    message: string;
    type: string;
    isRead: boolean;
    createdAt: string;
}

export function NotificationDropdown() {
    const { user } = useAuth();
    const queryClient = useQueryClient();

    const { data: notifications } = useQuery<NotificationInterface[]>({
        queryKey: ['notifications', user?.id],
        queryFn: async () => {
            if (!user) return [];
            const { data, error } = await supabase
                .from('notifications')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });

            if (error) throw error;

            return data.map((n: any) => ({
                id: n.id,
                title: n.title,
                message: n.message,
                type: n.type,
                isRead: n.is_read,
                createdAt: n.created_at
            }));
        },
        refetchInterval: 60000,
        enabled: !!user,
    });

    const markReadMutation = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase
                .from('notifications')
                .update({ is_read: true })
                .eq('id', id);

            if (error) throw error;
            return true;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['notifications', user?.id] });
        }
    });

    const markAllReadMutation = useMutation({
        mutationFn: async () => {
            if (!user) return;
            const { error } = await supabase
                .from('notifications')
                .update({ is_read: true })
                .eq('user_id', user.id);

            if (error) throw error;
            return true;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['notifications', user?.id] });
        }
    });

    const unreadCount = notifications?.filter(n => !n.isRead).length || 0;

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                    <Bell size={24} color="#000" />
                    {unreadCount > 0 && (
                        <View className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
                    )}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-80">
                <DropdownMenuLabel className="flex-row items-center justify-between">
                    <Text className='font-semibold'>Notifications</Text>
                    {unreadCount > 0 && (
                        <TouchableOpacity
                            onPress={() => markAllReadMutation.mutate()}
                        >
                            <Text className="text-xs text-blue-600">Mark all read</Text>
                        </TouchableOpacity>
                    )}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <ScrollView className="max-h-[300px]">
                    {notifications && notifications.length > 0 ? (
                        notifications.map((notification) => (
                            <DropdownMenuItem
                                key={notification.id}
                                className={`flex-col items-start p-3 ${!notification.isRead ? 'bg-gray-100' : ''}`}
                                onSelect={() => !notification.isRead && markReadMutation.mutate(notification.id)}
                            >
                                <Text className="font-medium text-sm mb-1">{notification.title}</Text>
                                <Text className="text-xs text-gray-500 mb-1">{notification.message}</Text>
                                <Text className="text-[10px] text-gray-400">
                                    {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                                </Text>
                            </DropdownMenuItem>
                        ))
                    ) : (
                        <View className="p-4 items-center">
                            <Text className="text-sm text-gray-500">No notifications</Text>
                        </View>
                    )}
                </ScrollView>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
