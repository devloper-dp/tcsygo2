import { View, ScrollView, TextInput, TouchableOpacity, Text, ActivityIndicator } from 'react-native';
import { Send, ArrowLeft, Check, CheckCheck, Clock, MessageSquare, Hourglass } from 'lucide-react-native';
import { format } from 'date-fns';
import { useRef, useEffect } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { useResponsive } from '@/hooks/useResponsive';
 
interface Message {
    id: string;
    senderId: string;
    message: string;
    createdAt: string;
    isRead?: boolean;
}
 
interface ChatMessageBubbleProps {
    message: Message;
    isMe: boolean;
    senderName?: string;
}
 
export function ChatMessageBubble({ message, isMe, senderName }: ChatMessageBubbleProps) {
    const { isDark } = useTheme();
    const { hScale, vScale, spacing } = useResponsive();
    
    return (
        <View style={{ marginBottom: vScale(24), maxWidth: '85%', alignSelf: isMe ? 'flex-end' : 'flex-start' }}>
            {!isMe && senderName && (
                <Text style={{ fontSize: hScale(9), marginBottom: vScale(8), marginLeft: hScale(16) }} className="text-slate-400 dark:text-slate-500 font-black uppercase tracking-widest">{senderName}</Text>
            )}
            <View
                style={{ padding: spacing.xl, borderRadius: hScale(28), shadowOpacity: 0.1, shadowRadius: 4 }}
                className={`${isMe
                        ? 'bg-slate-900 dark:bg-blue-600 rounded-br-sm shadow-slate-900/10'
                        : 'bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-bl-sm shadow-slate-900/5'
                    }`}
            >
                <Text style={{ fontSize: hScale(15), lineHeight: vScale(24) }} className={`font-bold tracking-tight ${isMe ? 'text-white' : 'text-slate-800 dark:text-slate-200'}`}>
                    {message.message}
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: vScale(12), alignSelf: 'flex-end', gap: spacing.xs, opacity: 0.6 }}>
                    <Clock size={hScale(10)} color={isMe ? "#ffffff" : (isDark ? "#94a3b8" : "#64748b")} />
                    <Text style={{ fontSize: hScale(9) }} className={`font-black uppercase tracking-widest ${isMe ? 'text-blue-100' : 'text-slate-500 dark:text-slate-500'}`}>
                        {format(new Date(message.createdAt), 'h:mm a')}
                    </Text>
                    {isMe && (
                        message.isRead
                            ? <CheckCheck size={hScale(12)} color="#4ade80" />
                            : <Check size={hScale(12)} color="rgba(255,255,255,0.6)" />
                    )}
                </View>
            </View>
        </View>
    );
}
 
interface ChatInputProps {
    value: string;
    onChangeText: (text: string) => void;
    onSend: () => void;
    disabled?: boolean;
}
 
export function ChatInput({ value, onChangeText, onSend, disabled }: ChatInputProps) {
    const { isDark } = useTheme();
    const { hScale, vScale, spacing } = useResponsive();
 
    return (
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', padding: spacing.xl, borderTopWidth: 1 }} className="bg-white dark:bg-slate-950 border-slate-100 dark:border-slate-800/50 shadow-2xl">
            <TextInput
                style={{ flex: 1, paddingHorizontal: spacing.xl, paddingVertical: vScale(16), marginRight: spacing.lg, fontSize: hScale(16), maxHeight: vScale(140), borderRadius: hScale(28), borderWidth: 1 }}
                className="bg-slate-50 dark:bg-slate-900 border-slate-100 dark:border-slate-800 tracking-tight text-slate-900 dark:text-white shadow-inner"
                placeholder="Type your message..."
                placeholderTextColor={isDark ? "#475569" : "#94a3b8"}
                value={value}
                onChangeText={onChangeText}
                multiline
                maxLength={500}
                editable={!disabled}
            />
            <TouchableOpacity
                style={{ width: hScale(56), height: hScale(56), borderRadius: hScale(16) }}
                className={`justify-center items-center shadow-lg ${(!value.trim() || disabled) ? 'bg-slate-100 dark:bg-slate-900 opacity-50' : 'bg-slate-900 dark:bg-blue-600 shadow-slate-900/10'
                    }`}
                onPress={onSend}
                disabled={!value.trim() || disabled}
            >
                {disabled ? (
                    <ActivityIndicator size="small" color={isDark ? "#3b82f6" : "#64748b"} />
                ) : (
                    <Send size={hScale(24)} color={(!value.trim() || disabled) ? (isDark ? "#334155" : "#cbd5e1") : "white"} strokeWidth={3} style={{ marginLeft: hScale(3) }} />
                )}
            </TouchableOpacity>
        </View>
    );
}
 
interface ChatHeaderProps {
    userName: string;
    onBack: () => void;
}
 
