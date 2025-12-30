import * as Location from 'expo-location';
import { logger } from './LoggerService';
import * as TaskManager from 'expo-task-manager';
import { supabase } from '@/lib/supabase';

const LOCATION_TASK_NAME = 'background-location-task';
const GEOFENCE_TASK_NAME = 'geofence-task';

export interface Coordinates {
    lat: number;
    lng: number;
}

export interface LocationUpdate {
    coords: Coordinates;
    timestamp: number;
    accuracy: number;
    altitude?: number;
    heading?: number;
    speed?: number;
}

export interface GeofenceRegion {
    identifier: string;
    latitude: number;
    longitude: number;
    radius: number; // in meters
    notifyOnEnter?: boolean;
    notifyOnExit?: boolean;
}

export interface GeofenceEvent {
    region: GeofenceRegion;
    state: 'enter' | 'exit';
    timestamp: number;
}

// Define background location task
TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }) => {
    if (error) {
        console.error('Background location task error:', error);
        return;
    }
    if (data) {
        const { locations } = data as any;
        const location = locations[0];

        // Update location in database
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                await LocationService.updateLiveLocation(
                    user.id,
                    {
                        lat: location.coords.latitude,
                        lng: location.coords.longitude,
                    },
                    location.coords.heading,
                    location.coords.speed
                );
            }
        } catch (error) {
            console.error('Error updating location in background:', error);
        }
    }
});

// Define geofence task
TaskManager.defineTask(GEOFENCE_TASK_NAME, async ({ data, error }) => {
    if (error) {
        console.error('Geofence task error:', error);
        return;
    }
    if (data) {
        const { eventType, region } = data as any;
        console.log('Geofence event:', eventType, region);
        // Handle geofence events (will be implemented in GeofenceAlerts component)
    }
});

