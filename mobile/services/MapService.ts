import * as Location from 'expo-location';
import { logger } from './LoggerService';

// Google Maps API configuration
const GOOGLE_MAPS_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || '';

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
}

export interface PlaceDetails {
    placeId: string;
    name: string;
    address: string;
    coordinates: Coordinates;
}

export const MapService = {
    /**
     * Calculate distance and duration between two points using Google Maps Distance Matrix API
     * Falls back to Haversine formula if API is unavailable
     */
    getDistance: async (
        origin: Coordinates,
        destination: Coordinates
    ): Promise<DistanceMatrixResult> => {
        if (!GOOGLE_MAPS_API_KEY) {
            logger.warn('Google Maps API key not configured, using Haversine formula');
            return MapService.getDistanceHaversine(origin, destination);
        }

        try {
            const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${origin.lat},${origin.lng}&destinations=${destination.lat},${destination.lng}&key=${GOOGLE_MAPS_API_KEY}&mode=driving`;

            const response = await fetch(url);
            const data = await response.json();

            if (data.status === 'OK' && data.rows[0].elements[0].status === 'OK') {
                const element = data.rows[0].elements[0];
                return {
                    distance: element.distance.value,
                    duration: element.duration.value,
                    distanceText: element.distance.text,
                    durationText: element.duration.text,
                };
            } else {
                throw new Error('Distance Matrix API error: ' + data.status);
            }
        } catch (error) {
            logger.error('Error fetching distance from Google Maps:', error);
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
     * Get route with turn-by-turn directions using Google Maps Directions API
     */
    getRoute: async (
        origin: Coordinates,
        destination: Coordinates,
        waypoints?: Coordinates[]
    ): Promise<Route> => {
        if (!GOOGLE_MAPS_API_KEY) {
            throw new Error('Google Maps API key not configured');
        }

        try {
            let url = `https://maps.googleapis.com/maps/api/directions/json?origin=${origin.lat},${origin.lng}&destination=${destination.lat},${destination.lng}&key=${GOOGLE_MAPS_API_KEY}&mode=driving`;

            if (waypoints && waypoints.length > 0) {
                const waypointsStr = waypoints
                    .map((wp) => `${wp.lat},${wp.lng}`)
                    .join('|');
                url += `&waypoints=${waypointsStr}`;
            }

            const response = await fetch(url);
            const data = await response.json();

            if (data.status === 'OK' && data.routes.length > 0) {
                const route = data.routes[0];
                const leg = route.legs[0];

                const steps: RouteStep[] = leg.steps.map((step: any) => ({
                    instruction: step.html_instructions.replace(/<[^>]*>/g, ''), // Remove HTML tags
                    distance: step.distance.value,
                    duration: step.duration.value,
                    maneuver: step.maneuver,
                    startLocation: {
                        lat: step.start_location.lat,
                        lng: step.start_location.lng,
                    },
                    endLocation: {
                        lat: step.end_location.lat,
                        lng: step.end_location.lng,
                    },
                }));

                return {
                    distance: leg.distance.value,
                    duration: leg.duration.value,
                    polyline: route.overview_polyline.points,
                    geometry: MapService.decodePolyline(route.overview_polyline.points),
                    steps,
                    bounds: {
                        northeast: {
                            lat: route.bounds.northeast.lat,
                            lng: route.bounds.northeast.lng,
                        },
                        southwest: {
                            lat: route.bounds.southwest.lat,
                            lng: route.bounds.southwest.lng,
                        },
                    },
                };
            } else {
                throw new Error('Directions API error: ' + data.status);
            }
        } catch (error) {
            logger.error('Error fetching route from Google Maps:', error);
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
     * Geocode address to coordinates
     */
    geocode: async (address: string): Promise<Coordinates | null> => {
        if (!GOOGLE_MAPS_API_KEY) {
            throw new Error('Google Maps API key not configured');
        }

        try {
            const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
                address
            )}&key=${GOOGLE_MAPS_API_KEY}`;

            const response = await fetch(url);
            const data = await response.json();

            if (data.status === 'OK' && data.results.length > 0) {
                const location = data.results[0].geometry.location;
                return {
                    lat: location.lat,
                    lng: location.lng,
                };
            }
            return null;
        } catch (error) {
            logger.error('Error geocoding address:', error);
            return null;
        }
    },

    /**
     * Reverse geocode coordinates to address
     */
    reverseGeocode: async (coordinates: Coordinates): Promise<string | null> => {
        if (!GOOGLE_MAPS_API_KEY) {
            throw new Error('Google Maps API key not configured');
        }

        try {
            const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${coordinates.lat},${coordinates.lng}&key=${GOOGLE_MAPS_API_KEY}`;

            const response = await fetch(url);
            const data = await response.json();

            if (data.status === 'OK' && data.results.length > 0) {
                return data.results[0].formatted_address;
            }
            return null;
        } catch (error) {
            logger.error('Error reverse geocoding:', error);
            return null;
        }
    },

    /**
     * Get place autocomplete suggestions
     */
    getPlaceAutocomplete: async (
        input: string,
        location?: Coordinates,
        radius?: number
    ): Promise<PlaceAutocompleteResult[]> => {
        if (!GOOGLE_MAPS_API_KEY) {
            throw new Error('Google Maps API key not configured');
        }

        try {
            let url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(
                input
            )}&key=${GOOGLE_MAPS_API_KEY}`;

            if (location) {
                url += `&location=${location.lat},${location.lng}`;
            }
            if (radius) {
                url += `&radius=${radius}`;
            }

            const response = await fetch(url);
            const data = await response.json();

            if (data.status === 'OK') {
                return data.predictions.map((prediction: any) => ({
                    placeId: prediction.place_id,
                    description: prediction.description,
                    mainText: prediction.structured_formatting.main_text,
                    secondaryText: prediction.structured_formatting.secondary_text,
                }));
            }
            return [];
        } catch (error) {
            logger.error('Error fetching place autocomplete:', error);
            return [];
        }
    },

    /**
     * Get place details by place ID
     */
    getPlaceDetails: async (placeId: string): Promise<PlaceDetails | null> => {
        if (!GOOGLE_MAPS_API_KEY) {
            throw new Error('Google Maps API key not configured');
        }

        try {
            const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&key=${GOOGLE_MAPS_API_KEY}`;

            const response = await fetch(url);
            const data = await response.json();

            if (data.status === 'OK') {
                const result = data.result;
                return {
                    placeId: result.place_id,
                    name: result.name,
                    address: result.formatted_address,
                    coordinates: {
                        lat: result.geometry.location.lat,
                        lng: result.geometry.location.lng,
                    },
                };
            }
            return null;
        } catch (error) {
            logger.error('Error fetching place details:', error);
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
                .not('latitude', 'is', null)
                .not('longitude', 'is', null);

            if (error || !drivers) {
                logger.error('Error fetching nearby drivers:', error);
                return [];
            }

            // Filter drivers within radius using Haversine formula
            const nearbyDrivers = drivers.filter((driver) => {
                const driverLocation: Coordinates = {
                    lat: driver.latitude,
                    lng: driver.longitude,
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
