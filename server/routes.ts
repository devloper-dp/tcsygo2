import type { Express } from "express";
import { createServer, type Server } from "http";
import { Server as SocketIOServer } from "socket.io";
import { tripService } from "./services/TripService";
import { bookingService } from "./services/BookingService";
import { paymentService } from "./services/PaymentService";
import { driverService } from "./services/DriverService";
import { locationService } from "./services/LocationService";
import { notificationService } from "./services/NotificationService";
import { ratingService } from "./services/RatingService";
import { userService } from "./services/UserService";
import { adminService } from "./services/AdminService";
import { authService } from "./services/AuthService";
import { requireAuth, optionalAuth, requireRole } from "./middleware/auth";

export async function registerRoutes(app: Express): Promise<Server> {
  // Authentication Routes
  app.post("/api/auth/signup", async (req, res) => {
    try {
      const { email, password, fullName } = req.body;
      const data = await authService.signUpWithEmail(email, password, fullName);
      res.json(data);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      const data = await authService.signInWithEmail(email, password);
      res.json(data);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.post("/api/auth/logout", async (req, res) => {
    try {
      await authService.signOut();
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.post("/api/auth/send-otp", async (req, res) => {
    try {
      const { phone } = req.body;
      const data = await authService.sendOTP(phone);
      res.json(data);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.post("/api/auth/verify-otp", async (req, res) => {
    try {
      const { phone, token } = req.body;
      const data = await authService.verifyOTP(phone, token);
      res.json(data);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.get("/api/auth/me", async (req, res) => {
    try {
      const user = await authService.getCurrentUser();
      res.json(user);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Trip Routes
  app.post("/api/trips", optionalAuth, async (req, res) => {
    try {
      const trip = await tripService.createTrip(req.body);
      res.json(trip);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.get("/api/trips/search", async (req, res) => {
    try {
      const { pickup, drop, date } = req.query;
      const trips = await tripService.searchTrips({
        pickup: pickup as string,
        drop: drop as string,
        date: date as string,
      });
      res.json(trips);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.get("/api/trips/my-trips", async (req, res) => {
    try {
      const userId = req.query.userId as string || 'mock-user-id';
      const trips = await tripService.getMyTrips(userId);
      res.json(trips);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.get("/api/trips/:id", async (req, res) => {
    try {
      const trip = await tripService.getTripById(req.params.id);
      if (!trip) {
        return res.status(404).json({ error: "Trip not found" });
      }
      res.json(trip);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.put("/api/trips/:id/status", async (req, res) => {
    try {
      await tripService.updateTripStatus(req.params.id, req.body.status);
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Booking Routes
  app.post("/api/bookings", optionalAuth, async (req, res) => {
    try {
      const { tripId, seatsBooked } = req.body;
      const passengerId = req.user?.id || req.body.passengerId || 'mock-passenger-id';
      
      const booking = await bookingService.createBooking({
        tripId,
        passengerId,
        seatsBooked: parseInt(seatsBooked),
      } as any);
      
      res.json(booking);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.get("/api/bookings/:id", async (req, res) => {
    try {
      const booking = await bookingService.getBookingById(req.params.id);
      if (!booking) {
        return res.status(404).json({ error: "Booking not found" });
      }
      res.json(booking);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.get("/api/bookings/my-bookings", async (req, res) => {
    try {
      const userId = req.query.userId as string || 'mock-user-id';
      const bookings = await bookingService.getMyBookings(userId);
      res.json(bookings);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.put("/api/bookings/:id/status", async (req, res) => {
    try {
      await bookingService.updateBookingStatus(req.params.id, req.body.status);
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Payment Routes
  app.post("/api/payments/create-order", async (req, res) => {
    try {
      const order = await paymentService.createOrder(req.body.bookingId);
      res.json(order);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.post("/api/payments/verify", async (req, res) => {
    try {
      const payment = await paymentService.verifyPayment(req.body);
      res.json(payment);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Driver Routes
  app.post("/api/drivers", async (req, res) => {
    try {
      const driver = await driverService.createDriverProfile(req.body);
      res.json(driver);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.get("/api/drivers/my-profile", async (req, res) => {
    try {
      const userId = req.query.userId as string || 'mock-user-id';
      const driver = await driverService.getDriverProfile(userId);
      res.json(driver);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.put("/api/drivers/:id", async (req, res) => {
    try {
      const driver = await driverService.updateDriverProfile(req.params.id, req.body);
      res.json(driver);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.put("/api/drivers/:id/verify", async (req, res) => {
    try {
      await driverService.verifyDriver(req.params.id, req.body.status);
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.get("/api/drivers/pending", async (req, res) => {
    try {
      const drivers = await driverService.getPendingVerifications();
      res.json(drivers);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Location Routes
  app.post("/api/locations", async (req, res) => {
    try {
      const location = await locationService.updateLocation(req.body);
      res.json(location);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.get("/api/locations/trip/:tripId", async (req, res) => {
    try {
      const location = await locationService.getLocationByTrip(req.params.tripId);
      res.json(location);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Notification Routes
  app.get("/api/notifications", async (req, res) => {
    try {
      const userId = req.query.userId as string || 'mock-user-id';
      const notifications = await notificationService.getUserNotifications(userId);
      res.json(notifications);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.put("/api/notifications/:id/read", async (req, res) => {
    try {
      await notificationService.markAsRead(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.put("/api/notifications/read-all", async (req, res) => {
    try {
      const userId = req.query.userId as string || 'mock-user-id';
      await notificationService.markAllAsRead(userId);
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Rating Routes
  app.post("/api/ratings", async (req, res) => {
    try {
      const rating = await ratingService.createRating(req.body);
      res.json(rating);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.get("/api/ratings/user/:userId", async (req, res) => {
    try {
      const ratings = await ratingService.getRatingsForUser(req.params.userId);
      res.json(ratings);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Admin Routes (protected)
  app.get("/api/admin/stats", optionalAuth, async (req, res) => {
    try {
      const stats = await adminService.getSystemStats();
      res.json(stats);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.get("/api/admin/activity", async (req, res) => {
    try {
      const days = parseInt(req.query.days as string) || 7;
      const activity = await adminService.getRecentActivity(days);
      res.json(activity);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.get("/api/admin/drivers/pending", async (req, res) => {
    try {
      const drivers = await driverService.getPendingVerifications();
      res.json(drivers);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.get("/api/admin/trips", async (req, res) => {
    try {
      const trips = await tripService.searchTrips({});
      res.json(trips);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.get("/api/admin/bookings", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;
      const bookings = await adminService.getAllBookings(limit, offset);
      res.json(bookings);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.get("/api/admin/payments", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;
      const payments = await adminService.getAllPayments(limit, offset);
      res.json(payments);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // User Profile Routes  
  app.post("/api/users", async (req, res) => {
    try {
      const user = await userService.createUser(req.body);
      res.json(user);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.get("/api/users/:id", async (req, res) => {
    try {
      const user = await userService.getUserById(req.params.id);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      res.json(user);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.put("/api/users/:id", async (req, res) => {
    try {
      const user = await userService.updateUserProfile(req.params.id, req.body);
      res.json(user);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.put("/api/users/:id/role", async (req, res) => {
    try {
      await userService.switchRole(req.params.id, req.body.role);
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.get("/api/users", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;
      const users = await userService.getAllUsers(limit, offset);
      res.json(users);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  const httpServer = createServer(app);

  // WebSocket setup for real-time location tracking
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  io.on("connection", (socket) => {
    console.log("Client connected:", socket.id);

    socket.on("driver:location:update", async (data) => {
      const { tripId, driverId, lat, lng, heading, speed } = data;
      
      try {
        await locationService.updateLocation({
          tripId,
          driverId,
          lat: lat.toString(),
          lng: lng.toString(),
          heading: heading?.toString(),
          speed: speed?.toString(),
        });

        io.to(`trip:${tripId}`).emit("location:updated", {
          tripId,
          lat,
          lng,
          heading,
          speed,
          timestamp: Date.now()
        });
      } catch (error) {
        console.error("Error updating location:", error);
      }
    });

    socket.on("trip:join", (tripId: string) => {
      socket.join(`trip:${tripId}`);
      console.log(`Socket ${socket.id} joined trip:${tripId}`);
    });

    socket.on("trip:leave", (tripId: string) => {
      socket.leave(`trip:${tripId}`);
      console.log(`Socket ${socket.id} left trip:${tripId}`);
    });

    socket.on("disconnect", () => {
      console.log("Client disconnected:", socket.id);
    });
  });

  return httpServer;
}
