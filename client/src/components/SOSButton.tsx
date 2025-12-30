import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { AlertTriangle, Phone, Share2, Shield } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface SOSButtonProps {
    tripId: string;
    currentLocation?: { lat: number; lng: number };
    emergencyContacts?: Array<{ name: string; phone: string }>;
    onSOSTriggered?: () => void;
    className?: string;
}

export function SOSButton({
    tripId,
    currentLocation,
    emergencyContacts = [],
    onSOSTriggered,
    className = '',
}: SOSButtonProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [isTriggered, setIsTriggered] = useState(false);
    const [countdown, setCountdown] = useState(5);

    const handleSOSTrigger = () => {
        setIsTriggered(true);

        // Countdown before triggering
        const interval = setInterval(() => {
            setCountdown((prev) => {
                if (prev <= 1) {
                    clearInterval(interval);
                    triggerSOS();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
    };

    const triggerSOS = async () => {
        try {
            const { triggerSOS } = await import('@/lib/safety-service');

            // Send SOS alert to backend
            const result = await triggerSOS(
                tripId,
                currentLocation || { lat: 0, lng: 0 }
            );

            if (!result.success) throw new Error(result.message);

            // Vibrate device
            if ('vibrate' in navigator) {
                navigator.vibrate([200, 100, 200, 100, 200]);
            }

            if (onSOSTriggered) {
                onSOSTriggered();
            }

            // Auto-close after triggering
            setTimeout(() => {
                setIsOpen(false);
                setIsTriggered(false);
                setCountdown(5);
            }, 3000);
        } catch (error) {
            console.error('Error triggering SOS:', error);
        }
    };

    const handleCancel = () => {
        setIsTriggered(false);
        setCountdown(5);
        setIsOpen(false);
    };

    const callPolice = () => {
        window.location.href = 'tel:100'; // India police emergency number
    };

    const callAmbulance = () => {
        window.location.href = 'tel:108'; // India ambulance emergency number
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button
                    variant="destructive"
                    size="lg"
                    className={`${className} animate-pulse`}
                >
                    <Shield className="w-5 h-5 mr-2" />
                    SOS Emergency
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-destructive">
                        <AlertTriangle className="w-5 h-5" />
                        Emergency SOS
                    </DialogTitle>
                    <DialogDescription>
                        This will alert emergency services and your emergency contacts
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    {!isTriggered ? (
                        <>
                            <Alert variant="destructive">
                                <AlertTriangle className="h-4 w-4" />
                                <AlertDescription>
                                    <p className="font-semibold mb-2">This will:</p>
                                    <ul className="list-disc list-inside space-y-1 text-sm">
                                        <li>Send your location to emergency services</li>
                                        <li>Alert your emergency contacts via SMS</li>
                                        <li>Share your ride details with authorities</li>
                                        <li>Start recording audio (if permitted)</li>
                                    </ul>
                                </AlertDescription>
                            </Alert>

                            <div className="space-y-2">
                                <p className="text-sm font-semibold">Quick Actions:</p>
                                <div className="grid grid-cols-2 gap-2">
                                    <Button
                                        variant="outline"
                                        onClick={callPolice}
                                        className="w-full"
                                    >
                                        <Phone className="w-4 h-4 mr-2" />
                                        Call Police (100)
                                    </Button>
                                    <Button
                                        variant="outline"
                                        onClick={callAmbulance}
                                        className="w-full"
                                    >
                                        <Phone className="w-4 h-4 mr-2" />
                                        Call Ambulance (108)
                                    </Button>
                                </div>
                            </div>

                            {emergencyContacts.length > 0 && (
                                <Card className="p-3 bg-muted">
                                    <p className="text-sm font-semibold mb-2">
                                        Emergency Contacts:
                                    </p>
                                    <div className="space-y-1">
                                        {emergencyContacts.map((contact, index) => (
                                            <div
                                                key={index}
                                                className="flex justify-between text-sm"
                                            >
                                                <span>{contact.name}</span>
                                                <span className="text-muted-foreground">
                                                    {contact.phone}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </Card>
                            )}

                            <div className="flex gap-2">
                                <Button
                                    variant="outline"
                                    onClick={handleCancel}
                                    className="flex-1"
                                >
                                    Cancel
                                </Button>
                                <Button
                                    variant="destructive"
                                    onClick={handleSOSTrigger}
                                    className="flex-1"
                                >
                                    <AlertTriangle className="w-4 h-4 mr-2" />
                                    Trigger SOS
                                </Button>
                            </div>
                        </>
                    ) : (
                        <div className="text-center space-y-4">
                            <div className="w-20 h-20 mx-auto rounded-full bg-destructive/10 flex items-center justify-center">
                                <span className="text-4xl font-bold text-destructive">
                                    {countdown}
                                </span>
                            </div>
                            <p className="text-lg font-semibold">
                                Triggering SOS in {countdown} seconds...
                            </p>
                            <p className="text-sm text-muted-foreground">
                                Emergency services and contacts will be notified
                            </p>
                            <Button
                                variant="outline"
                                onClick={handleCancel}
                                className="w-full"
                            >
                                Cancel SOS
                            </Button>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
