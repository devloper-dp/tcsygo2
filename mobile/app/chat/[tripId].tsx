import { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, FlatList, TouchableOpacity, KeyboardAvoidingView, Platform, ActivityIndicator, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { format } from 'date-fns';
import { useTheme } from '@/contexts/ThemeContext';
import { useResponsive } from '@/hooks/useResponsive';
 
interface Message {
    id: string;
    senderId: string;
    message: string;
    createdAt: string;
}
 
export default function ChatScreen() {
    const { tripId, otherUserId, otherUserName } = useLocalSearchParams();
    const router = useRouter();
    const { user } = useAuth();
    const { theme, isDark } = useTheme();
    const { hScale, vScale, spacing } = useResponsive();
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const flatListRef = useRef<FlatList>(null);
 
    useEffect(() => {
        fetchMessages();
 
        const channel = supabase
            .channel(`trip_chat:${tripId}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'messages',
                    filter: `trip_id=eq.${tripId}`,
                },
                (payload) => {
                    const message = payload.new;
                    const isRelevant =
                        (message.sender_id === user?.id && message.receiver_id === otherUserId) ||
                        (message.sender_id === otherUserId && message.receiver_id === user?.id);
 
                    if (isRelevant) {
                        setMessages((current) => {
                            if (current.some(m => m.id === message.id)) return current;
                            return [...current, {
                                id: message.id,
                                senderId: message.sender_id,
                                message: message.message,
                                createdAt: message.created_at,
                            }];
                        });
                    }
                }
            )
            .subscribe();
 
        return () => {
            supabase.removeChannel(channel);
        };
    }, [tripId, user?.id, otherUserId]);
 
    const fetchMessages = async () => {
        try {
            const { data, error } = await supabase
                .from('messages')
                .select('*')
                .eq('trip_id', tripId)
                .or(`sender_id.eq.${user?.id},receiver_id.eq.${user?.id}`)
                .or(`sender_id.eq.${otherUserId},receiver_id.eq.${otherUserId}`)
                .order('created_at', { ascending: true });
 
            if (error) throw error;
 
            setMessages(data.map((m: any) => ({
                id: m.id,
                senderId: m.sender_id,
                message: m.message,
                createdAt: m.created_at,
            })));
        } catch (error) {
            console.error('Error fetching messages:', error);
        } finally {
            setLoading(false);
        }
    };
 
    const sendMessage = async () => {
        if (!newMessage.trim()) return;
 
        setSending(true);
        try {
            const { error } = await supabase
                .from('messages')
                .insert({
                    trip_id: tripId,
                    sender_id: user?.id,
                    receiver_id: otherUserId,
                    message: newMessage.trim(),
                });
 
            if (error) throw error;
            setNewMessage('');
        } catch (error) {
            console.error('Error sending message:', error);
        } finally {
            setSending(false);
        }
    };
 
    const renderMessage = ({ item }: { item: Message }) => {
        const isMe = item.senderId === user?.id;
        return (
            <View style={{ marginBottom: vScale(24), maxWidth: '85%', alignSelf: isMe ? 'flex-end' : 'flex-start' }}>
                <View 
                    style={{ padding: spacing.xl, borderRadius: hScale(28), shadowOpacity: 0.05, shadowRadius: 3 }}
                    className={`${isMe 
                    ? 'bg-slate-900 dark:bg-blue-600 rounded-br-sm shadow-slate-900/10' 
                    : 'bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-bl-sm shadow-slate-900/5'}`}>
                    <Text style={{ fontSize: hScale(15), lineHeight: vScale(24) }} className={`font-bold tracking-tight ${isMe ? 'text-white' : 'text-slate-800 dark:text-slate-200'}`}>
                        {item.message}
                    </Text>
                    <Text style={{ fontSize: hScale(9), marginTop: vScale(8), opacity: 0.6 }} className={`font-black uppercase tracking-widest ${isMe ? 'text-blue-100 text-right' : 'text-slate-500'}`}>
                        {format(new Date(item.createdAt), 'hh:mm a')}
                    </Text>
                </View>
            </View>
        );
    };
 
    return (
        <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-950" edges={['top']}>
            <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
            
            {/* Header */}
            <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.xl, paddingVertical: vScale(20), borderBottomWidth: 1 }} className="border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-sm z-20">
                <TouchableOpacity 
                    onPress={() => router.back()} 
                    style={{ width: hScale(48), height: hScale(48), borderRadius: hScale(24), marginRight: spacing.lg, borderWidth: 1 }}
                    className="bg-slate-50 dark:bg-slate-900 items-center justify-center border-slate-100 dark:border-slate-800"
                >
                    <Ionicons name="arrow-back" size={hScale(24)} color={isDark ? "#f8fafc" : "#1e293b"} />
                </TouchableOpacity>
                <View className="flex-row items-center flex-1">
                    <View style={{ width: hScale(48), height: hScale(48), borderRadius: hScale(20), marginRight: spacing.lg, borderWidth: 1 }} className="bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 justify-center items-center relative">
                        <Text style={{ fontSize: hScale(18) }} className="text-slate-900 dark:text-slate-100 font-black">{((otherUserName as string) || 'U').charAt(0).toUpperCase()}</Text>
                        <View style={{ position: 'absolute', bottom: -hScale(0.5), right: -hScale(0.5), width: hScale(14), height: hScale(14), borderRadius: hScale(7), borderWidth: 2 }} className="bg-green-500 border-white dark:border-slate-950 shadow-sm" />
                    </View>
                    <View>
                        <Text style={{ fontSize: hScale(18) }} className="font-black text-slate-900 dark:text-white tracking-tighter uppercase">{otherUserName || 'User'}</Text>
                        <Text style={{ fontSize: hScale(10) }} className="font-black text-slate-500 dark:text-slate-500 uppercase tracking-widest">Secure Trip Channel</Text>
                    </View>
                </View>
            </View>
 
            <KeyboardAvoidingView
                className="flex-1"
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
            >
                {loading ? (
                    <View style={{ padding: spacing.xl }} className="flex-1 justify-center items-center bg-slate-50 dark:bg-slate-950">
                        <ActivityIndicator size="large" color={isDark ? "#ffffff" : "#3b82f6"} />
                        <Text style={{ fontSize: hScale(10), marginTop: vScale(24) }} className="font-black text-slate-400 dark:text-slate-600 uppercase tracking-[2px]">Decrypting History...</Text>
                    </View>
                ) : (
                    <FlatList
                        ref={flatListRef}
                        data={messages}
                        renderItem={renderMessage}
                        keyExtractor={(item) => item.id}
                        contentContainerStyle={{ padding: spacing.xl, flexGrow: 1, paddingBottom: vScale(40) }}
                        onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
                        showsVerticalScrollIndicator={false}
                        ListEmptyComponent={
                            <View style={{ paddingVertical: vScale(80), opacity: 0.4 }} className="flex-1 justify-center items-center">
                                <View style={{ width: hScale(96), height: hScale(96), borderRadius: hScale(48) }} className="bg-slate-100 dark:bg-slate-900 items-center justify-center mb-8">
                                    <Ionicons name="chatbubbles" size={hScale(40)} color={isDark ? "#334155" : "#cbd5e1"} />
                                </View>
                                <Text style={{ fontSize: hScale(24) }} className="font-black text-slate-900 dark:text-white uppercase tracking-tighter">No transmissions</Text>
                                <Text style={{ fontSize: hScale(12), marginTop: vScale(12) }} className="font-medium text-slate-500 dark:text-slate-500 text-center tracking-widest uppercase">Start a secure conversation.</Text>
                            </View>
                        }
                    />
                )}
 
                <View style={{ flexDirection: 'row', padding: spacing.xl, borderTopWidth: 1, alignItems: 'flex-end' }} className="bg-white dark:bg-slate-950 border-slate-100 dark:border-slate-800/50 shadow-2xl">
                    <TextInput
                        style={{ flex: 1, paddingHorizontal: spacing.xl, paddingVertical: vScale(16), marginRight: spacing.lg, fontSize: hScale(16), maxHeight: vScale(140), borderRadius: hScale(28), borderWidth: 1 }}
                        className="bg-slate-50 dark:bg-slate-900 border-slate-100 dark:border-slate-800 tracking-tight text-slate-900 dark:text-white shadow-inner"
                        placeholder="Type your message..."
                        placeholderTextColor={isDark ? "#475569" : "#94a3b8"}
                        value={newMessage}
                        onChangeText={setNewMessage}
                        multiline
                        maxLength={500}
                    />
                    <TouchableOpacity
                        style={{ width: hScale(56), height: hScale(56), borderRadius: hScale(16) }}
                        className={`justify-center items-center shadow-lg ${(!newMessage.trim() || sending) ? 'bg-slate-100 dark:bg-slate-900 opacity-50' : 'bg-slate-900 dark:bg-blue-600 shadow-slate-900/10'}`}
                        onPress={sendMessage}
                        disabled={!newMessage.trim() || sending}
                    >
                        {sending ? (
                            <ActivityIndicator size="small" color={isDark ? "#3b82f6" : "#64748b"} />
                        ) : (
                            <Ionicons name="send" size={hScale(24)} color="white" style={{ marginLeft: hScale(3) }} />
                        )}
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}
