import { z } from 'zod';

// User schemas
export const userSchema = z.object({
    id: z.string().uuid(),
    email: z.string().email(),
    full_name: z.string().min(2).max(100),
    phone: z.string().optional(),
    profile_photo: z.string().url().optional(),
    role: z.enum(['passenger', 'driver', 'both', 'admin']),
    bio: z.string().max(500).optional(),
    verification_status: z.enum(['pending', 'verified', 'rejected']),
    created_at: z.string().datetime(),
    updated_at: z.string().datetime(),
});

export const updateProfileSchema = z.object({
    full_name: z.string().min(2).max(100).optional(),
    phone: z.string().regex(/^[+]?[\d\s-()]+$/).optional(),
    bio: z.string().max(500).optional(),
    profile_photo: z.string().url().optional(),
});

// Driver schemas
export const driverApplicationSchema = z.object({
    license_number: z.string().min(5).max(20),
    license_photo: z.string().url(),
    vehicle_make: z.string().min(2).max(50),
    vehicle_model: z.string().min(2).max(50),
    vehicle_year: z.number().int().min(1990).max(new Date().getFullYear() + 1),
    vehicle_color: z.string().min(2).max(30),
    vehicle_plate: z.string().min(4).max(15),
    vehicle_photos: z.array(z.string().url()).min(1).max(5),
});

// Trip schemas
export const tripPreferencesSchema = z.object({
    smoking: z.boolean().optional(),
    pets: z.boolean().optional(),
    music: z.boolean().optional(),
    luggage: z.boolean().optional(),
});

export const createTripSchema = z.object({
    pickup_location: z.string().min(3).max(200),
    pickup_lat: z.number().min(-90).max(90),
    pickup_lng: z.number().min(-180).max(180),
    drop_location: z.string().min(3).max(200),
    drop_lat: z.number().min(-90).max(90),
    drop_lng: z.number().min(-180).max(180),
    departure_time: z.string().datetime(),
    price_per_seat: z.number().positive().max(10000),
    available_seats: z.number().int().min(1).max(7),
    preferences: tripPreferencesSchema.optional(),
});

export const searchTripsSchema = z.object({
    pickup: z.string().min(2),
    drop: z.string().min(2),
    pickupLat: z.number().optional(),
    pickupLng: z.number().optional(),
    dropLat: z.number().optional(),
    dropLng: z.number().optional(),
    date: z.string().optional(),
    seats: z.number().int().min(1).max(7).optional(),
    minPrice: z.number().positive().optional(),
    maxPrice: z.number().positive().optional(),
});

// Booking schemas
export const createBookingSchema = z.object({
    trip_id: z.string().uuid(),
    seats_booked: z.number().int().min(1).max(7),
    pickup_location: z.string().optional(),
    drop_location: z.string().optional(),
});

// Rating schemas
export const createRatingSchema = z.object({
    trip_id: z.string().uuid(),
    to_user_id: z.string().uuid(),
    rating: z.number().int().min(1).max(5),
    review: z.string().max(500).optional(),
});

// Auth schemas
export const signupSchema = z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    full_name: z.string().min(2, 'Name must be at least 2 characters'),
    phone: z.string().regex(/^[+]?[\d\s-()]+$/, 'Invalid phone number').optional(),
});

export const loginSchema = z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(1, 'Password is required'),
});

// Payment schemas
export const createPaymentOrderSchema = z.object({
    booking_id: z.string().uuid(),
    amount: z.number().positive(),
});

export const verifyPaymentSchema = z.object({
    razorpay_order_id: z.string(),
    razorpay_payment_id: z.string(),
    razorpay_signature: z.string(),
    booking_id: z.string().uuid(),
});

// Notification schemas
export const createNotificationSchema = z.object({
    user_id: z.string().uuid(),
    title: z.string().min(1).max(100),
    message: z.string().min(1).max(500),
    type: z.enum(['booking', 'trip', 'payment', 'system', 'message']),
    data: z.any().optional(),
});

// Export types from schemas
export type UserInput = z.infer<typeof userSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type DriverApplicationInput = z.infer<typeof driverApplicationSchema>;
export type CreateTripInput = z.infer<typeof createTripSchema>;
export type SearchTripsInput = z.infer<typeof searchTripsSchema>;
export type CreateBookingInput = z.infer<typeof createBookingSchema>;
export type CreateRatingInput = z.infer<typeof createRatingSchema>;
export type SignupInput = z.infer<typeof signupSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type CreatePaymentOrderInput = z.infer<typeof createPaymentOrderSchema>;
export type VerifyPaymentInput = z.infer<typeof verifyPaymentSchema>;
export type CreateNotificationInput = z.infer<typeof createNotificationSchema>;
