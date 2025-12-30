import { supabase } from './supabase';
import { logProcess, logError } from './error-logger';
import { Coordinates, calculateDistance } from './maps';

export interface LocationUpdate {
    tripId: string;
    driverId: string;
    lat: number;
    lng: number;
    heading?: number;
    speed?: number;
    timestamp: string;
    accuracy?: number;
    altitude?: number;
}

export interface LocationSubscriptionOptions {
    tripId: string;
    onUpdate: (location: LocationUpdate) => void;
    onError?: (error: Error) => void;
    onDriverArrival?: (distance: number) => void;
    onGeofenceAlert?: (type: 'pickup' | 'drop', distance: number) => void;
}

export interface RoutePoint {
    lat: number;
    lng: number;
    timestamp: string;
    speed?: number;
    heading?: number;
}

export interface TripRecording {
    tripId: string;
    driverId: string;
    routePoints: RoutePoint[];
    startTime: string;
    endTime?: string;
    totalDistance: number;
    maxSpeed: number;
    averageSpeed: number;
}

class LocationTrackingService {
    private subscriptions: Map<string, any> = new Map();
    private updateInterval: number = 5000; // 5 seconds
    private isTracking: boolean = false;
    private recordingSessions: Map<string, TripRecording> = new Map();
    private geofenceRadii: Map<string, { pickup: number; drop: number }> = new Map();

