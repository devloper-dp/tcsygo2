/**
 * Additional Supabase Type Definitions
 * Types for new database tables and RPC functions
 */

// Re-export all types from supabase-types
export * from './supabase-types';

// ============================================================================
// New Database Table Types (not in supabase-types.ts)
// ============================================================================

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
    matched_driver_id: string | null;
    preferences: Record<string, any>;
    promo_code: string | null;
    discount_amount: number;
    surge_multiplier: number;
    search_radius: number;
    timeout_at: string | null;
    matched_at: string | null;
    accepted_at: string | null;
    cancelled_at: string | null;
    cancellation_reason: string | null;
    created_at: string;
    updated_at: string;
}

export interface DriverAvailability {
    id: string;
    driver_id: string;
    is_online: boolean;
    is_available: boolean;
    current_lat: number | null;
    current_lng: number | null;
    current_heading: number | null;
    current_speed: number | null;
    battery_level: number | null;
    last_location_update: string | null;
    active_ride_id: string | null;
    created_at: string;
    updated_at: string;
}

export interface RideRecording {
    id: string;
    trip_id: string;
    booking_id: string;
    route_points: Array<{
        lat: number;
        lng: number;
        timestamp: string;
        speed?: number;
        heading?: number;
    }>;
    total_distance: number | null;
    total_duration: number | null;
    average_speed: number | null;
    max_speed: number | null;
    created_at: string;
}

export interface RideSharingMatch {
    id: string;
    ride_request_id: string;
    requester_id: string;
    partner_id: string;
    status: 'pending' | 'accepted' | 'rejected' | 'expired';
    shared_distance: number | null;
    cost_split_percentage: number;
    requester_amount: number | null;
    partner_amount: number | null;
    message: string | null;
    created_at: string;
    responded_at: string | null;
}

export interface SurgePricingZone {
    id: string;
    zone_name: string;
    zone_polygon: any;
    current_multiplier: number;
    demand_level: 'low' | 'medium' | 'high' | 'very_high';
    active_requests: number;
    available_drivers: number;
    is_active: boolean;
    updated_at: string;
    created_at: string;
}

export interface SavedPaymentMethod {
    id: string;
    user_id: string;
    method_type: 'card' | 'upi' | 'netbanking';
    is_default: boolean;
    card_last4: string | null;
    card_brand: string | null;
    card_token: string | null;
    upi_id: string | null;
    bank_name: string | null;
    bank_code: string | null;
    nickname: string | null;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

export interface NotificationPreferences {
    id: string;
    user_id: string;
    push_enabled: boolean;
    sms_enabled: boolean;
    email_enabled: boolean;
    booking_updates: boolean;
    driver_arrival: boolean;
    payment_updates: boolean;
    promotional_offers: boolean;
    safety_alerts: boolean;
    ride_sharing_invites: boolean;
    created_at: string;
    updated_at: string;
}

// ============================================================================
// New RPC Function Types
// ============================================================================

export interface FindNearbyDriversParams {
    lat: number;
    lng: number;
    radius?: number;
    vehicleType?: string;
}

export interface FindNearbyDriversResult {
    driver_id: string;
    distance_meters: number;
    driver_name: string;
    driver_rating: number;
    vehicle_info: string;
    current_lat: number;
    current_lng: number;
}

export interface MatchRideRequestParams {
    requestId: string;
    driverId: string;
}

export interface MatchRideRequestResult {
    success: boolean;
    message: string;
    driver_id?: string;
}
