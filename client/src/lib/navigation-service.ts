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
 * Get turn-by-turn navigation instructions from OpenRouteService
 */
export async function getNavigationInstructions(
    start: Coordinates,
    end: Coordinates
): Promise<NavigationRoute> {
    try {
        const apiKey = import.meta.env.VITE_OPENROUTE_API_KEY;

        // If no API key, use basic routing without detailed instructions
        if (!apiKey) {
            return await getBasicNavigation(start, end);
        }

        const url = 'https://api.openrouteservice.org/v2/directions/driving-car';
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': apiKey,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                coordinates: [
                    [start.lng, start.lat],
                    [end.lng, end.lat],
                ],
                instructions: true,
                language: 'en',
            }),
        });

        if (!response.ok) {
            throw new Error('Failed to fetch navigation instructions');
        }

        const data = await response.json();
        const route = data.routes[0];
        const segments = route.segments[0];

        const instructions: NavigationInstruction[] = segments.steps.map((step: any) => ({
            type: mapInstructionType(step.type),
            instruction: step.instruction,
            distance: step.distance,
            duration: step.duration,
            location: {
                lat: step.way_points[0][1],
                lng: step.way_points[0][0],
            },
            icon: getInstructionIcon(step.type),
        }));

        const geometry = route.geometry.coordinates.map((coord: number[]) => ({
            lat: coord[1],
            lng: coord[0],
        }));

        return {
            instructions,
            totalDistance: route.summary.distance,
            totalDuration: route.summary.duration,
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
 * Map OpenRouteService instruction types to our types
 */
function mapInstructionType(type: number): NavigationInstruction['type'] {
    const typeMap: Record<number, NavigationInstruction['type']> = {
        0: 'turn-left',
        1: 'turn-right',
        2: 'turn-sharp-left',
        3: 'turn-sharp-right',
        4: 'turn-slight-left',
        5: 'turn-slight-right',
        6: 'straight',
        7: 'roundabout',
        10: 'destination',
        11: 'depart',
    };

    return typeMap[type] || 'straight';
}

/**
 * Get icon for instruction type
 */
function getInstructionIcon(type: number): string {
    const iconMap: Record<number, string> = {
        0: '←',
        1: '→',
        2: '↙',
        3: '↘',
        4: '↖',
        5: '↗',
        6: '↑',
        7: '⭕',
        10: '🏁',
        11: '🚗',
    };

    return iconMap[type] || '↑';
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
