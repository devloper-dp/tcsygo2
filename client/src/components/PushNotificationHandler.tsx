import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { Bell, Car, CreditCard, Gift, Info } from 'lucide-react';

interface Notification {
    id: string;
    userId: string;
    title: string;
    message: string;
    type: 'booking' | 'arrival' | 'payment' | 'offer' | 'info';
    isRead: boolean;
    data?: any;
    createdAt: string;
}

const NOTIFICATION_ICONS = {
    booking: Car,
    arrival: Bell,
    payment: CreditCard,
    offer: Gift,
    info: Info,
};

export function PushNotificationHandler() {
    const { user } = useAuth();
    const { toast } = useToast();

    useEffect(() => {
        if (!user?.id) return;

        const channel = supabase
            .channel('notifications')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'notifications',
                    filter: `user_id=eq.${user.id}`,
                },
                (payload) => {
                    const notification = payload.new as Notification;
                    const Icon = NOTIFICATION_ICONS[notification.type] || Bell;

                    toast({
                        title: notification.title,
                        description: notification.message,
                    });

                    // Show native notification if supported and permission granted
                    import('@/lib/notifications').then(({ showNotification, getNotificationPermission }) => {
                        if (getNotificationPermission() === 'granted') {
                            showNotification({
                                title: notification.title,
                                body: notification.message,
                                icon: '/icon-192x192.png', // Fallback or dynamic
                                data: { url: notification.data?.url || window.location.href }
                            });
                        }
                    });
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user?.id, toast]);

    return null;
}
