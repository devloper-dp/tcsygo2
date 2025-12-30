// OpenStreetMap utilities - No API key required!

export interface Coordinates {
    lat: number;
    lng: number;
}

export interface RouteData {
    distance: number; // in km
    duration: number; // in minutes
    geometry: Coordinates[];
    steps?: {
        instruction: string;
        distance: number;
        type: 'straight' | 'left' | 'right' | 'destination';
    }[];
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
export async function getRoute(
    start: Coordinates,
    end: Coordinates,
    waypoints: Coordinates[] = []
): Promise<RouteData> {
    try {
        const coordinates = [
            `${start.lng},${start.lat}`,
            ...waypoints.map(wp => `${wp.lng},${wp.lat}`),
            `${end.lng},${end.lat}`
        ].join(';');

        const response = await fetch(
            `${OSRM_BASE}/route/v1/driving/${coordinates}?overview=full&geometries=geojson&steps=true`,
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

            // Parse steps if available
            let steps: RouteData['steps'] = [];
            if (route.legs && route.legs.length > 0) {
                // Combine steps from all legs (usually 1 leg for point-to-point)
                steps = route.legs.flatMap((leg: any) =>
                    leg.steps.map((step: any) => ({
                        instruction: step.maneuver.type === 'arrive'
                            ? 'Arrive at destination'
                            : `${step.maneuver.type} ${step.maneuver.modifier ? step.maneuver.modifier : ''} ${step.name ? 'on ' + step.name : ''}`.trim(),
                        distance: step.distance,
                        type: mapManeuverToType(step.maneuver.type, step.maneuver.modifier)
                    }))
                );
            }

            return {
                distance: route.distance / 1000, // meters to km
                duration: Math.round(route.duration / 60), // seconds to minutes
                geometry,
                steps
            };
        }

        throw new Error('No route found');
    } catch (error) {
        console.error('Error fetching route:', error);
        // Fallback to straight line
        return getStraightLineRoute(start, end, waypoints);
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
 * Search for location suggestions using Nominatim
 */
export async function searchLocations(query: string): Promise<Array<{
    name: string;
    coordinates: Coordinates;
}>> {
    try {
        const searchQuery = query.includes('India') ? query : `${query}, India`;

        const response = await fetch(
            `${NOMINATIM_BASE}/search?` +
            `q=${encodeURIComponent(searchQuery)}` +
            `&format=json` +
            `&limit=5` +
            `&countrycodes=in`,
            {
                headers: { 'User-Agent': USER_AGENT }
            }
        );

        const data = await response.json();

        return data.map((item: any) => ({
            name: item.display_name,
            coordinates: {
                lat: parseFloat(item.lat),
                lng: parseFloat(item.lon)
            }
        }));
    } catch (error) {
        console.error('Error searching locations:', error);
        return [];
    }
}

/**
 * Fallback: Calculate straight line route
 */
function getStraightLineRoute(
    start: Coordinates,
    end: Coordinates,
    waypoints: Coordinates[] = []
): RouteData {
    const points = [start, ...waypoints, end];
    const steps = 20;
    let geometry: Coordinates[] = [];
    let totalDist = 0;

    for (let i = 0; i < points.length - 1; i++) {
        const p1 = points[i];
        const p2 = points[i + 1];

        const segment = Array.from({ length: steps }).map((_, j) => ({
            lat: p1.lat + (p2.lat - p1.lat) * (j / (steps - 1)),
            lng: p1.lng + (p2.lng - p1.lng) * (j / (steps - 1))
        }));

        if (i > 0) segment.shift();
        geometry = geometry.concat(segment);

        // Haversine distance
        const R = 6371;
        const dLat = (p2.lat - p1.lat) * Math.PI / 180;
        const dLon = (p2.lng - p1.lng) * Math.PI / 180;
        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(p1.lat * Math.PI / 180) *
            Math.cos(p2.lat * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        totalDist += R * c;
    }

    return {
        distance: parseFloat(totalDist.toFixed(1)),
        duration: Math.round(totalDist * 2), // ~30km/h average
        geometry,
        steps: [
            {
                instruction: 'Head towards destination',
                distance: totalDist * 1000,
                type: 'straight'
            },
            {
                instruction: 'Arrive at destination',
                distance: 0,
                type: 'destination'
            }
        ]
    };
}

/**
 * Calculate distance between two coordinates using Haversine formula
 */
export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Radius of the Earth in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

function mapManeuverToType(type: string, modifier?: string): 'straight' | 'left' | 'right' | 'destination' {
    if (type === 'arrive') return 'destination';
    if (modifier && modifier.includes('left')) return 'left';
    if (modifier && modifier.includes('right')) return 'right';
    return 'straight';
}
