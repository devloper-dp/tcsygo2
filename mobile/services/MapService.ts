import * as Location from 'expo-location';
import { logger } from './LoggerService';

// Using Open Mapping Services (OSRM, Nominatim, Photon) - No API Key Required


export interface Coordinates {
    lat: number;
    lng: number;
}

export interface RouteStep {
    instruction: string;
    distance: number;
    duration: number;
    maneuver?: string;
    startLocation: Coordinates;
    endLocation: Coordinates;
}

export interface Route {
    distance: number; // in meters
    duration: number; // in seconds
    polyline: string;
    geometry: Coordinates[];
    steps: RouteStep[];
    bounds: {
        northeast: Coordinates;
        southwest: Coordinates;
    };
}

export interface DistanceMatrixResult {
    distance: number; // in meters
    duration: number; // in seconds
    distanceText: string;
    durationText: string;
}

export interface PlaceAutocompleteResult {
    placeId: string;
    description: string;
    mainText: string;
    secondaryText: string;
    coordinates?: Coordinates; // Added for Photon integration
}

export interface PlaceDetails {
    placeId: string;
    name: string;
    address: string;
    coordinates: Coordinates;
}

export const MapService = {
    /**
     * Calculate distance and duration between two points using OSRM Table API
     * Falls back to Haversine formula if API is unavailable
     */
    getDistance: async (
        origin: Coordinates,
        destination: Coordinates
    ): Promise<DistanceMatrixResult> => {
        try {
            // OSRM uses longitude,latitude format
            const url = `http://router.project-osrm.org/table/v1/driving/${origin.lng},${origin.lat};${destination.lng},${destination.lat}?annotations=distance,duration`;

            const response = await fetch(url, {
                headers: {
                    'Accept': 'application/json',
                    'User-Agent': 'TCSYGO-Mobile'
                }
            });
            const data = await response.json();

            if (data.code === 'Ok' && data.distances?.[0]?.[1] !== undefined) {
                const distance = data.distances[0][1]; // distance in meters
                const duration = data.durations[0][1]; // duration in seconds

                return {
                    distance,
                    duration,
                    distanceText: `${(distance / 1000).toFixed(1)} km`,
                    durationText: `${Math.round(duration / 60)} mins`,
                };
            } else {
                throw new Error('OSRM Table API error: ' + (data.code || 'Unknown error'));
            }
        } catch (error) {
            logger.error('Error fetching distance from OSRM:', error);
            // Fallback to Haversine
            return MapService.getDistanceHaversine(origin, destination);
        }
    },

    /**
     * Haversine formula for distance calculation (fallback)
     */
    getDistanceHaversine: (
        origin: Coordinates,
        destination: Coordinates
    ): DistanceMatrixResult => {
        const R = 6371000; // Earth's radius in meters
        const dLat = ((destination.lat - origin.lat) * Math.PI) / 180;
        const dLon = ((destination.lng - origin.lng) * Math.PI) / 180;

        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos((origin.lat * Math.PI) / 180) *
            Math.cos((destination.lat * Math.PI) / 180) *
            Math.sin(dLon / 2) *
            Math.sin(dLon / 2);

        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const distance = R * c;

        // Estimate duration assuming average city speed of 30 km/h
        const duration = (distance / 1000) * (3600 / 30);

        return {
            distance: Math.round(distance),
            duration: Math.round(duration),
            distanceText: `${(distance / 1000).toFixed(1)} km`,
            durationText: `${Math.round(duration / 60)} mins`,
        };
    },

    /**
     * Get route with turn-by-turn directions using OSRM Route API
     */
    getRoute: async (
        origin: Coordinates,
        destination: Coordinates,
        waypoints?: Coordinates[]
    ): Promise<Route> => {
        try {
            let coordsArr = [`${origin.lng},${origin.lat}`];
            if (waypoints && waypoints.length > 0) {
                waypoints.forEach(wp => coordsArr.push(`${wp.lng},${wp.lat}`));
            }
            coordsArr.push(`${destination.lng},${destination.lat}`);
            
            const coordsStr = coordsArr.join(';');
            const url = `http://router.project-osrm.org/route/v1/driving/${coordsStr}?overview=full&steps=true&geometries=polyline`;

            const response = await fetch(url, {
                headers: {
                    'Accept': 'application/json',
                    'User-Agent': 'TCSYGO-Mobile-App'
                }
            });
            const data = await response.json();

            if (data.code === 'Ok' && data.routes.length > 0) {
                const route = data.routes[0];
                const leg = route.legs[0];

                const steps: RouteStep[] = route.legs.flatMap((l: any) => 
                    l.steps.map((step: any) => ({
                        instruction: step.maneuver.instruction,
                        distance: step.distance,
                        duration: step.duration,
                        maneuver: step.maneuver.type,
                        startLocation: {
                            lat: step.maneuver.location[1],
                            lng: step.maneuver.location[0],
                        },
                        endLocation: {
                            lat: step.maneuver.location[1],
                            lng: step.maneuver.location[0], // OSRM steps are point-based
                        },
                    }))
                );

                return {
                    distance: route.distance,
                    duration: route.duration,
                    polyline: route.geometry,
                    geometry: MapService.decodePolyline(route.geometry),
                    steps,
                    bounds: {
                        northeast: {
                            lat: Math.max(...route.legs.flatMap((l: any) => l.steps.map((s: any) => s.maneuver.location[1]))),
                            lng: Math.max(...route.legs.flatMap((l: any) => l.steps.map((s: any) => s.maneuver.location[0]))),
                        },
                        southwest: {
                            lat: Math.min(...route.legs.flatMap((l: any) => l.steps.map((s: any) => s.maneuver.location[1]))),
                            lng: Math.min(...route.legs.flatMap((l: any) => l.steps.map((s: any) => s.maneuver.location[0]))),
                        },
                    },
                };
            } else {
                throw new Error('OSRM Route API error: ' + (data.code || 'Unknown error'));
            }
        } catch (error) {
            logger.error('Error fetching route from OSRM:', error);
            throw error;
        }
    },

    /**
     * Decode polyline string to array of coordinates
     */
    decodePolyline: (encoded: string): Coordinates[] => {
        const points: Coordinates[] = [];
        let index = 0;
        const len = encoded.length;
        let lat = 0;
        let lng = 0;

        while (index < len) {
            let b;
            let shift = 0;
            let result = 0;
            do {
                b = encoded.charCodeAt(index++) - 63;
                result |= (b & 0x1f) << shift;
                shift += 5;
            } while (b >= 0x20);
            const dlat = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
            lat += dlat;

            shift = 0;
            result = 0;
            do {
                b = encoded.charCodeAt(index++) - 63;
                result |= (b & 0x1f) << shift;
                shift += 5;
            } while (b >= 0x20);
            const dlng = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
            lng += dlng;

            points.push({
                lat: lat / 1e5,
                lng: lng / 1e5,
            });
        }

        return points;
    },

    /**
     * Geocode address to coordinates using Nominatim API
     */
    geocode: async (address: string): Promise<Coordinates | null> => {
        try {
            const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
                address
            )}&format=jsonv2&limit=1`;

            const response = await fetch(url, {
                headers: {
                    'Accept': 'application/json',
                    'User-Agent': 'TCSYGO-Mobile'
                }
            });
            const data = await response.json();

            if (data && data.length > 0) {
                return {
                    lat: parseFloat(data[0].lat),
                    lng: parseFloat(data[0].lon),
                };
            }
            return null;
        } catch (error) {
            logger.error('Error geocoding address with Nominatim:', error);
            return null;
        }
    },

    /**
     * Reverse geocode coordinates to address using Nominatim API
     */
    reverseGeocode: async (coordinates: Coordinates): Promise<string | null> => {
        try {
            const url = `https://nominatim.openstreetmap.org/reverse?lat=${coordinates.lat}&lon=${coordinates.lng}&format=jsonv2`;

            const response = await fetch(url, {
                headers: {
                    'Accept': 'application/json',
                    'User-Agent': 'TCSYGO-Mobile'
                }
            });
            const data = await response.json();

            if (data && data.display_name) {
                return data.display_name;
            }
            return null;
        } catch (error) {
            logger.error('Error reverse geocoding with Nominatim:', error);
            return null;
        }
    },

    /**
     * Get place autocomplete suggestions using Photon API (OpenStreetMap based)
     */
    getPlaceAutocomplete: async (
        input: string,
        location?: Coordinates,
        radius?: number
    ): Promise<PlaceAutocompleteResult[]> => {
        try {
            let url = `https://photon.komoot.io/api/?q=${encodeURIComponent(input)}&limit=10`;

            if (location) {
                url += `&lat=${location.lat}&lon=${location.lng}`;
            }

            const response = await fetch(url);
            const data = await response.json();

            if (data && data.features) {
                return data.features.map((feature: any) => {
                    const properties = feature.properties;
                    const coords = feature.geometry.coordinates;
                    
                    const mainText = properties.name || properties.street || properties.city || 'Unknown';
                    const secondaryText = [properties.city, properties.state, properties.country]
                        .filter(Boolean)
                        .join(', ');

                    return {
                        placeId: properties.osm_id?.toString() || Math.random().toString(),
                        description: `${mainText}, ${secondaryText}`,
                        mainText: mainText,
                        secondaryText: secondaryText,
                        coordinates: {
                            lat: coords[1],
                            lng: coords[0]
                        }
                    };
                });
            }
            return [];
        } catch (error) {
            logger.error('Error fetching place autocomplete from Photon:', error);
            return [];
        }
    },

    /**
     * Get place details by place ID (Adapts to Photon/Nominatim)
     */
    getPlaceDetails: async (placeId: string): Promise<PlaceDetails | null> => {
        try {
            // Since we updated autocomplete to include coordinates, we might already have them.
            // If not, we can treat placeId as a query for Nominatim if it looks like a string, 
            // or use specific OSM ID lookup if we implement it.
            // For now, we'll use a search query as a fallback.
            
            const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(placeId)}&format=jsonv2&limit=1`;
            const response = await fetch(url, {
                headers: {
                    'Accept': 'application/json',
                    'User-Agent': 'TCSYGO-Mobile-App'
                }
            });
            const data = await response.json();

            if (data && data.length > 0) {
                const result = data[0];
                return {
                    placeId: result.osm_id.toString(),
                    name: result.display_name.split(',')[0],
                    address: result.display_name,
                    coordinates: {
                        lat: parseFloat(result.lat),
                        lng: parseFloat(result.lon),
                    },
                };
            }
            return null;
        } catch (error) {
            logger.error('Error fetching place details from Nominatim:', error);
            return null;
        }
    },

    /**
     * Get current location
     */
    getCurrentLocation: async (): Promise<Coordinates | null> => {
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                logger.error('Location permission not granted');
                return null;
            }

            const location = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.High,
            });

            return {
                lat: location.coords.latitude,
                lng: location.coords.longitude,
            };
        } catch (error) {
            logger.error('Error getting current location:', error);
            return null;
        }
    },

    /**
     * Get nearby drivers within a specified radius
     */
    getNearbyDrivers: async (
        location: Coordinates,
        radiusMeters: number = 5000
    ): Promise<any[]> => {
        try {
            const { supabase } = await import('@/lib/supabase');

            // Get all active drivers with live locations
            const { data: drivers, error } = await supabase
                .from('live_locations')
                .select(`
                    *,
                    drivers!inner(
                        id,
                        user_id,
                        verification_status,
                        is_available
                    )
                `)
                .eq('drivers.verification_status', 'approved')
                .eq('drivers.is_available', true)
                .not('lat', 'is', null)
                .not('lng', 'is', null);

            if (error || !drivers) {
                logger.error('Error fetching nearby drivers:', error);
                return [];
            }

            // Filter drivers within radius using Haversine formula
            const nearbyDrivers = drivers.filter((driver) => {
                const driverLocation: Coordinates = {
                    lat: driver.lat,
                    lng: driver.lng,
                };
                const distance = MapService.getDistanceHaversine(location, driverLocation).distance;
                return distance <= radiusMeters;
            });

            return nearbyDrivers;
        } catch (error) {
            logger.error('Error getting nearby drivers:', error);
            return [];
        }
    },

    /**
     * Calculate ETA based on current location and destination
     */
    calculateETA: async (
        currentLocation: Coordinates,
        destination: Coordinates
    ): Promise<{ eta: Date; duration: number }> => {
        const result = await MapService.getDistance(currentLocation, destination);
        const eta = new Date(Date.now() + result.duration * 1000);
        return {
            eta,
            duration: result.duration,
        };
    },

};
