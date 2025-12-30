/**
 * Supabase Type Definitions
 * Complete TypeScript types for database tables, edge functions, and RPC calls
 */

// ============================================================================
// Database Table Types
// ============================================================================

export interface User {
    id: string;
    email: string;
    full_name: string;
    phone: string | null;
    avatar_url: string | null;
    role: 'passenger' | 'driver' | 'admin';
    is_verified: boolean;
    created_at: string;
    updated_at: string;
}

export interface Driver {
    id: string;
    user_id: string;
    license_number: string;
    license_expiry: string;
    license_photo_url: string | null;
    vehicle_make: string;
    vehicle_model: string;
    vehicle_year: number;
    vehicle_color: string;
    vehicle_plate: string;
    vehicle_photos: string[];
    verification_status: 'pending' | 'approved' | 'rejected';
    verification_notes: string | null;
    rating: number;
    total_trips: number;
    created_at: string;
    updated_at: string;
}

export interface Trip {
    id: string;
    driver_id: string;
    pickup_location: string;
    pickup_lat: number;
    pickup_lng: number;
    drop_location: string;
    drop_lat: number;
    drop_lng: number;
    departure_time: string;
    available_seats: number;
    price_per_seat: number;
    status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
    preferences: {
        ac?: boolean;
        music?: boolean;
        pets?: boolean;
        luggage?: number;
    };
    created_at: string;
    updated_at: string;
}

export interface Booking {
    id: string;
    trip_id: string;
    passenger_id: string;
    seats_booked: number;
    total_amount: number;
    status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
    payment_status: 'pending' | 'paid' | 'refunded' | 'failed';
    pickup_location: string | null;
    drop_location: string | null;
    created_at: string;
    updated_at: string;
}

export interface Payment {
    id: string;
    booking_id: string;
    user_id: string;
    amount: number;
    payment_method: 'razorpay' | 'wallet' | 'cash';
    razorpay_order_id: string | null;
    razorpay_payment_id: string | null;
    razorpay_signature: string | null;
    status: 'pending' | 'success' | 'failed' | 'refunded';
    created_at: string;
    updated_at: string;
}

export interface Wallet {
    id: string;
    user_id: string;
    balance: number;
    created_at: string;
    updated_at: string;
}

export interface WalletTransaction {
    id: string;
    wallet_id: string;
    user_id: string;
    amount: number;
    type: 'credit' | 'debit';
    description: string;
    reference_id: string | null;
    created_at: string;
}

export interface SavedPlace {
    id: string;
    user_id: string;
    label: 'home' | 'work' | 'favorite';
    name: string;
    address: string;
    lat: number;
    lng: number;
    created_at: string;
    updated_at: string;
}

export interface EmergencyContact {
    id: string;
    user_id: string;
    name: string;
    phone: string;
    relationship: string;
    created_at: string;
    updated_at: string;
}

export interface RidePreference {
    id: string;
    user_id: string;
    ac_preference: boolean;
    music_preference: boolean;
    pets_allowed: boolean;
    max_luggage: number;
    created_at: string;
    updated_at: string;
}

export interface SafetyCheckin {
    id: string;
    trip_id: string;
    user_id: string;
    status: 'safe' | 'help_needed' | 'missed';
    lat: number | null;
    lng: number | null;
    notes: string | null;
    created_at: string;
}

export interface LiveLocation {
    id: string;
    trip_id: string;
    driver_id: string;
    lat: number;
    lng: number;
    heading: number | null;
    speed: number | null;
    created_at: string;
    updated_at: string;
}

export interface Notification {
    id: string;
    user_id: string;
    title: string;
    message: string;
    type: 'booking' | 'payment' | 'trip' | 'system' | 'offer';
    is_read: boolean;
    data: Record<string, any> | null;
    created_at: string;
}

export interface Rating {
    id: string;
    booking_id: string;
    from_user_id: string;
    to_user_id: string;
    rating: number;
    review: string | null;
    created_at: string;
}

export interface SplitFareRequest {
    id: string;
    booking_id: string;
    requester_id: string;
    participant_email: string;
    amount: number;
    status: 'pending' | 'accepted' | 'rejected' | 'paid';
    created_at: string;
    updated_at: string;
}

export interface PromoCode {
    id: string;
    code: string;
    discount_type: 'percentage' | 'fixed';
    discount_value: number;
    max_discount: number | null;
    min_amount: number | null;
    valid_from: string;
    valid_until: string;
    usage_limit: number | null;
    used_count: number;
    is_active: boolean;
    created_at: string;
}

export interface ReferralCode {
    id: string;
    user_id: string;
    code: string;
    reward_amount: number;
    usage_count: number;
    max_uses: number | null;
    is_active: boolean;
    created_at: string;
}

// ============================================================================
// Edge Function Types
// ============================================================================

export interface CreatePaymentOrderRequest {
    bookingId: string;
    amount: number;
    promoCodeId?: string;
}

export interface CreatePaymentOrderResponse {
    orderId: string;
    amount: number;
    currency: string;
    key: string;
}

export interface VerifyPaymentRequest {
    razorpayOrderId: string;
    razorpayPaymentId: string;
    razorpaySignature: string;
    bookingId: string;
}

export interface VerifyPaymentResponse {
    success: boolean;
    paymentId: string;
    bookingId: string;
}

