import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { locationTrackingService } from '@/lib/location-tracking';
import { Coordinates, calculateDistance as calculateDistanceKm } from '@/lib/maps';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface RealDriverTrackerProps {
    tripId: string;
    driverId: string;
    pickupLocation: Coordinates;
    dropLocation: Coordinates;
    isDriver: boolean;
    onArrival?: () => void;
    onComplete?: () => void;
}

export function RealDriverTracker({
    tripId,
    driverId,
    pickupLocation,
    dropLocation,
    isDriver,
    onArrival,
    onComplete
}: RealDriverTrackerProps) {
    const { user } = useAuth();
    const { toast } = useToast();
    const [isTracking, setIsTracking] = useState(false);
    const watchIdRef = useRef<number | null>(null);
    const notifiedArrivedRef = useRef(false);
    const notifiedCompletedRef = useRef(false);

    // Only run if the current user is the driver
    const shouldRun = isDriver && user?.id === driverId;

    useEffect(() => {
        if (!shouldRun) return;

        console.log('Starting Real Driver Tracking...');
        setIsTracking(true);

        if (!('geolocation' in navigator)) {
            toast({
                title: "Geolocation not supported",
                description: "Your device does not support geolocation tracking.",
                variant: 'destructive'
            });
            return;
        }

        const successHandler = async (position: GeolocationPosition) => {
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;
            const speed = position.coords.speed ? position.coords.speed * 3.6 : 0; // m/s to km/h
            const heading = position.coords.heading || 0;

            // Update Lat/Lng to Supabase
            try {
                await locationTrackingService.updateLocation({
                    tripId,
                    driverId,
                    lat,
                    lng,
                    heading,
                    speed
                });

                // Check Proximity Logic
                checkProximity(lat, lng);

            } catch (error) {
                console.error('Failed to update driver location:', error);
            }
        };

        const errorHandler = (error: GeolocationPositionError) => {
            console.error('Geolocation error:', error);
            toast({
                title: "GPS Error",
                description: `Unable to track location: ${error.message}`,
                variant: 'destructive'
            });
        };

        // Options for high accuracy tracking (for driving)
        const options = {
            enableHighAccuracy: true,
            timeout: 5000,
            maximumAge: 0
        };

        watchIdRef.current = navigator.geolocation.watchPosition(successHandler, errorHandler, options);

        return () => {
            if (watchIdRef.current !== null) {
                navigator.geolocation.clearWatch(watchIdRef.current);
            }
            setIsTracking(false);
        };
    }, [shouldRun, tripId, driverId]);

    const checkProximity = async (currentLat: number, currentLng: number) => {
        // 1. Driver Arrived (Distance to pickup < 100m)
        const distToPickup = calculateDistanceKm(currentLat, currentLng, pickupLocation.lat, pickupLocation.lng);

        if (distToPickup < 0.1 && !notifiedArrivedRef.current) {
            notifiedArrivedRef.current = true;

            await supabase.from('notifications').insert({
                // We'd ideally notify all passengers. For now, we rely on backend triggers or client notifications
                // But this component might not know passenger IDs.
                // Best practice: The backend should listen to location updates and trigger this.
                // However, following the existing pattern of client-side logic:
                // We will just let the parent know.
            });

            if (onArrival) onArrival();

            toast({
                title: "You have arrived!",
                description: "Notify passengers that you are at the pickup point."
            });
        }

        // 2. Trip Completed (Distance to drop < 100m)
        const distToDrop = calculateDistanceKm(currentLat, currentLng, dropLocation.lat, dropLocation.lng);
        if (distToDrop < 0.1 && !notifiedCompletedRef.current) {
            notifiedCompletedRef.current = true;

            if (onComplete) onComplete();

            toast({
                title: "Destination Reached",
                description: "You have arrived at the drop location."
            });
        }
    };

    return null; // Invisible component
}