export function ChatHeader({ userName, onBack }: ChatHeaderProps) {
    const { isDark } = useTheme();
    const { hScale, vScale, spacing } = useResponsive();
 
    return (
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.xl, paddingVertical: vScale(20), borderBottomWidth: 1 }} className="bg-white dark:bg-slate-950 border-slate-100 dark:border-slate-800 shadow-sm z-20">
            <TouchableOpacity 
                onPress={onBack} 
                style={{ width: hScale(48), height: hScale(48), borderRadius: hScale(24), marginRight: spacing.lg, borderWidth: 1 }}
                className="bg-slate-50 dark:bg-slate-900 items-center justify-center border-slate-100 dark:border-slate-800 active:bg-slate-100 dark:active:bg-slate-800"
            >
                <ArrowLeft size={hScale(24)} color={isDark ? "#f8fafc" : "#1e293b"} strokeWidth={3} />
            </TouchableOpacity>
            <View className="flex-row items-center flex-1">
                <View style={{ width: hScale(48), height: hScale(48), borderRadius: hScale(20), marginRight: spacing.lg, borderWidth: 1 }} className="bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 justify-center items-center relative">
                    <Text style={{ fontSize: hScale(18) }} className="text-slate-900 dark:text-slate-100 font-black">{userName.charAt(0).toUpperCase()}</Text>
                    <View style={{ position: 'absolute', bottom: -hScale(0.5), right: -hScale(0.5), width: hScale(14), height: hScale(14), borderRadius: hScale(7), borderWidth: 2 }} className="bg-green-500 border-white dark:border-slate-950 shadow-sm" />
                </View>
                <View>
                    <Text style={{ fontSize: hScale(18) }} className="font-black text-slate-900 dark:text-white tracking-tighter uppercase">{userName}</Text>
                    <Text style={{ fontSize: hScale(10) }} className="text-green-600 dark:text-green-500 font-black uppercase tracking-widest">Secure Link Active</Text>
                </View>
            </View>
            <TouchableOpacity style={{ width: hScale(48), height: hScale(48), borderRadius: hScale(24), borderWidth: 1 }} className="bg-slate-50 dark:bg-slate-900 items-center justify-center border-slate-100 dark:border-slate-800">
                <Clock size={hScale(22)} color={isDark ? "#475569" : "#94a3b8"} strokeWidth={2.5} />
            </TouchableOpacity>
        </View>
    );
}
 
interface ChatMessagesListProps {
    messages: Message[];
    currentUserId: string;
    otherUserName?: string;
    isLoading?: boolean;
}
 
export function ChatMessagesList({ messages, currentUserId, otherUserName, isLoading }: ChatMessagesListProps) {
    const scrollViewRef = useRef<ScrollView>(null);
    const { isDark } = useTheme();
    const { hScale, vScale, spacing } = useResponsive();
 
    useEffect(() => {
        if (scrollViewRef.current && messages.length > 0) {
            scrollViewRef.current.scrollToEnd({ animated: true });
        }
    }, [messages]);
 
    if (isLoading) {
        return (
            <View style={{ padding: spacing.xl, paddingVertical: vScale(32) }} className="flex-1 justify-center items-center bg-slate-50 dark:bg-slate-950">
                <ActivityIndicator size="large" color={isDark ? "#ffffff" : "#3b82f6"} />
                <Text style={{ fontSize: hScale(10), marginTop: vScale(24) }} className="font-black text-slate-400 dark:text-slate-600 uppercase tracking-[2px]">Syncing Encrypted Feed...</Text>
            </View>
        );
    }
 
    if (!messages || messages.length === 0) {
        return (
            <View style={{ padding: spacing.xl, paddingVertical: vScale(48), opacity: 0.4 }} className="flex-1 justify-center items-center bg-slate-50 dark:bg-slate-950">
                <View style={{ width: hScale(96), height: hScale(96), borderRadius: hScale(48), marginBottom: vScale(32) }} className="bg-slate-100 dark:bg-slate-900 rounded-full items-center justify-center">
                    <MessageSquare size={hScale(40)} color={isDark ? "#334155" : "#94a3b8"} strokeWidth={2.5} />
                </View>
                <Text style={{ fontSize: hScale(24) }} className="font-black text-slate-900 dark:text-white text-center uppercase tracking-tighter">Silence in Hangar</Text>
                <Text style={{ fontSize: hScale(12), marginTop: vScale(12), maxWidth: hScale(240), lineHeight: vScale(20) }} className="font-medium text-slate-500 dark:text-slate-400 text-center uppercase tracking-widest">
                    Start a secure channel with <Text className="font-black text-slate-900 dark:text-white">{otherUserName || 'Driver'}</Text>
                </Text>
            </View>
        );
    }
 
    return (
        <ScrollView
            ref={scrollViewRef}
            className="flex-1 bg-slate-50 dark:bg-slate-950"
            contentContainerStyle={{ padding: spacing.xl, paddingBottom: vScale(60) }}
            onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
            showsVerticalScrollIndicator={false}
        >
            {messages.map((message) => (
                <ChatMessageBubble
                    key={message.id}
                    message={message}
                    isMe={message.senderId === currentUserId}
                    senderName={message.senderId !== currentUserId ? otherUserName : undefined}
                />
            ))}
        </ScrollView>
    );
}
