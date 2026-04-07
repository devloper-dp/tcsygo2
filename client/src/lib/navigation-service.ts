import { Coordinates, calculateDistance as calculateDistanceKm } from './maps';

/**
 * Calculate distance in meters
 */
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) =>
    calculateDistanceKm(lat1, lon1, lat2, lon2) * 1000;


export interface NavigationInstruction {
    type: 'turn-left' | 'turn-right' | 'turn-slight-left' | 'turn-slight-right' |
    'turn-sharp-left' | 'turn-sharp-right' | 'straight' | 'roundabout' |
    'destination' | 'depart';
    instruction: string;
    distance: number; // meters
    duration: number; // seconds
    location: Coordinates;
    icon: string;
}

export interface NavigationRoute {
    instructions: NavigationInstruction[];
    totalDistance: number;
    totalDuration: number;
    geometry: Coordinates[];
}

/**
 * Get turn-by-turn navigation instructions using OSRM
 */
export async function getNavigationInstructions(
    start: Coordinates,
    end: Coordinates
): Promise<NavigationRoute> {
    try {
        // Use OSRM for directions (free, no key required)
        const coordinates = [
            `${start.lng},${start.lat}`,
            `${end.lng},${end.lat}`
        ].join(';');

        const response = await fetch(
            `https://router.project-osrm.org/route/v1/driving/${coordinates}?overview=full&geometries=geojson&steps=true`
        );

        if (!response.ok) {
            throw new Error('Failed to fetch OSRM navigation');
        }

        const data = await response.json();

        if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) {
            throw new Error('No route found');
        }

        const route = data.routes[0];
        const segments = route.legs[0];

        const instructions: NavigationInstruction[] = segments.steps.map((step: any) => ({
            type: mapOSRMToInstructionType(step.maneuver.type, step.maneuver.modifier),
            instruction: step.maneuver.instruction,
            distance: step.distance,
            duration: step.duration,
            location: {
                lat: step.maneuver.location[1],
                lng: step.maneuver.location[0],
            },
            icon: getOSRMInstructionIcon(step.maneuver.type, step.maneuver.modifier),
        }));

        const geometry = route.geometry.coordinates.map((coord: number[]) => ({
            lat: coord[1],
            lng: coord[0],
        }));

        return {
            instructions,
            totalDistance: route.distance,
            totalDuration: route.duration,
            geometry,
        };
    } catch (error) {
        console.error('Navigation error:', error);
        return await getBasicNavigation(start, end);
    }
}

/**
 * Get basic navigation without detailed turn-by-turn instructions
 * Fallback when OpenRouteService is not available
 */
async function getBasicNavigation(
    start: Coordinates,
    end: Coordinates
): Promise<NavigationRoute> {
    // Use existing getRoute function from maps.ts
    const { getRoute } = await import('./maps');
    const route = await getRoute(start, end);

    // Generate basic instructions
    const instructions: NavigationInstruction[] = [
        {
            type: 'depart',
            instruction: 'Head towards destination',
            distance: route.distance * 1000,
            duration: route.duration * 60,
            location: start,
            icon: '↑',
        },
        {
            type: 'destination',
            instruction: 'You have arrived at your destination',
            distance: 0,
            duration: 0,
            location: end,
            icon: '🏁',
        },
    ];

    return {
        instructions,
        totalDistance: route.distance * 1000,
        totalDuration: route.duration * 60,
        geometry: route.geometry,
    };
}

/**
 * Map OSRM maneuver types and modifiers to our types
 */
function mapOSRMToInstructionType(type: string, modifier?: string): NavigationInstruction['type'] {
    if (type === 'arrive') return 'destination';
    if (type === 'depart') return 'depart';
    
    if (modifier) {
        if (modifier.includes('slight left')) return 'turn-slight-left';
        if (modifier.includes('slight right')) return 'turn-slight-right';
        if (modifier.includes('sharp left')) return 'turn-sharp-left';
        if (modifier.includes('sharp right')) return 'turn-sharp-right';
        if (modifier.includes('left')) return 'turn-left';
        if (modifier.includes('right')) return 'turn-right';
    }
    
    if (type.includes('roundabout')) return 'roundabout';
    
    return 'straight';
}

