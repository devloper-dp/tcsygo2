import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { supabase } from './supabase';
import Constants from 'expo-constants';

// Configure notification behavior
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
    }),
});

export interface NotificationData {
    type: 'booking' | 'trip' | 'message' | 'payment' | 'emergency';
    tripId?: string;
    bookingId?: string;
    messageId?: string;
    [key: string]: any;
}

/**
 * Register for push notifications and get the Expo push token
 */
export async function registerForPushNotificationsAsync(): Promise<string | undefined> {
    let token: string | undefined;

    if (Platform.OS === 'android') {
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
            console.log('Push token:', token);
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
 */
export async function sendLocalNotification(
    title: string,
    body: string,
    data?: NotificationData
) {
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
 * Schedule a notification for a specific time
 */
export async function scheduleNotification(
    title: string,
    body: string,
    trigger: Date,
    data?: NotificationData
) {
    await Notifications.scheduleNotificationAsync({
        content: {
            title,
            body,
            data,
            sound: true,
        },
        trigger: {
            date: trigger,
        },
    });
}

/**
 * Cancel all scheduled notifications
 */
export async function cancelAllNotifications() {
    await Notifications.cancelAllScheduledNotificationsAsync();
}

/**
 * Cancel a specific notification by ID
 */
export async function cancelNotification(notificationId: string) {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
}

/**
 * Get badge count
 */
export async function getBadgeCount(): Promise<number> {
    return await Notifications.getBadgeCountAsync();
}

/**
 * Set badge count
 */
export async function setBadgeCount(count: number) {
    await Notifications.setBadgeCountAsync(count);
}

/**
 * Clear badge
 */
export async function clearBadge() {
    await Notifications.setBadgeCountAsync(0);
}

/**
 * Add notification received listener
 */
export function addNotificationReceivedListener(
    listener: (notification: Notifications.Notification) => void
) {
    return Notifications.addNotificationReceivedListener(listener);
}

/**
 * Add notification response listener (when user taps notification)
 */
export function addNotificationResponseListener(
    listener: (response: Notifications.NotificationResponse) => void
) {
    return Notifications.addNotificationResponseReceivedListener(listener);
}

/**
 * Remove notification listener
 */
export function removeNotificationSubscription(
    subscription: Notifications.Subscription
) {
    Notifications.removeNotificationSubscription(subscription);
}

/**
 * Handle notification tap - navigate to appropriate screen
 */
export function handleNotificationTap(
    data: NotificationData,
    navigation: any
) {
    switch (data.type) {
        case 'message':
            if (data.tripId) {
                navigation.navigate('chat/[id]', { id: data.tripId });
            }
            break;
        case 'trip':
            if (data.tripId) {
                navigation.navigate('trip/[id]', { id: data.tripId });
            }
            break;
        case 'booking':
            if (data.bookingId) {
                navigation.navigate('booking/[id]', { id: data.bookingId });
            }
            break;
        case 'payment':
            if (data.bookingId) {
                navigation.navigate('payment/[id]', { id: data.bookingId });
            }
            break;
        case 'emergency':
            if (data.tripId) {
                navigation.navigate('track/[id]', { id: data.tripId });
            }
            break;
        default:
            // Navigate to home or notifications screen
            navigation.navigate('(tabs)');
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
