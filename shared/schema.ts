import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, decimal, integer, boolean, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
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

// Users table (extends Supabase Auth)
export const users = pgTable("users", {
  id: varchar("id").primaryKey(), // matches Supabase Auth UID
  email: text("email").notNull().unique(),
  fullName: text("full_name").notNull(),
  phone: text("phone"),
  profilePhoto: text("profile_photo"),
  role: text("role").notNull().default(UserRole.PASSENGER), // passenger | driver | both
  bio: text("bio"),
  verificationStatus: text("verification_status").default(VerificationStatus.PENDING),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Driver profiles (additional driver-specific info)
export const drivers = pgTable("drivers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  licenseNumber: text("license_number").notNull(),
  licensePhoto: text("license_photo"),
  vehicleMake: text("vehicle_make").notNull(),
  vehicleModel: text("vehicle_model").notNull(),
  vehicleYear: integer("vehicle_year").notNull(),
  vehicleColor: text("vehicle_color").notNull(),
  vehiclePlate: text("vehicle_plate").notNull(),
  vehiclePhotos: jsonb("vehicle_photos").$type<string[]>().default([]),
  isAvailable: boolean("is_available").default(false),
  rating: decimal("rating", { precision: 3, scale: 2 }).default("0.00"),
  totalTrips: integer("total_trips").default(0),
  verificationStatus: text("verification_status").default(VerificationStatus.PENDING),
  documents: jsonb("documents").$type<{ type: string; url: string }[]>().default([]),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Trips table
export const trips = pgTable("trips", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  driverId: varchar("driver_id").notNull().references(() => drivers.id),
  pickupLocation: text("pickup_location").notNull(),
  pickupLat: decimal("pickup_lat", { precision: 10, scale: 7 }).notNull(),
  pickupLng: decimal("pickup_lng", { precision: 10, scale: 7 }).notNull(),
  dropLocation: text("drop_location").notNull(),
  dropLat: decimal("drop_lat", { precision: 10, scale: 7 }).notNull(),
  dropLng: decimal("drop_lng", { precision: 10, scale: 7 }).notNull(),
  departureTime: timestamp("departure_time").notNull(),
  distance: decimal("distance", { precision: 10, scale: 2 }).notNull(), // in km
  duration: integer("duration").notNull(), // in minutes
  pricePerSeat: decimal("price_per_seat", { precision: 10, scale: 2 }).notNull(),
  availableSeats: integer("available_seats").notNull(),
  totalSeats: integer("total_seats").notNull(),
  status: text("status").notNull().default(TripStatus.UPCOMING),
  route: jsonb("route").$type<{ lat: number; lng: number }[]>(),
  preferences: jsonb("preferences").$type<{
    smoking?: boolean;
    pets?: boolean;
    music?: boolean;
  }>().default({}),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Bookings table
export const bookings = pgTable("bookings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tripId: varchar("trip_id").notNull().references(() => trips.id),
  passengerId: varchar("passenger_id").notNull().references(() => users.id),
  seatsBooked: integer("seats_booked").notNull().default(1),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
  status: text("status").notNull().default(BookingStatus.PENDING),
  pickupLocation: text("pickup_location"),
  dropLocation: text("drop_location"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Payments table
export const payments = pgTable("payments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  bookingId: varchar("booking_id").notNull().references(() => bookings.id),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  platformFee: decimal("platform_fee", { precision: 10, scale: 2 }).notNull(),
  driverEarnings: decimal("driver_earnings", { precision: 10, scale: 2 }).notNull(),
  razorpayOrderId: text("razorpay_order_id"),
  razorpayPaymentId: text("razorpay_payment_id"),
  status: text("status").notNull().default(PaymentStatus.PENDING),
  paymentMethod: text("payment_method"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Ratings table
export const ratings = pgTable("ratings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tripId: varchar("trip_id").notNull().references(() => trips.id),
  fromUserId: varchar("from_user_id").notNull().references(() => users.id),
  toUserId: varchar("to_user_id").notNull().references(() => users.id),
  rating: integer("rating").notNull(), // 1-5 stars
  review: text("review"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Live locations table (for real-time tracking)
export const liveLocations = pgTable("live_locations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tripId: varchar("trip_id").notNull().references(() => trips.id),
  driverId: varchar("driver_id").notNull().references(() => drivers.id),
  lat: decimal("lat", { precision: 10, scale: 7 }).notNull(),
  lng: decimal("lng", { precision: 10, scale: 7 }).notNull(),
  heading: decimal("heading", { precision: 5, scale: 2 }),
  speed: decimal("speed", { precision: 5, scale: 2 }),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Notifications table
export const notifications = pgTable("notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  title: text("title").notNull(),
  message: text("message").notNull(),
  type: text("type").notNull(), // booking | payment | trip | system
  isRead: boolean("is_read").default(false),
  data: jsonb("data").$type<Record<string, any>>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Insert Schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertDriverSchema = createInsertSchema(drivers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  rating: true,
  totalTrips: true,
});

export const insertTripSchema = createInsertSchema(trips).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  departureTime: z.string(),
});

export const insertBookingSchema = createInsertSchema(bookings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPaymentSchema = createInsertSchema(payments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertRatingSchema = createInsertSchema(ratings).omit({
  id: true,
  createdAt: true,
});

export const insertLiveLocationSchema = createInsertSchema(liveLocations).omit({
  id: true,
  updatedAt: true,
});

export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  createdAt: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Driver = typeof drivers.$inferSelect;
export type InsertDriver = z.infer<typeof insertDriverSchema>;

export type Trip = typeof trips.$inferSelect;
export type InsertTrip = z.infer<typeof insertTripSchema>;

export type Booking = typeof bookings.$inferSelect;
export type InsertBooking = z.infer<typeof insertBookingSchema>;

export type Payment = typeof payments.$inferSelect;
export type InsertPayment = z.infer<typeof insertPaymentSchema>;

export type Rating = typeof ratings.$inferSelect;
export type InsertRating = z.infer<typeof insertRatingSchema>;

export type LiveLocation = typeof liveLocations.$inferSelect;
export type InsertLiveLocation = z.infer<typeof insertLiveLocationSchema>;

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;

// Drizzle Relations
import { relations } from 'drizzle-orm';

export const usersRelations = relations(users, ({ many }) => ({
  driversProfiles: many(drivers),
  bookings: many(bookings),
  ratingsGiven: many(ratings, { relationName: 'ratingsFrom' }),
  ratingsReceived: many(ratings, { relationName: 'ratingsTo' }),
  notifications: many(notifications),
}));

export const driversRelations = relations(drivers, ({ one, many }) => ({
  user: one(users, {
    fields: [drivers.userId],
    references: [users.id],
  }),
  trips: many(trips),
  liveLocations: many(liveLocations),
}));

export const tripsRelations = relations(trips, ({ one, many }) => ({
  driver: one(drivers, {
    fields: [trips.driverId],
    references: [drivers.id],
  }),
  bookings: many(bookings),
  ratings: many(ratings),
  liveLocations: many(liveLocations),
}));

export const bookingsRelations = relations(bookings, ({ one }) => ({
  trip: one(trips, {
    fields: [bookings.tripId],
    references: [trips.id],
  }),
  passenger: one(users, {
    fields: [bookings.passengerId],
    references: [users.id],
  }),
  payment: one(payments),
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
  booking: one(bookings, {
    fields: [payments.bookingId],
    references: [bookings.id],
  }),
}));

export const ratingsRelations = relations(ratings, ({ one }) => ({
  trip: one(trips, {
    fields: [ratings.tripId],
    references: [trips.id],
  }),
  fromUser: one(users, {
    fields: [ratings.fromUserId],
    references: [users.id],
    relationName: 'ratingsFrom',
  }),
  toUser: one(users, {
    fields: [ratings.toUserId],
    references: [users.id],
    relationName: 'ratingsTo',
  }),
}));

export const liveLocationsRelations = relations(liveLocations, ({ one }) => ({
  trip: one(trips, {
    fields: [liveLocations.tripId],
    references: [trips.id],
  }),
  driver: one(drivers, {
    fields: [liveLocations.driverId],
    references: [drivers.id],
  }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
}));

// Extended types with relations
export type TripWithDriver = Trip & {
  driver: Driver & { user: User };
};

export type BookingWithDetails = Booking & {
  trip: TripWithDriver;
  passenger: User;
  payment?: Payment;
};