/**
 * Get icon for OSRM instruction type
 */
function getOSRMInstructionIcon(type: string, modifier?: string): string {
    if (type === 'arrive') return '🏁';
    if (type === 'depart') return '🚗';
    
    if (modifier) {
        if (modifier.includes('slight left')) return '↖';
        if (modifier.includes('slight right')) return '↗';
        if (modifier.includes('sharp left')) return '↙';
        if (modifier.includes('sharp right')) return '↘';
        if (modifier.includes('left')) return '←';
        if (modifier.includes('right')) return '→';
    }
    
    if (type.includes('roundabout')) return '⭕';
    
    return '↑';
}

/**
 * Get current navigation instruction based on driver location
 */
export function getCurrentInstruction(
    instructions: NavigationInstruction[],
    currentLocation: Coordinates,
    threshold: number = 50 // meters
): NavigationInstruction | null {
    for (let i = 0; i < instructions.length; i++) {
        const instruction = instructions[i];
        const distance = calculateDistance(
            currentLocation.lat,
            currentLocation.lng,
            instruction.location.lat,
            instruction.location.lng
        );

        if (distance <= threshold) {
            return instruction;
        }
    }

    return instructions[0] || null;
}

/**
 * Get next instruction after current one
 */
export function getNextInstruction(
    instructions: NavigationInstruction[],
    currentInstruction: NavigationInstruction
): NavigationInstruction | null {
    const currentIndex = instructions.findIndex(
        (inst) =>
            inst.location.lat === currentInstruction.location.lat &&
            inst.location.lng === currentInstruction.location.lng
    );

    if (currentIndex >= 0 && currentIndex < instructions.length - 1) {
        return instructions[currentIndex + 1];
    }

    return null;
}


/**
 * Check if driver has deviated from route
 */
export function isOffRoute(
    currentLocation: Coordinates,
    routeGeometry: Coordinates[],
    threshold: number = 100 // meters
): boolean {
    let minDistance = Infinity;

    for (const point of routeGeometry) {
        const distance = calculateDistance(
            currentLocation.lat,
            currentLocation.lng,
            point.lat,
            point.lng
        );

        if (distance < minDistance) {
            minDistance = distance;
        }
    }

    return minDistance > threshold;
}

/**
 * Get reroute if driver is off the planned route
 */
export async function getReroute(
    currentLocation: Coordinates,
    destination: Coordinates,
    originalRoute: NavigationRoute
): Promise<NavigationRoute | null> {
    if (!isOffRoute(currentLocation, originalRoute.geometry)) {
        return null; // Still on route
    }

    // Get new route from current location to destination
    return await getNavigationInstructions(currentLocation, destination);
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
 * Format duration for display
 */
export function formatDuration(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) {
        return `${minutes} min`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
}

/**
 * Generate voice instruction text
 */
export function getVoiceInstruction(instruction: NavigationInstruction): string {
    const distance = formatDistance(instruction.distance);

    switch (instruction.type) {
        case 'turn-left':
            return `In ${distance}, turn left`;
        case 'turn-right':
            return `In ${distance}, turn right`;
        case 'turn-slight-left':
            return `In ${distance}, keep left`;
        case 'turn-slight-right':
            return `In ${distance}, keep right`;
        case 'turn-sharp-left':
            return `In ${distance}, make a sharp left turn`;
        case 'turn-sharp-right':
            return `In ${distance}, make a sharp right turn`;
        case 'straight':
            return `Continue straight for ${distance}`;
        case 'roundabout':
            return `In ${distance}, enter the roundabout`;
        case 'destination':
            return 'You have arrived at your destination';
        case 'depart':
            return 'Start your journey';
        default:
            return instruction.instruction;
    }
}
