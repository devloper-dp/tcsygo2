import { supabase } from './supabase';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';

const LOCATION_TASK_NAME = 'background-location-task';

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
    private isTracking: boolean = false;
    private currentTripId: string | null = null;
    private currentDriverId: string | null = null;

    /**
     * Request location permissions
     */
    async requestPermissions(): Promise<boolean> {
        try {
            const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();

            if (foregroundStatus !== 'granted') {
                return false;
            }

            const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();

            return backgroundStatus === 'granted';
        } catch (error) {
            console.error('Failed to request location permissions:', error);
            return false;
        }
    }

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
     * Update driver location
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
     * Start foreground location tracking
     */
    async startForegroundTracking(tripId: string, driverId: string) {
        const hasPermission = await this.requestPermissions();
        if (!hasPermission) {
            throw new Error('Location permission not granted');
        }

        this.isTracking = true;
        this.currentTripId = tripId;
        this.currentDriverId = driverId;

        // Watch position with high accuracy
        const subscription = await Location.watchPositionAsync(
            {
                accuracy: Location.Accuracy.BestForNavigation,
                timeInterval: 5000, // Update every 5 seconds
                distanceInterval: 10, // Or every 10 meters
            },
            async (location) => {
                if (!this.isTracking) return;

                try {
                    await this.updateLocation({
                        tripId,
                        driverId,
                        lat: location.coords.latitude,
                        lng: location.coords.longitude,
                        heading: location.coords.heading ?? undefined,
                        speed: location.coords.speed ?? undefined,
                    });
                } catch (error) {
                    console.error('Failed to update location:', error);
                }
            }
        );

        return subscription;
    }

    /**
     * Start background location tracking (for active trips)
     */
    async startBackgroundTracking(tripId: string, driverId: string) {
        const hasPermission = await this.requestPermissions();
        if (!hasPermission) {
            throw new Error('Background location permission not granted');
        }

        this.currentTripId = tripId;
        this.currentDriverId = driverId;

        // Define background task
        TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }) => {
            if (error) {
                console.error('Background location error:', error);
                return;
            }

            if (data) {
                const { locations } = data as any;
                const location = locations[0];

                if (location && this.currentTripId && this.currentDriverId) {
                    try {
                        await this.updateLocation({
                            tripId: this.currentTripId,
                            driverId: this.currentDriverId,
                            lat: location.coords.latitude,
                            lng: location.coords.longitude,
                            heading: location.coords.heading ?? undefined,
                            speed: location.coords.speed ?? undefined,
                        });
                    } catch (error) {
                        console.error('Failed to update location in background:', error);
                    }
                }
            }
        });

        // Start background location updates
        await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
            accuracy: Location.Accuracy.Balanced,
            timeInterval: 10000, // Every 10 seconds
            distanceInterval: 20, // Or every 20 meters
            foregroundService: {
                notificationTitle: 'Trip in Progress',
                notificationBody: 'Sharing your location with passengers',
            },
        });

        this.isTracking = true;
    }

    /**
     * Stop location tracking
     */
    async stopTracking() {
        this.isTracking = false;
        this.currentTripId = null;
        this.currentDriverId = null;

        // Stop background tracking if active
        const isTaskDefined = await TaskManager.isTaskDefined(LOCATION_TASK_NAME);
        if (isTaskDefined) {
            await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
        }
    }

    /**
     * Get current device location
     */
    async getCurrentPosition(): Promise<Location.LocationObject> {
        const hasPermission = await this.requestPermissions();
        if (!hasPermission) {
            throw new Error('Location permission not granted');
        }

        return await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.High,
        });
    }

    /**
     * Clean up all subscriptions
     */
    async cleanup() {
        await this.stopTracking();
        this.subscriptions.forEach((channel, tripId) => {
            this.unsubscribeFromTrip(tripId);
        });
    }
}

export const locationTrackingService = new LocationTrackingService();
