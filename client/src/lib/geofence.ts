import { calculateDistance as calculateDistanceKm } from './maps';

export interface Location {
    lat: number;
    lng: number;
}

/**
 * Calculate distance between two coordinates using Haversine formula
 * Returns distance in meters
 */
export function calculateDistance(point1: Location, point2: Location): number {
    return calculateDistanceKm(point1.lat, point1.lng, point2.lat, point2.lng) * 1000;
}

/**
 * Check if a point is within a geofence radius
 */
export function isWithinGeofence(
    point: Location,
    center: Location,
    radiusMeters: number
): boolean {
    const distance = calculateDistance(point, center);
    return distance <= radiusMeters;
}

/**
 * Get proximity level based on distance
 */
export function getProximityLevel(distanceMeters: number): {
    level: 'arrived' | 'very_close' | 'close' | 'nearby' | 'far';
    message: string;
} {
    if (distanceMeters <= 50) {
        return { level: 'arrived', message: 'Driver has arrived' };
    } else if (distanceMeters <= 100) {
        return { level: 'very_close', message: 'Driver is 100m away' };
    } else if (distanceMeters <= 500) {
        return { level: 'close', message: `Driver is ${Math.round(distanceMeters)}m away` };
    } else if (distanceMeters <= 1000) {
        return { level: 'nearby', message: `Driver is ${(distanceMeters / 1000).toFixed(1)}km away` };
    } else {
        return { level: 'far', message: `Driver is ${(distanceMeters / 1000).toFixed(1)}km away` };
    }
}

/**
 * Calculate bearing between two points
 */
export function calculateBearing(point1: Location, point2: Location): number {
    const φ1 = (point1.lat * Math.PI) / 180;
    const φ2 = (point2.lat * Math.PI) / 180;
    const Δλ = ((point2.lng - point1.lng) * Math.PI) / 180;

    const y = Math.sin(Δλ) * Math.cos(φ2);
    const x =
        Math.cos(φ1) * Math.sin(φ2) -
        Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);

    const θ = Math.atan2(y, x);
    const bearing = ((θ * 180) / Math.PI + 360) % 360;

    return bearing;
}

/**
 * Get direction text from bearing
 */
export function getDirectionFromBearing(bearing: number): string {
    const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    const index = Math.round(bearing / 45) % 8;
    return directions[index];
}

/**
 * Format distance for display
 */
export function formatDistance(meters: number): string {
    if (meters < 1000) {
        return `${Math.round(meters)}m`;
    }
    return `${(meters / 1000).toFixed(1)}km`;
}

/**
 * Calculate ETA based on distance and speed
 */
export function calculateETAFromDistance(
    distanceMeters: number,
    speedKmh: number = 30
): number {
    const distanceKm = distanceMeters / 1000;
    const hours = distanceKm / speedKmh;
    return Math.ceil(hours * 60); // Return minutes
}
