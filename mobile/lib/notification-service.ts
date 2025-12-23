import { supabase } from './supabase';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

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

// Configure notification handler
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
    }),
});

class NotificationService {
    private subscription: any = null;
    private unreadCount: number = 0;
    private expoPushToken: string | null = null;
    private notificationListener: any = null;
    private responseListener: any = null;

    /**
     * Register for push notifications
     */
    async registerForPushNotifications(): Promise<string | null> {
        if (!Device.isDevice) {
            console.log('Must use physical device for Push Notifications');
            return null;
        }

        try {
            const { status: existingStatus } = await Notifications.getPermissionsAsync();
            let finalStatus = existingStatus;

            if (existingStatus !== 'granted') {
                const { status } = await Notifications.requestPermissionsAsync();
                finalStatus = status;
            }

            if (finalStatus !== 'granted') {
                console.log('Failed to get push token for push notification!');
                return null;
            }

            const projectId = Constants.expoConfig?.extra?.eas?.projectId;
            const token = await Notifications.getExpoPushTokenAsync({
                projectId,
            });

            this.expoPushToken = token.data;

            if (Platform.OS === 'android') {
                Notifications.setNotificationChannelAsync('default', {
                    name: 'default',
                    importance: Notifications.AndroidImportance.MAX,
                    vibrationPattern: [0, 250, 250, 250],
                    lightColor: '#3b82f6',
                });
            }

            return token.data;
        } catch (error) {
            console.error('Error registering for push notifications:', error);
            return null;
        }
    }

    /**
     * Set up notification listeners
     */
    setupNotificationListeners(
        onNotificationReceived?: (notification: Notifications.Notification) => void,
        onNotificationResponse?: (response: Notifications.NotificationResponse) => void
    ) {
        // Listener for notifications received while app is foregrounded
        this.notificationListener = Notifications.addNotificationReceivedListener(notification => {
            console.log('Notification received:', notification);
            onNotificationReceived?.(notification);
        });

        // Listener for user tapping on notification
        this.responseListener = Notifications.addNotificationResponseReceivedListener(response => {
            console.log('Notification response:', response);
            onNotificationResponse?.(response);
        });
    }

    /**
     * Remove notification listeners
     */
    removeNotificationListeners() {
        if (this.notificationListener) {
            Notifications.removeNotificationSubscription(this.notificationListener);
        }
        if (this.responseListener) {
            Notifications.removeNotificationSubscription(this.responseListener);
        }
    }

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

                        // Show local notification
                        this.showLocalNotification(notification.title, notification.message, notification.data);
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
     * Show local notification
     */
    async showLocalNotification(title: string, body: string, data?: any) {
        await Notifications.scheduleNotificationAsync({
            content: {
                title,
                body,
                data,
                sound: true,
            },
            trigger: null, // Show immediately
        });
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

            // Update badge count
            await Notifications.setBadgeCountAsync(this.unreadCount);

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
            await Notifications.setBadgeCountAsync(this.unreadCount);
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
            await Notifications.setBadgeCountAsync(0);
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
     * Get push token
     */
    getPushToken(): string | null {
        return this.expoPushToken;
    }

    /**
     * Get current unread count (cached)
     */
    getCachedUnreadCount(): number {
        return this.unreadCount;
    }

    /**
     * Clean up
     */
    cleanup() {
        this.unsubscribe();
        this.removeNotificationListeners();
    }
}

export const notificationService = new NotificationService();
