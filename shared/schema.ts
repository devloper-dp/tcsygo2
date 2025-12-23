import { z } from "zod";

// User roles enum
export const UserRole = {
  PASSENGER: "passenger",
  DRIVER: "driver",
  BOTH: "both"
} as const;

// Trip status enum
export const TripStatus = {
  UPCOMING: "upcoming",
  ONGOING: "ongoing",
  COMPLETED: "completed",
  CANCELLED: "cancelled"
} as const;

// Booking status enum
export const BookingStatus = {
  PENDING: "pending",
  CONFIRMED: "confirmed",
  REJECTED: "rejected",
  CANCELLED: "cancelled"
} as const;

// Payment status enum
export const PaymentStatus = {
  PENDING: "pending",
  SUCCESS: "success",
  FAILED: "failed",
  REFUNDED: "refunded"
} as const;

// Verification status enum
export const VerificationStatus = {
  PENDING: "pending",
  VERIFIED: "verified",
  REJECTED: "rejected"
} as const;

// Types based on the database schema
export interface User {
  id: string;
  email: string;
  fullName: string;
  phone?: string | null;
  profilePhoto?: string | null;
  role: string;
  bio?: string | null;
  verificationStatus?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Driver {
  id: string;
  userId: string;
  licenseNumber: string;
  licensePhoto?: string | null;
  vehicleMake: string;
  vehicleModel: string;
  vehicleYear: number;
  vehicleColor: string;
  vehiclePlate: string;
  vehiclePhotos: string[];
  isAvailable: boolean;
  rating: string;
  totalTrips: number;
  verificationStatus: string;
  documents: { type: string; url: string }[];
  createdAt: string;
  updatedAt: string;
}

export interface Trip {
  id: string;
  driverId: string;
  pickupLocation: string;
  pickupLat: string;
  pickupLng: string;
  dropLocation: string;
  dropLat: string;
  dropLng: string;
  departureTime: string;
  distance: string;
  duration: number;
  pricePerSeat: string;
  availableSeats: number;
  totalSeats: number;
  status: string;
  route?: { lat: number; lng: number }[] | null;
  preferences: {
    smoking?: boolean;
    pets?: boolean;
    music?: boolean;
    luggage?: boolean;
  };
  createdAt: string;
  updatedAt: string;
}

export interface Booking {
  id: string;
  tripId: string;
  passengerId: string;
  seatsBooked: number;
  totalAmount: string;
  status: string;
  pickupLocation?: string | null;
  dropLocation?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Payment {
  id: string;
  bookingId: string;
  amount: string;
  platformFee: string;
  driverEarnings: string;
  razorpayOrderId?: string | null;
  razorpayPaymentId?: string | null;
  status: string;
  paymentMethod?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Rating {
  id: string;
  tripId: string;
  fromUserId: string;
  toUserId: string;
  rating: number;
  review?: string | null;
  createdAt: string;
}

export interface LiveLocation {
  id: string;
  tripId: string;
  driverId: string;
  lat: string;
  lng: string;
  heading?: string | null;
  speed?: string | null;
  updatedAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  data?: Record<string, any> | null;
  createdAt: string;
}

export interface PromoCode {
  id: string;
  code: string;
  discount: number;
  type: 'percentage' | 'fixed';
  description?: string | null;
  minAmount: number;
  maxDiscount?: number | null;
  expiresAt?: string | null;
  isActive: boolean;
  createdAt: string;
}

// Zod Schemas for Validation
export const insertUserSchema = z.object({
  id: z.string().optional(),
  email: z.string().email(),
  fullName: z.string().min(1),
  phone: z.string().nullable().optional(),
  profilePhoto: z.string().url().nullable().optional(),
  role: z.string().default(UserRole.PASSENGER),
  bio: z.string().nullable().optional(),
});

export const insertDriverSchema = z.object({
  userId: z.string(),
  licenseNumber: z.string(),
  licensePhoto: z.string().url().optional(),
  vehicleMake: z.string(),
  vehicleModel: z.string(),
  vehicleYear: z.number(),
  vehicleColor: z.string(),
  vehiclePlate: z.string(),
  vehiclePhotos: z.array(z.string()).default([]),
  documents: z.array(z.object({ type: z.string(), url: z.string() })).default([]),
});

export const insertTripSchema = z.object({
  driverId: z.string(),
  pickupLocation: z.string(),
  pickupLat: z.string(),
  pickupLng: z.string(),
  dropLocation: z.string(),
  dropLat: z.string(),
  dropLng: z.string(),
  departureTime: z.string(),
  distance: z.string(),
  duration: z.number(),
  pricePerSeat: z.string(),
  availableSeats: z.number(),
  totalSeats: z.number(),
  status: z.string().default(TripStatus.UPCOMING),
  route: z.array(z.object({ lat: z.number(), lng: z.number() })).optional(),
  preferences: z.object({
    smoking: z.boolean().optional(),
    pets: z.boolean().optional(),
    music: z.boolean().optional(),
    luggage: z.boolean().optional(),
  }).default({}),
});

export const insertBookingSchema = z.object({
  tripId: z.string(),
  passengerId: z.string(),
  seatsBooked: z.number().default(1),
  totalAmount: z.string(),
  status: z.string().default(BookingStatus.PENDING),
  pickupLocation: z.string().optional(),
  dropLocation: z.string().optional(),
});

export const insertPaymentSchema = z.object({
  bookingId: z.string(),
  amount: z.string(),
  platformFee: z.string(),
  driverEarnings: z.string(),
  razorpayOrderId: z.string().optional(),
  razorpayPaymentId: z.string().optional(),
  status: z.string().default(PaymentStatus.PENDING),
  paymentMethod: z.string().optional(),
});

export const insertRatingSchema = z.object({
  tripId: z.string(),
  fromUserId: z.string(),
  toUserId: z.string(),
  rating: z.number().min(1).max(5),
  review: z.string().optional(),
});

export const insertLiveLocationSchema = z.object({
  tripId: z.string(),
  driverId: z.string(),
  lat: z.string(),
  lng: z.string(),
  heading: z.string().optional(),
  speed: z.string().optional(),
});

export const insertNotificationSchema = z.object({
  userId: z.string(),
  title: z.string(),
  message: z.string(),
  type: z.string(),
  data: z.record(z.any()).optional(),
});

export const insertPromoCodeSchema = z.object({
  code: z.string().min(1),
  discount: z.number(),
  type: z.enum(['percentage', 'fixed']),
  description: z.string().optional(),
  minAmount: z.number().default(0),
  maxDiscount: z.number().optional(),
  expiresAt: z.string().optional(),
  isActive: z.boolean().default(true),
});

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertDriver = z.infer<typeof insertDriverSchema>;
export type InsertTrip = z.infer<typeof insertTripSchema>;
export type InsertBooking = z.infer<typeof insertBookingSchema>;
export type InsertPayment = z.infer<typeof insertPaymentSchema>;
export type InsertRating = z.infer<typeof insertRatingSchema>;
export type InsertLiveLocation = z.infer<typeof insertLiveLocationSchema>;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type InsertPromoCode = z.infer<typeof insertPromoCodeSchema>;

// Extended types for application logic
export type TripWithDriver = Trip & {
  driver: Driver & { user: User };
};

export type BookingWithDetails = Booking & {
  trip: TripWithDriver;
  passenger: User;
  payment?: Payment;
};

// SOS Alert Interface
export interface SOSAlert {
  id: string;
  tripId: string;
  userId: string;
  lat: string;
  lng: string;
  status: string;
  createdAt: string;
  resolvedAt?: string | null;
}

export const insertSOSAlertSchema = z.object({
  tripId: z.string(),
  userId: z.string(),
  lat: z.string(),
  lng: z.string(),
  status: z.string().default("triggered"),
});

export type InsertSOSAlert = z.infer<typeof insertSOSAlertSchema>;
