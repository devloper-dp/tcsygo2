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

            // Get pickup location (current location if not provided)
            let pickupLocation: { latitude: number; longitude: number; address: string; } | null = request.pickupLocation || null;
            if (!pickupLocation) {
                pickupLocation = (await QuickBookService.getCurrentLocation()) || null;
                if (!pickupLocation) {
                    return { success: false, error: 'Failed to get current location' };
                }
            }

            // Calculate fare estimate
            const { RideService } = await import('./RideService');
            const fareEstimate = await RideService.estimateFare(
                { lat: pickupLocation.latitude, lng: pickupLocation.longitude },
                { lat: request.dropLocation.latitude, lng: request.dropLocation.longitude },
                request.vehicleType || 'bike'
            );

            // Create booking initially with pending status and no driver
            const { data: booking, error: bookingError } = await supabase
                .from('bookings')
                .insert({
                    passenger_id: user.id,
                    pickup_location: pickupLocation.address,
                    pickup_lat: pickupLocation.latitude,
                    pickup_lng: pickupLocation.longitude,
                    drop_location: request.dropLocation.address,
                    drop_lat: request.dropLocation.latitude,
                    drop_lng: request.dropLocation.longitude,
                    status: 'pending',
                    total_amount: fareEstimate.estimatedPrice - (request.discountAmount || 0),
                    vehicle_type: request.vehicleType || 'bike',
                    promo_code: request.promoCode,
                    discount_amount: request.discountAmount || 0,
                    fare_breakdown: {
                        ...fareEstimate.breakdown,
                        discount: request.discountAmount || 0,
                    },
                    preferences: request.preferences,
                    created_at: new Date().toISOString(),
                })
                .select()
                .single();

            if (bookingError) throw bookingError;

            // Start matching process
            const matchResult = await QuickBookService.matchWithDrivers(
                booking.id,
                pickupLocation.latitude,
                pickupLocation.longitude,
                pickupLocation.address,
                request.vehicleType || 'bike'
            );

            if (!matchResult.success) {
                // Update booking status to timeout
                await supabase
                    .from('bookings')
                    .update({ status: 'timeout' })
                    .eq('id', booking.id);

                return {
                    success: false,
                    error: matchResult.error || 'No drivers available nearby'
                };
            }

            return {
                success: true,
                bookingId: booking.id,
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
    matchWithDrivers: async (
        bookingId: string,
        latitude: number,
        longitude: number,
        pickupAddress: string,
        vehicleType: string
    ): Promise<{ success: boolean; estimatedArrival?: number; error?: string }> => {
        const MAX_ATTEMPTS = 5;
        const ATTEMPT_INTERVAL = 30000; // 30 seconds

        for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
            const { RideService } = await import('./RideService');
            const drivers = await RideService.findNearbyDrivers({ lat: latitude, lng: longitude }, vehicleType as any);

            if (drivers.length > 0) {
                // Notify nearest 3 drivers via database notifications
                const { NotificationService } = await import('./NotificationService');
                const notifyPromises = drivers.slice(0, 3).map(driver =>
                    NotificationService.createNotification((driver as any).userId, {
                        type: 'booking_confirmation',
                        title: 'New QuickBook Request',
                        message: `Nearby ride request from ${pickupAddress} available`,
                        data: { bookingId, type: 'new_booking' }
                    })
                );
                await Promise.all(notifyPromises);

                // Wait for acceptance
                const accepted = await QuickBookService.waitForAcceptance(bookingId);
                if (accepted) {
                    const { data: updatedBooking } = await supabase
                        .from('bookings')
                        .select('driver_id')
                        .eq('id', bookingId)
                        .single();

                    if (updatedBooking?.driver_id) {
                        const { data: driver } = await supabase
                            .from('drivers')
                            .select('current_lat, current_lng')
                            .eq('id', updatedBooking.driver_id)
                            .single();

                        if (driver && driver.current_lat !== null && driver.current_lng !== null) {
                            const distance = await QuickBookService.calculateDistance(
                                latitude, longitude, driver.current_lat, driver.current_lng
                            );
                            return { success: true, estimatedArrival: Math.round((distance / 1000) * 3) };
                        }
                    }
                }
            }

            // Wait before next attempt
            await new Promise(resolve => setTimeout(resolve, attempt < MAX_ATTEMPTS - 1 ? ATTEMPT_INTERVAL : 0));
        }

        return { success: false, error: 'No drivers accepted your request' };
    },

    /**
     * Poll for driver acceptance
     */
    waitForAcceptance: async (bookingId: string): Promise<boolean> => {
        const POLL_INTERVAL = 2000;
        const TIMEOUT = 30000;
        const startTime = Date.now();

        while (Date.now() - startTime < TIMEOUT) {
            const { data } = await supabase
                .from('bookings')
                .select('status')
                .eq('id', bookingId)
                .single();

            if (data?.status === 'accepted') return true;
            if (data?.status === 'cancelled') return false;

            await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL));
        }
        return false;
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
