import { useState, useEffect } from 'react';
import { View, KeyboardAvoidingView, Platform, Alert, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { ChatHeader, ChatMessagesList, ChatInput } from '../../components/ChatComponents';
import { queryClient } from '@/lib/queryClient';
import { useTheme } from '@/contexts/ThemeContext';
 
interface Message {
    id: string;
    senderId: string;
    message: string;
    createdAt: string;
    isRead: boolean;
}
 
const ChatScreen = () => {
    const router = useRouter();
    const params = useLocalSearchParams();
    const { user } = useAuth();
    const { isDark } = useTheme();
    const [newMessage, setNewMessage] = useState('');
    const [otherUserId, setOtherUserId] = useState<string | null>(null);
    const [otherUserName, setOtherUserName] = useState<string>('User');
 
    const tripId = params.id as string;
 
    // Fetch trip details to determine the other user
    const { data: trip } = useQuery({
        queryKey: ['trip', tripId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('trips')
                .select(`
                    *,
                    driver:drivers(
                        user_id,
                        user:users(id, full_name)
                    )
                `)
                .eq('id', tripId)
                .single();
 
            if (error) throw error;
            return data;
        },
        enabled: !!tripId,
    });
 
    // Determine other user based on trip data
    useEffect(() => {
        if (trip && user) {
            const driverUserId = trip.driver?.user?.id;
 
            if (params.userId) {
                const userId = Array.isArray(params.userId) ? params.userId[0] : params.userId;
                const userName = Array.isArray(params.userName) ? params.userName[0] : params.userName;
                setOtherUserId(userId || null);
                setOtherUserName(userName || 'User');
            } else if (user.id === driverUserId) {
                fetchPassenger();
            } else {
                setOtherUserId(driverUserId);
                setOtherUserName(trip.driver?.user?.full_name || 'Driver');
            }
        }
    }, [trip, user, params]);
 
    const fetchPassenger = async () => {
        if (!tripId) return;
 
        const { data: bookings } = await supabase
            .from('bookings')
            .select(`
                passenger_id,
                passenger:users(id, full_name)
            `)
            .eq('trip_id', tripId)
            .limit(1);
 
        if (bookings && bookings.length > 0) {
            const booking = bookings[0] as any;
            setOtherUserId(booking.passenger_id);
            setOtherUserName(booking.passenger?.full_name || 'Passenger');
        }
    };
 
    // Fetch messages
    const { data: messages, isLoading } = useQuery<Message[]>({
        queryKey: ['chat-messages', tripId, user?.id, otherUserId],
        queryFn: async () => {
            if (!otherUserId) return [];
 
            const { data, error } = await supabase
                .from('messages')
                .select('*')
                .eq('trip_id', tripId)
                .or(`and(sender_id.eq.${user?.id},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${user?.id})`)
                .order('created_at', { ascending: true });
 
            if (error) throw error;
 
            return data.map((m: any) => ({
                id: m.id,
                senderId: m.sender_id,
                message: m.message,
                createdAt: m.created_at,
                isRead: m.is_read || false,
            }));
        },
        enabled: !!tripId && !!user && !!otherUserId,
    });
 
    // Real-time subscription
    useEffect(() => {
        if (!tripId || !user || !otherUserId) return;
 
        const channel = supabase
            .channel(`chat-${tripId}-${user.id}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'messages',
                    filter: `trip_id=eq.${tripId}`,
                },
                (payload) => {
                    const newMsg = payload.new as any;
                    if (
                        (newMsg.sender_id === user.id && newMsg.receiver_id === otherUserId) ||
                        (newMsg.sender_id === otherUserId && newMsg.receiver_id === user.id)
                    ) {
                        queryClient.invalidateQueries({ queryKey: ['chat-messages', tripId] });
 
                        if (newMsg.receiver_id === user.id) {
                            markAsRead(newMsg.id);
                        }
                    }
                }
            )
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'messages',
                    filter: `trip_id=eq.${tripId}`,
                },
                () => {
                    queryClient.invalidateQueries({ queryKey: ['chat-messages', tripId] });
                }
            )
            .subscribe();
 
        return () => {
            supabase.removeChannel(channel);
        };
    }, [tripId, user, otherUserId]);
 
    const markAsRead = async (messageId: string) => {
        await supabase
            .from('messages')
            .update({ is_read: true })
            .eq('id', messageId)
            .eq('receiver_id', user?.id);
    };
 
    useEffect(() => {
        if (messages && otherUserId) {
            messages.forEach((msg) => {
                if (msg.senderId === otherUserId && !msg.isRead) {
                    markAsRead(msg.id);
                }
            });
        }
    }, [messages, otherUserId]);
 
    const sendMessageMutation = useMutation({
        mutationFn: async (message: string) => {
            if (!otherUserId) {
                throw new Error('Recipient not found');
            }
 
            const { error } = await supabase
                .from('messages')
                .insert({
                    trip_id: tripId,
                    sender_id: user?.id,
                    receiver_id: otherUserId,
                    message: message,
                    is_read: false,
                });
 
            if (error) throw error;
        },
        onSuccess: () => {
            setNewMessage('');
        },
        onError: (error: any) => {
            Alert.alert('Error', error.message || 'Failed to send message');
        },
    });
 
    const handleSend = () => {
        if (!newMessage.trim()) return;
        sendMessageMutation.mutate(newMessage);
    };
 
    return (
        <SafeAreaView className="flex-1 bg-white dark:bg-slate-950" edges={['top']}>
            <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
            <ChatHeader
                userName={otherUserName}
                onBack={() => router.back()}
            />
 
            <KeyboardAvoidingView
                className="flex-1"
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
            >
                <ChatMessagesList
                    messages={messages || []}
                    currentUserId={user?.id || ''}
                    otherUserName={otherUserName}
                    isLoading={isLoading}
                />
 
                <ChatInput
                    value={newMessage}
                    onChangeText={setNewMessage}
                    onSend={handleSend}
                    disabled={sendMessageMutation.isPending || !otherUserId}
                />
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};
 
export default ChatScreen;