    /**
     * Subscribe to real-time location updates for a trip
     */
    subscribeToTrip({ tripId, onUpdate, onError, onDriverArrival, onGeofenceAlert }: LocationSubscriptionOptions) {
        logProcess('LocationTracking.subscribe', 'start', { tripId });
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
                    logProcess('LocationTracking.updateReceived', 'step', { tripId, payload });
                    if (payload.new) {
                        const data = payload.new as any;
                        const location: LocationUpdate = {
                            tripId: data.trip_id,
                            driverId: data.driver_id,
                            lat: parseFloat(data.lat),
                            lng: parseFloat(data.lng),
                            heading: data.heading ? parseFloat(data.heading) : undefined,
                            speed: data.speed ? parseFloat(data.speed) : undefined,
                            timestamp: data.updated_at,
                            accuracy: data.accuracy ? parseFloat(data.accuracy) : undefined,
                            altitude: data.altitude ? parseFloat(data.altitude) : undefined,
                        };

                        // Check for driver arrival
                        if (onDriverArrival) {
                            this.checkDriverArrival(tripId, location, onDriverArrival);
                        }

                        // Check for geofence alerts
                        if (onGeofenceAlert) {
                            this.checkGeofenceAlerts(tripId, location, onGeofenceAlert);
                        }

                        // Record route point if recording is active
                        this.recordRoutePoint(tripId, location);

                        onUpdate(location);
                    }
                }
            )
            .subscribe((status) => {
                logProcess('LocationTracking.subscribeStatus', 'step', { tripId, status });
                if (status === 'SUBSCRIBED') {
                    console.log(`Subscribed to location updates for trip ${tripId}`);
                } else if (status === 'CHANNEL_ERROR') {
                    const error = new Error('Failed to subscribe to location updates');
                    logError(error, { tripId });
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
            logProcess('LocationTracking.unsubscribe', 'step', { tripId });
            supabase.removeChannel(channel);
            this.subscriptions.delete(tripId);
            console.log(`Unsubscribed from location updates for trip ${tripId}`);
        }
    }

    /**
     * Update driver location (for drivers)
     */
    async updateLocation(update: Omit<LocationUpdate, 'timestamp'>) {
        logProcess('LocationTracking.updateLocation', 'start', { update });
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
                    accuracy: update.accuracy,
                    altitude: update.altitude,
                    updated_at: new Date().toISOString(),
                })
                .select()
                .single();

            if (error) throw error;
            logProcess('LocationTracking.updateLocation', 'end', { data });
            return data;
        } catch (error) {
            logError('Failed to update location', { error, update });
            throw error;
        }
    }

    /**
     * Set geofence radii for a trip
     */
    setGeofenceRadii(tripId: string, pickupRadius: number, dropRadius: number) {
        this.geofenceRadii.set(tripId, { pickup: pickupRadius, drop: dropRadius });
    }

    /**
     * Check driver arrival and trigger callback
     */
    private async checkDriverArrival(
        tripId: string,
        location: LocationUpdate,
        onDriverArrival: (distance: number) => void
    ) {
        try {
            // Get trip details to check pickup location
            const { data: trip } = await supabase
                .from('trips')
                .select('pickup_lat, pickup_lng')
                .eq('id', tripId)
                .single();

            if (trip) {
                const distance = calculateDistance(
                    location.lat,
                    location.lng,
                    trip.pickup_lat,
                    trip.pickup_lng
                );

                // Trigger arrival callback if within 50m
                if (distance <= 0.05) {
                    onDriverArrival(distance);
                }
            }
        } catch (error) {
            console.error('Error checking driver arrival:', error);
        }
    }

    /**
     * Check geofence alerts
     */
    private async checkGeofenceAlerts(
        tripId: string,
        location: LocationUpdate,
        onGeofenceAlert: (type: 'pickup' | 'drop', distance: number) => void
    ) {
        try {
            const radii = this.geofenceRadii.get(tripId);
            if (!radii) return;

            // Get trip details
            const { data: trip } = await supabase
                .from('trips')
                .select('pickup_lat, pickup_lng, drop_lat, drop_lng')
                .eq('id', tripId)
                .single();

            if (!trip) return;

            // Check pickup geofence
            const pickupDistance = calculateDistance(
                location.lat,
                location.lng,
                trip.pickup_lat,
                trip.pickup_lng
            );

            if (pickupDistance <= radii.pickup) {
                onGeofenceAlert('pickup', pickupDistance);
            }

            // Check drop geofence
            const dropDistance = calculateDistance(
                location.lat,
                location.lng,
                trip.drop_lat,
                trip.drop_lng
            );

            if (dropDistance <= radii.drop) {
                onGeofenceAlert('drop', dropDistance);
            }
        } catch (error) {
            console.error('Error checking geofence alerts:', error);
        }
    }

    /**
     * Start recording trip route
     */
    startRouteRecording(tripId: string, driverId: string) {
        const recording: TripRecording = {
            tripId,
            driverId,
            routePoints: [],
            startTime: new Date().toISOString(),
            totalDistance: 0,
            maxSpeed: 0,
            averageSpeed: 0,
        };
        this.recordingSessions.set(tripId, recording);
    }

    /**
     * Stop recording trip route
     */
    stopRouteRecording(tripId: string): TripRecording | null {
        const recording = this.recordingSessions.get(tripId);
        if (recording) {
            recording.endTime = new Date().toISOString();
            this.calculateRouteStats(recording);
            this.recordingSessions.delete(tripId);
            return recording;
        }
        return null;
    }

    /**
     * Record a route point
     */
    private recordRoutePoint(tripId: string, location: LocationUpdate) {
        const recording = this.recordingSessions.get(tripId);
        if (recording) {
            const point: RoutePoint = {
                lat: location.lat,
                lng: location.lng,
                timestamp: location.timestamp,
                speed: location.speed,
                heading: location.heading,
            };
            recording.routePoints.push(point);
        }
    }

    /**
     * Calculate route statistics
     */
    private calculateRouteStats(recording: TripRecording) {
        if (recording.routePoints.length < 2) return;

        let totalDistance = 0;
        let maxSpeed = 0;
        const speeds: number[] = [];

        for (let i = 1; i < recording.routePoints.length; i++) {
            const prev = recording.routePoints[i - 1];
            const curr = recording.routePoints[i];

            // Calculate distance between points
            const distance = calculateDistance(
                prev.lat,
                prev.lng,
                curr.lat,
                curr.lng
            );
            totalDistance += distance;

            // Track speeds
            if (curr.speed) {
                maxSpeed = Math.max(maxSpeed, curr.speed);
                speeds.push(curr.speed);
            }
        }

        recording.totalDistance = totalDistance;
        recording.maxSpeed = maxSpeed;
        recording.averageSpeed = speeds.length > 0
            ? speeds.reduce((sum, speed) => sum + speed, 0) / speeds.length
            : 0;
    }

    /**
     * Get trip recording
     */
    getTripRecording(tripId: string): TripRecording | null {
        return this.recordingSessions.get(tripId) || null;
    }

    /**
     * Save trip recording to database
     */
    async saveTripRecording(recording: TripRecording): Promise<void> {
        try {
            const { error } = await supabase
                .from('ride_recordings')
                .insert({
                    trip_id: recording.tripId,
                    driver_id: recording.driverId,
                    route_data: JSON.stringify(recording.routePoints),
                    start_time: recording.startTime,
                    end_time: recording.endTime,
                    total_distance: recording.totalDistance,
                    max_speed: recording.maxSpeed,
                    average_speed: recording.averageSpeed,
                });

            if (error) throw error;
        } catch (error) {
            console.error('Failed to save trip recording:', error);
        }
    }

    /**
     * Get saved trip recording
     */
    async getSavedTripRecording(tripId: string): Promise<TripRecording | null> {
        try {
            const { data, error } = await supabase
                .from('ride_recordings')
                .select('*')
                .eq('trip_id', tripId)
                .single();

            if (error || !data) return null;

            return {
                tripId: data.trip_id,
                driverId: data.driver_id,
                routePoints: JSON.parse(data.route_data),
                startTime: data.start_time,
                endTime: data.end_time,
                totalDistance: data.total_distance,
                maxSpeed: data.max_speed,
                averageSpeed: data.average_speed,
            };
        } catch (error) {
            console.error('Failed to get saved trip recording:', error);
            return null;
        }
    }

    /**
     * Get current location for a trip
     */
    async getCurrentLocation(tripId: string): Promise<LocationUpdate | null> {
        logProcess('LocationTracking.getCurrentLocation', 'start', { tripId });
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
                    logProcess('LocationTracking.getCurrentLocation', 'end', { status: 'not found' });
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
            logProcess('LocationTracking.getCurrentLocation', 'end', { result });
            return result;
        } catch (error) {
            logError('Failed to get current location', { error, tripId });
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
            logProcess('LocationTracking.startTracking', 'step', { status: 'already tracking' });
            return;
        }

        logProcess('LocationTracking.startTracking', 'start', { tripId, driverId });
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
                // logError is already called within this.updateLocation
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
        logProcess('LocationTracking.stopTracking', 'step');
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
