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
  PAYMENT_PENDING: "payment_pending",
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
  pushToken?: string | null;
  organization?: string | null;
  notificationPreferences?: {
    messages: boolean;
    trips: boolean;
    bookings: boolean;
    payments: boolean;
    marketing: boolean;
  } | null;
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
  basePrice?: string | null;
  surgeMultiplier?: number | null;
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
  promoCodeId?: string | null;
  preferences?: {
    acPreferred: boolean;
    musicAllowed: boolean;
    petFriendly: boolean;
    luggageCapacity: number;
  } | null;
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

export interface Message {
  id: string;
  tripId: string;
  senderId: string;
  receiverId: string;
  message: string;
  isRead: boolean;
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

export interface SupportTicket {
  id: string;
  userId?: string | null;
  name: string;
  email: string;
  message: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface PromoCode {
  id: string;
  code: string;
  discountType: 'percentage' | 'fixed';
  discountValue: string;
  maxUses?: number | null;
  currentUses: number;
  validFrom: string;
  validUntil: string;
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
  pushToken: z.string().nullable().optional(),
  organization: z.string().nullable().optional(),
  notificationPreferences: z.object({
    messages: z.boolean(),
    trips: z.boolean(),
    bookings: z.boolean(),
    payments: z.boolean(),
    marketing: z.boolean(),
  }).nullable().optional(),
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
  promoCodeId: z.string().optional().nullable(),
  preferences: z.object({
    acPreferred: z.boolean(),
    musicAllowed: z.boolean(),
    petFriendly: z.boolean(),
    luggageCapacity: z.number(),
  }).optional().nullable(),
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

export const insertMessageSchema = z.object({
  tripId: z.string(),
  senderId: z.string(),
  receiverId: z.string(),
  message: z.string(),
  isRead: z.boolean().default(false),
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

export const insertSupportTicketSchema = z.object({
  userId: z.string().optional().nullable(),
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  message: z.string().min(10, "Message must be at least 10 characters"),
  status: z.string().default('open'),
});

export const insertPromoCodeSchema = z.object({
  code: z.string().min(1),
  discountType: z.enum(['percentage', 'fixed']),
  discountValue: z.string(),
  maxUses: z.number().nullable().optional(),
  currentUses: z.number().default(0),
  validFrom: z.string(),
  validUntil: z.string(),
  isActive: z.boolean().default(true),
});

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertDriver = z.infer<typeof insertDriverSchema>;
export type InsertTrip = z.infer<typeof insertTripSchema>;
export type InsertBooking = z.infer<typeof insertBookingSchema>;
export type InsertPayment = z.infer<typeof insertPaymentSchema>;
export type InsertRating = z.infer<typeof insertRatingSchema>;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type InsertLiveLocation = z.infer<typeof insertLiveLocationSchema>;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type InsertSupportTicket = z.infer<typeof insertSupportTicketSchema>;
export type InsertPromoCode = z.infer<typeof insertPromoCodeSchema>;

// Extended types for application logic
export type TripWithDriver = Trip & {
  driver: Driver & { user: User };
};

export type BookingWithDetails = Booking & {
  trip: TripWithDriver;
  passenger: User;
  payment?: Payment;
  promoCode?: PromoCode;
};

// Emergency Alert Interface
export interface EmergencyAlert {
  id: string;
  tripId: string;
  userId: string;
  lat: string;
  lng: string;
  status: string;
  createdAt: string;
  resolvedAt?: string | null;
  user?: User;
}

export const insertEmergencyAlertSchema = z.object({
  tripId: z.string(),
  userId: z.string(),
  lat: z.string(),
  lng: z.string(),
  status: z.string().default("triggered"),
});

export type InsertEmergencyAlert = z.infer<typeof insertEmergencyAlertSchema>;

// System Settings
export interface SystemSettings {
  id: string;
  platformFeePercentage: string;
  maintenanceMode: boolean;
  supportEmail: string;
  supportPhone: string;
  updatedAt: string;
}

export const insertSystemSettingsSchema = z.object({
  platformFeePercentage: z.string().default("10"),
  maintenanceMode: z.boolean().default(false),
  supportEmail: z.string().email().optional().or(z.literal('')),
  supportPhone: z.string().optional().or(z.literal('')),
});


export interface SplitFareRequest {
  id: string;
  bookingId: string;
  requesterId: string;
  participantEmail: string;
  amount: string;
  status: 'pending' | 'paid' | 'declined';
  createdAt: string;
}

export const insertSplitFareRequestSchema = z.object({
  bookingId: z.string(),
  requesterId: z.string(),
  participantEmail: z.string().email(),
  amount: z.string(),
  status: z.enum(['pending', 'paid', 'declined']).default('pending'),
});

export type InsertSplitFareRequest = z.infer<typeof insertSplitFareRequestSchema>;

// Ride Requests (for Instant Booking)
export const RideRequestStatus = {
  PENDING: "pending",   // Looking for driver
  ACCEPTED: "accepted", // Driver accepted
  REJECTED: "rejected", // Driver rejected (internal/specific) or System rejected
  CANCELLED: "cancelled", // Passenger cancelled
  TIMEOUT: "timeout"    // No driver found
} as const;

export interface RideRequest {
  id: string;
  passengerId: string;
  pickupLocation: string;
  pickupLat: string;
  pickupLng: string;
  dropLocation: string;
  dropLat: string;
  dropLng: string;
  status: string;
  fare: string;
  distance: string;
  duration: number;
  vehicleType: string;
  driverId?: string | null; // Set when accepted
  tripId?: string | null;   // Created trip ID after acceptance
  organization_only?: boolean;
  createdAt: string;
  updatedAt: string;
}

export const insertRideRequestSchema = z.object({
  passengerId: z.string(),
  pickupLocation: z.string(),
  pickupLat: z.string(),
  pickupLng: z.string(),
  dropLocation: z.string(),
  dropLat: z.string(),
  dropLng: z.string(),
  status: z.string().default(RideRequestStatus.PENDING),
  fare: z.string(),
  distance: z.string(),
  duration: z.number(),
  vehicleType: z.string(),
  driverId: z.string().nullable().optional(),
  tripId: z.string().nullable().optional(),
  organization_only: z.boolean().default(false),
});

export type InsertRideRequest = z.infer<typeof insertRideRequestSchema>;


