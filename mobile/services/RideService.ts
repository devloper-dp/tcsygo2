import { supabase } from '@/lib/supabase';
import { Alert } from 'react-native';
import { logger } from './LoggerService';

export interface Ride {
    id: string;
    pickup_location: string;
    drop_location: string;
    pickup_lat: number;
    pickup_lng: number;
    drop_lat: number;
    drop_lng: number;
    status: 'pending' | 'accepted' | 'started' | 'completed' | 'cancelled' | 'scheduled' | 'timeout';
    price_per_seat: number;
    total_amount: number;
    driver_id?: string;
    passenger_id?: string;
    created_at: string;
    scheduled_time?: string;
    preferences?: any;
    vehicle_type?: 'bike' | 'auto' | 'car';
    cancellation_reason?: string;
    refund_amount?: number;
}

export interface FareEstimate {
    basePrice: number;
    estimatedPrice: number;
    currency: string;
    surgeMultiplier: number;
    surgeReason?: string;
    distanceKm: number;
    durationMins: number;
    breakdown: {
        baseFare: number;
        distanceFare: number;
        timeFare: number;
        surgeCharge: number;
        convenienceFee: number;
        taxes: number;
        total: number;
    };
}


export interface DriverMatch {
    id: string;
    name: string;
    rating: number;
    totalTrips: number;
    vehicleType: string;
    vehicleNumber?: string;
    distance: number; // Distance from pickup in meters
    eta: number; // ETA in minutes
    currentLat: number;
    currentLng: number;
    userId?: string;
}

const BOOKING_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes
const DRIVER_SEARCH_RADIUS_KM = 10; // 10 km radius

