import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';
import { logger } from './LoggerService';

const LOCATION_TASK_NAME = 'background-location-task';
const GEOFENCE_TASK_NAME = 'geofence-task';
const STORAGE_KEY_TRIP_ID = 'tracking_trip_id';
const STORAGE_KEY_DRIVER_ID = 'tracking_driver_id';

export interface Coordinates {
    lat: number;
    lng: number;
}

export interface LocationUpdate {
    tripId?: string;
    driverId?: string;
    lat: number;
    lng: number;
    heading?: number;
    speed?: number;
    timestamp: string;
}

export interface GeofenceRegion {
    identifier: string;
    latitude: number;
    longitude: number;
    radius: number;
    notifyOnEnter?: boolean;
    notifyOnExit?: boolean;
}

// Define background location task
TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }: { data: any, error: any }) => {
    if (error) {
        logger.error('Background location task error:', error);
        return;
    }

    if (data) {
        const { locations } = data;
        const location = locations[0];
        if (!location) return;

        try {
            // 1. Get context from storage
            const tripId = await AsyncStorage.getItem(STORAGE_KEY_TRIP_ID);
            const driverId = await AsyncStorage.getItem(STORAGE_KEY_DRIVER_ID);

            // 2. Get current user
            const { data: { user } } = await supabase.auth.getUser();

            const lat = location.coords.latitude;
            const lng = location.coords.longitude;
            const heading = location.coords.heading ?? undefined;
            const speed = location.coords.speed ?? undefined;

            // 3. Update active trip live location if we have IDs
            if (tripId && driverId) {
                await locationTrackingService.updateLiveLocation({
                    tripId,
                    driverId,
                    lat,
                    lng,
                    heading,
                    speed
                });
            }

            // 4. Update driver availability if user is a driver
            if (user) {
                await locationTrackingService.syncDriverAvailability(user.id, { lat, lng }, heading, speed);
            }
        } catch (err) {
            logger.error('Failed to process background location update', err);
        }
    }
});

// Define geofence task
TaskManager.defineTask(GEOFENCE_TASK_NAME, async ({ data, error }: { data: any, error: any }) => {
    if (error) {
        logger.error('Geofence task error:', error);
        return;
    }
    if (data) {
        const { eventType, region } = data;
        logger.info('Geofence event:', { eventType, region });
        // Logic for handling geofence events can be added here or via listeners
    }
});

class LocationTrackingService {
    private subscriptions: Map<string, ReturnType<typeof supabase.channel>> = new Map();
    private isTracking: boolean = false;

    /**
     * Request all necessary permissions
     */
    async requestPermissions(): Promise<boolean> {
        try {
            const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
            if (foregroundStatus !== 'granted') return false;

            const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
            return backgroundStatus === 'granted';
        } catch (error) {
            logger.error('Error requesting location permissions:', error);
            return false;
        }
    }

    /**
     * Update live location for a trip
     */
    async updateLiveLocation(update: Omit<LocationUpdate, 'timestamp'>) {
        try {
            const { error } = await supabase
                .from('live_locations')
                .upsert({
                    trip_id: update.tripId,
                    driver_id: update.driverId,
                    lat: update.lat,
                    lng: update.lng,
                    heading: update.heading,
                    speed: update.speed,
                    updated_at: new Date().toISOString(),
                });

            if (error) throw error;
        } catch (error) {
            logger.error('Failed to update live_locations', error);
            throw error;
        }
    }

    /**
     * Sync driver availability in database
     */
    async syncDriverAvailability(userId: string, coords: Coordinates, heading?: number, speed?: number) {
        try {
            const { data: driver } = await supabase
                .from('drivers')
                .select('id')
                .eq('user_id', userId)
                .single();

            if (driver) {
                await supabase
                    .from('driver_availability')
                    .upsert({
                        driver_id: driver.id,
                        current_lat: coords.lat,
                        current_lng: coords.lng,
                        current_heading: heading,
                        current_speed: speed,
                        last_location_update: new Date().toISOString(),
                    });
                
                // Also update any active trips for this driver
                const { data: activeTrip } = await supabase
                    .from('trips')
                    .select('id')
                    .eq('driver_id', driver.id)
                    .eq('status', 'ongoing')
                    .single();

                if (activeTrip) {
                    await this.updateLiveLocation({
                        tripId: activeTrip.id,
                        driverId: driver.id,
                        lat: coords.lat,
                        lng: coords.lng,
                        heading,
                        speed
                    });
                }
            }
        } catch (error) {
            logger.error('Error syncing driver availability:', error);
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
                if (error.code === 'PGRST116') return null;
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
            logger.error('Failed to get current location', error);
            return null;
        }
    }

