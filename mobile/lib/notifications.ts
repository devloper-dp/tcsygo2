import { useState, useEffect, useRef } from 'react';
import type * as NotificationsType from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { supabase } from './supabase';
import Constants from 'expo-constants';

/**
 * Check if the app is running in Expo Go
 * Expo Go on Android (SDK 53+) doesn't support push notifications
 */
export function isExpoGo(): boolean {
    return Constants.executionEnvironment === 'storeClient';
}

/**
 * Check if push notifications are supported in the current environment
 */
export function isPushNotificationSupported(): boolean {
    // Expo Go on Android doesn't support push notifications in SDK 53+
    if (Platform.OS === 'android' && isExpoGo()) {
        return false;
    }
    return true;
}

// Lazy import of Notifications to prevent Expo Go crashes
let Notifications: typeof NotificationsType | null = null;

// Initialize notifications module only if supported
if (isPushNotificationSupported()) {
    try {
        Notifications = require('expo-notifications');

        // Configure notification behavior
        Notifications!.setNotificationHandler({
            handleNotification: async () => ({
                shouldShowAlert: true,
                shouldPlaySound: true,
                shouldSetBadge: true,
                shouldShowBanner: true,
                shouldShowList: true,
            }),
        });
    } catch (error) {
        console.warn('Failed to initialize expo-notifications:', error);
        Notifications = null;
    }
}

export interface NotificationData {
    type: 'booking' | 'trip' | 'message' | 'payment' | 'emergency';
    tripId?: string;
    bookingId?: string;
    messageId?: string;
    [key: string]: any;
}

export interface SupabaseNotification {
    id: string;
    user_id: string;
    title: string;
    message: string;
    type: string;
    data?: NotificationData;
    is_read: boolean;
    created_at: string;
}

/**
 * Register for push notifications and get the Expo push token
 * Returns undefined if running in Expo Go or if permissions are denied
 */
export async function registerForPushNotificationsAsync(): Promise<string | undefined> {
    // Check if push notifications are supported
    if (!isPushNotificationSupported() || !Notifications) {
        console.log('ℹ️ Push notifications are not supported in Expo Go. Use a development build for full notification support.');
        return undefined;
    }

    let token: string | undefined;

    if (Platform.OS === 'android') {
        try {
            await Notifications.setNotificationChannelAsync('default', {
                name: 'default',
                importance: Notifications.AndroidImportance.MAX,
                vibrationPattern: [0, 250, 250, 250],
                lightColor: '#3b82f6',
            });

            // Create additional channels for different notification types
            await Notifications.setNotificationChannelAsync('messages', {
                name: 'Messages',
                importance: Notifications.AndroidImportance.HIGH,
                vibrationPattern: [0, 250, 250, 250],
                lightColor: '#3b82f6',
                sound: 'default',
            });

            await Notifications.setNotificationChannelAsync('trips', {
                name: 'Trips',
                importance: Notifications.AndroidImportance.HIGH,
                vibrationPattern: [0, 250, 250, 250],
                lightColor: '#22c55e',
            });

            await Notifications.setNotificationChannelAsync('emergency', {
                name: 'Emergency Alerts',
                importance: Notifications.AndroidImportance.MAX,
                vibrationPattern: [0, 500, 250, 500],
                lightColor: '#ef4444',
                sound: 'default',
            });
        } catch (error) {
            console.warn('Failed to set notification channels:', error);
        }
    }

    if (Device.isDevice) {
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;

        if (existingStatus !== 'granted') {
            const { status } = await Notifications.requestPermissionsAsync();
            finalStatus = status;
        }

        if (finalStatus !== 'granted') {
            console.warn('Failed to get push token for push notification!');
            return;
        }

        try {
            const projectId = Constants.expoConfig?.extra?.eas?.projectId;
            token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
            console.log('✅ Push token registered:', token);
        } catch (error) {
            console.error('Error getting push token:', error);
        }
    } else {
        console.warn('Must use physical device for Push Notifications');
    }

    return token;
}

/**
 * Save the push token to the user's profile in Supabase
 */
export async function savePushToken(userId: string, token: string) {
    try {
        const { error } = await supabase
            .from('users')
            .update({ push_token: token })
            .eq('id', userId);

        if (error) throw error;
        console.log('Push token saved successfully');
    } catch (error) {
        console.error('Error saving push token:', error);
    }
}

