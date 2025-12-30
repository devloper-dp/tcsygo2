import { supabase } from './supabase';
import type {
    RealtimePayload,
    RealtimeCallback,
    LiveLocation,
    Booking,
    Notification,
    Trip,
} from '@/types/supabase-types';
import { RealtimeChannel } from '@supabase/supabase-js';

/**
 * Realtime Service
 * Centralized service for Supabase Realtime subscriptions
 * Handles live location updates, booking changes, messages, and notifications
 */

class RealtimeService {
    private channels: Map<string, RealtimeChannel> = new Map();

    /**
     * Subscribe to live location updates for a trip
     */
    subscribeLiveLocation(
        tripId: string,
        callback: RealtimeCallback<LiveLocation>
    ): () => void {
        const channelName = `live-location:${tripId}`;

        // Remove existing subscription if any
        this.unsubscribe(channelName);

        const channel = supabase
            .channel(channelName)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'live_locations',
                    filter: `trip_id=eq.${tripId}`,
                },
                (payload) => {
                    callback(payload as unknown as RealtimePayload<LiveLocation>);
                }
            )
            .subscribe();

        this.channels.set(channelName, channel);

        // Return unsubscribe function
        return () => this.unsubscribe(channelName);
    }

    /**
     * Subscribe to booking status changes
     */
    subscribeBookingUpdates(
        bookingId: string,
        callback: RealtimeCallback<Booking>
    ): () => void {
        const channelName = `booking:${bookingId}`;

        this.unsubscribe(channelName);

        const channel = supabase
            .channel(channelName)
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'bookings',
                    filter: `id=eq.${bookingId}`,
                },
                (payload) => {
                    callback(payload as unknown as RealtimePayload<Booking>);
                }
            )
            .subscribe();

        this.channels.set(channelName, channel);

        return () => this.unsubscribe(channelName);
    }

    /**
     * Subscribe to all bookings for a user (passenger or driver)
     */
    subscribeUserBookings(
        userId: string,
        isDriver: boolean,
        callback: RealtimeCallback<Booking>
    ): () => void {
        const channelName = `user-bookings:${userId}`;
        const filterField = isDriver ? 'driver_id' : 'passenger_id';

        this.unsubscribe(channelName);

        const channel = supabase
            .channel(channelName)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'bookings',
                    filter: `${filterField}=eq.${userId}`,
                },
                (payload) => {
                    callback(payload as unknown as RealtimePayload<Booking>);
                }
            )
            .subscribe();

        this.channels.set(channelName, channel);

        return () => this.unsubscribe(channelName);
    }

    /**
     * Subscribe to trip updates
     */
    subscribeTripUpdates(
        tripId: string,
        callback: RealtimeCallback<Trip>
    ): () => void {
        const channelName = `trip:${tripId}`;

        this.unsubscribe(channelName);

        const channel = supabase
            .channel(channelName)
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'trips',
                    filter: `id=eq.${tripId}`,
                },
                (payload) => {
                    callback(payload as unknown as RealtimePayload<Trip>);
                }
            )
            .subscribe();

        this.channels.set(channelName, channel);

        return () => this.unsubscribe(channelName);
    }

    /**
     * Subscribe to new notifications for a user
     */
    subscribeNotifications(
        userId: string,
        callback: RealtimeCallback<Notification>
    ): () => void {
        const channelName = `notifications:${userId}`;

        this.unsubscribe(channelName);

        const channel = supabase
            .channel(channelName)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'notifications',
                    filter: `user_id=eq.${userId}`,
                },
                (payload) => {
                    callback(payload as unknown as RealtimePayload<Notification>);
                }
            )
            .subscribe();

        this.channels.set(channelName, channel);

        return () => this.unsubscribe(channelName);
    }

    /**
     * Subscribe to new messages in a conversation
     */
    subscribeMessages(
        conversationId: string,
        callback: RealtimeCallback<any>
    ): () => void {
        const channelName = `messages:${conversationId}`;

        this.unsubscribe(channelName);

        const channel = supabase
            .channel(channelName)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'messages',
                    filter: `conversation_id=eq.${conversationId}`,
                },
                (payload) => {
                    callback(payload as RealtimePayload<any>);
                }
            )
            .subscribe();

        this.channels.set(channelName, channel);

        return () => this.unsubscribe(channelName);
    }

    /**
     * Subscribe to presence (online/offline status)
     */
    subscribePresence(
        roomName: string,
        onJoin: (key: string, currentPresence: any, newPresence: any) => void,
        onLeave: (key: string, currentPresence: any, leftPresence: any) => void
    ): () => void {
        const channelName = `presence:${roomName}`;

        this.unsubscribe(channelName);

        const channel = supabase.channel(channelName);

        channel
            .on('presence', { event: 'join' }, ({ key, currentPresences, newPresences }) => {
                onJoin(key, currentPresences, newPresences);
            })
            .on('presence', { event: 'leave' }, ({ key, currentPresences, leftPresences }) => {
                onLeave(key, currentPresences, leftPresences);
            })
            .subscribe();

        this.channels.set(channelName, channel);

        return () => this.unsubscribe(channelName);
    }

    /**
     * Track user presence in a room
     */
    async trackPresence(roomName: string, userState: any): Promise<void> {
        const channelName = `presence:${roomName}`;
        const channel = this.channels.get(channelName);

        if (channel) {
            await channel.track(userState);
        }
    }

    /**
     * Unsubscribe from a specific channel
     */
    unsubscribe(channelName: string): void {
        const channel = this.channels.get(channelName);
        if (channel) {
            supabase.removeChannel(channel);
            this.channels.delete(channelName);
        }
    }

    /**
     * Unsubscribe from all channels
     */
    unsubscribeAll(): void {
        this.channels.forEach((channel, name) => {
            supabase.removeChannel(channel);
        });
        this.channels.clear();
    }

    /**
     * Get connection status
     */
    getConnectionStatus(): string {
        // Check if any channel is connected
        for (const channel of Array.from(this.channels.values())) {
            return channel.state;
        }
        return 'closed';
    }

    /**
     * Reconnect all channels
     */
    async reconnectAll(): Promise<void> {
        for (const channel of Array.from(this.channels.values())) {
            await channel.subscribe();
        }
    }
}