    /**
     * Subscribe to real-time location updates for a specific trip
     */
    subscribeToTrip(options: { tripId: string; onUpdate: (location: LocationUpdate) => void; onError?: (error: Error) => void }) {
        const { tripId, onUpdate, onError } = options;
        if (this.subscriptions.has(tripId)) {
            this.unsubscribeFromTrip(tripId);
        }

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
                        const data = payload.new as any;
                        onUpdate({
                            tripId: data.trip_id,
                            driverId: data.driver_id,
                            lat: parseFloat(data.lat),
                            lng: parseFloat(data.lng),
                            heading: data.heading ? parseFloat(data.heading) : undefined,
                            speed: data.speed ? parseFloat(data.speed) : undefined,
                            timestamp: data.updated_at,
                        });
                    }
                }
            )
            .subscribe((status) => {
                if (status === 'CHANNEL_ERROR') {
                    onError?.(new Error('Failed to subscribe to location updates'));
                }
            });

        this.subscriptions.set(tripId, channel);
        return () => this.unsubscribeFromTrip(tripId);
    }

    unsubscribeFromTrip(tripId: string) {
        const channel = this.subscriptions.get(tripId);
        if (channel) {
            supabase.removeChannel(channel);
            this.subscriptions.delete(tripId);
        }
    }

    /**
     * Start background location tracking
     */
    async startBackgroundTracking(tripId: string, driverId: string) {
        const hasPermission = await this.requestPermissions();
        if (!hasPermission) throw new Error('Location permissions not granted');

        // Store context for background task
        await AsyncStorage.setItem(STORAGE_KEY_TRIP_ID, tripId);
        await AsyncStorage.setItem(STORAGE_KEY_DRIVER_ID, driverId);

        await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
            accuracy: Location.Accuracy.Balanced,
            timeInterval: 10000,
            distanceInterval: 20,
            foregroundService: {
                notificationTitle: 'Trip in Progress',
                notificationBody: 'Sharing your location with passengers',
                notificationColor: '#3b82f6',
            },
        });

        this.isTracking = true;
    }

    /**
     * Stop all location tracking
     */
    async stopTracking() {
        this.isTracking = false;
        await AsyncStorage.removeItem(STORAGE_KEY_TRIP_ID);
        await AsyncStorage.removeItem(STORAGE_KEY_DRIVER_ID);

        const hasStarted = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);
        if (hasStarted) {
            await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
        }
    }

    /**
     * Start geofencing for specific regions
     */
    async startGeofencing(regions: GeofenceRegion[]) {
        const hasPermission = await this.requestPermissions();
        if (!hasPermission) return false;

        await Location.startGeofencingAsync(GEOFENCE_TASK_NAME, regions);
        return true;
    }

    async stopGeofencing() {
        const hasStarted = await Location.hasStartedGeofencingAsync(GEOFENCE_TASK_NAME);
        if (hasStarted) {
            await Location.stopGeofencingAsync(GEOFENCE_TASK_NAME);
        }
    }

    /**
     * Helpers (Haversine)
     */
    calculateDistance(loc1: Coordinates, loc2: Coordinates): number {
        const R = 6371000; // Meters
        const dLat = ((loc2.lat - loc1.lat) * Math.PI) / 180;
        const dLon = ((loc2.lng - loc1.lng) * Math.PI) / 180;
        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos((loc1.lat * Math.PI) / 180) *
            Math.cos((loc2.lat * Math.PI) / 180) *
            Math.sin(dLon / 2) *
            Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }
}

export const locationTrackingService = new LocationTrackingService();
