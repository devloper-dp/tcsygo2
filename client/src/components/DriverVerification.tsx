import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { CheckCircle, AlertTriangle, User, Car, Shield, Phone } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { TripWithDriver } from '@shared/schema';

interface DriverVerificationProps {
    driver: TripWithDriver['driver'];
    onVerified: () => void;
    onReportMismatch: () => void;
    className?: string;
}

export function DriverVerification({
    driver,
    onVerified,
    onReportMismatch,
    className = '',
}: DriverVerificationProps) {
    const { t } = useTranslation();
    const { toast } = useToast();
    const [isOpen, setIsOpen] = useState(true);
    const [verified, setVerified] = useState(false);

    const handleVerify = () => {
        setVerified(true);
        toast({
            title: t('verification.verifiedDetails'),
            description: 'You can now start your ride safely',
        });
        setTimeout(() => {
            setIsOpen(false);
            onVerified();
        }, 1500);
    };

    const handleMismatch = () => {
        toast({
            title: t('verification.mismatchReported'),
            description: 'Our support team has been notified',
            variant: 'destructive',
        });
        setIsOpen(false);
        onReportMismatch();
    };

    const handleCallDriver = () => {
        if (driver.user.phone) {
            window.location.href = `tel:${driver.user.phone}`;
        } else {
            toast({
                title: 'Phone number not available',
                description: 'The driver has not provided a contact number.',
                variant: 'destructive'
            });
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Shield className="w-5 h-5 text-primary" />
                        {t('verification.title')}
                    </DialogTitle>
                    <DialogDescription>
                        Please verify the driver details before starting your ride
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {/* Driver Photo */}
                    <div className="flex flex-col items-center gap-3">
                        <Avatar className="w-24 h-24 border-4 border-primary/20">
                            <AvatarImage src={driver.user.profilePhoto || undefined} />
                            <AvatarFallback className="text-2xl">
                                {driver.user.fullName.charAt(0)}
                            </AvatarFallback>
                        </Avatar>
                        <div className="text-center">
                            <h3 className="text-xl font-bold">{driver.user.fullName}</h3>
                            <div className="flex items-center justify-center gap-2 mt-1">
                                <Badge variant="secondary">
                                    ⭐ {Number(driver.rating).toFixed(1)}
                                </Badge>
                                <Badge variant="outline">
                                    {driver.totalTrips} trips
                                </Badge>
                            </div>
                        </div>
                    </div>

                    {/* Verification Checklist */}
                    <Card className="p-4 bg-muted/50">
                        <h4 className="font-semibold mb-3 flex items-center gap-2">
                            <CheckCircle className="w-4 h-4 text-primary" />
                            {t('verification.checklist')}
                        </h4>
                        <div className="space-y-3">
                            {/* Vehicle Details */}
                            <div className="flex items-start gap-3">
                                <Car className="w-5 h-5 text-muted-foreground mt-0.5" />
                                <div className="flex-1">
                                    <p className="text-sm font-medium">{t('ride.vehicle')}</p>
                                    <p className="text-sm text-muted-foreground">
                                        {driver.vehicleMake} {driver.vehicleModel}
                                    </p>
                                    <p className="text-sm text-muted-foreground">
                                        {driver.vehicleColor}
                                    </p>
                                </div>
                            </div>

                            {/* License Plate */}
                            <div className="flex items-start gap-3">
                                <Shield className="w-5 h-5 text-muted-foreground mt-0.5" />
                                <div className="flex-1">
                                    <p className="text-sm font-medium">License Plate</p>
                                    <Badge variant="outline" className="mt-1 text-base font-bold">
                                        {driver.vehiclePlate}
                                    </Badge>
                                </div>
                            </div>

                            {/* Driver Photo */}
                            <div className="flex items-start gap-3">
                                <User className="w-5 h-5 text-muted-foreground mt-0.5" />
                                <div className="flex-1">
                                    <p className="text-sm font-medium">{t('verification.match')}</p>
                                    <p className="text-xs text-muted-foreground">
                                        Match the photo above with the driver
                                    </p>
                                </div>
                            </div>
                        </div>
                    </Card>

                    {/* Safety Tips */}
                    <Card className="p-4 bg-primary/5 border-primary/20">
                        <h4 className="font-semibold mb-2 text-sm">{t('safety.tips')}</h4>
                        <ul className="text-xs text-muted-foreground space-y-1">
                            <li>• Verify the license plate matches</li>
                            <li>• Check if the driver's photo matches</li>
                            <li>• Confirm vehicle make and color</li>
                            <li>• Share trip details with family/friends</li>
                        </ul>
                    </Card>

                    {/* Action Buttons */}
                    <div className="space-y-2">
                        {verified ? (
                            <Button className="w-full" size="lg" disabled>
                                <CheckCircle className="w-5 h-5 mr-2" />
                                {t('verification.verifiedDetails')}
                            </Button>
                        ) : (
                            <>
                                <Button
                                    onClick={handleVerify}
                                    className="w-full"
                                    size="lg"
                                >
                                    <CheckCircle className="w-5 h-5 mr-2" />
                                    {t('verification.startRide')}
                                </Button>

                                <Button
                                    onClick={handleMismatch}
                                    variant="destructive"
                                    className="w-full"
                                    size="lg"
                                >
                                    <AlertTriangle className="w-5 h-5 mr-2" />
                                    {t('verification.reportMismatch')}
                                </Button>
                            </>
                        )}

                        {/* Contact Driver */}
                        <Button
                            variant="outline"
                            className="w-full"
                            onClick={handleCallDriver}
                        >
                            <Phone className="w-4 h-4 mr-2" />
                            {t('verification.callDriver')}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