/**
 * Send a local notification (for testing or immediate feedback)
 * Only works in development builds, not in Expo Go
 */
export async function sendLocalNotification(
    title: string,
    body: string,
    data?: NotificationData
) {
    if (!isPushNotificationSupported() || !Notifications) {
        console.log('ℹ️ Local notifications are not supported in Expo Go');
        return;
    }

    try {
        await Notifications.scheduleNotificationAsync({
            content: {
                title,
                body,
                data,
                sound: true,
            },
            trigger: null, // Show immediately
        });
    } catch (error) {
        console.error('Error sending local notification:', error);
    }
}

/**
 * Schedule a notification for a specific time
 * Only works in development builds, not in Expo Go
 */
export async function scheduleNotification(
    title: string,
    body: string,
    trigger: Date,
    data?: NotificationData
) {
    if (!isPushNotificationSupported() || !Notifications) {
        console.log('ℹ️ Scheduled notifications are not supported in Expo Go');
        return;
    }

    try {
        await Notifications.scheduleNotificationAsync({
            content: {
                title,
                body,
                data,
                sound: true,
            },
            trigger: {
                type: Notifications!.SchedulableTriggerInputTypes.DATE,
                date: trigger,
            } as NotificationsType.DateTriggerInput,
        });
    } catch (error) {
        console.error('Error scheduling notification:', error);
    }
}

/**
 * Cancel all scheduled notifications
 */
export async function cancelAllNotifications() {
    if (!Notifications) return;
    await Notifications.cancelAllScheduledNotificationsAsync();
}

/**
 * Cancel a specific notification by ID
 */
export async function cancelNotification(notificationId: string) {
    if (!Notifications) return;
    await Notifications.cancelScheduledNotificationAsync(notificationId);
}

/**
 * Get badge count
 * Returns 0 in Expo Go
 */
export async function getBadgeCount(): Promise<number> {
    if (!isPushNotificationSupported() || !Notifications) {
        return 0;
    }
    try {
        return await Notifications.getBadgeCountAsync();
    } catch (error) {
        console.error('Error getting badge count:', error);
        return 0;
    }
}

/**
 * Set badge count
 * No-op in Expo Go
 */
export async function setBadgeCount(count: number) {
    if (!isPushNotificationSupported() || !Notifications) {
        return;
    }
    try {
        await Notifications.setBadgeCountAsync(count);
    } catch (error) {
        console.error('Error setting badge count:', error);
    }
}

/**
 * Clear badge
 * No-op in Expo Go
 */
export async function clearBadge() {
    if (!isPushNotificationSupported() || !Notifications) {
        return;
    }
    try {
        await Notifications.setBadgeCountAsync(0);
    } catch (error) {
        console.error('Error clearing badge:', error);
    }
}

/**
 * Add notification received listener
 */
export function addNotificationReceivedListener(
    listener: (notification: NotificationsType.Notification) => void
) {
    if (!Notifications) {
        return { remove: () => { } };
    }
    return Notifications.addNotificationReceivedListener(listener);
}

/**
 * Add notification response listener (when user taps notification)
 */
export function addNotificationResponseListener(
    listener: (response: NotificationsType.NotificationResponse) => void
) {
    if (!Notifications) {
        return { remove: () => { } };
    }
    return Notifications.addNotificationResponseReceivedListener(listener);
}

/**
 * Remove notification listener
 */
export function removeNotificationSubscription(
    subscription: NotificationsType.Subscription | { remove: () => void }
) {
    subscription?.remove();
}

/**
 * Handle notification tap - navigate to appropriate screen
 */
export function handleNotificationTap(
    data: NotificationData,
    router: any
) {
    switch (data.type) {
        case 'message':
            if (data.tripId) {
                router.push(`/chat/${data.tripId}`);
            }
            break;
        case 'trip':
            if (data.tripId) {
                router.push(`/trip/${data.tripId}`);
            }
            break;
        case 'booking':
            if (data.bookingId) {
                router.push(`/booking/${data.bookingId}`);
            }
            break;
        case 'payment':
            if (data.bookingId) {
                router.push(`/payment/${data.bookingId}`);
            }
            break;
        case 'emergency':
            if (data.tripId) {
                router.push(`/track/${data.tripId}`);
            }
            break;
        default:
            // Navigate to home or notifications screen
            router.push('/(tabs)');
    }
}

/**
 * Request notification preferences from user
 */
