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
            .from('bookings')
            .select('*')
            .eq('passenger_id', userId)
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

        // Base rates by vehicle type (Matching Client Defaults)
        const baseRates = {
            bike: { base: 20, perKm: 8, perMin: 1, minFare: 30 },
            auto: { base: 30, perKm: 12, perMin: 1.5, minFare: 50 },
            car: { base: 50, perKm: 15, perMin: 2, minFare: 80 },
        };

        const rates = baseRates[vehicleType];
        const baseFare = rates.base;
        const distanceFare = distanceKm * rates.perKm;
        const timeFare = durationMins * rates.perMin;

        // Enhanced surge calculation
        const { SurgePricingService } = await import('./SurgePricingService');
        const surgeData = await SurgePricingService.getSurgeMultiplier(pickup.lat, pickup.lng);
        const surgeMultiplier = surgeData.multiplier;

        let subtotal = baseFare + distanceFare + timeFare;

        // Apply minimum fare
        if (subtotal < rates.minFare) {
            subtotal = rates.minFare;
        }

        const surgeCharge = subtotal * (surgeMultiplier - 1);
        const totalWithSurge = subtotal * surgeMultiplier;

        // Fees (Matching Client: 5% platform, 5% GST)
        const platformFee = totalWithSurge * 0.05;
        const gst = (totalWithSurge + platformFee) * 0.05;

        const total = Math.round(totalWithSurge + platformFee + gst);

        return {
            basePrice: Math.round(baseFare),
            estimatedPrice: total,
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
                convenienceFee: Math.round(platformFee), // Mapping platform fee to convenience
                taxes: Math.round(gst),
                total: total,
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
     * Create a new ride request (Matching Client Logic)
     */
    createRideRequest: async (params: {
        pickupLocation: string;
        pickupCoords: { lat: number; lng: number };
        dropLocation: string;
        dropCoords: { lat: number; lng: number };
        vehicleType: 'bike' | 'auto' | 'car';
        fare: number;
        distance: number;
        duration: number;
        preferences?: any;
        promoCode?: string;
        discountAmount?: number;
    }) => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        const timeoutMinutes = 5;
        const timeoutAt = new Date(Date.now() + timeoutMinutes * 60 * 1000).toISOString();

        const { data, error } = await supabase
            .from('ride_requests')
            .insert({
                passenger_id: user.id,
                pickup_location: params.pickupLocation,
                pickup_lat: params.pickupCoords.lat,
                pickup_lng: params.pickupCoords.lng,
                drop_location: params.dropLocation,
                drop_lat: params.dropCoords.lat,
                drop_lng: params.dropCoords.lng,
                vehicle_type: params.vehicleType,
                fare: params.fare,
                distance: params.distance,
                duration: params.duration,
                status: 'searching',
                preferences: params.preferences || {},
                promo_code: params.promoCode,
                discount_amount: params.discountAmount || 0,
                search_radius: 5000,
                timeout_at: timeoutAt,
            })
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    /**
     * Book a ride (Legacy/Direct Booking - Deprecated for On-Demand)
     * Kept for compatibility if used elsewhere, but typically we use createRideRequest now.
     */
    bookRide: async (bookingDetails: Partial<Ride>) => {
        const { data, error } = await supabase
            .from('bookings')
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

    /**
     * Accept a ride request (Driver Side)
     * Handles atomic locking, booking creation, and pooling logic
     */
    acceptRequest: async (request: any, driverId: string): Promise<{ id: string }> => {
        try {
            // 1. ATOMIC LOCK: Try to set status to 'accepted' first
            const { data: updatedRequest, error: updateError } = await supabase
                .from('ride_requests')
                .update({
                    status: 'accepted',
                    driver_id: driverId
                })
                .eq('id', request.id)
                .in('status', ['pending', 'searching']) // Only update if it's still pending
                .select()
                .single();

            if (updateError || !updatedRequest) {
                throw new Error("Ride is no longer available (taken by another driver)");
            }

            try {
                // 2. Create Booking Record
                const { data: booking, error: bookingError } = await supabase
                    .from('bookings')
                    .insert({
                        passenger_id: request.passengerId,
                        driver_id: driverId,
                        seats_booked: request.seats || 1,
                        total_amount: request.fare,
                        status: 'confirmed',
                        pickup_location: request.pickupLocation,
                        pickup_lat: request.pickupLat,
                        pickup_lng: request.pickupLng,
                        drop_location: request.dropLocation,
                        drop_lat: request.dropLat,
                        drop_lng: request.dropLng
                    })
                    .select()
                    .single();

                if (bookingError) throw bookingError;

                // 3. Check for existing active trip for this driver (POOLING)
                let tripId;
                const { data: activeTrip } = await supabase
                    .from('trips')
                    .select('id, available_seats, pickup_lat, pickup_lng, drop_lat, drop_lng, bookings(drop_lat, drop_lng, status)')
                    .eq('driver_id', driverId)
                    .eq('status', 'ongoing')
                    .gt('available_seats', 0)
                    .maybeSingle();

                if (activeTrip) {
                    // 3a. Deviation Check (Advanced Routing)
                    const { locationTrackingService } = await import('@/lib/location-tracking');
                    const { calculateDetour } = await import('@/lib/maps');

                    // Get current driver location
                    const driverLoc = await locationTrackingService.getCurrentLocation(activeTrip.id);
                    const startCoord = driverLoc ? { lat: driverLoc.lat, lng: driverLoc.lng } : { lat: Number(activeTrip.pickup_lat), lng: Number(activeTrip.pickup_lng) };

                    // Get existing drops from bookings (waypoints)
                    const bookings = (activeTrip.bookings || []).filter((b: any) => b.status === 'confirmed');
                    const currentWaypoints = bookings.map((b: any) => ({ lat: Number(b.drop_lat), lng: Number(b.drop_lng) }));

                    // New stops to add
                    const newStops = [
                        { lat: Number(request.pickupLat), lng: Number(request.pickupLng) },
                        { lat: Number(request.dropLat), lng: Number(request.dropLng) }
                    ];

                    const detour = await calculateDetour(
                        startCoord,
                        { lat: Number(activeTrip.drop_lat), lng: Number(activeTrip.drop_lng) }, // Trip end
                        currentWaypoints,
                        newStops
                    );

                    // THRESHOLD: 15 minutes max detour
                    if (detour.detourDuration > 15) {
                        throw new Error(`Detour too large (+${Math.round(detour.detourDuration)} mins). Cannot pool.`);
                    }

                    // reuse existing trip
                    tripId = activeTrip.id;

                    // Update seats AND ROUTE so checking clients see the new path
                    await supabase.from('trips')
                        .update({
                            available_seats: activeTrip.available_seats - 1,
                            route: detour.geometry
                        })
                        .eq('id', tripId);

                } else {
                    // Create New Trip
                    const { data: trip, error: tripError } = await supabase
                        .from('trips')
                        .insert({
                            driver_id: driverId,
                            booking_id: booking.id, // Primary booking
                            pickup_location: request.pickupLocation,
                            pickup_lat: request.pickupLat,
                            pickup_lng: request.pickupLng,
                            drop_location: request.dropLocation,
                            drop_lat: request.dropLat,
                            drop_lng: request.dropLng,
                            departure_time: new Date().toISOString(),
                            distance: request.distance,
                            duration: request.duration,
                            price_per_seat: request.fare,
                            available_seats: 3.0, // Assuming 4 seater - 1
                            total_seats: 4,
                            status: 'ongoing',
                            preferences: {},
                        })
                        .select()
                        .single();

                    if (tripError) throw tripError;
                    tripId = trip.id;
                }

                // 4. Update Booking with Trip ID
                const { error: updateBookingError } = await supabase
                    .from('bookings')
                    .update({ trip_id: tripId })
                    .eq('id', booking.id);

                if (updateBookingError) throw updateBookingError;

                // 5. Update Request with Trip ID (Link it back)
                const { error: reqError } = await supabase
                    .from('ride_requests')
                    .update({
                        trip_id: tripId
                    })
                    .eq('id', request.id);

                if (reqError) throw reqError;

                // 6. Send Notification to Passenger
                await supabase.from('notifications').insert({
                    user_id: request.passengerId,
                    title: 'Ride Accepted',
                    message: 'A driver has accepted your ride!',
                    type: 'booking',
                    data: { tripId: tripId, driverId: driverId },
                    is_read: false
                });

                // 7. Cleanup other requests (optional/best effort)
                try {
                    await supabase
                        .from('ride_requests')
                        .update({
                            status: 'cancelled',
                            cancellation_reason: 'Auto-cancelled due to other request acceptance'
                        })
                        .eq('passenger_id', request.passengerId)
                        .neq('id', request.id)
                        .in('status', ['pending', 'searching']);
                } catch (cleanupError) {
                    console.error("Non-fatal error cleaning up sibling requests", cleanupError);
                }

                return { id: tripId };

            } catch (error) {
                // Rollback: If anything fails after "locking" the request, we should try to release it
                console.error("Error during trip creation, rolling back request status...", error);
                await supabase
                    .from('ride_requests')
                    .update({ status: 'pending', driver_id: null })
                    .eq('id', request.id)
                    .eq('driver_id', driverId);

                throw error;
            }
        } catch (error: any) {
            logger.error('Error accepting request:', error);
            throw error;
        }
    }
};
