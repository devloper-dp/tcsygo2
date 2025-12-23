import { useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { supabase } from './supabase';

// Configure notification behavior
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
    }),
});

export async function registerForPushNotificationsAsync() {
    let token;

    if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
            name: 'default',
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#3b82f6',
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
            alert('Failed to get push notification permissions!');
            return;
        }

        token = (await Notifications.getExpoPushTokenAsync()).data;
    } else {
        alert('Must use physical device for Push Notifications');
    }

    return token;
}

export function useNotifications(userId?: string) {
    const notificationListener = useRef<any>();
    const responseListener = useRef<any>();

    useEffect(() => {
        // Register for push notifications
        registerForPushNotificationsAsync().then(async (token) => {
            if (token && userId) {
                // Save token to user profile
                await supabase
                    .from('users')
                    .update({ push_token: token })
                    .eq('id', userId);
            }
        });

        // Listen for notifications received while app is foregrounded
        notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
            console.log('Notification received:', notification);
        });

        // Listen for user interactions with notifications
        responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
            console.log('Notification response:', response);

            // Handle notification tap - navigate to appropriate screen
            const data = response.notification.request.content.data;
            if (data.tripId) {
                // Navigate to trip details
                // router.push(`/trip/${data.tripId}`);
            } else if (data.bookingId) {
                // Navigate to booking
                // router.push(`/booking/${data.bookingId}`);
            }
        });

        return () => {
            Notifications.removeNotificationSubscription(notificationListener.current);
            Notifications.removeNotificationSubscription(responseListener.current);
        };
    }, [userId]);

    return {
        scheduleNotification: async (title: string, body: string, data?: any) => {
            await Notifications.scheduleNotificationAsync({
                content: {
                    title,
                    body,
                    data,
                },
                trigger: null, // Show immediately
            });
        },
    };
}

export async function sendPushNotification(expoPushToken: string, title: string, body: string, data?: any) {
    const message = {
        to: expoPushToken,
        sound: 'default',
        title,
        body,
        data,
    };

    await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
            Accept: 'application/json',
            'Accept-encoding': 'gzip, deflate',
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(message),
    });
}
