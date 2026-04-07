import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform, LogBox } from 'react-native';
import { supabase } from '@/lib/supabase';
import { logger } from './LoggerService';

// Check if running in Expo Go (where push notifications are not supported in SDK 53+)
const isExpoGo = Constants.appOwnership === 'expo';

// Conditionally import expo-notifications only if not in Expo Go
let Notifications: any = null;
if (!isExpoGo) {
    try {
        Notifications = require('expo-notifications');
    } catch (error) {
        logger.warn('Failed to load expo-notifications module:', error);
    }
}

// Suppress the Expo Go notification warning since we handle it gracefully
if (isExpoGo) {
    LogBox.ignoreLogs([
        '`expo-notifications` functionality is not fully supported in Expo Go',
        'expo-notifications',
        'Android Push notifications',
    ]);
}

// Configure notification behavior only if not in Expo Go
if (!isExpoGo && Notifications) {
    try {
        Notifications.setNotificationHandler({
            handleNotification: async () => ({
                shouldShowAlert: true,
                shouldPlaySound: true,
                shouldSetBadge: true,
                shouldShowBanner: true,
                shouldShowList: true,
            }),
        });
    } catch (error) {
        logger.warn('Failed to set notification handler (likely running in Expo Go):', error);
    }
}

/**
 * Check if push notifications are available
 * Returns false when running in Expo Go
 */
const areNotificationsAvailable = (): boolean => {
    if (isExpoGo || !Notifications) {
        logger.info('Push notifications are not available in Expo Go. Use a development build for full notification support.');
        return false;
    }
    return true;
};

export type NotificationType =
    | 'booking_confirmation'
    | 'driver_arrival'
    | 'ride_started'
    | 'ride_completed'
    | 'payment_reminder'
    | 'payment_success'
    | 'promo_offer'
    | 'safety_alert'
    | 'ride_sharing_invite'
    | 'general';

export interface NotificationPayload {
    bookingId?: string;
    tripId?: string;
    eta?: number;
    destination?: string;
    amount?: number;
    type?: string;
    [key: string]: any;
}

export interface NotificationData {
    type: NotificationType;
    title: string;
    message: string;
    data?: NotificationPayload;
}

export interface PushNotificationToken {
    token: string;
    platform: 'ios' | 'android' | 'web';
}

