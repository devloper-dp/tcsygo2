import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, ActivityIndicator } from 'react-native';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge'; // Assuming you have a Badge component, or we style a helper
import { supabase } from '@/lib/supabase';
import { MessageSquare } from 'lucide-react-native';

interface SupportTicket {
    id: string;
    subject: string;
    status: 'open' | 'closed' | 'pending';
    created_at: string;
    user_email?: string;
}

export function SupportTab() {
    const [tickets, setTickets] = useState<SupportTicket[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchTickets();
    }, []);

    const fetchTickets = async () => {
        try {
            setLoading(true);
            // Join with users table if possible, but keeping it simple for now
            const { data, error } = await supabase
                .from('support_tickets')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setTickets(data || []);
        } catch (error) {
            console.error('Error fetching support tickets:', error);
            setTickets([]);
        } finally {
            setLoading(false);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'open': return 'bg-red-100 text-red-800';
            case 'pending': return 'bg-yellow-100 text-yellow-800';
            case 'closed': return 'bg-green-100 text-green-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const renderTicketItem = ({ item }: { item: SupportTicket }) => (
        <Card className="mb-4">
            <CardContent className="p-4">
                <View className="flex-row justify-between items-start mb-2">
                    <View className="flex-1 mr-2">
                        <Text className="text-lg font-bold text-foreground numberOfLines={1}">{item.subject}</Text>
                        <Text className="text-sm text-muted-foreground mt-1">Ticket #{item.id.slice(0, 8)}</Text>
                    </View>
                    <View className={`px-2 py-1 rounded-full ${getStatusColor(item.status)}`}>
                        <Text className="text-xs font-semibold capitalize bg-opacity-0">{item.status}</Text>
                    </View>
                </View>
                <View className="flex-row items-center mt-3 pt-3 border-t border-border">
                    <MessageSquare size={16} className="text-muted-foreground mr-2" />
                    <Text className="text-xs text-muted-foreground">
                        Opened {new Date(item.created_at).toLocaleDateString()}
                    </Text>
                </View>
            </CardContent>
        </Card>
    );

    return (
        <View className="flex-1">
            {loading ? (
                <ActivityIndicator size="large" className="mt-8" />
            ) : (
                <FlatList
                    data={tickets}
                    keyExtractor={(item) => item.id}
                    renderItem={renderTicketItem}
                    ListEmptyComponent={
                        <View className="items-center mt-8 p-4">
                            <Text className="text-muted-foreground text-center">No open support tickets</Text>
                        </View>
                    }
                    contentContainerStyle={{ paddingBottom: 20 }}
                />
            )}
        </View>
    );
}
