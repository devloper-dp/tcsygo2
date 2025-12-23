import { supabase } from './supabase';

export interface Notification {
    id: string;
    userId: string;
    title: string;
    message: string;
    type: 'booking' | 'trip' | 'payment' | 'driver' | 'system';
    isRead: boolean;
    data?: Record<string, any>;
    createdAt: string;
}

export interface NotificationSubscriptionOptions {
    userId: string;
    onNotification: (notification: Notification) => void;
    onError?: (error: Error) => void;
}

class NotificationService {
    private subscription: any = null;
    private unreadCount: number = 0;

    /**
     * Subscribe to real-time notifications for a user
     */
    subscribeToNotifications({ userId, onNotification, onError }: NotificationSubscriptionOptions) {
        // Unsubscribe if already subscribed
        this.unsubscribe();

        const channel = supabase
            .channel(`notifications:${userId}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'notifications',
                    filter: `user_id=eq.${userId}`,
                },
                (payload) => {
                    if (payload.new) {
                        const notification: Notification = {
                            id: payload.new.id,
                            userId: payload.new.user_id,
                            title: payload.new.title,
                            message: payload.new.message,
                            type: payload.new.type,
                            isRead: payload.new.is_read,
                            data: payload.new.data,
                            createdAt: payload.new.created_at,
                        };

                        this.unreadCount++;
                        onNotification(notification);
                    }
                }
            )
            .subscribe((status) => {
                if (status === 'SUBSCRIBED') {
                    console.log(`Subscribed to notifications for user ${userId}`);
                } else if (status === 'CHANNEL_ERROR') {
                    onError?.(new Error('Failed to subscribe to notifications'));
                }
            });

        this.subscription = channel;
        return () => this.unsubscribe();
    }

    /**
     * Unsubscribe from notifications
     */
    unsubscribe() {
        if (this.subscription) {
            supabase.removeChannel(this.subscription);
            this.subscription = null;
            console.log('Unsubscribed from notifications');
        }
    }

    /**
     * Get notifications for a user
     */
    async getNotifications(userId: string, limit: number = 50): Promise<Notification[]> {
        try {
            const { data, error } = await supabase
                .from('notifications')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false })
                .limit(limit);

            if (error) throw error;

            return data.map(n => ({
                id: n.id,
                userId: n.user_id,
                title: n.title,
                message: n.message,
                type: n.type,
                isRead: n.is_read,
                data: n.data,
                createdAt: n.created_at,
            }));
        } catch (error) {
            console.error('Failed to get notifications:', error);
            return [];
        }
    }

    /**
     * Get unread notification count
     */
    async getUnreadCount(userId: string): Promise<number> {
        try {
            const { count, error } = await supabase
                .from('notifications')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', userId)
                .eq('is_read', false);

            if (error) throw error;
            this.unreadCount = count || 0;
            return this.unreadCount;
        } catch (error) {
            console.error('Failed to get unread count:', error);
            return 0;
        }
    }

    /**
     * Mark notification as read
     */
    async markAsRead(notificationId: string): Promise<void> {
        try {
            const { error } = await supabase
                .from('notifications')
                .update({ is_read: true })
                .eq('id', notificationId);

            if (error) throw error;
            this.unreadCount = Math.max(0, this.unreadCount - 1);
        } catch (error) {
            console.error('Failed to mark notification as read:', error);
            throw error;
        }
    }

    /**
     * Mark all notifications as read
     */
    async markAllAsRead(userId: string): Promise<void> {
        try {
            const { error } = await supabase
                .from('notifications')
                .update({ is_read: true })
                .eq('user_id', userId)
                .eq('is_read', false);

            if (error) throw error;
            this.unreadCount = 0;
        } catch (error) {
            console.error('Failed to mark all as read:', error);
            throw error;
        }
    }

    /**
     * Delete notification
     */
    async deleteNotification(notificationId: string): Promise<void> {
        try {
            const { error } = await supabase
                .from('notifications')
                .delete()
                .eq('id', notificationId);

            if (error) throw error;
        } catch (error) {
            console.error('Failed to delete notification:', error);
            throw error;
        }
    }

    /**
     * Create a notification (admin/system use)
     */
    async createNotification(
        userId: string,
        title: string,
        message: string,
        type: Notification['type'],
        data?: Record<string, any>
    ): Promise<Notification | null> {
        try {
            const { data: notification, error } = await supabase
                .from('notifications')
                .insert({
                    user_id: userId,
                    title,
                    message,
                    type,
                    data,
                    is_read: false,
                })
                .select()
                .single();

            if (error) throw error;

            return {
                id: notification.id,
                userId: notification.user_id,
                title: notification.title,
                message: notification.message,
                type: notification.type,
                isRead: notification.is_read,
                data: notification.data,
                createdAt: notification.created_at,
            };
        } catch (error) {
            console.error('Failed to create notification:', error);
            return null;
        }
    }

    /**
     * Get current unread count (cached)
     */
    getCachedUnreadCount(): number {
        return this.unreadCount;
    }
}

export const notificationService = new NotificationService();
