import Constants from 'expo-constants';

// OpenStreetMap utilities - No API key required!

export interface Coordinates {
    lat: number;
    lng: number;
}

export interface RouteData {
    distance: number; // in km
    duration: number; // in minutes
    geometry: Coordinates[];
}

// Nominatim API for geocoding (free, no key required)
const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org';

// OSRM API for routing (free, no key required)
const OSRM_BASE = 'https://router.project-osrm.org';

// User agent required by Nominatim
const USER_AGENT = 'TCSYGO-Carpooling-App';

/**
 * Get route between two points using OSRM
 */
export async function getRoute(start: Coordinates, end: Coordinates): Promise<RouteData> {
    try {
        const coordinates = `${start.lng},${start.lat};${end.lng},${end.lat}`;

        const response = await fetch(
            `${OSRM_BASE}/route/v1/driving/${coordinates}?overview=full&geometries=geojson`,
            {
                headers: { 'User-Agent': USER_AGENT }
            }
        );

        const data = await response.json();

        if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
            const route = data.routes[0];
            const geometry = route.geometry.coordinates.map(
                ([lng, lat]: [number, number]) => ({ lat, lng })
            );

            return {
                distance: route.distance / 1000, // meters to km
                duration: Math.round(route.duration / 60), // seconds to minutes
                geometry
            };
        }

        throw new Error('No route found');
    } catch (error) {
        console.error('Error fetching route:', error);
        throw error;
    }
}

/**
 * Geocode address to coordinates using Nominatim
 */
export async function geocodeAddress(address: string): Promise<Coordinates | null> {
    try {
        // Add "India" to improve results for Indian addresses
        const searchQuery = address.includes('India') ? address : `${address}, India`;

        const response = await fetch(
            `${NOMINATIM_BASE}/search?` +
            `q=${encodeURIComponent(searchQuery)}` +
            `&format=json` +
            `&limit=1` +
            `&countrycodes=in`, // Restrict to India
            {
                headers: { 'User-Agent': USER_AGENT }
            }
        );

        const data = await response.json();

        if (data && data.length > 0) {
            return {
                lat: parseFloat(data[0].lat),
                lng: parseFloat(data[0].lon)
            };
        }

        return null;
    } catch (error) {
        console.error('Error geocoding address:', error);
        return null;
    }
}

/**
 * Reverse geocode coordinates to address using Nominatim
 */
export async function reverseGeocode(coords: Coordinates): Promise<string> {
    try {
        const response = await fetch(
            `${NOMINATIM_BASE}/reverse?` +
            `lat=${coords.lat}` +
            `&lon=${coords.lng}` +
            `&format=json`,
            {
                headers: { 'User-Agent': USER_AGENT }
            }
        );

        const data = await response.json();

        if (data && data.display_name) {
            return data.display_name;
        }

        return `${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}`;
    } catch (error) {
        console.error('Error reverse geocoding:', error);
        return `${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}`;
    }
}

/**
 * Fallback: Calculate straight line route
 */
function getStraightLineRoute(start: Coordinates, end: Coordinates): RouteData {
    const steps = 20;
    const geometry = Array.from({ length: steps }).map((_, i) => ({
        lat: start.lat + (end.lat - start.lat) * (i / (steps - 1)),
        lng: start.lng + (end.lng - start.lng) * (i / (steps - 1))
    }));

    // Calculate roughly straight line distance (Haversine approx)
    const R = 6371; // km
    const dLat = (end.lat - start.lat) * Math.PI / 180;
    const dLon = (end.lng - start.lng) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(start.lat * Math.PI / 180) * Math.cos(end.lat * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const dist = R * c;

    return {
        distance: parseFloat(dist.toFixed(1)),
        duration: Math.round(dist * 2), // rough estimate 30km/h avg
        geometry
    };
}