export const NotificationService = {
    /**
     * Register for push notifications and get Expo push token
     */
    registerForPushNotifications: async (): Promise<string | null> => {
        if (!areNotificationsAvailable()) {
            return null;
        }

        try {
            if (!Device.isDevice) {
                logger.warn('Push notifications only work on physical devices');
                return null;
            }

            // Request permissions
            const { status: existingStatus } = await Notifications!.getPermissionsAsync();
            let finalStatus = existingStatus;

            if (existingStatus !== 'granted') {
                const { status } = await Notifications!.requestPermissionsAsync();
                finalStatus = status;
            }

            if (finalStatus !== 'granted') {
                logger.error('Permission not granted for push notifications');
                return null;
            }

            // Get Expo push token
            const tokenData = await Notifications!.getExpoPushTokenAsync({
                projectId: process.env.EXPO_PUBLIC_PROJECT_ID,
            });

            const token = tokenData.data;

            // Save token to database
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                await NotificationService.savePushToken(user.id, token, Platform.OS as 'ios' | 'android');
            }

            // Configure notification channels for Android
            if (Platform.OS === 'android' && Notifications) {
                await Notifications.setNotificationChannelAsync('default', {
                    name: 'Default',
                    importance: Notifications.AndroidImportance.MAX,
                    vibrationPattern: [0, 250, 250, 250],
                    lightColor: '#FF231F7C',
                });

                await Notifications.setNotificationChannelAsync('ride_updates', {
                    name: 'Ride Updates',
                    importance: Notifications.AndroidImportance.HIGH,
                    vibrationPattern: [0, 250, 250, 250],
                    sound: 'default',
                });

                await Notifications.setNotificationChannelAsync('safety', {
                    name: 'Safety Alerts',
                    importance: Notifications.AndroidImportance.MAX,
                    vibrationPattern: [0, 500, 250, 500],
                    sound: 'default',
                });
            }

            return token;
        } catch (error) {
            logger.error('Error registering for push notifications:', error);
            return null;
        }
    },

    /**
     * Save push token to database
     */
    savePushToken: async (
        userId: string,
        token: string,
        platform: 'ios' | 'android'
    ): Promise<void> => {
        try {
            // Check if token already exists
            const { data: existing } = await supabase
                .from('push_tokens')
                .select('id')
                .eq('user_id', userId)
                .eq('token', token)
                .single();

            if (!existing) {
                await supabase.from('push_tokens').insert({
                    user_id: userId,
                    token,
                    platform,
                    is_active: true,
                });
            }
        } catch (error) {
            logger.error('Error saving push token:', error);
        }
    },

    /**
     * Send local notification
     */
    sendLocalNotification: async (
        title: string,
        body: string,
        data?: NotificationPayload,
        channelId: string = 'default'
    ): Promise<string> => {
        if (!areNotificationsAvailable()) {
            const mockId = Math.random().toString(36).substring(2, 11);
            logger.info(`[Expo Go] Would send notification: ${title} - ${body} (ID: ${mockId})`);
            return mockId;
        }

        try {
            const notificationId = await Notifications!.scheduleNotificationAsync({
                content: {
                    title,
                    body,
                    data,
                    sound: true,
                    priority: Notifications!.AndroidNotificationPriority.HIGH,
                },
                trigger: null, // Send immediately
            });

            return notificationId;
        } catch (error) {
            logger.error('Error sending local notification:', error);
            throw error;
        }
    },

    /**
     * Schedule notification for later
     */
    scheduleNotification: async (
        title: string,
        body: string,
        triggerDate: Date,
        data?: NotificationPayload
    ): Promise<string> => {
        if (!areNotificationsAvailable()) {
            const mockId = Math.random().toString(36).substring(2, 11);
            logger.info(`[Expo Go] Would schedule notification for ${triggerDate}: ${title} (ID: ${mockId})`);
            return mockId;
        }

        try {
            const notificationId = await Notifications!.scheduleNotificationAsync({
                content: {
                    title,
                    body,
                    data,
                    sound: true,
                },
                trigger: triggerDate as any,
            });

            return notificationId;
        } catch (error) {
            logger.error('Error scheduling notification:', error);
            throw error;
        }
    },

    /**
     * Cancel scheduled notification
     */
    cancelNotification: async (notificationId: string): Promise<void> => {
        if (!areNotificationsAvailable()) {
            return;
        }

        try {
            await Notifications!.cancelScheduledNotificationAsync(notificationId);
        } catch (error) {
            logger.error('Error canceling notification:', error);
        }
    },

    /**
     * Cancel all notifications
     */
    cancelAllNotifications: async (): Promise<void> => {
        if (!areNotificationsAvailable()) {
            return;
        }

        try {
            await Notifications!.cancelAllScheduledNotificationsAsync();
        } catch (error) {
            logger.error('Error canceling all notifications:', error);
        }
    },

    /**
     * Get badge count
     */
    getBadgeCount: async (): Promise<number> => {
        if (!areNotificationsAvailable()) {
            return 0;
        }

        try {
            return await Notifications!.getBadgeCountAsync();
        } catch (error) {
            logger.error('Error getting badge count:', error);
            return 0;
        }
    },

    /**
     * Set badge count
     */
    setBadgeCount: async (count: number): Promise<void> => {
        if (!areNotificationsAvailable()) {
            return;
        }

        try {
            await Notifications!.setBadgeCountAsync(count);
        } catch (error) {
            logger.error('Error setting badge count:', error);
        }
    },

    /**
     * Clear badge
     */
    clearBadge: async (): Promise<void> => {
        if (!areNotificationsAvailable()) {
            return;
        }

        try {
            await Notifications!.setBadgeCountAsync(0);
        } catch (error) {
            logger.error('Error clearing badge:', error);
        }
    },

    /**
     * Add notification received listener
     */
    addNotificationReceivedListener: (
        callback: (notification: any) => void
    ): { remove: () => void } => {
        if (!areNotificationsAvailable()) {
            return { remove: () => { } };
        }
        return Notifications!.addNotificationReceivedListener(callback);
    },

    /**
     * Add notification response listener (when user taps notification)
     */
    addNotificationResponseListener: (
        callback: (response: any) => void
    ): { remove: () => void } => {
        if (!areNotificationsAvailable()) {
            return { remove: () => { } };
        }
        return Notifications!.addNotificationResponseReceivedListener(callback);
    },

    /**
     * Create notification in database
     */
    createNotification: async (
        userId: string,
        notification: NotificationData
    ): Promise<void> => {
        try {
            await supabase.from('notifications').insert({
                user_id: userId,
                title: notification.title,
                message: notification.message,
                type: notification.type,
                data: notification.data,
                is_read: false,
            });
        } catch (error) {
            logger.error('Error creating notification in database:', error);
        }
    },

    /**
     * Mark notification as read
     */
    markAsRead: async (notificationId: string): Promise<void> => {
        try {
            await supabase
                .from('notifications')
                .update({ is_read: true })
                .eq('id', notificationId);
        } catch (error) {
            logger.error('Error marking notification as read:', error);
        }
    },

    /**
     * Mark all notifications as read
     */
    markAllAsRead: async (userId: string): Promise<void> => {
        try {
            await supabase
                .from('notifications')
                .update({ is_read: true })
                .eq('user_id', userId)
                .eq('is_read', false);
        } catch (error) {
            logger.error('Error marking all notifications as read:', error);
        }
    },

    /**
     * Delete notification
     */
    deleteNotification: async (notificationId: string): Promise<void> => {
        try {
            await supabase.from('notifications').delete().eq('id', notificationId);
        } catch (error) {
            logger.error('Error deleting notification:', error);
        }
    },

    /**
     * Get unread notification count
     */
    getUnreadCount: async (userId: string): Promise<number> => {
        try {
            const { count, error } = await supabase
                .from('notifications')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', userId)
                .eq('is_read', false);

            if (error) throw error;
            return count || 0;
        } catch (error) {
            logger.error('Error getting unread count:', error);
            return 0;
        }
    },

    /**
     * Subscribe to real-time notifications
     */
    subscribeToNotifications: (
        userId: string,
        callback: (notification: any) => void
    ) => {
        const channel = supabase
            .channel('notifications')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'notifications',
                    filter: `user_id=eq.${userId}`,
                },
                (payload) => {
                    callback(payload.new);
                }
            )
            .subscribe();

        return channel;
    },

    /**
     * Send notification for booking confirmation
     */
    sendBookingConfirmation: async (
        userId: string,
        bookingId: string,
        pickupLocation: string,
        dropLocation: string
    ): Promise<void> => {
        const notification: NotificationData = {
            type: 'booking_confirmation',
            title: '🚗 Booking Confirmed',
            message: `Your ride from ${pickupLocation} to ${dropLocation} is confirmed`,
            data: { bookingId },
        };

        await NotificationService.createNotification(userId, notification);
        await NotificationService.sendLocalNotification(
            notification.title,
            notification.message,
            notification.data,
            'ride_updates'
        );
    },

    /**
     * Send notification for driver arrival
     */
    sendDriverArrival: async (
        userId: string,
        driverName: string,
        eta: number
    ): Promise<void> => {
        const notification: NotificationData = {
            type: 'driver_arrival',
            title: '✅ Driver Arriving',
            message: `${driverName} will arrive in ${eta} minutes`,
            data: { eta },
        };

        await NotificationService.createNotification(userId, notification);
        await NotificationService.sendLocalNotification(
            notification.title,
            notification.message,
            notification.data,
            'ride_updates'
        );
    },

    /**
     * Send notification for ride started
     */
    sendRideStarted: async (
        userId: string,
        destination: string
    ): Promise<void> => {
        const notification: NotificationData = {
            type: 'ride_started',
            title: '🚀 Ride Started',
            message: `Your ride to ${destination} has started`,
            data: { destination },
        };

        await NotificationService.createNotification(userId, notification);
        await NotificationService.sendLocalNotification(
            notification.title,
            notification.message,
            notification.data,
            'ride_updates'
        );
    },

    /**
     * Send notification for ride completed
     */
    sendRideCompleted: async (
        userId: string,
        amount: number
    ): Promise<void> => {
        const notification: NotificationData = {
            type: 'ride_completed',
            title: '🎉 Ride Completed',
            message: `Your ride is complete. Amount: ₹${amount}`,
            data: { amount },
        };

        await NotificationService.createNotification(userId, notification);
        await NotificationService.sendLocalNotification(
            notification.title,
            notification.message,
            notification.data,
            'ride_updates'
        );
    },

    /**
     * Send safety alert notification
     */
    sendSafetyAlert: async (
        userId: string,
        message: string
    ): Promise<void> => {
        const notification: NotificationData = {
            type: 'safety_alert',
            title: '⚠️ Safety Alert',
            message,
            data: {},
        };

        await NotificationService.createNotification(userId, notification);
        await NotificationService.sendLocalNotification(
            notification.title,
            notification.message,
            notification.data,
            'safety'
        );
    },
};
