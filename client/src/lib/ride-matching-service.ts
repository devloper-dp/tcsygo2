import { supabase } from './supabase';
import { Coordinates } from './maps';

export interface RideRequest {
    id: string;
    passenger_id: string;
    pickup_location: string;
    pickup_lat: number;
    pickup_lng: number;
    drop_location: string;
    drop_lat: number;
    drop_lng: number;
    vehicle_type: 'bike' | 'auto' | 'car';
    fare: number;
    distance: number;
    duration: number;
    status: 'pending' | 'searching' | 'matched' | 'accepted' | 'cancelled' | 'expired' | 'completed';
    matched_driver_id?: string;
    preferences?: any;
    promo_code?: string;
    discount_amount?: number;
    surge_multiplier?: number;
    search_radius?: number;
    timeout_at?: string;
    matched_at?: string;
    accepted_at?: string;
    cancelled_at?: string;
    cancellation_reason?: string;
    organization_only?: boolean;
    organization?: string;
    scheduled_time?: string;
    created_at: string;
    updated_at: string;
}

export interface NearbyDriver {
    driver_id: string;
    distance_meters: number;
    driver_name: string;
    driver_rating: number;
    vehicle_info: string;
    current_lat: number;
    current_lng: number;
    organization?: string;
}

/**
 * Create a new ride request for instant booking
 */
export async function createRideRequest(params: {
    pickupLocation: string;
    pickupCoords: Coordinates;
    dropLocation: string;
    dropCoords: Coordinates;
    vehicleType: 'bike' | 'auto' | 'car';
    fare: number;
    distance: number;
    duration: number;
    preferences?: any;
    promoCode?: string;
    discountAmount?: number;
    surgeMultiplier?: number;
    organizationOnly?: boolean;
    organization?: string;
    scheduledTime?: Date;
}): Promise<RideRequest> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const timeoutMinutes = 5; // Request expires after 5 minutes
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
            status: params.scheduledTime ? 'pending' : 'searching',
            preferences: params.preferences || {},
            promo_code: params.promoCode,
            discount_amount: params.discountAmount || 0,
            surge_multiplier: params.surgeMultiplier || 1.0,
            organization_only: params.organizationOnly || false,
            organization: params.organization,
            search_radius: 5000, // Start with 5km radius
            timeout_at: timeoutAt,
            scheduled_time: params.scheduledTime?.toISOString(),
        })
        .select()
        .single();

    if (error) throw error;
    return data;
}

/**
 * Find nearby available drivers
 */
export async function findNearbyDrivers(
    location: Coordinates,
    radius: number = 5000,
    vehicleType?: 'bike' | 'auto' | 'car',
    organization?: string
): Promise<NearbyDriver[]> {
    const { data, error } = await supabase.rpc('find_nearby_drivers', {
        p_lat: location.lat,
        p_lng: location.lng,
        p_radius: radius,
        p_vehicle_type: vehicleType || null,
        p_organization: organization || null,
    });

    if (error) throw error;
    return data || [];
}

/**
 * Match a ride request with a driver
 */
export async function matchRideWithDriver(
    requestId: string,
    driverId: string
): Promise<{ success: boolean; message: string; driver_id?: string }> {
    const { data, error } = await supabase.rpc('match_ride_request', {
        p_request_id: requestId,
        p_driver_id: driverId,
    });

    if (error) throw error;
    return data;
}

/**
 * Cancel a ride request
 */
export async function cancelRideRequest(
    requestId: string,
    reason: string
): Promise<void> {
    const { error } = await supabase
        .from('ride_requests')
        .update({
            status: 'cancelled',
            cancelled_at: new Date().toISOString(),
            cancellation_reason: reason,
        })
        .eq('id', requestId);

    if (error) throw error;
}

/**
 * Accept a matched ride request (driver action)
 */
export async function acceptRideRequest(requestId: string): Promise<void> {
    const { error } = await supabase
        .from('ride_requests')
        .update({
            status: 'accepted',
            accepted_at: new Date().toISOString(),
        })
        .eq('id', requestId);

    if (error) throw error;
}

/**
 * Subscribe to ride request status updates
 */
export function subscribeToRideRequest(
    requestId: string,
    callback: (request: RideRequest) => void
) {
    const channel = supabase
        .channel(`ride_request:${requestId}`)
        .on(
            'postgres_changes',
            {
                event: 'UPDATE',
                schema: 'public',
                table: 'ride_requests',
                filter: `id=eq.${requestId}`,
            },
            (payload) => {
                callback(payload.new as RideRequest);
            }
        )
        .subscribe();

    return () => {
        supabase.removeChannel(channel);
    };
}

/**
 * Auto-match ride request with nearest available driver
 */
export async function autoMatchRideRequest(requestId: string): Promise<boolean> {
    try {
        // Get ride request details
        const { data: request, error: requestError } = await supabase
            .from('ride_requests')
            .select('*')
            .eq('id', requestId)
            .single();

        if (requestError || !request) {
            console.error('Failed to fetch ride request:', requestError);
            return false;
        }

        // Find nearby drivers
        const drivers = await findNearbyDrivers(
            { lat: request.pickup_lat, lng: request.pickup_lng },
            request.search_radius,
            request.vehicle_type,
            request.organization_only ? request.organization : undefined
        );

        if (drivers.length === 0) {
            // Expand search radius if no drivers found
            if (request.search_radius < 20000) {
                await supabase
                    .from('ride_requests')
                    .update({ search_radius: request.search_radius + 2000 })
                    .eq('id', requestId);
            }
            return false;
        }

        // Match with nearest driver
        const nearestDriver = drivers[0];
        const result = await matchRideWithDriver(requestId, nearestDriver.driver_id);

        return result.success;
    } catch (error) {
        console.error('Auto-match error:', error);
        return false;
    }
}

/**
 * Check for expired ride requests and mark them
 */
export async function checkExpiredRequests(): Promise<void> {
    const { error } = await supabase
        .from('ride_requests')
        .update({ status: 'expired' })
        .eq('status', 'searching')
        .lt('timeout_at', new Date().toISOString());

    if (error) {
        console.error('Failed to update expired requests:', error);
    }
}

/**
 * Get ride request by ID
 */
export async function getRideRequest(requestId: string): Promise<RideRequest | null> {
    const { data, error } = await supabase
        .from('ride_requests')
        .select('*')
        .eq('id', requestId)
        .single();

    if (error) {
        console.error('Failed to fetch ride request:', error);
        return null;
    }

    return data;
}

/**
 * Get user's active ride request
 */
export async function getActiveRideRequest(): Promise<RideRequest | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
        .from('ride_requests')
        .select('*')
        .eq('passenger_id', user.id)
        .in('status', ['searching', 'matched', 'accepted'])
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

    if (error) {
        if (error.code === 'PGRST116') return null; // No rows returned
        console.error('Failed to fetch active ride request:', error);
        return null;
    }

    return data;
}
