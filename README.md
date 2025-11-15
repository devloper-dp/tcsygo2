# TCSYGO - Carpooling Platform

A comprehensive BlaBlaCar + Rapido-style ride-sharing platform with React web app, React Native mobile app, and Supabase backend.

## 🌟 Features

### For Passengers
- **Search Trips**: Find rides by pickup/drop locations and date
- **Book Seats**: Reserve seats with secure payment via Razorpay
- **Real-time Tracking**: Track your driver's location during the trip
- **Rate Drivers**: Leave reviews and ratings after trips
- **Profile Management**: Manage your account and trip history

### For Drivers
- **Create Trips**: Publish trips with custom pricing and preferences
- **Manage Bookings**: Accept or reject passenger requests
- **Real-time Location**: Share live GPS location during trips
- **Driver Verification**: Complete verification to start offering rides
- **Earnings Dashboard**: Track your earnings and trip statistics

### For Admins
- **Driver Verification**: Approve or reject driver applications
- **Monitor Platform**: View trips, bookings, and payment analytics
- **User Management**: Oversee platform activity and resolve issues

## 🏗️ Architecture

### Frontend (Web)
- **React** with **Vite** for fast development
- **TanStack Query** for data fetching and caching
- **Wouter** for client-side routing
- **Shadcn UI** + **Tailwind CSS** for beautiful, accessible components
- **Mapbox GL JS** for interactive maps and routing

### Frontend (Mobile)
- **React Native** with **Expo** framework
- **Expo Router** for file-based navigation
- **React Native Maps** for mobile mapping
- **NativeWind** for Tailwind CSS on mobile
- **Expo Location** for GPS tracking
- **Expo Notifications** for push notifications

### Backend
- **Express.js** server with modular service architecture
- **Supabase** for authentication, database, and realtime features
- **Razorpay** for payment processing
- **Event-driven** architecture with EventEmitter

