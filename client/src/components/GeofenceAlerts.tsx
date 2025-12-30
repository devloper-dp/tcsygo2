import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin, Bell, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export interface Location {
    lat: number;
    lng: number;
}

export function calculateDistance(loc1: Location, loc2: Location): number {
    const R = 6371; // Earth's radius in km
    const dLat = ((loc2.lat - loc1.lat) * Math.PI) / 180;
    const dLon = ((loc2.lng - loc1.lng) * Math.PI) / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((loc1.lat * Math.PI) / 180) *
        Math.cos((loc2.lat * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c * 1000; // Return distance in meters
}

export function formatDistance(meters: number): string {
    if (meters < 1000) {
        return `${Math.round(meters)} m`;
    }
    return `${(meters / 1000).toFixed(1)} km`;
}

interface GeofenceAlertsProps {
    driverLocation: Location;
    pickupLocation: Location;
    dropLocation: Location;
    tripStatus: 'pending' | 'ongoing' | 'completed';
    className?: string;
}

export function GeofenceAlerts({
    driverLocation,
    pickupLocation,
    dropLocation,
    tripStatus,
    className = '',
}: GeofenceAlertsProps) {
    const { toast } = useToast();
    const [pickupAlerted, setPickupAlerted] = useState(false);
    const [dropAlerted, setDropAlerted] = useState(false);
    const [pickupDistance, setPickupDistance] = useState<number>(0);
    const [dropDistance, setDropDistance] = useState<number>(0);

    // Geofence thresholds in meters
    const NEAR_THRESHOLD = 500; // 500m
    const ARRIVED_THRESHOLD = 50; // 50m

    useEffect(() => {
        const distToPickup = calculateDistance(driverLocation, pickupLocation);
        const distToDrop = calculateDistance(driverLocation, dropLocation);

        setPickupDistance(distToPickup);
        setDropDistance(distToDrop);

        // Pickup proximity alerts
        if (tripStatus === 'pending' && !pickupAlerted) {
            if (distToPickup <= ARRIVED_THRESHOLD) {
                toast({
                    title: '🎯 Driver Arrived!',
                    description: 'Your driver has arrived at the pickup location',
                    duration: 5000,
                });
                setPickupAlerted(true);
                playNotificationSound();
            } else if (distToPickup <= NEAR_THRESHOLD) {
                toast({
                    title: '🚗 Driver Nearby',
                    description: `Driver is ${formatDistance(distToPickup)} away from pickup`,
                    duration: 4000,
                });
                setPickupAlerted(true);
            }
        }

        // Drop proximity alerts
        if (tripStatus === 'ongoing' && !dropAlerted) {
            if (distToDrop <= ARRIVED_THRESHOLD) {
                toast({
                    title: '🏁 Destination Reached!',
                    description: 'You have arrived at your destination',
                    duration: 5000,
                });
                setDropAlerted(true);
                playNotificationSound();
            } else if (distToDrop <= NEAR_THRESHOLD) {
                toast({
                    title: '📍 Approaching Destination',
                    description: `${formatDistance(distToDrop)} away from drop location`,
                    duration: 4000,
                });
                setDropAlerted(true);
            }
        }
    }, [driverLocation, tripStatus]);

    const playNotificationSound = () => {
        // Play a notification sound
        if ('vibrate' in navigator) {
            navigator.vibrate([200, 100, 200]);
        }
    };

    const getProximityStatus = () => {
        if (tripStatus === 'pending') {
            if (pickupDistance <= ARRIVED_THRESHOLD) {
                return { text: 'Driver Arrived', color: 'bg-success', icon: CheckCircle };
            } else if (pickupDistance <= NEAR_THRESHOLD) {
                return { text: 'Driver Nearby', color: 'bg-warning', icon: MapPin };
            }
        } else if (tripStatus === 'ongoing') {
            if (dropDistance <= ARRIVED_THRESHOLD) {
                return { text: 'Destination Reached', color: 'bg-success', icon: CheckCircle };
            } else if (dropDistance <= NEAR_THRESHOLD) {
                return { text: 'Approaching Destination', color: 'bg-primary', icon: MapPin };
            }
        }
        return null;
    };

    const status = getProximityStatus();

    if (!status) return null;

    const StatusIcon = status.icon;

    return (
        <Card className={`p-4 ${className}`}>
            <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full ${status.color} flex items-center justify-center`}>
                    <StatusIcon className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1">
                    <p className="font-semibold">{status.text}</p>
                    <p className="text-sm text-muted-foreground">
                        {tripStatus === 'pending'
                            ? formatDistance(pickupDistance)
                            : formatDistance(dropDistance)}{' '}
                        away
                    </p>
                </div>
                <Badge variant="outline" className="animate-pulse">
                    <Bell className="w-3 h-3 mr-1" />
                    Alert
                </Badge>
            </div>
        </Card>
    );
}
