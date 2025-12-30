import { supabase } from '@/lib/supabase';
import { Linking, Platform } from 'react-native';
import * as Location from 'expo-location';
import { router } from 'expo-router';
import { logger } from './LoggerService';

export interface NavigationRoute {
    distance: number; // in meters
    duration: number; // in seconds
    polyline: Array<{ lat: number; lng: number }>;
    steps: NavigationStep[];
}

export interface NavigationStep {
    instruction: string;
    distance: number;
    duration: number;
    maneuver?: string;
    location: { lat: number; lng: number };
}

export interface ETAUpdate {
    estimatedArrival: Date;
    remainingDistance: number;
    remainingDuration: number;
}

export const NavigationService = {
    /**
     * Get route between two points with turn-by-turn directions
     */
    getRoute: async (
        origin: { lat: number; lng: number },
        destination: { lat: number; lng: number }
    ): Promise<NavigationRoute | null> => {
        try {
            // Use MapService for route calculation
            const { MapService } = await import('./MapService');
            const routeData = await MapService.getRoute(origin, destination);

            if (!routeData) return null;

            // Decode polyline to coordinates
            const polylineCoords = typeof routeData.polyline === 'string'
                ? MapService.decodePolyline(routeData.polyline)
                : [];

            // Convert RouteStep to NavigationStep
            const steps: NavigationStep[] = routeData.steps.map(step => ({
                instruction: step.instruction,
                distance: step.distance,
                duration: step.duration,
                maneuver: step.maneuver,
                location: step.endLocation, // Use end location as the step location
            }));

            return {
                distance: routeData.distance,
                duration: routeData.duration,
                polyline: polylineCoords,
                steps: steps,
            };
        } catch (error) {
            logger.error('Error navigating to trip:', error);
            return null;
        }
    },

    /**
     * Calculate ETA based on current location and destination
     */
    calculateETA: async (
        currentLocation: { lat: number; lng: number },
        destination: { lat: number; lng: number },
        currentSpeed?: number // in km/h
    ): Promise<ETAUpdate | null> => {
        try {
            const route = await NavigationService.getRoute(currentLocation, destination);
            if (!route) return null;

            // If we have current speed, use it for more accurate ETA
            let estimatedDuration = route.duration;
            if (currentSpeed && currentSpeed > 0) {
                const distanceKm = route.distance / 1000;
                estimatedDuration = (distanceKm / currentSpeed) * 3600; // Convert to seconds
            }

            const estimatedArrival = new Date(Date.now() + estimatedDuration * 1000);

            return {
                estimatedArrival,
                remainingDistance: route.distance,
                remainingDuration: estimatedDuration,
            };
        } catch (error) {
            console.error('Error calculating ETA:', error);
            return null;
        }
    },

    /**
     * Open external navigation app (Google Maps or Apple Maps)
     */
    openExternalNavigation: async (
        destination: { lat: number; lng: number },
        label?: string
    ): Promise<boolean> => {
        try {
            const scheme = Platform.select({
                ios: 'maps:0,0?q=',
                android: 'geo:0,0?q=',
            });

            const latLng = `${destination.lat},${destination.lng}`;
            const url = Platform.select({
                ios: `${scheme}${label || 'Destination'}@${latLng}`,
                android: `${scheme}${latLng}(${label || 'Destination'})`,
            });

            if (url) {
                const canOpen = await Linking.canOpenURL(url);
                if (canOpen) {
                    await Linking.openURL(url);
                    return true;
                }
            }

            // Fallback to Google Maps web
            const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${destination.lat},${destination.lng}`;
            await Linking.openURL(googleMapsUrl);
            return true;
        } catch (error) {
            console.error('Error opening navigation:', error);
            return false;
        }
    },

    /**
     * Check if user is on route (within tolerance)
     */
    isOnRoute: (
        currentLocation: { lat: number; lng: number },
        routePolyline: Array<{ lat: number; lng: number }>,
        toleranceMeters: number = 50
    ): boolean => {
        if (!routePolyline || routePolyline.length === 0) return false;

        // Find closest point on route
        let minDistance = Infinity;
        for (const point of routePolyline) {
            const distance = NavigationService.calculateDistance(
                currentLocation.lat,
                currentLocation.lng,
                point.lat,
                point.lng
            );
            minDistance = Math.min(minDistance, distance);
        }

        return minDistance <= toleranceMeters;
    },

    /**
     * Calculate distance between two points using Haversine formula
     */
    calculateDistance: (
        lat1: number,
        lon1: number,
        lat2: number,
        lon2: number
    ): number => {
        const R = 6371e3; // Earth's radius in meters
        const φ1 = (lat1 * Math.PI) / 180;
        const φ2 = (lat2 * Math.PI) / 180;
        const Δφ = ((lat2 - lat1) * Math.PI) / 180;
        const Δλ = ((lon2 - lon1) * Math.PI) / 180;

        const a =
            Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

        return R * c; // Distance in meters
    },

    /**
     * Get next navigation instruction based on current location
     */
    getNextInstruction: (
        currentLocation: { lat: number; lng: number },
        route: NavigationRoute
    ): NavigationStep | null => {
        if (!route.steps || route.steps.length === 0) return null;

        // Find the next step that hasn't been passed
        for (const step of route.steps) {
            const distanceToStep = NavigationService.calculateDistance(
                currentLocation.lat,
                currentLocation.lng,
                step.location.lat,
                step.location.lng
            );

            // If we're more than 10 meters away, this is the next step
            if (distanceToStep > 10) {
                return step;
            }
        }

        return null;
    },

    /**
     * Recalculate route if user deviates
     */
    recalculateRoute: async (
        currentLocation: { lat: number; lng: number },
        destination: { lat: number; lng: number },
        originalRoute: NavigationRoute
    ): Promise<NavigationRoute | null> => {
        // Check if user is significantly off route
        const isOnRoute = NavigationService.isOnRoute(
            currentLocation,
            originalRoute.polyline,
            100 // 100 meters tolerance
        );

        if (isOnRoute) {
            return originalRoute; // No need to recalculate
        }

        // User is off route, recalculate
        console.log('User off route, recalculating...');
        return await NavigationService.getRoute(currentLocation, destination);
    },

    /**
     * Format duration for display
     */
    formatDuration: (seconds: number): string => {
        if (seconds < 60) {
            return 'Less than 1 min';
        }

        const minutes = Math.round(seconds / 60);
        if (minutes < 60) {
            return `${minutes} min${minutes > 1 ? 's' : ''}`;
        }

        const hours = Math.floor(minutes / 60);
        const remainingMinutes = minutes % 60;
        return `${hours} hr${hours > 1 ? 's' : ''} ${remainingMinutes > 0 ? `${remainingMinutes} min` : ''}`;
    },

    /**
     * Format distance for display
     */
    formatDistance: (meters: number): string => {
        if (meters < 1000) {
            return `${Math.round(meters)} m`;
        }

        const km = meters / 1000;
        return `${km.toFixed(1)} km`;
    },

    /**
     * Get bearing between two points (for rotation of markers)
     */
    getBearing: (
        start: { lat: number; lng: number },
        end: { lat: number; lng: number }
    ): number => {
        const startLat = (start.lat * Math.PI) / 180;
        const startLng = (start.lng * Math.PI) / 180;
        const endLat = (end.lat * Math.PI) / 180;
        const endLng = (end.lng * Math.PI) / 180;

        const dLng = endLng - startLng;

        const y = Math.sin(dLng) * Math.cos(endLat);
        const x =
            Math.cos(startLat) * Math.sin(endLat) -
            Math.sin(startLat) * Math.cos(endLat) * Math.cos(dLng);

        let bearing = Math.atan2(y, x);
        bearing = (bearing * 180) / Math.PI;
        bearing = (bearing + 360) % 360;

        return bearing;
    },

    /**
     * Simplify polyline for better performance (Douglas-Peucker algorithm)
     */
    simplifyPolyline: (
        points: Array<{ lat: number; lng: number }>,
        tolerance: number = 0.0001
    ): Array<{ lat: number; lng: number }> => {
        if (points.length <= 2) return points;

        // Find the point with maximum distance from line between first and last
        let maxDistance = 0;
        let maxIndex = 0;

        const firstPoint = points[0];
        const lastPoint = points[points.length - 1];

        for (let i = 1; i < points.length - 1; i++) {
            const distance = NavigationService.perpendicularDistance(
                points[i],
                firstPoint,
                lastPoint
            );

            if (distance > maxDistance) {
                maxDistance = distance;
                maxIndex = i;
            }
        }

        // If max distance is greater than tolerance, recursively simplify
        if (maxDistance > tolerance) {
            const leftSegment = NavigationService.simplifyPolyline(
                points.slice(0, maxIndex + 1),
                tolerance
            );
            const rightSegment = NavigationService.simplifyPolyline(
                points.slice(maxIndex),
                tolerance
            );

            return [...leftSegment.slice(0, -1), ...rightSegment];
        }

        return [firstPoint, lastPoint];
    },

    /**
     * Calculate perpendicular distance from point to line
     */
    perpendicularDistance: (
        point: { lat: number; lng: number },
        lineStart: { lat: number; lng: number },
        lineEnd: { lat: number; lng: number }
    ): number => {
        const x = point.lng;
        const y = point.lat;
        const x1 = lineStart.lng;
        const y1 = lineStart.lat;
        const x2 = lineEnd.lng;
        const y2 = lineEnd.lat;

        const A = x - x1;
        const B = y - y1;
        const C = x2 - x1;
        const D = y2 - y1;

        const dot = A * C + B * D;
        const lenSq = C * C + D * D;
        let param = -1;

        if (lenSq !== 0) {
            param = dot / lenSq;
        }

        let xx, yy;

        if (param < 0) {
            xx = x1;
            yy = y1;
        } else if (param > 1) {
            xx = x2;
            yy = y2;
        } else {
            xx = x1 + param * C;
            yy = y1 + param * D;
        }

        const dx = x - xx;
        const dy = y - yy;

        return Math.sqrt(dx * dx + dy * dy);
    },
};
