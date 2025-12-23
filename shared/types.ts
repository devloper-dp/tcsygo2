// Database schema types
export interface User {
    id: string;
    email: string;
    full_name: string;
    phone?: string;
    profile_photo?: string;
    role: 'passenger' | 'driver' | 'both' | 'admin';
    bio?: string;
    verification_status: 'pending' | 'verified' | 'rejected';
    created_at: string;
    updated_at: string;
}

export interface Driver {
    id: string;
    user_id: string;
    license_number: string;
    license_photo?: string;
    vehicle_make: string;
    vehicle_model: string;
    vehicle_year: number;
    vehicle_color: string;
    vehicle_plate: string;
    vehicle_photos: string[];
    is_available: boolean;
    rating: number;
    total_trips: number;
    verification_status: 'pending' | 'verified' | 'rejected';
    documents: any[];
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
    distance: number;
    duration: number;
    price_per_seat: number;
    available_seats: number;
    total_seats: number;
    status: 'upcoming' | 'in_progress' | 'completed' | 'cancelled';
    route?: any;
    preferences: TripPreferences;
    created_at: string;
    updated_at: string;
}

export interface TripPreferences {
    smoking?: boolean;
    pets?: boolean;
    music?: boolean;
    luggage?: boolean;
}

export interface Booking {
    id: string;
    trip_id: string;
    passenger_id: string;
    seats_booked: number;
    total_amount: number;
    status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
    pickup_location?: string;
    drop_location?: string;
    created_at: string;
    updated_at: string;
}

export interface Payment {
    id: string;
    booking_id: string;
    amount: number;
    platform_fee: number;
    driver_earnings: number;
    razorpay_order_id?: string;
    razorpay_payment_id?: string;
    status: 'pending' | 'success' | 'failed';
    payment_method?: string;
    created_at: string;
    updated_at: string;
}

export interface Rating {
    id: string;
    trip_id: string;
    from_user_id: string;
    to_user_id: string;
    rating: number;
    review?: string;
    created_at: string;
}

export interface LiveLocation {
    id: string;
    trip_id: string;
    driver_id: string;
    lat: number;
    lng: number;
    heading?: number;
    speed?: number;
    updated_at: string;
}

export interface Notification {
    id: string;
    user_id: string;
    title: string;
    message: string;
    type: 'booking' | 'trip' | 'payment' | 'system' | 'message';
    is_read: boolean;
    data?: any;
    created_at: string;
}

// Extended types with relations
export interface TripWithDriver extends Trip {
    driver: User & { driver_profile?: Driver };
}

export interface BookingWithTrip extends Booking {
    trip: TripWithDriver;
}

export interface BookingWithPassenger extends Booking {
    passenger: User;
}

// API Response types
export interface ApiResponse<T> {
    data?: T;
    error?: string;
    message?: string;
}

export interface PaginatedResponse<T> {
    data: T[];
    total: number;
    page: number;
    pageSize: number;
    hasMore: boolean;
}

// Form types
export interface TripSearchParams {
    pickup: string;
    drop: string;
    pickupLat?: number;
    pickupLng?: number;
    dropLat?: number;
    dropLng?: number;
    date?: string;
    seats?: number;
}

export interface CreateTripData {
    pickup_location: string;
    pickup_lat: number;
    pickup_lng: number;
    drop_location: string;
    drop_lat: number;
    drop_lng: number;
    departure_time: string;
    price_per_seat: number;
    available_seats: number;
    preferences?: TripPreferences;
}

export interface CreateBookingData {
    trip_id: string;
    seats_booked: number;
    pickup_location?: string;
    drop_location?: string;
}

export interface UpdateProfileData {
    full_name?: string;
    phone?: string;
    bio?: string;
    profile_photo?: string;
}

export interface DriverApplicationData {
    license_number: string;
    license_photo: string;
    vehicle_make: string;
    vehicle_model: string;
    vehicle_year: number;
    vehicle_color: string;
    vehicle_plate: string;
    vehicle_photos: string[];
}

// Utility types
export type TripStatus = Trip['status'];
export type BookingStatus = Booking['status'];
export type UserRole = User['role'];
export type VerificationStatus = User['verification_status'];
export type NotificationType = Notification['type'];

// Type guards
export function isDriver(user: User): boolean {
    return user.role === 'driver' || user.role === 'both';
}

export function isAdmin(user: User): boolean {
    return user.role === 'admin';
}

export function isTripActive(trip: Trip): boolean {
    return trip.status === 'upcoming' || trip.status === 'in_progress';
}

export function isBookingActive(booking: Booking): boolean {
    return booking.status === 'pending' || booking.status === 'confirmed';
}

// Validation helpers
export function isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

export function isValidPhone(phone: string): boolean {
    const phoneRegex = /^[+]?[\d\s-()]+$/;
    return phoneRegex.test(phone) && phone.replace(/\D/g, '').length >= 10;
}

export function isValidLicenseNumber(license: string): boolean {
    // Basic validation - adjust based on your region
    return license.length >= 5 && license.length <= 20;
}

export function isValidVehiclePlate(plate: string): boolean {
    // Basic validation - adjust based on your region
    return plate.length >= 4 && plate.length <= 15;
}
