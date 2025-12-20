import { useLocation, useRoute } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Phone, Shield } from 'lucide-react';
import { MapView } from '@/components/MapView';
import { TripWithDriver } from '@shared/schema';

import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

export default function TrackTrip() {
    const [, navigate] = useLocation();
    const [, params] = useRoute('/track/:id');
    const tripId = params?.id;
    const { toast } = useToast();

    const { data: trip, isLoading } = useQuery<TripWithDriver>({
        queryKey: ['/api/trips', tripId],
        enabled: !!tripId,
    });

    const handleSOS = async () => {
        if (!trip) return;

        try {
            await apiRequest('POST', '/api/sos', {
                tripId: trip.id,
                reporterId: trip.driver.userId, // In a real app this should be the current user
                lat: trip.pickupLat, // Ideally use current location
                lng: trip.pickupLng,
            });

            toast({
                title: "EMERGENCY ALERT SENT",
                description: "Help is on the way. Your location has been shared with our safety team.",
                variant: "destructive",
                duration: 10000,
            });
        } catch (error) {
            toast({
                title: "Failed to send alert",
                description: "Please call 100 immediately.",
                variant: "destructive",
            });
        }
    };

    if (isLoading || !trip) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                    <p className="text-muted-foreground">Connecting to vehicle...</p>
                </div>
            </div>
        );
    }

    const driver = trip.driver;

    return (
        <div className="min-h-screen bg-background flex flex-col">
            <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur shrink-0">
                <div className="container mx-auto px-6 h-16 flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => navigate('/my-trips')}>
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                    <div>
                        <h1 className="text-xl font-display font-bold">Live Tracking</h1>
                        <p className="text-xs text-muted-foreground">
                            {trip.pickupLocation} → {trip.dropLocation}
                        </p>
                    </div>
                    <div className="ml-auto flex items-center gap-2">
                        <Badge variant="outline" className="animate-pulse bg-green-500/10 text-green-500 border-green-500/20">
                            ● LIVE
                        </Badge>
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button variant="destructive" size="sm" className="gap-2 animate-pulse hover:animate-none">
                                    <Shield className="w-4 h-4" />
                                    SOS
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle className="text-destructive flex items-center gap-2">
                                        <Shield className="w-5 h-5" />
                                        Emergency SOS
                                    </AlertDialogTitle>
                                    <AlertDialogDescription>
                                        Are you sure you want to trigger an emergency alert? This will send your live location to our safety team and emergency contacts.
                                        <br /><br />
                                        <strong>Only use this in case of a genuine emergency.</strong>
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={handleSOS} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
                                        YES, SEND HELP
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </div>
                </div>
            </header>

            <div className="flex-1 relative">
                <MapView
                    tripId={tripId}
                    onMapClick={() => { }}
                    className="w-full h-full absolute inset-0"
                    zoom={14}
                />

                {/* Driver Info Overlay */}
                <div className="absolute bottom-6 left-6 right-6 md:left-auto md:right-6 md:w-96">
                    <Card className="p-4 shadow-xl border-primary/20">
                        <div className="flex items-center gap-4">
                            <Avatar className="w-12 h-12 border-2 border-background">
                                <AvatarImage src={driver.user.profilePhoto || undefined} />
                                <AvatarFallback>{driver.user.fullName.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                                <h3 className="font-semibold truncate">{driver.user.fullName}</h3>
                                <p className="text-sm text-muted-foreground">
                                    {driver.vehicleMake} {driver.vehicleModel} • {driver.vehiclePlate}
                                </p>
                            </div>
                            <Button size="icon" variant="secondary" className="rounded-full h-10 w-10">
                                <Phone className="w-4 h-4" />
                            </Button>
                        </div>

                        <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 p-2 rounded">
                            <Shield className="w-3 h-3" />
                            <span>Your ride is monitored for safety</span>
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
}
