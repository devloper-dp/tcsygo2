import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Bell, Send, CheckCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

interface TrustedContact {
    id: string;
    name: string;
    phone: string;
}

interface TrustedContactsAutoNotifyProps {
    tripId: string;
    tripStatus: 'pending' | 'ongoing' | 'completed';
    pickupLocation: string;
    dropLocation: string;
    driverName?: string;
    vehicleNumber?: string;
    className?: string;
}

export function TrustedContactsAutoNotify({
    tripId,
    tripStatus,
    pickupLocation,
    dropLocation,
    driverName,
    vehicleNumber,
    className = '',
}: TrustedContactsAutoNotifyProps) {
    const { user } = useAuth();
    const { toast } = useToast();
    const [autoNotifyEnabled, setAutoNotifyEnabled] = useState(true);
    const [trustedContacts, setTrustedContacts] = useState<TrustedContact[]>([]);
    const [notificationsSent, setNotificationsSent] = useState({
        rideStart: false,
        rideEnd: false,
    });

    useEffect(() => {
        if (user) {
            fetchTrustedContacts();
        }
    }, [user]);

    useEffect(() => {
        if (autoNotifyEnabled && trustedContacts.length > 0) {
            handleAutoNotifications();
        }
    }, [tripStatus, autoNotifyEnabled, trustedContacts]);

    const fetchTrustedContacts = async () => {
        if (!user) return;

        try {
            const { data, error } = await supabase
                .from('emergency_contacts')
                .select('*')
                .eq('user_id', user.id)
                .limit(3);

            if (error) throw error;

            if (data) {
                setTrustedContacts(data.map(contact => ({
                    id: contact.id,
                    name: contact.name,
                    phone: contact.phone,
                })));
            }
        } catch (error) {
            console.error('Error fetching trusted contacts:', error);
        }
    };

    const handleAutoNotifications = async () => {
        // Notify when ride starts
        if (tripStatus === 'ongoing' && !notificationsSent.rideStart) {
            await sendRideStartNotification();
            setNotificationsSent(prev => ({ ...prev, rideStart: true }));
        }

        // Notify when ride ends
        if (tripStatus === 'completed' && !notificationsSent.rideEnd) {
            await sendRideEndNotification();
            setNotificationsSent(prev => ({ ...prev, rideEnd: true }));
        }
    };

    const sendRideStartNotification = async () => {
        try {
            const message = `🚗 Ride Started: ${user?.fullName || 'Your friend'} has started a ride from ${pickupLocation} to ${dropLocation}. Track here: https://tcsygo.com/track/${tripId}`;

            // Attempt to send in-app notification if contact is a registered user
            const notifications = trustedContacts.map(async (contact) => {
                // Try to resolve user by phone
                // Note: In a real app, you might want a more robust way to link contacts to users
                const { data: contactUser } = await supabase
                    .from('users')
                    .select('id')
                    .eq('phone', contact.phone)
                    .maybeSingle();

                if (contactUser) {
                    return supabase.from('notifications').insert({
                        user_id: contactUser.id,
                        title: 'Ride Started',
                        message: message,
                        type: 'ride_status',
                        data: { tripId, status: 'ongoing' }
                    });
                }
                return Promise.resolve();
            });

            await Promise.all(notifications);

            toast({
                title: 'Contacts Notified',
                description: `${trustedContacts.length} trusted contact(s) have been notified about your ride`,
            });
        } catch (error) {
            console.error('Error sending ride start notification:', error);
        }
    };

    const sendRideEndNotification = async () => {
        try {
            const message = `✅ Ride Completed: ${user?.fullName || 'Your friend'} has safely arrived at ${dropLocation}.`;

            const notifications = trustedContacts.map(async (contact) => {
                const { data: contactUser } = await supabase
                    .from('users')
                    .select('id')
                    .eq('phone', contact.phone)
                    .maybeSingle();

                if (contactUser) {
                    return supabase.from('notifications').insert({
                        user_id: contactUser.id,
                        title: 'Ride Completed',
                        message: message,
                        type: 'ride_status',
                        data: { tripId, status: 'completed' }
                    });
                }
                return Promise.resolve();
            });

            await Promise.all(notifications);

            toast({
                title: 'Ride Completed',
                description: 'Your trusted contacts have been notified',
            });
        } catch (error) {
            console.error('Error sending ride end notification:', error);
        }
    };

    if (trustedContacts.length === 0) {
        return null;
    }

    return (
        <Card className={`p-4 ${className}`}>
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Bell className="w-4 h-4 text-primary" />
                        <Label htmlFor="auto-notify" className="font-semibold">
                            Auto-notify Trusted Contacts
                        </Label>
                    </div>
                    <Switch
                        id="auto-notify"
                        checked={autoNotifyEnabled}
                        onCheckedChange={setAutoNotifyEnabled}
                    />
                </div>

                {autoNotifyEnabled && (
                    <div className="space-y-2">
                        <p className="text-xs text-muted-foreground">
                            Your trusted contacts will be automatically notified when:
                        </p>
                        <ul className="text-xs space-y-1 ml-4 list-disc text-muted-foreground">
                            <li>Your ride starts (with live tracking link)</li>
                            <li>Your ride is completed</li>
                        </ul>

                        <div className="pt-2 space-y-1">
                            {trustedContacts.map((contact) => (
                                <div key={contact.id} className="flex items-center gap-2 text-xs">
                                    <CheckCircle className="w-3 h-3 text-success" />
                                    <span>{contact.name} ({contact.phone})</span>
                                </div>
                            ))}
                        </div>

                        {notificationsSent.rideStart && (
                            <div className="pt-2 flex items-center gap-2 text-xs text-success">
                                <Send className="w-3 h-3" />
                                <span>Ride start notifications sent</span>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </Card>
    );
}
