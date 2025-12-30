import { supabase } from './supabase';

export interface NotificationPayload {
    title: string;
    body: string;
    icon?: string;
    badge?: string;
    data?: Record<string, any>;
    tag?: string;
    requireInteraction?: boolean;
}

export interface NotificationRecord {
    id: string;
    user_id: string;
    type: 'booking' | 'driver_arrival' | 'payment' | 'promotional' | 'safety' | 'system';
    title: string;
    message: string;
    data?: any;
    is_read: boolean;
    created_at: string;
    read_at?: string;
    expires_at?: string;
    priority: 'low' | 'medium' | 'high' | 'urgent';
    action_url?: string;
    action_text?: string;
}

export interface NotificationPreferences {
    user_id: string;
    push_enabled: boolean;
    email_enabled: boolean;
    sms_enabled: boolean;
    categories: {
        booking: boolean;
        driver_arrival: boolean;
        payment: boolean;
        promotional: boolean;
        safety: boolean;
        system: boolean;
    };
    quiet_hours: {
        enabled: boolean;
        start: string; // HH:mm format
        end: string;   // HH:mm format
    };
    created_at: string;
    updated_at: string;
}

/**
 * Get notification preferences for a user
 */
export async function getNotificationPreferences(): Promise<NotificationPreferences> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', user.id)
        .single();

    if (error || !data) {
        // Return default preferences
        const defaultPrefs: NotificationPreferences = {
            user_id: user.id,
            push_enabled: true,
            email_enabled: true,
            sms_enabled: false,
            categories: {
                booking: true,
                driver_arrival: true,
                payment: true,
                promotional: true,
                safety: true,
                system: true,
            },
            quiet_hours: {
                enabled: false,
                start: '22:00',
                end: '08:00',
            },
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        };

        await createNotificationPreferences(defaultPrefs);
        return defaultPrefs;
    }

    return data;
}

/**
 * Create notification preferences
 */
export async function createNotificationPreferences(
    preferences: NotificationPreferences
): Promise<void> {
    const { error } = await supabase
        .from('notification_preferences')
        .insert({
            user_id: preferences.user_id,
            push_enabled: preferences.push_enabled,
            email_enabled: preferences.email_enabled,
            sms_enabled: preferences.sms_enabled,
            categories: preferences.categories,
            quiet_hours: preferences.quiet_hours,
            created_at: preferences.created_at,
            updated_at: preferences.updated_at,
        });

    if (error) throw error;
}

/**
 * Update notification preferences
 */
export async function updateNotificationPreferences(
    updates: Partial<NotificationPreferences>
): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const updateData: any = {
        updated_at: new Date().toISOString(),
    };

    if (updates.push_enabled !== undefined) {
        updateData.push_enabled = updates.push_enabled;
    }
    if (updates.email_enabled !== undefined) {
        updateData.email_enabled = updates.email_enabled;
    }
    if (updates.sms_enabled !== undefined) {
        updateData.sms_enabled = updates.sms_enabled;
    }
    if (updates.categories) {
        updateData.categories = updates.categories;
    }
    if (updates.quiet_hours) {
        updateData.quiet_hours = updates.quiet_hours;
    }

    const { error } = await supabase
        .from('notification_preferences')
        .update(updateData)
        .eq('user_id', user.id);

    if (error) throw error;
}

/**
 * Create notification record
 */
export async function createNotification(notification: {
    type: NotificationRecord['type'];
    title: string;
    message: string;
    data?: any;
    priority?: NotificationRecord['priority'];
    action_url?: string;
    action_text?: string;
}): Promise<NotificationRecord> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
        .from('notifications')
        .insert({
            user_id: user.id,
            type: notification.type,
            title: notification.title,
            message: notification.message,
            data: notification.data,
            is_read: false,
            priority: notification.priority || 'medium',
            action_url: notification.action_url,
            action_text: notification.action_text,
            created_at: new Date().toISOString(),
        })
        .select()
        .single();

    if (error) throw error;

    // Show browser notification
    if (notification.type !== 'system') {
        showNotification({
            title: notification.title,
            body: notification.message,
            data: { url: notification.action_url, ...notification.data },
            tag: `notification-${data.id}`,
            requireInteraction: notification.priority === 'urgent',
        });
    }

    return data;
}

/**
 * Get notifications for a user
 */
export async function getNotifications(
    limit: number = 50,
    offset: number = 0,
    unreadOnly: boolean = false
): Promise<NotificationRecord[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    let query = supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

    if (unreadOnly) {
        query = query.eq('is_read', false);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
}

/**
 * Mark notification as read
 */
export async function markAsRead(notificationId: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { error } = await supabase
        .from('notifications')
        .update({
            is_read: true,
            read_at: new Date().toISOString(),
        })
        .eq('id', notificationId)
        .eq('user_id', user.id);

    if (error) throw error;
}

/**
 * Mark all notifications as read
 */
export async function markAllAsRead(): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { error } = await supabase
        .from('notifications')
        .update({
            is_read: true,
            read_at: new Date().toISOString(),
        })
        .eq('user_id', user.id)
        .eq('is_read', false);

    if (error) throw error;
}

/**
 * Get unread notification count
 */
export async function getUnreadCount(): Promise<number> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return 0;

    const { data, error } = await supabase
        .from('notifications')
        .select('id')
        .eq('user_id', user.id)
        .eq('is_read', false);

    if (error) throw error;
    return data?.length || 0;
}

