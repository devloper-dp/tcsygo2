import { useState, useEffect, useRef } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Send, Loader2, Check, CheckCheck } from 'lucide-react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { queryClient } from '@/lib/queryClient';
import { format } from 'date-fns';

interface ChatProps {
    isOpen: boolean;
    onClose: () => void;
    tripId: string;
    otherUserId: string;
    otherUserName: string;
    otherUserPhoto?: string;
}

interface Message {
    id: string;
    senderId: string;
    message: string;
    createdAt: string;
    isRead: boolean;
}

export function ChatDialog({ isOpen, onClose, tripId, otherUserId, otherUserName, otherUserPhoto }: ChatProps) {
    const { user } = useAuth();
    const [newMessage, setNewMessage] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);
    const typingTimeoutRef = useRef<NodeJS.Timeout>();

    // Fetch messages
    const { data: messages } = useQuery<Message[]>({
        queryKey: ['chat-messages', tripId, user?.id, otherUserId],
        queryFn: async () => {
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
                isRead: m.is_read,
            }));
        },
        enabled: isOpen && !!user,
    });

    // Real-time subscription for new messages
    useEffect(() => {
        if (!isOpen || !user || !tripId) return;

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
                    // Only add if it's relevant to this conversation
                    if (
                        (newMsg.sender_id === user.id && newMsg.receiver_id === otherUserId) ||
                        (newMsg.sender_id === otherUserId && newMsg.receiver_id === user.id)
                    ) {
                        queryClient.invalidateQueries({ queryKey: ['chat-messages', tripId] });

                        // Mark as read if we received it
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
    }, [isOpen, user, tripId, otherUserId]);

    // Mark messages as read
    const markAsRead = async (messageId: string) => {
        await supabase
            .from('messages')
            .update({ is_read: true })
            .eq('id', messageId)
            .eq('receiver_id', user?.id);
    };

    // Send message mutation
    const sendMessageMutation = useMutation({
        mutationFn: async (message: string) => {
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

            // Trigger push notification
            await supabase.functions.invoke('send-push-notification', {
                body: {
                    userId: otherUserId,
                    title: `New message from ${user?.fullName || 'User'}`, // Fallback name if missing
                    body: message.substring(0, 50) + (message.length > 50 ? '...' : ''),
                    data: { tripId, senderId: user?.id }
                }
            });
        },
        onSuccess: () => {
            setNewMessage('');
            setIsTyping(false);
        },
    });

    const handleSend = () => {
        if (!newMessage.trim()) return;
        sendMessageMutation.mutate(newMessage);
    };

    // Handle typing indicator
    const handleTyping = (value: string) => {
        setNewMessage(value);

        if (!isTyping && value.length > 0) {
            setIsTyping(true);
        }

        // Clear existing timeout
        if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
        }

        // Set new timeout
        typingTimeoutRef.current = setTimeout(() => {
            setIsTyping(false);
        }, 1000);
    };

    // Auto-scroll to bottom
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    // Mark unread messages as read when chat opens
    useEffect(() => {
        if (isOpen && messages) {
            messages.forEach((msg) => {
                if (msg.senderId === otherUserId && !msg.isRead) {
                    markAsRead(msg.id);
                }
            });
        }
    }, [isOpen, messages, otherUserId]);

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-md h-[600px] flex flex-col p-0">
                <DialogHeader className="p-6 pb-4 border-b">
                    <div className="flex items-center gap-3">
                        <Avatar>
                            <AvatarImage src={otherUserPhoto} />
                            <AvatarFallback>{otherUserName.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div>
                            <DialogTitle>{otherUserName}</DialogTitle>
                            <p className="text-xs text-muted-foreground">Trip Chat</p>
                        </div>
                    </div>
                </DialogHeader>

                <ScrollArea className="flex-1 p-6" ref={scrollRef}>
                    <div className="space-y-4">
                        {messages && messages.length > 0 ? (
                            messages.map((msg) => {
                                const isMe = msg.senderId === user?.id;
                                return (
                                    <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                        <div className={`max-w-[70%] ${isMe ? 'bg-primary text-primary-foreground' : 'bg-muted'} rounded-lg p-3`}>
                                            <p className="text-sm">{msg.message}</p>
                                            <div className={`flex items-center gap-1 mt-1 ${isMe ? 'justify-end' : 'justify-start'}`}>
                                                <p className={`text-[10px] ${isMe ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                                                    {format(new Date(msg.createdAt), 'hh:mm a')}
                                                </p>
                                                {isMe && (
                                                    msg.isRead ? (
                                                        <CheckCheck className="w-3 h-3 text-primary-foreground/70" />
                                                    ) : (
                                                        <Check className="w-3 h-3 text-primary-foreground/70" />
                                                    )
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        ) : (
                            <div className="text-center text-muted-foreground py-8">
                                No messages yet. Start the conversation!
                            </div>
                        )}
                    </div>
                </ScrollArea>

                <div className="p-4 border-t">
                    <div className="flex gap-2">
                        <Input
                            placeholder="Type a message..."
                            value={newMessage}
                            onChange={(e) => handleTyping(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                            disabled={sendMessageMutation.isPending}
                        />
                        <Button
                            size="icon"
                            onClick={handleSend}
                            disabled={!newMessage.trim() || sendMessageMutation.isPending}
                        >
                            {sendMessageMutation.isPending ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <Send className="w-4 h-4" />
                            )}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}

