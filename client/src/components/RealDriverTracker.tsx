import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { locationTrackingService } from '@/lib/location-tracking';
import { Coordinates, calculateDistance as calculateDistanceKm } from '@/lib/maps';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface RealDriverTrackerProps {
    tripId: string;
    driverId: string;
    driverUserId: string;
    pickupLocation: Coordinates;
    dropLocation: Coordinates;
    isDriver: boolean;
    onArrival?: () => void;
    onComplete?: () => void;
}

export function RealDriverTracker({
    tripId,
    driverId,
    driverUserId,
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
    const notifiedArrivedRef = useRef<Record<string, boolean>>({});
    const notifiedCompletedRef = useRef<Record<string, boolean>>({});

    // Only run if the current user is the driver and matches the trip's driver user ID
    const shouldRun = isDriver && user?.id === driverUserId;

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
            timeout: 20000,
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
        try {
            // Fetch all active bookings for this trip to check against ALL stops (pooling)
            const { data: bookings } = await supabase
                .from('bookings')
                .select('*')
                .eq('trip_id', tripId)
                .neq('status', 'cancelled')
                .neq('status', 'completed'); // Only care about incomplete ones

            if (!bookings) return;

            // 1. Check Pickups
            for (const booking of bookings) {
                if (booking.status === 'confirmed') { // Waiting to be picked up
                    const dist = calculateDistanceKm(currentLat, currentLng, Number(booking.pickup_lat), Number(booking.pickup_lng));

                    // Use a unique key for "notified" ref to avoid re-notifying for same passenger
                    const notifKey = `arrived_pickup_${booking.id}`;
                    if (dist < 0.1 && !notifiedArrivedRef.current[notifKey]) {
                        notifiedArrivedRef.current[notifKey] = true;

                        await supabase.from('notifications').insert({
                            user_id: booking.passenger_id,
                            title: 'Driver Arrived',
                            message: 'Your driver has arrived at the pickup location.',
                            type: 'trip_update',
                            is_read: false
                        });

                        toast({
                            title: "Arrived at Pickup",
                            description: `Pickup for passenger #${booking.id.slice(0, 4)}`
                        });
                    }
                }
            }

            // 2. Check Drop-offs
            for (const booking of bookings) {
                if (booking.status === 'picked_up') { // On board
                    const dist = calculateDistanceKm(currentLat, currentLng, Number(booking.drop_lat), Number(booking.drop_lng));

                    const notifKey = `arrived_drop_${booking.id}`;
                    if (dist < 0.1 && !notifiedCompletedRef.current[notifKey]) {
                        notifiedCompletedRef.current[notifKey] = true;

                        // We don't auto-complete the booking here (driver must confirm "Drop Off" in manual manifest for safety/payment trigger)
                        // But we can notify

                        await supabase.from('notifications').insert({
                            user_id: booking.passenger_id,
                            title: 'Arriving at Destination',
                            message: 'You are arriving at your drop location.',
                            type: 'trip_update',
                            is_read: false
                        });

                        toast({
                            title: "Arrived at Drop",
                            description: `Drop-off for passenger #${booking.id.slice(0, 4)}`
                        });
                    }
                }
            }

            // 3. Driver Arrival (Legacy/Single Passenger compatibility) - keeping existing props check as fallback
            const distToPickup = calculateDistanceKm(currentLat, currentLng, pickupLocation.lat, pickupLocation.lng);
            if (distToPickup < 0.1 && !notifiedArrivedRef.current['main']) {
                notifiedArrivedRef.current['main'] = true;
                if (onArrival) onArrival();
            }

            const distToDrop = calculateDistanceKm(currentLat, currentLng, dropLocation.lat, dropLocation.lng);
            if (distToDrop < 0.1 && !notifiedCompletedRef.current['main']) {
                notifiedCompletedRef.current['main'] = true;
                if (onComplete) onComplete();
            }

        } catch (error) {
            console.error("Proximity check failed", error);
        }
    };

    return null; // Invisible component
}

