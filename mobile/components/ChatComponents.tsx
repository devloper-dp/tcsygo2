import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { useRef, useEffect } from 'react';

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
    return (
        <View style={[styles.messageContainer, isMe ? styles.myMessageContainer : styles.theirMessageContainer]}>
            {!isMe && senderName && (
                <Text style={styles.senderName}>{senderName}</Text>
            )}
            <View style={[styles.messageBubble, isMe ? styles.myMessage : styles.theirMessage]}>
                <Text style={[styles.messageText, isMe ? styles.myMessageText : styles.theirMessageText]}>
                    {message.message}
                </Text>
                <View style={styles.timestampContainer}>
                    <Text style={[styles.timestamp, isMe ? styles.myTimestamp : styles.theirTimestamp]}>
                        {format(new Date(message.createdAt), 'hh:mm a')}
                    </Text>
                    {isMe && (
                        <Ionicons
                            name={message.isRead ? "checkmark-done" : "checkmark"}
                            size={14}
                            color="rgba(255, 255, 255, 0.7)"
                            style={{ marginLeft: 4 }}
                        />
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
    return (
        <View style={styles.inputContainer}>
            <TextInput
                style={styles.input}
                placeholder="Type a message..."
                placeholderTextColor="#9ca3af"
                value={value}
                onChangeText={onChangeText}
                multiline
                maxLength={500}
                editable={!disabled}
            />
            <TouchableOpacity
                style={[styles.sendButton, (!value.trim() || disabled) && styles.sendButtonDisabled]}
                onPress={onSend}
                disabled={!value.trim() || disabled}
            >
                <Ionicons name="send" size={20} color="white" />
            </TouchableOpacity>
        </View>
    );
}

interface ChatHeaderProps {
    userName: string;
    userPhoto?: string;
    onBack: () => void;
}

export function ChatHeader({ userName, userPhoto, onBack }: ChatHeaderProps) {
    return (
        <View style={styles.header}>
            <TouchableOpacity onPress={onBack} style={styles.backButton}>
                <Ionicons name="arrow-back" size={24} color="#1f2937" />
            </TouchableOpacity>
            <View style={styles.headerInfo}>
                <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{userName.charAt(0).toUpperCase()}</Text>
                </View>
                <View>
                    <Text style={styles.headerName}>{userName}</Text>
                    <Text style={styles.headerSubtitle}>Trip Chat</Text>
                </View>
            </View>
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

    useEffect(() => {
        // Auto-scroll to bottom when new messages arrive
        if (scrollViewRef.current && messages.length > 0) {
            scrollViewRef.current.scrollToEnd({ animated: true });
        }
    }, [messages]);

    if (isLoading) {
        return (
            <View style={styles.emptyContainer}>
                <Ionicons name="hourglass-outline" size={64} color="#d1d5db" />
                <Text style={styles.emptyText}>Loading messages...</Text>
            </View>
        );
    }

    if (!messages || messages.length === 0) {
        return (
            <View style={styles.emptyContainer}>
                <Ionicons name="chatbubbles-outline" size={64} color="#d1d5db" />
                <Text style={styles.emptyText}>No messages yet</Text>
                <Text style={styles.emptySubtext}>Start the conversation!</Text>
            </View>
        );
    }

    return (
        <ScrollView
            ref={scrollViewRef}
            style={styles.messagesList}
            contentContainerStyle={styles.messagesContent}
            onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
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

const styles = StyleSheet.create({
    messageContainer: {
        marginBottom: 16,
        maxWidth: '75%',
    },
    myMessageContainer: {
        alignSelf: 'flex-end',
    },
    theirMessageContainer: {
        alignSelf: 'flex-start',
    },
    senderName: {
        fontSize: 12,
        color: '#6b7280',
        marginBottom: 4,
        marginLeft: 12,
    },
    messageBubble: {
        borderRadius: 16,
        padding: 12,
    },
    myMessage: {
        backgroundColor: '#3b82f6',
        borderBottomRightRadius: 4,
    },
    theirMessage: {
        backgroundColor: '#f3f4f6',
        borderBottomLeftRadius: 4,
    },
    messageText: {
        fontSize: 15,
        lineHeight: 20,
    },
    myMessageText: {
        color: 'white',
    },
    theirMessageText: {
        color: '#1f2937',
    },
    timestampContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 4,
    },
    timestamp: {
        fontSize: 10,
    },
    myTimestamp: {
        color: 'rgba(255, 255, 255, 0.7)',
        textAlign: 'right',
    },
    theirTimestamp: {
        color: '#9ca3af',
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        padding: 16,
        borderTopWidth: 1,
        borderTopColor: '#f3f4f6',
        backgroundColor: 'white',
    },
    input: {
        flex: 1,
        backgroundColor: '#f9fafb',
        borderRadius: 24,
        paddingHorizontal: 16,
        paddingVertical: 10,
        marginRight: 8,
        maxHeight: 100,
        fontSize: 15,
        color: '#1f2937',
    },
    sendButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#3b82f6',
        justifyContent: 'center',
        alignItems: 'center',
    },
    sendButtonDisabled: {
        backgroundColor: '#d1d5db',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#f3f4f6',
        backgroundColor: 'white',
    },
    backButton: {
        marginRight: 12,
    },
    headerInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#3b82f6',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    avatarText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
    headerName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1f2937',
    },
    headerSubtitle: {
        fontSize: 12,
        color: '#6b7280',
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 32,
    },
    emptyText: {
        fontSize: 18,
        fontWeight: '600',
        color: '#6b7280',
        marginTop: 16,
    },
    emptySubtext: {
        fontSize: 14,
        color: '#9ca3af',
        marginTop: 4,
    },
    messagesList: {
        flex: 1,
        backgroundColor: 'white',
    },
    messagesContent: {
        padding: 16,
    },
});