export const RideService = {
    /**
     * Get user's recent rides for "Repeat Ride" functionality
     */
    getRecentRides: async (userId: string, limit = 1): Promise<Ride[]> => {
        const { data, error } = await supabase
            .from('trips')
            .select('*')
            .eq('passenger_id', userId) // Assuming there's a join table or column, adjusting to schema standard
            // Note: Schema might vary, standardizing on 'trips' table for now based on previous file reads
            .order('created_at', { ascending: false })
            .limit(limit);

        if (error) {
            logger.error('Error fetching recent rides:', error);
            return [];
        }
        return data || [];
    },

    /**
     * Calculate fare estimate including surge pricing logic
     */
    estimateFare: async (
        pickup: { lat: number; lng: number },
        drop: { lat: number; lng: number },
        vehicleType: 'bike' | 'auto' | 'car' = 'bike'
    ): Promise<FareEstimate> => {
        // Use MapService for accurate distance calculation
        const { MapService } = await import('./MapService');
        const distanceResult = await MapService.getDistance(pickup, drop);

        const distanceKm = distanceResult.distance / 1000;
        const durationMins = distanceResult.duration / 60;

        // Base rates by vehicle type
        const baseRates = {
            bike: { base: 25, perKm: 14, perMin: 2 },
            auto: { base: 35, perKm: 18, perMin: 2.5 },
            car: { base: 60, perKm: 24, perMin: 3 },
        };

        const rates = baseRates[vehicleType];
        const baseFare = rates.base;
        const distanceFare = distanceKm * rates.perKm;
        const timeFare = durationMins * rates.perMin;

        // Enhanced surge calculation
        const { SurgePricingService } = await import('./SurgePricingService');
        const surgeData = await SurgePricingService.getSurgeMultiplier(pickup.lat, pickup.lng);
        const surgeMultiplier = surgeData.multiplier;

        const subtotal = baseFare + distanceFare + timeFare;
        const surgeCharge = subtotal * (surgeMultiplier - 1);

        // Standard convenience fee
        const convenienceFee = 10;

        const taxableAmount = subtotal + surgeCharge + convenienceFee;
        const taxes = taxableAmount * 0.18; // 18% GST

        const total = taxableAmount + taxes;

        return {
            basePrice: Math.round(baseFare),
            estimatedPrice: Math.round(total),
            currency: 'INR',
            surgeMultiplier,
            surgeReason: surgeData.reason,
            distanceKm: parseFloat(distanceKm.toFixed(1)),
            durationMins: Math.round(durationMins),
            breakdown: {
                baseFare: Math.round(baseFare),
                distanceFare: Math.round(distanceFare),
                timeFare: Math.round(timeFare),
                surgeCharge: Math.round(surgeCharge),
                convenienceFee: Math.round(convenienceFee),
                taxes: Math.round(taxes),
                total: Math.round(total),
            },
        };
    },

    /**
     * Get active surge multiplier
     */
    getSurgeMultiplier: async (): Promise<{ multiplier: number, reason?: string }> => {
        try {
            // Fetch from surge_pricing_zones table
            const { data, error } = await supabase
                .from('surge_pricing_zones')
                .select('current_multiplier, demand_level, zone_name')
                .eq('is_active', true)
                .order('current_multiplier', { ascending: false })
                .limit(1)
                .single();

            if (error || !data) {
                // Fallback to time-based surge
                const hour = new Date().getHours();
                const isPeakHours = (hour >= 8 && hour <= 10) || (hour >= 17 && hour <= 20);
                return {
                    multiplier: isPeakHours ? 1.4 : 1.0,
                    reason: isPeakHours ? 'Peak Hours' : undefined
                };
            }

            return {
                multiplier: data.current_multiplier,
                reason: `${data.demand_level.charAt(0).toUpperCase() + data.demand_level.slice(1)} Demand in ${data.zone_name}`
            };
        } catch (error) {
            logger.error('Error fetching surge multiplier:', error);
            // Fallback to time-based surge
            const hour = new Date().getHours();
            const isPeakHours = (hour >= 8 && hour <= 10) || (hour >= 17 && hour <= 20);
            return {
                multiplier: isPeakHours ? 1.4 : 1.0,
                reason: isPeakHours ? 'Peak Hours' : undefined
            };
        }
    },

    /**
     * Book a new ride
     */
    bookRide: async (bookingDetails: Partial<Ride>) => {
        const { data, error } = await supabase
            .from('bookings') // Standardizing on 'bookings' for all ride types
            .insert([{
                ...bookingDetails,
                status: 'pending',
                created_at: new Date().toISOString()
            }])
            .select()
            .single();

        if (error) throw error;
        return data as Ride;
    },

    /**
     * Cancel a ride with refund logic
     */
    cancelRide: async (
        rideId: string,
        userId: string,
        reason?: string
    ): Promise<{ success: boolean; refundAmount?: number; error?: string }> => {
        try {
            // Get ride details
            const { data: ride, error: rideError } = await supabase
                .from('bookings')
                .select('*, trip:trips(*)')
                .eq('id', rideId)
                .single();

            if (rideError || !ride) {
                return { success: false, error: 'Ride not found' };
            }

            // Check if user is authorized to cancel
            if (ride.passenger_id !== userId && ride.driver_id !== userId) {
                return { success: false, error: 'Unauthorized' };
            }

            // Calculate refund based on cancellation time
            const now = new Date();
            const rideTime = new Date(ride.trip?.departure_time || ride.created_at);
            const hoursUntilRide = (rideTime.getTime() - now.getTime()) / (1000 * 60 * 60);

            let refundPercentage = 0;
            if (hoursUntilRide > 24) {
                refundPercentage = 100; // Full refund
            } else if (hoursUntilRide > 12) {
                refundPercentage = 75;
            } else if (hoursUntilRide > 6) {
                refundPercentage = 50;
            } else if (hoursUntilRide > 1) {
                refundPercentage = 25;
            }

            const refundAmount = Math.round((ride.total_amount * refundPercentage) / 100);

            // Update ride status
            const { error: updateError } = await supabase
                .from('bookings')
                .update({
                    status: 'cancelled',
                    cancellation_reason: reason,
                    refund_amount: refundAmount,
                    cancelled_at: new Date().toISOString(),
                })
                .eq('id', rideId);

            if (updateError) throw updateError;

            // Process refund if applicable
            if (refundAmount > 0 && ride.payment_method === 'wallet') {
                const { PaymentService } = await import('./PaymentService');
                await PaymentService.addMoneyToWallet(userId, refundAmount, `refund_${rideId}`);
            }

            return { success: true, refundAmount };
        } catch (error: any) {
            logger.error('Error cancelling ride:', error);
            return { success: false, error: error.message };
        }
    },

    /**
     * Find available drivers near pickup location
     */
    findNearbyDrivers: async (
        pickupLocation: { lat: number; lng: number },
        vehicleType: 'bike' | 'auto' | 'car',
        radiusKm: number = DRIVER_SEARCH_RADIUS_KM
    ): Promise<DriverMatch[]> => {
        try {
            // Calculate a bounding box for the radius to efficiently filter drivers
            const latDelta = radiusKm / 111.32; // 1 degree of latitude is approx 111.32 km
            const lngDelta = radiusKm / (111.32 * Math.cos(pickupLocation.lat * (Math.PI / 180)));

            const minLat = pickupLocation.lat - latDelta;
            const maxLat = pickupLocation.lat + latDelta;
            const minLng = pickupLocation.lng - lngDelta;
            const maxLng = pickupLocation.lng + lngDelta;

            // Get available drivers with the specified vehicle type within the bounding box
            const { data: drivers, error } = await supabase
                .from('drivers')
                .select('*, users!inner(*)')
                .eq('verification_status', 'verified')
                .eq('is_available', true)
                .eq('vehicle_type', vehicleType)
                .gte('current_lat', minLat)
                .lte('current_lat', maxLat)
                .gte('current_lng', minLng)
                .lte('current_lng', maxLng);

            if (error) throw error;
            if (!drivers || drivers.length === 0) return [];

            const { MapService } = await import('./MapService');
            const matches: DriverMatch[] = [];

            for (const driver of drivers) {
                const driverLocation = {
                    lat: driver.current_lat,
                    lng: driver.current_lng,
                };

                // Use Haversine for a quick initial check, then optionally get real driving distance
                const distanceResult = MapService.getDistanceHaversine(pickupLocation, driverLocation);

                if (distanceResult.distance <= radiusKm * 1000) {
                    matches.push({
                        id: driver.id,
                        name: driver.users?.full_name || 'Driver',
                        rating: driver.rating || 0,
                        totalTrips: driver.total_trips || 0,
                        vehicleType: driver.vehicle_type,
                        vehicleNumber: driver.vehicle_number,
                        distance: distanceResult.distance,
                        eta: Math.round(distanceResult.duration / 60), // Convert to minutes
                        currentLat: driver.current_lat,
                        currentLng: driver.current_lng,
                        userId: driver.users?.id,
                    });
                }
            }

            // Sort by distance (closest first)
            matches.sort((a, b) => a.distance - b.distance);

            return matches;
        } catch (error) {
            logger.error('Error finding nearby drivers:', error);
            return [];
        }
    },

    /**
     * Match driver to booking
     */
    matchDriver: async (
        bookingId: string,
        driverId: string
    ): Promise<{ success: boolean; error?: string }> => {
        try {
            const { error } = await supabase
                .from('bookings')
                .update({
                    driver_id: driverId,
                    status: 'accepted',
                    accepted_at: new Date().toISOString(),
                })
                .eq('id', bookingId);

            if (error) throw error;

            // Update driver availability
            await supabase
                .from('drivers')
                .update({ is_available: false })
                .eq('id', driverId);

            return { success: true };
        } catch (error: any) {
            logger.error('Error matching driver:', error);
            return { success: false, error: error.message };
        }
    },

    /**
     * Handle booking timeout
     */
    handleBookingTimeout: async (bookingId: string): Promise<void> => {
        try {
            const { data: booking, error: fetchError } = await supabase
                .from('bookings')
                .select('*')
                .eq('id', bookingId)
                .single();

            if (fetchError || !booking) return;

            // Check if booking is still pending
            if (booking.status === 'pending') {
                const createdAt = new Date(booking.created_at);
                const now = new Date();
                const timeDiff = now.getTime() - createdAt.getTime();

                if (timeDiff > BOOKING_TIMEOUT_MS) {
                    // Mark as timeout and process refund
                    await supabase
                        .from('bookings')
                        .update({
                            status: 'timeout',
                            cancellation_reason: 'No driver found within timeout period',
                            cancelled_at: new Date().toISOString(),
                        })
                        .eq('id', bookingId);

                    // Process full refund
                    if (booking.payment_method === 'wallet') {
                        const { PaymentService } = await import('./PaymentService');
                        await PaymentService.addMoneyToWallet(
                            booking.passenger_id,
                            booking.total_amount,
                            `timeout_refund_${bookingId}`
                        );
                    }

                    // Send notification to user
                    const { NotificationService } = await import('./NotificationService');
                    await NotificationService.sendLocalNotification(
                        'Booking Timeout',
                        'Sorry, we couldn\'t find a driver. Your payment has been refunded.',
                        { bookingId, type: 'booking_timeout' }
                    );
                }
            }
        } catch (error) {
            logger.error('Error handling booking timeout:', error);
        }
    },

    /**
     * Start booking timeout timer
     */
    startBookingTimeout: (bookingId: string): ReturnType<typeof setTimeout> => {
        return setTimeout(() => {
            RideService.handleBookingTimeout(bookingId);
        }, BOOKING_TIMEOUT_MS);
    },

    /**
     * Get booking status
     */
    getBookingStatus: async (bookingId: string): Promise<Ride | null> => {
        try {
            const { data, error } = await supabase
                .from('bookings')
                .select('*')
                .eq('id', bookingId)
                .single();

            if (error) throw error;
            return data;
        } catch (error) {
            logger.error('Error getting booking status:', error);
            return null;
        }
    },

    /**
     * Subscribe to booking status updates
     */
    subscribeToBookingUpdates: (
        bookingId: string,
        onUpdate: (booking: Ride) => void
    ) => {
        const channel = supabase
            .channel(`booking:${bookingId}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'bookings',
                    filter: `id=eq.${bookingId}`,
                },
                (payload) => {
                    if (payload.new) {
                        onUpdate(payload.new as Ride);
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    },
};