/**
 * Subscribe to real-time notifications
 */
export function subscribeToNotifications(
    userId: string,
    callback: (notification: NotificationRecord) => void
) {
    return supabase
        .channel(`notifications:${userId}`)
        .on(
            'postgres_changes',
            {
                event: '*',
                schema: 'public',
                table: 'notifications',
                filter: `user_id=eq.${userId}`,
            },
            (payload) => {
                if (payload.new) {
                    callback(payload.new as NotificationRecord);
                }
            }
        )
        .subscribe();
}

/**
 * Request notification permission
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
    if (!('Notification' in window)) {
        console.warn('This browser does not support notifications');
        return 'denied';
    }

    if (Notification.permission === 'granted') {
        return 'granted';
    }

    if (Notification.permission !== 'denied') {
        const permission = await Notification.requestPermission();
        return permission;
    }

    return Notification.permission;
}

/**
 * Show browser notification
 */
export function showNotification(payload: NotificationPayload): void {
    if (!('Notification' in window)) {
        console.warn('This browser does not support notifications');
        return;
    }

    if (Notification.permission === 'granted') {
        const notification = new Notification(payload.title, {
            body: payload.body,
            icon: payload.icon || '/logo.png',
            badge: payload.badge || '/logo.png',
            tag: payload.tag,
            requireInteraction: payload.requireInteraction || false,
            data: payload.data,
        });

        notification.onclick = (event) => {
            event.preventDefault();
            window.focus();

            // Handle navigation based on notification data
            if (payload.data?.url) {
                window.location.href = payload.data.url;
            }

            notification.close();
        };
    }
}

/**
 * Notification templates for common scenarios
 */
export const NotificationTemplates = {
    bookingConfirmed: (bookingId: string, driverName: string) => ({
        title: '🎉 Booking Confirmed!',
        body: `Your ride with ${driverName} has been confirmed.`,
        tag: `booking-${bookingId}`,
        data: { url: `/track/${bookingId}`, type: 'booking' },
    }),

    driverArriving: (driverName: string, eta: number) => ({
        title: '🚗 Driver Arriving',
        body: `${driverName} will arrive in ${eta} minutes.`,
        tag: 'driver-arriving',
        requireInteraction: true,
        data: { type: 'arrival' },
    }),

    driverArrived: (driverName: string) => ({
        title: '✅ Driver Arrived',
        body: `${driverName} has arrived at your pickup location.`,
        tag: 'driver-arrived',
        requireInteraction: true,
        data: { type: 'arrival' },
    }),

    rideStarted: (destination: string) => ({
        title: '🛣️ Ride Started',
        body: `Your ride to ${destination} has started.`,
        tag: 'ride-started',
        data: { type: 'ride' },
    }),

    rideCompleted: (fare: number) => ({
        title: '🏁 Ride Completed',
        body: `Your ride is complete. Total fare: ₹${fare}`,
        tag: 'ride-completed',
        data: { type: 'ride' },
    }),

    paymentSuccess: (amount: number) => ({
        title: '💰 Payment Successful',
        body: `Payment of ₹${amount} processed successfully.`,
        tag: 'payment-success',
        data: { type: 'payment' },
    }),

    paymentFailed: () => ({
        title: '❌ Payment Failed',
        body: 'Your payment could not be processed. Please try again.',
        tag: 'payment-failed',
        requireInteraction: true,
        data: { type: 'payment' },
    }),

    promoApplied: (discount: number) => ({
        title: '🎁 Promo Applied!',
        body: `You saved ₹${discount} on this ride.`,
        tag: 'promo-applied',
        data: { type: 'promo' },
    }),

    safetyCheckIn: () => ({
        title: '🛡️ Safety Check-in',
        body: 'Are you safe? Tap to confirm.',
        tag: 'safety-checkin',
        requireInteraction: true,
        data: { type: 'safety' },
    }),

    emergencyAlert: (contactName: string) => ({
        title: '🚨 Emergency Alert Sent',
        body: `Emergency alert sent to ${contactName}.`,
        tag: 'emergency-alert',
        requireInteraction: true,
        data: { type: 'emergency' },
    }),

    walletRecharge: (amount: number, balance: number) => ({
        title: '💳 Wallet Recharged',
        body: `₹${amount} added. New balance: ₹${balance}`,
        tag: 'wallet-recharge',
        data: { type: 'wallet' },
    }),

    referralReward: (amount: number) => ({
        title: '🎉 Referral Reward!',
        body: `You earned ₹${amount} from a successful referral.`,
        tag: 'referral-reward',
        data: { type: 'referral' },
    }),
};

/**
 * Play notification sound
 */
export function playNotificationSound(): void {
    const audio = new Audio('/notification.mp3');
    audio.play().catch((error) => {
        console.warn('Could not play notification sound:', error);
    });
}

/**
 * Vibrate device (mobile)
 */
export function vibrateDevice(pattern: number | number[] = 200): void {
    if ('vibrate' in navigator) {
        navigator.vibrate(pattern);
    }
}

/**
 * Check if notifications are supported
 */
export function areNotificationsSupported(): boolean {
    return 'Notification' in window;
}

/**
 * Get notification permission status
 */
export function getNotificationPermission(): NotificationPermission {
    if (!areNotificationsSupported()) {
        return 'denied';
    }
    return Notification.permission;
}
