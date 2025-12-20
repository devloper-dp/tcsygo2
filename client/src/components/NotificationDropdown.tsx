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
import { apiRequest, queryClient } from '@/lib/queryClient';
import { formatDistanceToNow } from 'date-fns';

interface Notification {
    id: string;
    title: string;
    message: string;
    type: string;
    isRead: boolean;
    createdAt: string;
}

export function NotificationDropdown() {
    const [isOpen, setIsOpen] = useState(false);

    const { data: notifications } = useQuery<Notification[]>({
        queryKey: ['/api/notifications'],
        // Refetch every minute
        refetchInterval: 60000
    });

    const markReadMutation = useMutation({
        mutationFn: async (id: string) => {
            return await apiRequest('PUT', `/api/notifications/${id}/read`, {});
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
        }
    });

    const markAllReadMutation = useMutation({
        mutationFn: async () => {
            return await apiRequest('PUT', '/api/notifications/read-all', {});
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
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
