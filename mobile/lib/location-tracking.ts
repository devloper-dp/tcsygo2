import { supabase } from './supabase';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { logger } from '../services/LoggerService';
import type { Coordinates } from '../services/MapService';

const LOCATION_TASK_NAME = 'background-location-task';
const STORAGE_KEY_TRIP_ID = 'tracking_trip_id';
const STORAGE_KEY_DRIVER_ID = 'tracking_driver_id';

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

// Define task in global scope
TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }: { data: any, error: any }) => {
    if (error) {
        logger.error('Background location error', error);
        return;
    }

    if (data) {
        const { locations } = data as any;
        const location = locations[0];

        if (location) {
            try {
                // Retrieve context from storage
                const tripId = await AsyncStorage.getItem(STORAGE_KEY_TRIP_ID);
                const driverId = await AsyncStorage.getItem(STORAGE_KEY_DRIVER_ID);

                if (tripId && driverId) {
                    logger.info(`BackgroundLocation.update: ${tripId}`, { location });
                    await locationTrackingService.updateLocation({
                        tripId,
                        driverId,
                        lat: location.coords.latitude,
                        lng: location.coords.longitude,
                        heading: location.coords.heading ?? undefined,
                        speed: location.coords.speed ?? undefined,
                    });
                }
            } catch (error) {
                logger.error('Failed to update location in background', error);
            }
        }
    }
});

class LocationTrackingService {
    private subscriptions: Map<string, any> = new Map();
    private isTracking: boolean = false;
    private currentTripId: string | null = null;
    private currentDriverId: string | null = null;

    /**
     * Request location permissions
     */
    async requestPermissions(): Promise<boolean> {
        logger.info('LocationTracking.requestPermissions started');
        try {
            const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();

            if (foregroundStatus !== 'granted') {
                logger.warn('LocationTracking.requestPermissions foreground denied');
                return false;
            }

            const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
            const granted = backgroundStatus === 'granted';
            return granted;
        } catch (error) {
            logger.error('Failed to request location permissions', error);
            return false;
        }
    }

    /**
     * Subscribe to real-time location updates for a trip
     */
    subscribeToTrip({ tripId, onUpdate, onError }: LocationSubscriptionOptions) {
        logger.info(`LocationTracking.subscribe started: ${tripId}`);
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
                    // Subscribed successfully
                } else if (status === 'CHANNEL_ERROR') {
                    const error = new Error('Failed to subscribe to location updates');
                    logger.error(`LocationTracking.subscribeError: ${tripId}`, error);
                    onError?.(error);
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
            logger.info(`LocationTracking.unsubscribe: ${tripId}`);
            supabase.removeChannel(channel);
            this.subscriptions.delete(tripId);
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
            logger.error('Failed to update location', error);
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

            const result = {
                tripId: data.trip_id,
                driverId: data.driver_id,
                lat: parseFloat(data.lat),
                lng: parseFloat(data.lng),
                heading: data.heading ? parseFloat(data.heading) : undefined,
                speed: data.speed ? parseFloat(data.speed) : undefined,
                timestamp: data.updated_at,
            };
            return result;
        } catch (error) {
            logger.error('Failed to get current location', error);
            return null;
        }
    }

    /**
     * Start foreground location tracking
     */
    async startForegroundTracking(tripId: string, driverId: string) {
        logger.info(`LocationTracking.startForeground started: ${tripId}`);
        const hasPermission = await this.requestPermissions();
        if (!hasPermission) {
            const error = new Error('Location permission not granted');
            logger.error('Location permission denied', error);
            throw error;
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
                    // logger.error is already called within this.updateLocation
                }
            }
        );

        return subscription;
    }

    /**
     * Start background location tracking (for active trips)
     */
    async startBackgroundTracking(tripId: string, driverId: string) {
        logger.info(`LocationTracking.startBackground started: ${tripId}`);
        const hasPermission = await this.requestPermissions();
        if (!hasPermission) {
            const error = new Error('Background location permission not granted');
            logger.error('Background location permission denied', error);
            throw error;
        }

        this.currentTripId = tripId;
        this.currentDriverId = driverId;

        // Persist context
        await AsyncStorage.setItem(STORAGE_KEY_TRIP_ID, tripId);
        await AsyncStorage.setItem(STORAGE_KEY_DRIVER_ID, driverId);

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
        logger.info('LocationTracking.stopTracking');
        this.isTracking = false;
        this.currentTripId = null;
        this.currentDriverId = null;

        // Clear context
        await AsyncStorage.removeItem(STORAGE_KEY_TRIP_ID);
        await AsyncStorage.removeItem(STORAGE_KEY_DRIVER_ID);

        // Stop background tracking if active
        // We check if it's running to avoid errors
        const hasStarted = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);
        if (hasStarted) {
            await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
        }
    }

    /**
     * Get current device location
     */
    async getCurrentPosition(): Promise<Location.LocationObject> {
        logger.info('LocationTracking.getCurrentPosition started');
        const hasPermission = await this.requestPermissions();
        if (!hasPermission) {
            const error = new Error('Location permission not granted');
            logger.error('Location permission denied', error);
            throw error;
        }

        const position = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.High,
        });
        return position;
    }

    /**
     * Clean up all subscriptions
     */
    async cleanup() {
        logger.info('LocationTracking.cleanup');
        await this.stopTracking();
        this.subscriptions.forEach((channel, tripId) => {
            this.unsubscribeFromTrip(tripId);
        });
    }
}

export const locationTrackingService = new LocationTrackingService();