export const LocationService = {
    /**
     * Request location permissions
     */
    requestPermissions: async (): Promise<boolean> => {
        try {
            const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();

            if (foregroundStatus !== 'granted') {
                console.error('Foreground location permission not granted');
                return false;
            }

            return true;
        } catch (error) {
            console.error('Error requesting location permissions:', error);
            return false;
        }
    },

    /**
     * Request background location permissions
     */
    requestBackgroundPermissions: async (): Promise<boolean> => {
        try {
            const { status } = await Location.requestBackgroundPermissionsAsync();

            if (status !== 'granted') {
                console.error('Background location permission not granted');
                return false;
            }

            return true;
        } catch (error) {
            console.error('Error requesting background location permissions:', error);
            return false;
        }
    },

    /**
     * Get current location
     */
    getCurrentLocation: async (): Promise<LocationUpdate | null> => {
        try {
            const hasPermission = await LocationService.requestPermissions();
            if (!hasPermission) return null;

            const location = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.High,
            });

            return {
                coords: {
                    lat: location.coords.latitude,
                    lng: location.coords.longitude,
                },
                timestamp: location.timestamp,
                accuracy: location.coords.accuracy || 0,
                altitude: location.coords.altitude || undefined,
                heading: location.coords.heading || undefined,
                speed: location.coords.speed || undefined,
            };
        } catch (error) {
            logger.error('Error getting current position:', error);
            return null;
        }
    },

    /**
     * Watch location changes
     */
    watchLocation: async (
        callback: (location: LocationUpdate) => void,
        options?: {
            accuracy?: Location.Accuracy;
            distanceInterval?: number;
            timeInterval?: number;
        }
    ): Promise<Location.LocationSubscription | null> => {
        try {
            const hasPermission = await LocationService.requestPermissions();
            if (!hasPermission) return null;

            const subscription = await Location.watchPositionAsync(
                {
                    accuracy: options?.accuracy || Location.Accuracy.High,
                    distanceInterval: options?.distanceInterval || 10, // Update every 10 meters
                    timeInterval: options?.timeInterval || 5000, // Update every 5 seconds
                },
                (location) => {
                    callback({
                        coords: {
                            lat: location.coords.latitude,
                            lng: location.coords.longitude,
                        },
                        timestamp: location.timestamp,
                        accuracy: location.coords.accuracy || 0,
                        altitude: location.coords.altitude || undefined,
                        heading: location.coords.heading || undefined,
                        speed: location.coords.speed || undefined,
                    });
                }
            );

            return subscription;
        } catch (error) {
            console.error('Error watching location:', error);
            return null;
        }
    },

    /**
     * Start background location tracking
     */
    startBackgroundTracking: async (): Promise<boolean> => {
        try {
            const hasBackgroundPermission = await LocationService.requestBackgroundPermissions();
            if (!hasBackgroundPermission) return false;

            const isTaskDefined = await TaskManager.isTaskDefined(LOCATION_TASK_NAME);
            if (!isTaskDefined) {
                console.error('Background location task not defined');
                return false;
            }

            await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
                accuracy: Location.Accuracy.High,
                distanceInterval: 10, // Update every 10 meters
                timeInterval: 5000, // Update every 5 seconds
                foregroundService: {
                    notificationTitle: 'TCSYGO',
                    notificationBody: 'Tracking your ride',
                    notificationColor: '#3b82f6',
                },
            });

            return true;
        } catch (error) {
            console.error('Error starting background tracking:', error);
            return false;
        }
    },

    /**
     * Stop background location tracking
     */
    stopBackgroundTracking: async (): Promise<void> => {
        try {
            const hasStarted = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);
            if (hasStarted) {
                await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
            }
        } catch (error) {
            console.error('Error stopping background tracking:', error);
        }
    },

    /**
     * Calculate distance between two coordinates (Haversine formula)
     */
    calculateDistance: (coord1: Coordinates, coord2: Coordinates): number => {
        const R = 6371000; // Earth's radius in meters
        const dLat = ((coord2.lat - coord1.lat) * Math.PI) / 180;
        const dLon = ((coord2.lng - coord1.lng) * Math.PI) / 180;

        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos((coord1.lat * Math.PI) / 180) *
            Math.cos((coord2.lat * Math.PI) / 180) *
            Math.sin(dLon / 2) *
            Math.sin(dLon / 2);

        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    },

    /**
     * Check if location is within geofence
     */
    isWithinGeofence: (
        location: Coordinates,
        geofenceCenter: Coordinates,
        radius: number
    ): boolean => {
        const distance = LocationService.calculateDistance(location, geofenceCenter);
        return distance <= radius;
    },

    /**
     * Start geofencing
     */
    startGeofencing: async (regions: GeofenceRegion[]): Promise<boolean> => {
        try {
            const hasPermission = await LocationService.requestBackgroundPermissions();
            if (!hasPermission) return false;

            const isTaskDefined = await TaskManager.isTaskDefined(GEOFENCE_TASK_NAME);
            if (!isTaskDefined) {
                console.error('Geofence task not defined');
                return false;
            }

            await Location.startGeofencingAsync(GEOFENCE_TASK_NAME, regions);
            return true;
        } catch (error) {
            console.error('Error starting geofencing:', error);
            return false;
        }
    },

    /**
     * Stop geofencing
     */
    stopGeofencing: async (): Promise<void> => {
        try {
            const hasStarted = await Location.hasStartedGeofencingAsync(GEOFENCE_TASK_NAME);
            if (hasStarted) {
                await Location.stopGeofencingAsync(GEOFENCE_TASK_NAME);
            }
        } catch (error) {
            console.error('Error stopping geofencing:', error);
        }
    },

    /**
     * Update live location in database
     */
    updateLiveLocation: async (
        userId: string,
        coordinates: Coordinates,
        heading?: number,
        speed?: number
    ): Promise<void> => {
        try {
            // Check if user is a driver
            const { data: driver } = await supabase
                .from('drivers')
                .select('id')
                .eq('user_id', userId)
                .single();

            if (driver) {
                // Update driver availability with current location
                await supabase
                    .from('driver_availability')
                    .upsert({
                        driver_id: driver.id,
                        current_lat: coordinates.lat,
                        current_lng: coordinates.lng,
                        current_heading: heading,
                        current_speed: speed,
                        last_location_update: new Date().toISOString(),
                    });
            }

            // Also update live_locations table for active trips
            const { data: activeTrip } = await supabase
                .from('trips')
                .select('id')
                .eq('driver_id', driver?.id)
                .eq('status', 'ongoing')
                .single();

            if (activeTrip) {
                await supabase.from('live_locations').upsert({
                    trip_id: activeTrip.id,
                    latitude: coordinates.lat,
                    longitude: coordinates.lng,
                    heading: heading,
                    speed: speed,
                    timestamp: new Date().toISOString(),
                });
            }
        } catch (error) {
            console.error('Error updating live location:', error);
        }
    },

    /**
     * Record location for trip replay
     */
    recordLocationForReplay: async (
        tripId: string,
        location: LocationUpdate
    ): Promise<void> => {
        try {
            // Get existing recording
            const { data: recording } = await supabase
                .from('ride_recordings')
                .select('route_points')
                .eq('trip_id', tripId)
                .single();

            const routePoints = recording?.route_points || [];
            routePoints.push({
                lat: location.coords.lat,
                lng: location.coords.lng,
                timestamp: location.timestamp,
                speed: location.speed,
                heading: location.heading,
            });

            // Update or insert recording
            await supabase.from('ride_recordings').upsert({
                trip_id: tripId,
                route_points: routePoints,
            });
        } catch (error) {
            console.error('Error recording location for replay:', error);
        }
    },

    /**
     * Get last known location from database
     */
    getLastKnownLocation: async (userId: string): Promise<Coordinates | null> => {
        try {
            const { data: driver } = await supabase
                .from('drivers')
                .select('id')
                .eq('user_id', userId)
                .single();

            if (driver) {
                const { data: availability } = await supabase
                    .from('driver_availability')
                    .select('current_lat, current_lng')
                    .eq('driver_id', driver.id)
                    .single();

                if (availability && availability.current_lat && availability.current_lng) {
                    return {
                        lat: availability.current_lat,
                        lng: availability.current_lng,
                    };
                }
            }

            return null;
        } catch (error) {
            console.error('Error getting last known location:', error);
            return null;
        }
    },

    /**
     * Subscribe to live location updates
     */
    subscribeToLiveLocation: (
        tripId: string,
        callback: (location: any) => void
    ) => {
        const channel = supabase
            .channel(`live_location_${tripId}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'live_locations',
                    filter: `trip_id=eq.${tripId}`,
                },
                (payload) => {
                    callback(payload.new);
                }
            )
            .subscribe();

        return channel;
    },
};
