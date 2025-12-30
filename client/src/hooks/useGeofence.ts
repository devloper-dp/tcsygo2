import { useState, useEffect, useCallback } from 'react';
import { calculateDistance, getProximityLevel, Location } from '@/lib/geofence';

export interface GeofenceAlert {
    type: 'entered' | 'exited' | 'proximity';
    distance: number;
    message: string;
    timestamp: Date;
}

interface UseGeofenceOptions {
    center: Location;
    radius: number; // in meters
    currentLocation?: Location;
    onEnter?: () => void;
    onExit?: () => void;
    onProximityChange?: (distance: number, level: string) => void;
}

export function useGeofence({
    center,
    radius,
    currentLocation,
    onEnter,
    onExit,
    onProximityChange,
}: UseGeofenceOptions) {
    const [isInside, setIsInside] = useState(false);
    const [distance, setDistance] = useState<number | null>(null);
    const [alerts, setAlerts] = useState<GeofenceAlert[]>([]);

    const checkGeofence = useCallback(() => {
        if (!currentLocation) return;

        const dist = calculateDistance(currentLocation, center);
        setDistance(dist);

        const wasInside = isInside;
        const nowInside = dist <= radius;

        if (nowInside !== wasInside) {
            setIsInside(nowInside);

            const alert: GeofenceAlert = {
                type: nowInside ? 'entered' : 'exited',
                distance: dist,
                message: nowInside
                    ? 'Entered geofence area'
                    : 'Exited geofence area',
                timestamp: new Date(),
            };

            setAlerts((prev) => [...prev, alert]);

            if (nowInside && onEnter) {
                onEnter();
            } else if (!nowInside && onExit) {
                onExit();
            }
        }

        // Check proximity levels
        const proximity = getProximityLevel(dist);
        if (onProximityChange) {
            onProximityChange(dist, proximity.level);
        }
    }, [currentLocation, center, radius, isInside, onEnter, onExit, onProximityChange]);

    useEffect(() => {
        checkGeofence();
    }, [checkGeofence]);

    const clearAlerts = useCallback(() => {
        setAlerts([]);
    }, []);

    return {
        isInside,
        distance,
        alerts,
        clearAlerts,
    };
}
