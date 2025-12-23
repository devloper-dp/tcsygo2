import { supabase } from './supabase';

export interface LocationUpdate {
    tripId: string;
    driverId: string;
    lat: number;
    lng: number;
    heading?: number;
    speed?: number;
    timestamp: string;
}

export interface LocationSubscriptionOptions {
    tripId: string;
    onUpdate: (location: LocationUpdate) => void;
    onError?: (error: Error) => void;
}

class LocationTrackingService {
    private subscriptions: Map<string, any> = new Map();
    private updateInterval: number = 5000; // 5 seconds
    private isTracking: boolean = false;

    /**
     * Subscribe to real-time location updates for a trip
     */
    subscribeToTrip({ tripId, onUpdate, onError }: LocationSubscriptionOptions) {
        // Unsubscribe if already subscribed
        this.unsubscribeFromTrip(tripId);

        const channel = supabase
            .channel(`trip-location:${tripId}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'live_locations',
                    filter: `trip_id=eq.${tripId}`,
                },
                (payload) => {
                    if (payload.new) {
                        const data = payload.new as any; // Type assertion for Supabase payload
                        const location: LocationUpdate = {
                            tripId: data.trip_id,
                            driverId: data.driver_id,
                            lat: parseFloat(data.lat),
                            lng: parseFloat(data.lng),
                            heading: data.heading ? parseFloat(data.heading) : undefined,
                            speed: data.speed ? parseFloat(data.speed) : undefined,
                            timestamp: data.updated_at,
                        };
                        onUpdate(location);
                    }
                }
            )
            .subscribe((status) => {
                if (status === 'SUBSCRIBED') {
                    console.log(`Subscribed to location updates for trip ${tripId}`);
                } else if (status === 'CHANNEL_ERROR') {
                    onError?.(new Error('Failed to subscribe to location updates'));
                }
            });

        this.subscriptions.set(tripId, channel);
        return () => this.unsubscribeFromTrip(tripId);
    }

    /**
     * Unsubscribe from location updates for a trip
     */
    unsubscribeFromTrip(tripId: string) {
        const channel = this.subscriptions.get(tripId);
        if (channel) {
            supabase.removeChannel(channel);
            this.subscriptions.delete(tripId);
            console.log(`Unsubscribed from location updates for trip ${tripId}`);
        }
    }

    /**
     * Update driver location (for drivers)
     */
    async updateLocation(update: Omit<LocationUpdate, 'timestamp'>) {
        try {
            const { data, error } = await supabase
                .from('live_locations')
                .upsert({
                    trip_id: update.tripId,
                    driver_id: update.driverId,
                    lat: update.lat,
                    lng: update.lng,
                    heading: update.heading,
                    speed: update.speed,
                    updated_at: new Date().toISOString(),
                })
                .select()
                .single();

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Failed to update location:', error);
            throw error;
        }
    }

    /**
     * Get current location for a trip
     */
    async getCurrentLocation(tripId: string): Promise<LocationUpdate | null> {
        try {
            const { data, error } = await supabase
                .from('live_locations')
                .select('*')
                .eq('trip_id', tripId)
                .order('updated_at', { ascending: false })
                .limit(1)
                .single();

            if (error) {
                if (error.code === 'PGRST116') {
                    // No location found
                    return null;
                }
                throw error;
            }

            return {
                tripId: data.trip_id,
                driverId: data.driver_id,
                lat: parseFloat(data.lat),
                lng: parseFloat(data.lng),
                heading: data.heading ? parseFloat(data.heading) : undefined,
                speed: data.speed ? parseFloat(data.speed) : undefined,
                timestamp: data.updated_at,
            };
        } catch (error) {
            console.error('Failed to get current location:', error);
            return null;
        }
    }

    /**
     * Start tracking location (for drivers)
     */
    startTracking(
        tripId: string,
        driverId: string,
        getPosition: () => Promise<{ lat: number; lng: number; heading?: number; speed?: number }>
    ) {
        if (this.isTracking) {
            console.warn('Already tracking location');
            return;
        }

        this.isTracking = true;

        const updateLocation = async () => {
            if (!this.isTracking) return;

            try {
                const position = await getPosition();
                await this.updateLocation({
                    tripId,
                    driverId,
                    ...position,
                });
            } catch (error) {
                console.error('Failed to update location:', error);
            }

            if (this.isTracking) {
                setTimeout(updateLocation, this.updateInterval);
            }
        };

        updateLocation();
    }

    /**
     * Stop tracking location
     */
    stopTracking() {
        this.isTracking = false;
    }

    /**
     * Set update interval (in milliseconds)
     */
    setUpdateInterval(interval: number) {
        this.updateInterval = Math.max(1000, interval); // Minimum 1 second
    }

    /**
     * Clean up all subscriptions
     */
    cleanup() {
        this.stopTracking();
        this.subscriptions.forEach((channel, tripId) => {
            this.unsubscribeFromTrip(tripId);
        });
    }
}

export const locationTrackingService = new LocationTrackingService();
