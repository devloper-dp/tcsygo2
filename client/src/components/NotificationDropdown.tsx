import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Bell } from 'lucide-react';
import { queryClient } from '@/lib/queryClient';
import { formatDistanceToNow } from 'date-fns';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Notification } from '@shared/schema';

// Map database schema to simple notification interface if needed, or use shared schema directly
// Looking at shared/schema, Notification has camelCase fields? No, mapper handles it usually, or we use raw Supabase data which is snake_case.
// We should check shared schema. Assuming Supabase returns snake_case, we might need mapping.
// Let's define the Supabase interface here for simplicity or use mapper.
// I'll create a local mapper or assume we treat raw data for now, but UI expects camelCase probably.
// Actually `client/src/lib/mapper.ts` didn't have `mapNotification`. I should check if I missed it or should add it.
// For now, I'll map manually in queryFn.

interface NotificationInterface {
    id: string;
    title: string;
    message: string;
    type: string;
    isRead: boolean;
    createdAt: string;
}

export function NotificationDropdown() {
    const [isOpen, setIsOpen] = useState(false);
    const { user } = useAuth();

    const { data: notifications } = useQuery<NotificationInterface[]>({
        queryKey: ['notifications', user?.id, user?.role],
        queryFn: async () => {
            if (!user) return [];

            let query = supabase
                .from('notifications')
                .select('*');

            if (user.role === 'admin') {
                query = query.or(`user_id.eq.${user.id},recipient_id.eq.admin`);
            } else {
                query = query.eq('user_id', user.id);
            }

            const { data, error } = await query.order('created_at', { ascending: false });

            if (error) throw error;

            return (data || []).map((n: any) => ({
                id: n.id,
                title: n.title,
                message: n.message,
                type: n.type,
                isRead: n.is_read,
                createdAt: n.created_at
            }));
        },
        // Refetch every minute
        refetchInterval: 60000,
        enabled: !!user,
    });

    const markReadMutation = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase
                .from('notifications')
                .update({ is_read: true })
                .eq('id', id);

            if (error) throw error;
            return true;
        },
        onSuccess: () => {
            // Invalidate to refetch
            queryClient.invalidateQueries({ queryKey: ['notifications', user?.id] });
        }
    });

    const markAllReadMutation = useMutation({
        mutationFn: async () => {
            if (!user) return;
            const { error } = await supabase
                .from('notifications')
                .update({ is_read: true })
                .eq('user_id', user.id);

            if (error) throw error;
            return true;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['notifications', user?.id] });
        }
    });

    const unreadCount = notifications?.filter(n => !n.isRead).length || 0;

    return (
        <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                    <Bell className="w-5 h-5" />
                    {unreadCount > 0 && (
                        <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-destructive rounded-full" />
                    )}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
                <DropdownMenuLabel className="flex items-center justify-between">
                    <span>Notifications</span>
                    {unreadCount > 0 && (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-auto text-xs text-primary p-0 hover:bg-transparent"
                            onClick={(e) => {
                                e.preventDefault();
                                markAllReadMutation.mutate();
                            }}
                        >
                            Mark all read
                        </Button>
                    )}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <div className="max-h-[300px] overflow-y-auto">
                    {notifications && notifications.length > 0 ? (
                        notifications.map((notification) => (
                            <DropdownMenuItem
                                key={notification.id}
                                className={`flex flex-col items-start p-3 cursor-pointer ${!notification.isRead ? 'bg-muted/50' : ''}`}
                                onClick={() => !notification.isRead && markReadMutation.mutate(notification.id)}
                            >
                                <div className="font-medium text-sm mb-1">{notification.title}</div>
                                <div className="text-xs text-muted-foreground mb-1">{notification.message}</div>
                                <div className="text-[10px] text-muted-foreground/70">
                                    {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                                </div>
                            </DropdownMenuItem>
                        ))
                    ) : (
                        <div className="p-4 text-center text-sm text-muted-foreground">
                            No notifications
                        </div>
                    )}
                </div>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
