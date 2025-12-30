import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Shield, CheckCircle, AlertTriangle, Phone } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

interface SafetyCheckInProps {
    tripId: string;
    isActive: boolean;
    checkInIntervalMinutes?: number;
    className?: string;
}

export function SafetyCheckIn({
    tripId,
    isActive,
    checkInIntervalMinutes = 10,
    className = '',
}: SafetyCheckInProps) {
    const { t } = useTranslation();
    const { user } = useAuth();
    const { toast } = useToast();
    const [showCheckIn, setShowCheckIn] = useState(false);
    const [lastCheckIn, setLastCheckIn] = useState<Date | null>(null);
    const [missedCheckIns, setMissedCheckIns] = useState(0);

    useEffect(() => {
        if (!isActive) return;

        // Set up periodic check-in prompts
        const interval = setInterval(() => {
            setShowCheckIn(true);
        }, checkInIntervalMinutes * 60 * 1000);

        // Show first check-in after 5 minutes
        const initialTimeout = setTimeout(() => {
            setShowCheckIn(true);
        }, 5 * 60 * 1000);

        return () => {
            clearInterval(interval);
            clearTimeout(initialTimeout);
        };
    }, [isActive, checkInIntervalMinutes]);

    // Auto-escalate if check-ins are missed
    useEffect(() => {
        if (missedCheckIns >= 2) {
            handleEscalate();
        }
    }, [missedCheckIns]);

    const handleCheckIn = async (status: 'safe' | 'need_help') => {
        try {
            // Get current location
            let location = { lat: 0, lng: 0 };
            if (navigator.geolocation) {
                const position = await new Promise<GeolocationPosition>((resolve, reject) => {
                    navigator.geolocation.getCurrentPosition(resolve, reject);
                });
                location = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude,
                };
            }

            const { error } = await supabase.from('safety_checkins').insert({
                trip_id: tripId,
                user_id: user?.id,
                status,
                location_lat: location.lat,
                location_lng: location.lng,
            });

            if (error) throw error;

            setLastCheckIn(new Date());
            setShowCheckIn(false);
            setMissedCheckIns(0);

            if (status === 'safe') {
                toast({
                    title: 'Check-in recorded',
                    description: 'Thank you for confirming your safety',
                });
            } else {
                handleEscalate();
            }
        } catch (error: any) {
            toast({
                title: 'Check-in failed',
                description: error.message,
                variant: 'destructive',
            });
        }
    };

    const handleEscalate = async () => {
        try {
            // Get current location for the alert
            let location = { lat: 0, lng: 0 };
            if (navigator.geolocation) {
                try {
                    const position = await new Promise<GeolocationPosition>((resolve, reject) => {
                        navigator.geolocation.getCurrentPosition(resolve, reject);
                    });
                    location = {
                        lat: position.coords.latitude,
                        lng: position.coords.longitude,
                    };
                } catch (e) {
                    console.error('Failed to get location for emergency alert:', e);
                }
            }

            // Create emergency alert
            const { error } = await supabase.from('emergency_alerts').insert({
                trip_id: tripId,
                user_id: user?.id,
                status: 'triggered',
                lat: location.lat.toString(),
                lng: location.lng.toString()
            });

            if (error) throw error;

            toast({
                title: `🚨 ${t('safety.alertSent')}`,
                description: 'Your emergency contacts and our safety team have been notified',
                variant: 'destructive',
                duration: 10000,
            });

            // Fetch emergency contacts
            const { data: contacts } = await supabase
                .from('emergency_contacts')
                .select('*')
                .eq('user_id', user?.id)
                .eq('is_active', true);

            if (contacts && contacts.length > 0) {
                // Send notifications to emergency contacts
                const notifications = contacts.map(contact => ({
                    user_id: user?.id,
                    title: 'EMERGENCY ALERT',
                    message: `${user?.fullName} has triggered an emergency alert during their trip.`,
                    type: 'emergency',
                    data: { tripId, contact_name: contact.name, contact_phone: contact.phone }
                }));

                await supabase.from('notifications').insert(notifications);
            }

            // Alert support team (create a support ticket)
            await supabase.from('support_tickets').insert({
                user_id: user?.id,
                name: user?.fullName || 'User',
                email: user?.email || 'support@tcsygo.com', // Fallback or required field
                message: `URGENT: Emergency alert triggered for Trip ID: ${tripId}. Location: ${location.lat}, ${location.lng}`,
                status: 'open',
            });

        } catch (error) {
            console.error('Escalation error:', error);
            toast({
                title: 'Alert failed',
                description: 'Failed to send emergency alert. Please call police immediately.',
                variant: 'destructive'
            });
        }
    };

    const handleDismiss = () => {
        setShowCheckIn(false);
        setMissedCheckIns((prev) => prev + 1);
        toast({
            title: 'Check-in reminder',
            description: 'Please respond to safety check-ins during your ride',
            variant: 'destructive',
        });
    };

    return (
        <>
            {/* Safety Status Indicator */}
            {isActive && lastCheckIn && (
                <Card className={`p-3 ${className}`}>
                    <div className="flex items-center gap-2">
                        <Shield className="w-4 h-4 text-success" />
                        <span className="text-sm text-muted-foreground">
                            Last check-in: {lastCheckIn.toLocaleTimeString()}
                        </span>
                        <Badge variant="outline" className="ml-auto">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Safe
                        </Badge>
                    </div>
                </Card>
            )}

            {/* Check-in Dialog */}
            <Dialog open={showCheckIn} onOpenChange={setShowCheckIn}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Shield className="w-5 h-5 text-primary" />
                            {t('safety.checkIn')}
                        </DialogTitle>
                        <DialogDescription>
                            Please confirm your safety status during this ride
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        {/* Safe Button */}
                        <Button
                            onClick={() => handleCheckIn('safe')}
                            className="w-full h-auto py-6 flex-col gap-2"
                            variant="default"
                        >
                            <CheckCircle className="w-8 h-8" />
                            <div>
                                <p className="font-semibold text-lg">{t('safety.imSafe')}</p>
                                <p className="text-sm opacity-90">Everything is going well</p>
                            </div>
                        </Button>

                        {/* Need Help Button */}
                        <Button
                            onClick={() => handleCheckIn('need_help')}
                            className="w-full h-auto py-6 flex-col gap-2"
                            variant="destructive"
                        >
                            <AlertTriangle className="w-8 h-8" />
                            <div>
                                <p className="font-semibold text-lg">{t('safety.needHelp')}</p>
                                <p className="text-sm opacity-90">
                                    Alert emergency contacts
                                </p>
                            </div>
                        </Button>

                        {/* Emergency Call */}
                        <div className="pt-4 border-t">
                            <Button
                                variant="outline"
                                className="w-full"
                                onClick={() => (window.location.href = 'tel:100')}
                            >
                                <Phone className="w-4 h-4 mr-2" />
                                {t('safety.callEmergency')} (100)
                            </Button>
                        </div>

                        {/* Dismiss */}
                        <Button
                            variant="ghost"
                            onClick={handleDismiss}
                            className="w-full text-muted-foreground"
                        >
                            Remind me later
                        </Button>

                        {missedCheckIns > 0 && (
                            <p className="text-xs text-center text-destructive">
                                ⚠️ {t('safety.missedCheckIns')}: {missedCheckIns}/2
                                {missedCheckIns >= 2 && ' - Emergency alert will be triggered'}
                            </p>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
