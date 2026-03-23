import { supabase } from '@/lib/supabase';
import * as Location from 'expo-location';
import { Alert } from 'react-native';
import { logger } from './LoggerService';

export interface QuickBookRequest {
    pickupLocation?: {
        latitude: number;
        longitude: number;
        address: string;
    };
    dropLocation: {
        latitude: number;
        longitude: number;
        address: string;
    };
    vehicleType?: 'bike' | 'auto' | 'car';
    promoCode?: string;
    discountAmount?: number;
    preferences?: {
        ac?: boolean;
        music?: boolean;
        pets?: boolean;
    };
}

export interface QuickBookResponse {
    success: boolean;
    bookingId?: string;
    estimatedFare?: number;
    estimatedArrival?: number;
    error?: string;
}

export const QuickBookService = {
    /**
     * Get current location for quick booking
     */
    getCurrentLocation: async (): Promise<{ latitude: number; longitude: number; address: string } | null> => {
        try {
            // Request location permissions
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission Denied', 'Location permission is required for quick booking');
                return null;
            }

            // Get current position
            const location = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.High,
            });

            // Reverse geocode to get address
            const addresses = await Location.reverseGeocodeAsync({
                latitude: location.coords.latitude,
                longitude: location.coords.longitude,
            });

            const address = addresses[0]
                ? `${addresses[0].name || ''}, ${addresses[0].street || ''}, ${addresses[0].city || ''}`
                : 'Current Location';

            return {
                latitude: location.coords.latitude,
                longitude: location.coords.longitude,
                address: address.trim(),
            };
        } catch (error) {
            logger.error('Error getting current location:', error);
            return null;
        }
    },

    /**
     * Quick book a ride with minimal input
     */
    quickBook: async (request: QuickBookRequest): Promise<QuickBookResponse> => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                return { success: false, error: 'User not authenticated' };
            }

            // Create Ride Request (using new standard method)
            const { RideService } = await import('./RideService');

            // Get location if not provided
            let pickupLocation = request.pickupLocation;
            if (!pickupLocation) {
                const currentLoc = await QuickBookService.getCurrentLocation();
                if (!currentLoc) return { success: false, error: 'Failed to access location' };
                pickupLocation = currentLoc;
            }

            // Estimate fare first
            const fareEstimate = await RideService.estimateFare(
                { lat: pickupLocation.latitude, lng: pickupLocation.longitude },
                { lat: request.dropLocation.latitude, lng: request.dropLocation.longitude },
                request.vehicleType || 'bike'
            );

            // Create Request
            const rideRequest = await RideService.createRideRequest({
                pickupLocation: pickupLocation.address,
                pickupCoords: { lat: pickupLocation.latitude, lng: pickupLocation.longitude },
                dropLocation: request.dropLocation.address,
                dropCoords: { lat: request.dropLocation.latitude, lng: request.dropLocation.longitude },
                vehicleType: request.vehicleType || 'bike',
                fare: fareEstimate.estimatedPrice,
                distance: fareEstimate.distanceKm,
                duration: fareEstimate.durationMins,
                preferences: request.preferences,
                promoCode: request.promoCode,
                discountAmount: request.discountAmount
            });

            // Start matching process
            const matchResult = await QuickBookService.matchWithDrivers(
                rideRequest.id,
                pickupLocation.latitude,
                pickupLocation.longitude,
                pickupLocation.address,
                request.vehicleType || 'bike'
            );

            if (!matchResult.success) {
                // Update request status to timeout
                await supabase
                    .from('ride_requests')
                    .update({ status: 'timeout' })
                    .eq('id', rideRequest.id);

                return {
                    success: false,
                    error: matchResult.error || 'No drivers available nearby'
                };
            }

            return {
                success: true,
                bookingId: matchResult.bookingId, // Now returns the actual booking created by driver
                estimatedFare: fareEstimate.estimatedPrice,
                estimatedArrival: matchResult.estimatedArrival,
            };
        } catch (error: any) {
            logger.error('Error in quick book:', error);
            return {
                success: false,
                error: error.message || 'Failed to book ride',
            };
        }
    },

    /**
     * Internal matching loop to find and notify drivers
     */
    /**
     * Internal matching loop to find and notify drivers
     */
    matchWithDrivers: async (
        requestId: string,
        latitude: number,
        longitude: number,
        pickupAddress: string,
        vehicleType: string
    ): Promise<{ success: boolean; estimatedArrival?: number; error?: string; bookingId?: string }> => {
        const MAX_ATTEMPTS = 5;
        const ATTEMPT_INTERVAL = 10000; // 10 seconds check
        // Total wait: 50s. Maybe too short? Increase validity of request? 
        // Client uses 5 minutes expiry.
        // We can check more frequently.

        const { RideService } = await import('./RideService');

        // Notify drivers ONCE
        const drivers = await RideService.findNearbyDrivers({ lat: latitude, lng: longitude }, vehicleType as any);
        if (drivers.length > 0) {
            const { NotificationService } = await import('./NotificationService');
            // Simplified: NotificationService might not be fully implemented in this context yet, fail gracefully
            try {
                const notifyPromises = drivers.slice(0, 5).map(driver =>
                    NotificationService.createNotification((driver as any).userId, {
                        type: 'booking_confirmation', // Keeping type same for legacy reasons or update to 'ride_request'
                        title: 'New Ride Request',
                        message: `New request from ${pickupAddress}`,
                        data: { requestId, type: 'new_request' }
                    })
                );
                await Promise.all(notifyPromises);
            } catch (e) { console.warn("Notification failed, but moving on", e); }
        }

        // Poll for acceptance
        const startTime = Date.now();
        const TIMEOUT = 60000; // 1 minute allowed for matching in this quick modal

        while (Date.now() - startTime < TIMEOUT) {
            const result = await QuickBookService.checkRequestStatus(requestId);

            if (result.accepted && result.tripId) {
                // Fetch the booking ID associated with this trip/passenger
                // Since RideRequestsList creates the booking, we need to find it along with trip info
                // Actually RideRequestsList updates ride_requests with trip_id. 
                // We can find the booking by searching bookings where trip_id matches and passenger matches.

                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                    const { data: booking } = await supabase.from('bookings')
                        .select('id')
                        .eq('trip_id', result.tripId)
                        .eq('passenger_id', user.id)
                        .maybeSingle();

                    if (booking) {
                        // Get driver location for arrival estimates
                        // (Skipping for brevity, can implement if needed)
                        return { success: true, bookingId: booking.id, estimatedArrival: 5 };
                    }
                }
            }

            if (result.cancelled) return { success: false, error: 'Request cancelled' };

            await new Promise(resolve => setTimeout(resolve, 2000));
        }

        return { success: false, error: 'No drivers accepted within time limit' };
    },

    /**
     * Check request status helper
     */
    checkRequestStatus: async (requestId: string) => {
        const { data } = await supabase
            .from('ride_requests')
            .select('status, trip_id')
            .eq('id', requestId)
            .single();

        return {
            accepted: data?.status === 'accepted',
            cancelled: data?.status === 'cancelled' || data?.status === 'expired' || data?.status === 'timeout',
            tripId: data?.trip_id
        };
    },


    /**
     * Calculate distance between two points using Haversine formula
     */
    calculateDistance: async (
        lat1: number,
        lon1: number,
        lat2: number,
        lon2: number
    ): Promise<number> => {
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
     * Get recent destinations for quick selection
     */
    getRecentDestinations: async (userId: string, limit: number = 5): Promise<any[]> => {
        try {
            const { data, error } = await supabase
                .from('bookings')
                .select('drop_location, drop_lat, drop_lng')
                .eq('passenger_id', userId)
                .order('created_at', { ascending: false })
                .limit(limit);

            if (error) throw error;

            // Remove duplicates
            const unique = data?.filter(
                (item, index, self) =>
                    index === self.findIndex((t) => t.drop_location === item.drop_location)
            );

            return unique || [];
        } catch (error) {
            logger.error('Error getting recent destinations:', error);
            return [];
        }
    },

    /**
     * Repeat last ride
     */
    repeatLastRide: async (userId: string): Promise<QuickBookResponse> => {
        try {
            // Get last ride
            const { data: lastRide, error } = await supabase
                .from('bookings')
                .select('*')
                .eq('passenger_id', userId)
                .order('created_at', { ascending: false })
                .limit(1)
                .single();

            if (error || !lastRide) {
                return { success: false, error: 'No previous rides found' };
            }

            // Quick book with same details
            return await QuickBookService.quickBook({
                dropLocation: {
                    latitude: lastRide.drop_lat,
                    longitude: lastRide.drop_lng,
                    address: lastRide.drop_location,
                },
                vehicleType: lastRide.vehicle_type,
                preferences: lastRide.preferences,
            });
        } catch (error: any) {
            logger.error('Error repeating last ride:', error);
            return {
                success: false,
                error: error.message || 'Failed to repeat ride',
            };
        }
    },
};