export interface AddMoneyToWalletRequest {
    userId: string;
    amount: number;
}

export interface AddMoneyToWalletResponse {
    orderId: string;
    amount: number;
    currency: string;
    key: string;
}

export interface VerifyWalletPaymentRequest {
    razorpayOrderId: string;
    razorpayPaymentId: string;
    razorpaySignature: string;
    userId: string;
    amount: number;
}

export interface VerifyWalletPaymentResponse {
    success: boolean;
    walletBalance: number;
}

export interface AddMoneyToWalletParams {
    amount: number;
    paymentId: string;
}

export interface AddMoneyToWalletResult {
    success: boolean;
    transactionId: string;
    message: string;
}

export interface DeductWalletRequest {
    userId: string;
    amount: number;
    bookingId: string;
    description: string;
}

export interface DeductWalletResponse {
    success: boolean;
    newBalance: number;
}

export interface SendPushNotificationRequest {
    userId: string;
    title: string;
    message: string;
    data?: Record<string, any>;
    pushTokens?: string[];
}

export interface SendPushNotificationResponse {
    success: boolean;
    receipts: any[];
}

export interface UpdateLiveLocationRequest {
    tripId: string;
    lat: number;
    lng: number;
    heading?: number;
    speed?: number;
}

export interface UpdateLiveLocationResponse {
    success: boolean;
    location: LiveLocation;
}

export interface SafetyCheckinRequest {
    tripId: string;
    status: 'safe' | 'help_needed';
    lat?: number;
    lng?: number;
    notes?: string;
}

export interface SafetyCheckinResponse {
    success: boolean;
    checkin: SafetyCheckin;
}

export interface SendRideShareEmailRequest {
    recipientEmail: string;
    senderName: string;
    tripDetails: {
        pickup: string;
        drop: string;
        date: string;
        time: string;
    };
}

export interface SendSplitFareEmailRequest {
    recipientEmail: string;
    senderName: string;
    amount: number;
    bookingId: string;
}

// ============================================================================
// RPC Function Types
// ============================================================================

export interface ApplyPromoCodeParams {
    code: string;
    bookingId: string;
    amount: number;
}

export interface ApplyPromoCodeResult {
    success: boolean;
    discountAmount: number;
    finalAmount: number;
    promoCodeId: string;
}

export interface CheckPromoCodeParams {
    code: string;
    amount: number;
}

export interface CheckPromoCodeResult {
    valid: boolean;
    discountAmount: number;
    finalAmount: number;
    message: string;
}

export interface GetWalletBalanceParams {
    userId: string;
}

export interface GetWalletBalanceResult {
    balance: number;
}

export interface TransferWalletFundsParams {
    fromUserId: string;
    toUserId: string;
    amount: number;
    description: string;
}

export interface TransferWalletFundsResult {
    success: boolean;
    transactionId: string;
}

export interface CalculateTripPriceParams {
    distance: number;
    duration: number;
    surgeMultiplier?: number;
}

export interface CalculateTripPriceResult {
    basePrice: number;
    surgePrice: number;
    totalPrice: number;
}

export interface GetNearbyDriversParams {
    lat: number;
    lng: number;
    radius: number;
}

export interface GetNearbyDriversResult {
    drivers: Array<{
        id: string;
        name: string;
        lat: number;
        lng: number;
        distance: number;
        rating: number;
    }>;
}

export interface GetDriverStatisticsParams {
    driverId: string;
}

export interface GetDriverStatisticsResult {
    totalTrips: number;
    totalEarnings: number;
    averageRating: number;
    completionRate: number;
    totalDistance: number;
}

export interface GetUserStatisticsParams {
    userId: string;
}

export interface GetUserStatisticsResult {
    totalTrips: number;
    totalSpent: number;
    averageRating: number;
    favoriteRoutes: Array<{
        from: string;
        to: string;
        count: number;
    }>;
}

// ============================================================================
// Query Filter Types
// ============================================================================

export interface QueryFilter<T> {
    column: keyof T;
    operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'like' | 'ilike' | 'in' | 'is';
    value: any;
}

export interface QueryOptions<T> {
    filters?: QueryFilter<T>[];
    orderBy?: {
        column: keyof T;
        ascending?: boolean;
    };
    limit?: number;
    offset?: number;
    select?: string;
}

export interface PaginatedResult<T> {
    data: T[];
    count: number;
    page: number;
    pageSize: number;
    totalPages: number;
}

// ============================================================================
// Realtime Event Types
// ============================================================================

export interface RealtimePayload<T> {
    eventType: 'INSERT' | 'UPDATE' | 'DELETE';
    new: T | null;
    old: T | null;
    table: string;
    schema: string;
    commit_timestamp: string;
}

export type RealtimeCallback<T> = (payload: RealtimePayload<T>) => void;

// ============================================================================
// Storage Bucket Types
// ============================================================================

export type BucketName =
    | 'profile-photos'
    | 'vehicles'
    | 'licenses'
    | 'documents'
    | 'receipts'
    | 'safety-media';

export interface FileUploadOptions {
    upsert?: boolean;
    cacheControl?: string;
    contentType?: string;
}

export interface FileMetadata {
    name: string;
    size: number;
    type: string;
    lastModified: number;
    bucket: BucketName;
    path: string;
    url: string;
}