export interface NotificationPreferences {
    messages: boolean;
    trips: boolean;
    bookings: boolean;
    payments: boolean;
    marketing: boolean;
}

export async function saveNotificationPreferences(
    userId: string,
    preferences: NotificationPreferences
) {
    try {
        const { error } = await supabase
            .from('users')
            .update({ notification_preferences: preferences })
            .eq('id', userId);

        if (error) throw error;
    } catch (error) {
        console.error('Error saving notification preferences:', error);
    }
}

export async function getNotificationPreferences(
    userId: string
): Promise<NotificationPreferences | null> {
    try {
        const { data, error } = await supabase
            .from('users')
            .select('notification_preferences')
            .eq('id', userId)
            .single();

        if (error) throw error;
        return data?.notification_preferences || null;
    } catch (error) {
        console.error('Error getting notification preferences:', error);
        return null;
    }
}

/**
 * Get notification history for a user
 */
export async function getNotificationHistory(
    userId: string,
    limit = 20
): Promise<SupabaseNotification[]> {
    try {
        const { data, error } = await supabase
            .from('notifications')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(limit);

        if (error) throw error;

        return data || [];
    } catch (error) {
        console.error('Error getting notification history:', error);
        return [];
    }
}

/**
 * Mark a notification as read
 */
export async function markNotificationAsRead(notificationId: string) {
    try {
        const { error } = await supabase
            .from('notifications')
            .update({ is_read: true })
            .eq('id', notificationId);

        if (error) throw error;
    } catch (error) {
        console.error('Error marking notification as read:', error);
    }
}

/**
 * Mark all notifications as read for a user
 */
export async function markAllNotificationsAsRead(userId: string) {
    try {
        const { error } = await supabase
            .from('notifications')
            .update({ is_read: true })
            .eq('user_id', userId)
            .eq('is_read', false);

        if (error) throw error;
    } catch (error) {
        console.error('Error marking all notifications as read:', error);
    }
}

/**
 * Setup notification listeners with automatic cleanup
 */
export function setupNotificationListeners(
    onNotificationReceived?: (notification: NotificationsType.Notification) => void,
    onNotificationResponse?: (response: NotificationsType.NotificationResponse) => void
) {
    if (!Notifications) {
        return () => { };
    }

    // Notification received while app is foregrounded
    const notificationListener = Notifications.addNotificationReceivedListener((notification: NotificationsType.Notification) => {
        onNotificationReceived?.(notification);
    });

    // User tapped on notification
    const responseListener = Notifications.addNotificationResponseReceivedListener((response: NotificationsType.NotificationResponse) => {
        onNotificationResponse?.(response);
    });

    return () => {
        notificationListener.remove();
        responseListener.remove();
    };
}

/**
 * Hook to manage push notifications
 * Gracefully handles Expo Go environment
 */
export function usePushNotifications(userId?: string) {
    const [expoPushToken, setExpoPushToken] = useState<string | undefined>();
    const [notification, setNotification] = useState<NotificationsType.Notification | undefined>();
    const [isSupported, setIsSupported] = useState(true);
    const notificationListener = useRef<NotificationsType.Subscription | undefined>(undefined);
    const responseListener = useRef<NotificationsType.Subscription | undefined>(undefined);

    useEffect(() => {
        // Check if notifications are supported
        const supported = isPushNotificationSupported() && !!Notifications;
        setIsSupported(supported);

        if (!supported) {
            console.log('ℹ️ Running in Expo Go - push notifications disabled');
            return;
        }

        // Register for push notifications
        registerForPushNotificationsAsync().then(token => {
            setExpoPushToken(token);
            if (token && userId) {
                savePushToken(userId, token);
            }
        }).catch(error => {
            console.error('Error registering for push notifications:', error);
        });

        // Set up listeners
        try {
            notificationListener.current = Notifications!.addNotificationReceivedListener((notification: NotificationsType.Notification) => {
                setNotification(notification);
            });

            responseListener.current = Notifications!.addNotificationResponseReceivedListener((response: NotificationsType.NotificationResponse) => {
                console.log('Notification response:', response);
            });
        } catch (error) {
            console.error('Error setting up notification listeners:', error);
        }

        return () => {
            notificationListener.current?.remove();
            responseListener.current?.remove();
        };
    }, [userId]);

    return {
        expoPushToken,
        notification,
        isSupported
    };
}

