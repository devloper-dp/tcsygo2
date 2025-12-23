import { useState, useEffect, useCallback, useRef } from 'react';
import * as Location from 'expo-location';
import { Alert, AppState, AppStateStatus } from 'react-native';

export interface LocationCoords {
    latitude: number;
    longitude: number;
    accuracy: number | null;
    altitude: number | null;
    heading: number | null;
    speed: number | null;
}

interface LocationTrackingState {
    location: LocationCoords | null;
    isTracking: boolean;
    hasPermission: boolean;
    error: string | null;
    lastUpdate: Date | null;
}

interface UseLocationTrackingOptions {
    enableBackgroundTracking?: boolean;
    distanceInterval?: number; // meters
    timeInterval?: number; // milliseconds
    accuracy?: Location.Accuracy;
    onLocationUpdate?: (location: LocationCoords) => void;
}

export function useLocationTracking(options: UseLocationTrackingOptions = {}) {
    const {
        enableBackgroundTracking = false,
        distanceInterval = 10, // 10 meters
        timeInterval = 5000, // 5 seconds
        accuracy = Location.Accuracy.High,
        onLocationUpdate,
    } = options;

    const [state, setState] = useState<LocationTrackingState>({
        location: null,
        isTracking: false,
        hasPermission: false,
        error: null,
        lastUpdate: null,
    });

    const watchSubscription = useRef<Location.LocationSubscription | null>(null);
    const appState = useRef(AppState.currentState);

    // Request location permissions
    const requestPermissions = useCallback(async () => {
        try {
            const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();

            if (foregroundStatus !== 'granted') {
                setState((prev) => ({
                    ...prev,
                    hasPermission: false,
                    error: 'Location permission denied',
                }));
                return false;
            }

            // Request background permission if needed
            if (enableBackgroundTracking) {
                const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();

                if (backgroundStatus !== 'granted') {
                    Alert.alert(
                        'Background Location',
                        'Background location permission is required for tracking during trips.',
                        [{ text: 'OK' }]
                    );
                }
            }

            setState((prev) => ({
                ...prev,
                hasPermission: true,
                error: null,
            }));

            return true;
        } catch (error: any) {
            setState((prev) => ({
                ...prev,
                hasPermission: false,
                error: error.message || 'Failed to request permissions',
            }));
            return false;
        }
    }, [enableBackgroundTracking]);

    // Start tracking location
    const startTracking = useCallback(async () => {
        const hasPermission = await requestPermissions();
        if (!hasPermission) {
            return;
        }

        try {
            // Get initial location
            const initialLocation = await Location.getCurrentPositionAsync({
                accuracy,
            });

            const coords: LocationCoords = {
                latitude: initialLocation.coords.latitude,
                longitude: initialLocation.coords.longitude,
                accuracy: initialLocation.coords.accuracy,
                altitude: initialLocation.coords.altitude,
                heading: initialLocation.coords.heading,
                speed: initialLocation.coords.speed,
            };

            setState((prev) => ({
                ...prev,
                location: coords,
                isTracking: true,
                lastUpdate: new Date(),
            }));

            if (onLocationUpdate) {
                onLocationUpdate(coords);
            }

            // Start watching location
            watchSubscription.current = await Location.watchPositionAsync(
                {
                    accuracy,
                    distanceInterval,
                    timeInterval,
                },
                (location) => {
                    const newCoords: LocationCoords = {
                        latitude: location.coords.latitude,
                        longitude: location.coords.longitude,
                        accuracy: location.coords.accuracy,
                        altitude: location.coords.altitude,
                        heading: location.coords.heading,
                        speed: location.coords.speed,
                    };

                    setState((prev) => ({
                        ...prev,
                        location: newCoords,
                        lastUpdate: new Date(),
                    }));

                    if (onLocationUpdate) {
                        onLocationUpdate(newCoords);
                    }
                }
            );
        } catch (error: any) {
            setState((prev) => ({
                ...prev,
                error: error.message || 'Failed to start tracking',
                isTracking: false,
            }));
        }
    }, [accuracy, distanceInterval, timeInterval, onLocationUpdate, requestPermissions]);

    // Stop tracking location
    const stopTracking = useCallback(() => {
        if (watchSubscription.current) {
            watchSubscription.current.remove();
            watchSubscription.current = null;
        }

        setState((prev) => ({
            ...prev,
            isTracking: false,
        }));
    }, []);

    // Get current location once
    const getCurrentLocation = useCallback(async (): Promise<LocationCoords | null> => {
        const hasPermission = await requestPermissions();
        if (!hasPermission) {
            return null;
        }

        try {
            const location = await Location.getCurrentPositionAsync({
                accuracy,
            });

            const coords: LocationCoords = {
                latitude: location.coords.latitude,
                longitude: location.coords.longitude,
                accuracy: location.coords.accuracy,
                altitude: location.coords.altitude,
                heading: location.coords.heading,
                speed: location.coords.speed,
            };

            setState((prev) => ({
                ...prev,
                location: coords,
                lastUpdate: new Date(),
            }));

            return coords;
        } catch (error: any) {
            setState((prev) => ({
                ...prev,
                error: error.message || 'Failed to get location',
            }));
            return null;
        }
    }, [accuracy, requestPermissions]);

    // Handle app state changes
    useEffect(() => {
        const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
            if (
                appState.current.match(/inactive|background/) &&
                nextAppState === 'active' &&
                state.isTracking
            ) {
                // App has come to foreground, refresh location
                getCurrentLocation();
            }
            appState.current = nextAppState;
        });

        return () => {
            subscription.remove();
        };
    }, [state.isTracking, getCurrentLocation]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            stopTracking();
        };
    }, [stopTracking]);

    return {
        ...state,
        startTracking,
        stopTracking,
        getCurrentLocation,
        requestPermissions,
    };
}

// Hook for background location tracking during trips
export function useBackgroundLocationTracking(tripId: string | null, enabled: boolean = false) {
    const { location, startTracking, stopTracking, isTracking } = useLocationTracking({
        enableBackgroundTracking: true,
        distanceInterval: 20, // Update every 20 meters
        timeInterval: 10000, // Or every 10 seconds
        accuracy: Location.Accuracy.High,
        onLocationUpdate: async (coords) => {
            if (!tripId) return;

            // Send location update to backend
            try {
                // This would be replaced with actual API call
                console.log('Updating trip location:', tripId, coords);

                // Example: Update Supabase
                // await supabase.from('live_locations').upsert({
                //   trip_id: tripId,
                //   lat: coords.latitude,
                //   lng: coords.longitude,
                //   heading: coords.heading,
                //   speed: coords.speed,
                //   updated_at: new Date().toISOString(),
                // });
            } catch (error) {
                console.error('Failed to update location:', error);
            }
        },
    });

    useEffect(() => {
        if (enabled && tripId && !isTracking) {
            startTracking();
        } else if ((!enabled || !tripId) && isTracking) {
            stopTracking();
        }
    }, [enabled, tripId, isTracking, startTracking, stopTracking]);

    return {
        location,
        isTracking,
    };
}
