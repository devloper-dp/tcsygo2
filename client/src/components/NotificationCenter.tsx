import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import {
    Bell,
    Car,
    CreditCard,
    Gift,
    CheckCircle,
    AlertCircle,
    Info,
    Trash2,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface Notification {
    id: string;
    title: string;
    message: string;
    type: 'booking' | 'arrival' | 'payment' | 'offer' | 'info';
    isRead: boolean;
    createdAt: string;
    data?: any;
}

export function NotificationCenter() {
    const { user } = useAuth();
    const { toast } = useToast();
    const [isOpen, setIsOpen] = useState(false);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [filter, setFilter] = useState<'all' | 'unread'>('all');

    useEffect(() => {
        if (user && isOpen) {
            loadNotifications();
        }
    }, [user, isOpen]);

    useEffect(() => {
        if (user) {
            // Subscribe to real-time notifications
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
                        const newNotification = mapNotification(payload.new);
                        setNotifications((prev) => [newNotification, ...prev]);
                        setUnreadCount((prev) => prev + 1);

                        // Show toast for new notification
                        toast({
                            title: newNotification.title,
                            description: newNotification.message,
                        });
                    }
                )
                .subscribe();

            return () => {
                supabase.removeChannel(channel);
            };
        }
    }, [user]);

    const loadNotifications = async () => {
        try {
            const { data, error } = await supabase
                .from('notifications')
                .select('*')
                .eq('user_id', user?.id)
                .order('created_at', { ascending: false })
                .limit(50);

            if (error) throw error;

            if (data) {
                const mapped = data.map(mapNotification);
                setNotifications(mapped);
                setUnreadCount(mapped.filter((n) => !n.isRead).length);
            }
        } catch (error) {
            console.error('Error loading notifications:', error);
        }
    };

    const mapNotification = (data: any): Notification => ({
        id: data.id,
        title: data.title,
        message: data.message,
        type: data.type,
        isRead: data.is_read,
        createdAt: data.created_at,
        data: data.data,
    });

    const markAsRead = async (notificationId: string) => {
        try {
            const { error } = await supabase
                .from('notifications')
                .update({ is_read: true })
                .eq('id', notificationId);

            if (error) throw error;

            setNotifications((prev) =>
                prev.map((n) => (n.id === notificationId ? { ...n, isRead: true } : n))
            );
            setUnreadCount((prev) => Math.max(0, prev - 1));
        } catch (error) {
            console.error('Error marking notification as read:', error);
        }
    };

    const markAllAsRead = async () => {
        try {
            const { error } = await supabase
                .from('notifications')
                .update({ is_read: true })
                .eq('user_id', user?.id)
                .eq('is_read', false);

            if (error) throw error;

            setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
            setUnreadCount(0);

            toast({
                title: 'All notifications marked as read',
            });
        } catch (error: any) {
            toast({
                title: 'Error',
                description: error.message,
                variant: 'destructive',
            });
        }
    };

    const deleteNotification = async (notificationId: string) => {
        try {
            const { error } = await supabase
                .from('notifications')
                .delete()
                .eq('id', notificationId);

            if (error) throw error;

            setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
        } catch (error) {
            console.error('Error deleting notification:', error);
        }
    };

    const getNotificationIcon = (type: Notification['type']) => {
        switch (type) {
            case 'booking':
                return Car;
            case 'arrival':
                return CheckCircle;
            case 'payment':
                return CreditCard;
            case 'offer':
                return Gift;
            default:
                return Info;
        }
    };

    const getNotificationColor = (type: Notification['type']) => {
        switch (type) {
            case 'booking':
                return 'text-primary';
            case 'arrival':
                return 'text-success';
            case 'payment':
                return 'text-blue-500';
            case 'offer':
                return 'text-purple-500';
            default:
                return 'text-muted-foreground';
        }
    };

    const filteredNotifications =
        filter === 'unread'
            ? notifications.filter((n) => !n.isRead)
            : notifications;

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                    <Bell className="w-5 h-5" />
                    {unreadCount > 0 && (
                        <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-[10px]">
                            {unreadCount > 9 ? '9+' : unreadCount}
                        </Badge>
                    )}
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh]">
                <DialogHeader>
                    <div className="flex items-center justify-between">
                        <DialogTitle className="flex items-center gap-2">
                            <Bell className="w-5 h-5" />
                            Notifications
                        </DialogTitle>
                        {unreadCount > 0 && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={markAllAsRead}
                            >
                                Mark all as read
                            </Button>
                        )}
                    </div>
                </DialogHeader>

                <Tabs value={filter} onValueChange={(v) => setFilter(v as any)}>
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="all">
                            All ({notifications.length})
                        </TabsTrigger>
                        <TabsTrigger value="unread">
                            Unread ({unreadCount})
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value={filter} className="mt-4">
                        <ScrollArea className="h-[500px] pr-4">
                            {filteredNotifications.length === 0 ? (
                                <div className="text-center py-12">
                                    <Bell className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                                    <p className="text-muted-foreground">
                                        {filter === 'unread'
                                            ? 'No unread notifications'
                                            : 'No notifications yet'}
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {filteredNotifications.map((notification) => {
                                        const Icon = getNotificationIcon(notification.type);
                                        const iconColor = getNotificationColor(notification.type);

                                        return (
                                            <Card
                                                key={notification.id}
                                                className={`p-4 cursor-pointer transition-colors ${!notification.isRead
                                                        ? 'bg-primary/5 border-primary/20'
                                                        : 'hover:bg-muted/50'
                                                    }`}
                                                onClick={() => markAsRead(notification.id)}
                                            >
                                                <div className="flex items-start gap-3">
                                                    <div
                                                        className={`w-10 h-10 rounded-full bg-muted flex items-center justify-center flex-shrink-0 ${iconColor}`}
                                                    >
                                                        <Icon className="w-5 h-5" />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-start justify-between gap-2 mb-1">
                                                            <h4 className="font-semibold text-sm">
                                                                {notification.title}
                                                            </h4>
                                                            {!notification.isRead && (
                                                                <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-1" />
                                                            )}
                                                        </div>
                                                        <p className="text-sm text-muted-foreground mb-2">
                                                            {notification.message}
                                                        </p>
                                                        <div className="flex items-center justify-between">
                                                            <span className="text-xs text-muted-foreground">
                                                                {format(
                                                                    new Date(notification.createdAt),
                                                                    'MMM dd, yyyy • hh:mm a'
                                                                )}
                                                            </span>
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    deleteNotification(notification.id);
                                                                }}
                                                            >
                                                                <Trash2 className="w-3 h-3" />
                                                            </Button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </Card>
                                        );
                                    })}
                                </div>
                            )}
                        </ScrollArea>
                    </TabsContent>
                </Tabs>
            </DialogContent>
        </Dialog>
    );
}
