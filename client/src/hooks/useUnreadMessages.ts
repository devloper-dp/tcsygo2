import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { queryClient } from '@/lib/queryClient';
import { useAuth } from '@/contexts/AuthContext';

interface UseUnreadMessagesOptions {
    tripId: string;
    otherUserId: string;
    enabled?: boolean;
}

/**
 * Custom hook to fetch and subscribe to unread message counts for a specific trip conversation
 * @param tripId - The trip ID
 * @param otherUserId - The ID of the other user in the conversation
 * @param enabled - Whether to enable the query (default: true)
 * @returns The count of unread messages
 */
export function useUnreadMessages({ tripId, otherUserId, enabled = true }: UseUnreadMessagesOptions) {
    const { user } = useAuth();

    // Query for unread message count
    const { data: unreadCount = 0 } = useQuery<number>({
        queryKey: ['unread-messages', tripId, user?.id, otherUserId],
        queryFn: async () => {
            if (!user) return 0;

            const { count, error } = await supabase
                .from('messages')
                .select('*', { count: 'exact', head: true })
                .eq('trip_id', tripId)
                .eq('sender_id', otherUserId)
                .eq('receiver_id', user.id)
                .eq('is_read', false);

            if (error) {
                console.error('Error fetching unread messages:', error);
                return 0;
            }

            return count || 0;
        },
        enabled: enabled && !!user && !!tripId && !!otherUserId,
        refetchInterval: false, // Don't poll, rely on real-time updates
    });

    // Subscribe to real-time updates for new messages
    useEffect(() => {
        if (!enabled || !user || !tripId || !otherUserId) return;

        const channel = supabase
            .channel(`unread-messages-${tripId}-${user.id}-${otherUserId}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'messages',
                    filter: `trip_id=eq.${tripId}`,
                },
                (payload) => {
                    const message = payload.new as any;

                    // Only invalidate if this message is relevant to our conversation
                    if (
                        (message.sender_id === otherUserId && message.receiver_id === user.id) ||
                        (message.sender_id === user.id && message.receiver_id === otherUserId)
                    ) {
                        queryClient.invalidateQueries({
                            queryKey: ['unread-messages', tripId, user.id, otherUserId]
                        });
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [enabled, user, tripId, otherUserId]);

    return unreadCount;
}

/**
 * Hook to get unread message counts for multiple trips at once
 * Useful for displaying badges on trip/booking lists
 */
export function useUnreadMessagesForTrips(trips: Array<{ tripId: string; otherUserId: string }>) {
    const { user } = useAuth();

    const { data: unreadCounts = {} } = useQuery<Record<string, number>>({
        queryKey: ['unread-messages-bulk', user?.id, trips.map(t => t.tripId).join(',')],
        queryFn: async () => {
            if (!user || trips.length === 0) return {};

            const counts: Record<string, number> = {};

            // Fetch unread counts for all trips in parallel
            await Promise.all(
                trips.map(async ({ tripId, otherUserId }) => {
                    const { count, error } = await supabase
                        .from('messages')
                        .select('*', { count: 'exact', head: true })
                        .eq('trip_id', tripId)
                        .eq('sender_id', otherUserId)
                        .eq('receiver_id', user.id)
                        .eq('is_read', false);

                    if (!error) {
                        counts[tripId] = count || 0;
                    }
                })
            );

            return counts;
        },
        enabled: !!user && trips.length > 0,
        refetchInterval: 30000, // Refetch every 30 seconds as fallback
    });

    // Subscribe to real-time updates for all trips
    useEffect(() => {
        if (!user || trips.length === 0) return;

        const channels = trips.map(({ tripId }) => {
            return supabase
                .channel(`unread-bulk-${tripId}-${user.id}`)
                .on(
                    'postgres_changes',
                    {
                        event: '*',
                        schema: 'public',
                        table: 'messages',
                        filter: `trip_id=eq.${tripId}`,
                    },
                    () => {
                        // Invalidate the bulk query when any message changes
                        queryClient.invalidateQueries({
                            queryKey: ['unread-messages-bulk', user.id]
                        });
                    }
                )
                .subscribe();
        });

        return () => {
            channels.forEach(channel => supabase.removeChannel(channel));
        };
    }, [user, trips.length]);

    return unreadCounts;
}
