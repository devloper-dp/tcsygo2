import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Share2, Copy, MessageCircle, Mail, Check } from 'lucide-react';

interface ShareTripDialogProps {
    isOpen: boolean;
    onClose: () => void;
    tripId: string;
    pickupLocation: string;
    dropLocation: string;
    driverName: string;
    departureTime: string;
}

export function ShareTripDialog({
    isOpen,
    onClose,
    tripId,
    pickupLocation,
    dropLocation,
    driverName,
    departureTime,
}: ShareTripDialogProps) {
    const { toast } = useToast();
    const [copied, setCopied] = useState(false);

    // Generate shareable link
    const shareUrl = `${window.location.origin}/track/${tripId}`;

    const shareMessage = `🚗 I'm on a ride with ${driverName}

📍 From: ${pickupLocation}
📍 To: ${dropLocation}
🕐 Departure: ${new Date(departureTime).toLocaleString()}

Track my ride live: ${shareUrl}

Powered by TCSYGO`;

    const handleCopyLink = async () => {
        try {
            await navigator.clipboard.writeText(shareUrl);
            setCopied(true);
            toast({
                title: 'Link copied!',
                description: 'Share link has been copied to clipboard',
            });
            setTimeout(() => setCopied(false), 2000);
        } catch (error) {
            toast({
                title: 'Failed to copy',
                description: 'Please try again',
                variant: 'destructive',
            });
        }
    };

    const handleShareWhatsApp = () => {
        const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareMessage)}`;
        window.open(whatsappUrl, '_blank');
    };

    const handleShareSMS = () => {
        const smsUrl = `sms:?body=${encodeURIComponent(shareMessage)}`;
        window.location.href = smsUrl;
    };

    const handleShareEmail = () => {
        const subject = 'Track my ride on TCSYGO';
        const body = shareMessage;
        const mailtoUrl = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
        window.location.href = mailtoUrl;
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Share2 className="w-5 h-5" />
                        Share Trip Details
                    </DialogTitle>
                    <DialogDescription>
                        Share your live trip status with friends and family for safety
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    {/* Copy Link */}
                    <div>
                        <Label htmlFor="share-link" className="text-sm font-medium mb-2 block">
                            Share Link
                        </Label>
                        <div className="flex gap-2">
                            <Input
                                id="share-link"
                                value={shareUrl}
                                readOnly
                                className="flex-1"
                            />
                            <Button
                                variant="outline"
                                size="icon"
                                onClick={handleCopyLink}
                                className="shrink-0"
                            >
                                {copied ? (
                                    <Check className="w-4 h-4 text-success" />
                                ) : (
                                    <Copy className="w-4 h-4" />
                                )}
                            </Button>
                        </div>
                    </div>

                    {/* Share Buttons */}
                    <div>
                        <Label className="text-sm font-medium mb-3 block">
                            Share via
                        </Label>
                        <div className="grid grid-cols-3 gap-3">
                            <Button
                                variant="outline"
                                className="flex-col h-auto py-4 gap-2"
                                onClick={handleShareWhatsApp}
                            >
                                <MessageCircle className="w-5 h-5 text-success" />
                                <span className="text-xs">WhatsApp</span>
                            </Button>

                            <Button
                                variant="outline"
                                className="flex-col h-auto py-4 gap-2"
                                onClick={handleShareSMS}
                            >
                                <MessageCircle className="w-5 h-5 text-primary" />
                                <span className="text-xs">SMS</span>
                            </Button>

                            <Button
                                variant="outline"
                                className="flex-col h-auto py-4 gap-2"
                                onClick={handleShareEmail}
                            >
                                <Mail className="w-5 h-5 text-warning" />
                                <span className="text-xs">Email</span>
                            </Button>
                        </div>
                    </div>

                    {/* Trip Summary */}
                    <div className="p-4 bg-muted/50 rounded-lg text-sm space-y-2">
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Driver:</span>
                            <span className="font-medium">{driverName}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">From:</span>
                            <span className="font-medium truncate ml-2">{pickupLocation}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">To:</span>
                            <span className="font-medium truncate ml-2">{dropLocation}</span>
                        </div>
                    </div>

                    <p className="text-xs text-muted-foreground text-center">
                        Anyone with this link can track your ride in real-time
                    </p>
                </div>
            </DialogContent>
        </Dialog>
    );
}