// Export singleton instance
export const realtime = new RealtimeService();

// Export individual functions as wrappers (can't destructure class methods)
export const subscribeLiveLocation = (tripId: string, callback: RealtimeCallback<LiveLocation>) =>
    realtime.subscribeLiveLocation(tripId, callback);

export const subscribeBookingUpdates = (bookingId: string, callback: RealtimeCallback<Booking>) =>
    realtime.subscribeBookingUpdates(bookingId, callback);

export const subscribeUserBookings = (userId: string, isDriver: boolean, callback: RealtimeCallback<Booking>) =>
    realtime.subscribeUserBookings(userId, isDriver, callback);

export const subscribeTripUpdates = (tripId: string, callback: RealtimeCallback<Trip>) =>
    realtime.subscribeTripUpdates(tripId, callback);

export const subscribeNotifications = (userId: string, callback: RealtimeCallback<Notification>) =>
    realtime.subscribeNotifications(userId, callback);

export const subscribeMessages = (conversationId: string, callback: RealtimeCallback<any>) =>
    realtime.subscribeMessages(conversationId, callback);

export const subscribePresence = (
    roomName: string,
    onJoin: (key: string, currentPresence: any, newPresence: any) => void,
    onLeave: (key: string, currentPresence: any, leftPresence: any) => void
) => realtime.subscribePresence(roomName, onJoin, onLeave);

export const trackPresence = (roomName: string, userState: any) =>
    realtime.trackPresence(roomName, userState);

export const unsubscribe = (channelName: string) =>
    realtime.unsubscribe(channelName);

export const unsubscribeAll = () =>
    realtime.unsubscribeAll();

export const getConnectionStatus = () =>
    realtime.getConnectionStatus();

export const reconnectAll = () =>
    realtime.reconnectAll();

