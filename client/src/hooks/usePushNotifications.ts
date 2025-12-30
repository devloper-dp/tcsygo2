import { useState, useEffect, useCallback } from 'react';
import {
    requestNotificationPermission,
    showNotification,
    NotificationPayload,
    getNotificationPermission,
} from '@/lib/notifications';

export function usePushNotifications() {
    const [permission, setPermission] = useState<NotificationPermission>(
        getNotificationPermission()
    );
    const [isSupported] = useState('Notification' in window);

    useEffect(() => {
        if (isSupported) {
            setPermission(Notification.permission);
        }
    }, [isSupported]);

    const requestPermission = useCallback(async () => {
        const result = await requestNotificationPermission();
        setPermission(result);
        return result;
    }, []);

    const sendNotification = useCallback(
        (payload: NotificationPayload) => {
            if (permission === 'granted') {
                showNotification(payload);
            } else {
                console.warn('Notification permission not granted');
            }
        },
        [permission]
    );

    return {
        permission,
        isSupported,
        requestPermission,
        sendNotification,
        isGranted: permission === 'granted',
    };
}