### Services
1. **TripService**: Trip creation, search, and management
2. **BookingService**: Booking lifecycle and seat management
3. **PaymentService**: Razorpay integration and payment verification
4. **DriverService**: Driver profiles and verification workflow
5. **LocationService**: Real-time GPS tracking with Supabase Realtime
6. **NotificationService**: Push notifications and in-app alerts
7. **RatingService**: Driver and passenger rating system

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ installed
- Supabase account (https://supabase.com)
- Razorpay account (https://razorpay.com)
- Mapbox account (https://mapbox.com)

### Web App Setup

1. **Install dependencies**:
```bash
npm install
```

2. **Configure environment variables**:

Create a `.env` file or add these to Replit Secrets:
```
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_key
VITE_RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_secret
VITE_MAPBOX_ACCESS_TOKEN=your_mapbox_token
SESSION_SECRET=your_session_secret
```

3. **Set up Supabase database**:

Run these SQL commands in your Supabase SQL editor:

```sql
-- Create users table
CREATE TABLE users (
  id VARCHAR PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  phone TEXT,
  profile_photo TEXT,
  role TEXT NOT NULL DEFAULT 'passenger',
  bio TEXT,
  verification_status TEXT DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create drivers table
CREATE TABLE drivers (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR REFERENCES users(id) NOT NULL,
  license_number TEXT NOT NULL,
  license_photo TEXT,
  vehicle_make TEXT NOT NULL,
  vehicle_model TEXT NOT NULL,
  vehicle_year INTEGER NOT NULL,
  vehicle_color TEXT NOT NULL,
  vehicle_plate TEXT NOT NULL,
  vehicle_photos JSONB DEFAULT '[]',
  is_available BOOLEAN DEFAULT FALSE,
  rating DECIMAL(3,2) DEFAULT 0.00,
  total_trips INTEGER DEFAULT 0,
  verification_status TEXT DEFAULT 'pending',
  documents JSONB DEFAULT '[]',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create trips table
CREATE TABLE trips (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id VARCHAR REFERENCES drivers(id) NOT NULL,
  pickup_location TEXT NOT NULL,
  pickup_lat DECIMAL(10,7) NOT NULL,
  pickup_lng DECIMAL(10,7) NOT NULL,
  drop_location TEXT NOT NULL,
  drop_lat DECIMAL(10,7) NOT NULL,
  drop_lng DECIMAL(10,7) NOT NULL,
  departure_time TIMESTAMP NOT NULL,
  distance DECIMAL(10,2) NOT NULL,
  duration INTEGER NOT NULL,
  price_per_seat DECIMAL(10,2) NOT NULL,
  available_seats INTEGER NOT NULL,
  total_seats INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'upcoming',
  route JSONB,
  preferences JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create bookings table
CREATE TABLE bookings (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id VARCHAR REFERENCES trips(id) NOT NULL,
  passenger_id VARCHAR REFERENCES users(id) NOT NULL,
  seats_booked INTEGER NOT NULL DEFAULT 1,
  total_amount DECIMAL(10,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  pickup_location TEXT,
  drop_location TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create payments table
CREATE TABLE payments (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id VARCHAR REFERENCES bookings(id) NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  platform_fee DECIMAL(10,2) NOT NULL,
  driver_earnings DECIMAL(10,2) NOT NULL,
  razorpay_order_id TEXT,
  razorpay_payment_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  payment_method TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create ratings table
CREATE TABLE ratings (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id VARCHAR REFERENCES trips(id) NOT NULL,
  from_user_id VARCHAR REFERENCES users(id) NOT NULL,
  to_user_id VARCHAR REFERENCES users(id) NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create live_locations table
CREATE TABLE live_locations (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id VARCHAR REFERENCES trips(id) NOT NULL,
  driver_id VARCHAR REFERENCES drivers(id) NOT NULL,
  lat DECIMAL(10,7) NOT NULL,
  lng DECIMAL(10,7) NOT NULL,
  heading DECIMAL(5,2),
  speed DECIMAL(5,2),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create notifications table
CREATE TABLE notifications (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR REFERENCES users(id) NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  data JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_trips_status ON trips(status);
CREATE INDEX idx_trips_departure ON trips(departure_time);
CREATE INDEX idx_bookings_passenger ON bookings(passenger_id);
CREATE INDEX idx_bookings_trip ON bookings(trip_id);
CREATE INDEX idx_locations_trip ON live_locations(trip_id);
```

4. **Start the application**:
```bash
npm run dev
```

The app will be available at http://localhost:5000

### Mobile App Setup

See `mobile/README.md` for detailed React Native setup instructions.

## 📱 Key Pages

### Web Application
- `/` - Landing page with trip search
- `/search` - Search results with map view
- `/create-trip` - Create a new trip (drivers)
- `/trip/:id` - Trip details and booking
- `/my-trips` - View your bookings and trips
- `/profile` - User profile and settings
- `/payment/:bookingId` - Payment checkout
- `/admin` - Admin dashboard

### Mobile Application
- Home (Map) - Find nearby trips
- Search - Browse and filter trips
- My Trips - Manage bookings and created trips
- Profile - Account settings and driver info

## 🔐 Security Features

- **Supabase Auth**: Secure authentication with email/password
- **Role-based Access**: Passenger, Driver, and Admin roles
- **Payment Security**: Razorpay with signature verification
- **Environment Variables**: Sensitive keys stored securely
- **Database RLS**: Row-level security on Supabase (recommended)

## 🎨 Design System

- **Colors**: Blue primary (#3b82f6), Green success, Red destructive
- **Typography**: Inter for body text, Poppins for headings
- **Components**: Shadcn UI with Radix primitives
- **Responsive**: Mobile-first design with Tailwind breakpoints
- **Dark Mode**: System preference detection (web)

## 🛠️ Tech Stack

**Frontend**:
- React 18.2
- TypeScript 5.1
- Tailwind CSS 3.4
- Shadcn UI Components
- TanStack Query v5
- Wouter Router
- Mapbox GL JS

**Backend**:
- Node.js / Express
- Supabase (PostgreSQL)
- Razorpay Payments
- EventEmitter3

**Mobile**:
- React Native 0.73
- Expo SDK 50
- React Native Maps
- Expo Router

## 📦 Project Structure

```
.
├── client/                 # React web app
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   ├── pages/         # Route pages
│   │   ├── contexts/      # React contexts
│   │   ├── lib/           # Utilities and configs
│   │   └── App.tsx        # Main app component
│   └── index.html
├── server/                # Express backend
│   ├── services/          # Business logic services
│   ├── routes.ts          # API routes
│   └── index.ts           # Server entry
├── mobile/                # React Native app
│   ├── app/               # Expo Router screens
│   ├── components/        # Mobile components
│   └── lib/               # Mobile utilities
├── shared/                # Shared types and schemas
│   └── schema.ts          # Database schema and types
└── attached_assets/       # Generated images

```

## 🔄 Real-time Features

- **Live Location Tracking**: Supabase Realtime channels
- **Booking Updates**: Real-time booking status changes
- **Notifications**: Instant push notifications
- **Trip Status**: Live trip status updates

## 💳 Payment Flow

1. Passenger selects trip and seats
2. Booking created with "pending" status
3. Payment order created via Razorpay
4. User completes payment
5. Payment verified with signature check
6. Booking status updated to "confirmed"
7. Platform fee and driver earnings calculated
8. Notifications sent to driver and passenger

## 📝 API Endpoints

### Trips
- `POST /api/trips` - Create trip
- `GET /api/trips/search` - Search trips
- `GET /api/trips/:id` - Get trip details
- `GET /api/trips/my-trips` - Get driver's trips

### Bookings
- `POST /api/bookings` - Create booking
- `GET /api/bookings/:id` - Get booking details
- `GET /api/bookings/my-bookings` - Get user's bookings

### Payments
- `POST /api/payments/create-order` - Create Razorpay order
- `POST /api/payments/verify` - Verify payment

### Drivers
- `POST /api/drivers` - Create driver profile
- `GET /api/drivers/my-profile` - Get driver profile
- `PUT /api/drivers/:id/verify` - Verify driver (admin)

### Locations
- `POST /api/locations` - Update live location
- `GET /api/locations/trip/:tripId` - Get trip location

### Ratings
- `POST /api/ratings` - Create rating
- `GET /api/ratings/user/:userId` - Get user ratings

## 🚧 Future Enhancements

- SOS emergency button
- Multi-stop trip support
- Automated payout scheduling
- Advanced analytics dashboard
- Trip sharing with deep links
- Surge pricing algorithms
- Dispute resolution workflow
- In-app chat between drivers and passengers

## 📄 License

This project is proprietary software for TCSYGO.

## 🤝 Contributing

This is a private project. Contact the team for contribution guidelines.

## 📞 Support

For support, email support@tcsygo.com or open an issue in the repository.
