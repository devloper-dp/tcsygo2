import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Share2, Copy, Check, MessageSquare, Mail } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ShareRideStatusProps {
    tripId: string;
    driverName: string;
    vehicleNumber: string;
    pickupLocation: string;
    dropLocation: string;
    estimatedArrival: string;
    trackingUrl?: string;
    className?: string;
    iconOnly?: boolean;
}

export function ShareRideStatus({
    tripId,
    driverName,
    vehicleNumber,
    pickupLocation,
    dropLocation,
    estimatedArrival,
    trackingUrl,
    className = '',
    iconOnly = false,
}: ShareRideStatusProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [copied, setCopied] = useState(false);
    const { toast } = useToast();

    const shareUrl = trackingUrl || `${window.location.origin}/track/${tripId}`;

    const shareMessage = `🚗 I'm on a ride with TCSYGO

Driver: ${driverName}
Vehicle: ${vehicleNumber}
From: ${pickupLocation}
To: ${dropLocation}
ETA: ${estimatedArrival}

Track my ride: ${shareUrl}`;

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(shareMessage);
            setCopied(true);
            toast({
                title: 'Copied!',
                description: 'Ride details copied to clipboard',
            });
            setTimeout(() => setCopied(false), 2000);
        } catch (error) {
            toast({
                title: 'Error',
                description: 'Failed to copy to clipboard',
                variant: 'destructive',
            });
        }
    };

    const handleWhatsApp = () => {
        const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareMessage)}`;
        window.open(whatsappUrl, '_blank');
    };

    const handleSMS = () => {
        const smsUrl = `sms:?body=${encodeURIComponent(shareMessage)}`;
        window.location.href = smsUrl;
    };

    const handleEmail = () => {
        const subject = 'Track my TCSYGO ride';
        const emailUrl = `mailto:?subject=${encodeURIComponent(
            subject
        )}&body=${encodeURIComponent(shareMessage)}`;
        window.location.href = emailUrl;
    };

    const handleNativeShare = async () => {
        if (navigator.share) {
            try {
                await navigator.share({
                    title: 'Track my ride',
                    text: shareMessage,
                    url: shareUrl,
                });
            } catch (error) {
                console.error('Error sharing:', error);
            }
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" className={className} size={iconOnly ? "icon" : "default"}>
                    <Share2 className={`w-4 h-4 ${iconOnly ? '' : 'mr-2'}`} />
                    {!iconOnly && "Share Ride Status"}
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Share Ride Status</DialogTitle>
                    <DialogDescription>
                        Share your ride details with family and friends so they can track your journey
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    {/* Tracking Link */}
                    <div className="space-y-2">
                        <Label>Tracking Link</Label>
                        <div className="flex gap-2">
                            <Input value={shareUrl} readOnly className="flex-1" />
                            <Button
                                size="icon"
                                variant="outline"
                                onClick={handleCopy}
                                className="flex-shrink-0"
                            >
                                {copied ? (
                                    <Check className="w-4 h-4 text-success" />
                                ) : (
                                    <Copy className="w-4 h-4" />
                                )}
                            </Button>
                        </div>
                    </div>

                    {/* Share Options */}
                    <div className="space-y-2">
                        <Label>Share via</Label>
                        <div className="grid grid-cols-2 gap-2">
                            <Button
                                variant="outline"
                                onClick={handleWhatsApp}
                                className="w-full"
                            >
                                <MessageSquare className="w-4 h-4 mr-2" />
                                WhatsApp
                            </Button>
                            <Button
                                variant="outline"
                                onClick={handleSMS}
                                className="w-full"
                            >
                                <MessageSquare className="w-4 h-4 mr-2" />
                                SMS
                            </Button>
                            <Button
                                variant="outline"
                                onClick={handleEmail}
                                className="w-full"
                            >
                                <Mail className="w-4 h-4 mr-2" />
                                Email
                            </Button>
                            {typeof navigator.share === 'function' && (
                                <Button
                                    variant="outline"
                                    onClick={handleNativeShare}
                                    className="w-full"
                                >
                                    <Share2 className="w-4 h-4 mr-2" />
                                    More
                                </Button>
                            )}
                        </div>
                    </div>

                    {/* Message Preview */}
                    <div className="space-y-2">
                        <Label>Message Preview</Label>
                        <Card className="p-3 bg-muted">
                            <pre className="text-xs whitespace-pre-wrap font-sans">
                                {shareMessage}
                            </pre>
                        </Card>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
