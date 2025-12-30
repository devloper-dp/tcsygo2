# TCSYGO - Indore Carpooling Platform

A comprehensive BlaBlaCar + Rapido-style ride-sharing platform for Indore city, Madhya Pradesh. Built with React web app, React Native mobile app, and Supabase backend.

## 📑 Table of Contents

- [Features](#-features)
- [Architecture](#-architecture)
- [Quick Start](#-quick-start)
- [Database Setup](#-database-setup)
- [Supabase Setup](#-supabase-setup)
- [Mobile App Setup](#-mobile-app-setup)
- [Project Structure](#-project-structure)
- [API Endpoints](#-api-endpoints)
- [Security](#-security)
- [Rapido Features](#-rapido-features)
- [Troubleshooting](#-troubleshooting)

## 🌟 Features

### For Passengers
- **Search Trips**: Find rides by pickup/drop locations and date
- **Book Seats**: Reserve seats with secure payment via Razorpay
- **Real-time Tracking**: Track your driver's location during the trip
- **Rate Drivers**: Leave reviews and ratings after trips
- **Profile Management**: Manage your account and trip history
- **Ride Preferences**: Customize AC, music, pets, luggage preferences
- **Split Fare**: Share ride costs with friends
- **Safety Check-ins**: Periodic safety verification during rides

### For Drivers
- **Create Trips**: Publish trips with custom pricing and preferences
- **Manage Bookings**: Accept or reject passenger requests
- **Real-time Location**: Share live GPS location during trips
- **Driver Verification**: Complete verification to start offering rides
- **Earnings Dashboard**: Track your earnings and trip statistics
- **Auto-Pay**: Automatic payment after ride completion

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
- **Leaflet** with **OpenStreetMap** for interactive maps and routing

### Frontend (Mobile)
- **React Native** with **Expo** framework
- **Expo Router** for file-based navigation
- **React Native Maps** for mobile mapping
- **NativeWind** for Tailwind CSS on mobile
- **Expo Location** for GPS tracking
- **Expo Notifications** for push notifications

### Backend
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

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ installed
- Supabase account (https://supabase.com)
- Razorpay account (https://razorpay.com)

### Web App Setup

1. **Install dependencies**:
```bash
npm install
```

2. **Configure environment variables**:

Create a `.env` file in the project root:
```env
# Server Configuration
PORT=5000
NODE_ENV=development

# Supabase Configuration
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
EXPO_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# Razorpay Payment Gateway
RAZORPAY_KEY_ID=rzp_test_your_key_id
RAZORPAY_KEY_SECRET=your_razorpay_secret
```

3. **Start the application**:
```bash
npm run dev
```

The app will be available at http://localhost:5000

## 🗄️ Database Setup

### Step 1: Run Core Database Setup

1. Go to your Supabase Dashboard → SQL Editor
2. Run `supabase/COMPLETE_SETUP.sql` - This creates:
   - All 15 core database tables
   - Complete RLS policies for security
   - Storage buckets (profile-photos, vehicles, licenses, documents)
   - Core triggers and functions
   - Performance indexes

### Step 2: Run Rapido Features Setup

1. In Supabase SQL Editor
2. Run `supabase/RAPIDO_FEATURES_COMPLETE.sql` - This adds:
   - All 14 Rapido feature tables
   - Ride preferences, auto-pay, split fare
   - Safety check-ins, driver tips, wallets
   - Saved places, emergency contacts
   - Referral program, surge pricing
   - Additional storage buckets

### Core Tables
- **users**: User profiles linked to Supabase Auth
- **drivers**: Driver-specific information and verification
- **trips**: Ride sharing trip listings
- **bookings**: Trip booking records
- **payments**: Payment transactions and payout tracking
- **messages**: In-app chat between users
- **notifications**: Push notification records
- **live_locations**: Real-time driver location tracking
- **ratings**: User and driver ratings/reviews
- **emergency_alerts**: SOS emergency alerts

### Rapido Feature Tables
- **ride_preferences**: User ride customization
- **auto_pay_settings**: Automatic payment configuration
- **split_fare_requests**: Fare splitting between users
- **safety_checkins**: Periodic safety verification
- **driver_tips**: Tipping functionality
- **wallets**: User wallet balances
- **wallet_transactions**: Transaction history
- **saved_places**: Home, work, favorites
- **emergency_contacts**: Safety contacts
- **referral_codes**: Referral program
- **favorite_routes**: Frequently used routes
- **ride_statistics**: User ride analytics
- **surge_pricing_zones**: Dynamic pricing
- **ride_recordings**: Trip replay data

## 🔧 Supabase Setup

### Step 1: Create Supabase Project

1. Go to [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Click **"New Project"**
3. Fill in details:
   - **Project Name**: `tcsygo-production`
   - **Database Password**: Create a strong password (save securely!)
   - **Region**: Choose closest to users (e.g., `ap-south-1` for India)
4. Wait 2-3 minutes for provisioning

### Step 2: Get Your Credentials

1. Go to **Settings** → **API**
2. Copy and save:
   - **Project URL**: `https://your-project-ref.supabase.co`
   - **anon/public key** (safe for client-side)
   - **service_role key** (⚠️ **NEVER expose publicly!**)

### Step 3: Configure Authentication

1. Go to **Authentication** → **Providers**
2. Enable **Email** provider
3. Configure settings:
   - ✅ Enable email confirmations (recommended for production)
   - ✅ Secure email change
   - ✅ Secure password change

4. Go to **Authentication** → **Settings**
5. Configure:
   - **Site URL**: `http://localhost:5173` (development) or production URL
   - **Redirect URLs**: Add allowed URLs:
     ```
     http://localhost:5173/**
     http://localhost:5000/**
     https://your-production-domain.com/**
     ```

### Step 4: Set Up Database Schema

1. Go to **SQL Editor** in Supabase dashboard
2. Run `supabase/COMPLETE_SETUP.sql`
3. Run `supabase/RAPIDO_FEATURES_COMPLETE.sql`
4. Verify all tables exist in **Table Editor**

### Step 5: Configure Storage Buckets

Verify these buckets were created:
- ✅ `profile-photos` (Public)
- ✅ `vehicles` (Public)
- ✅ `licenses` (Private)
- ✅ `documents` (Private)
- ✅ `receipts` (Private)
- ✅ `safety-media` (Private)

### Step 6: Deploy Edge Functions (Optional)

```bash
# Install Supabase CLI
npm install -g supabase

# Login
supabase login

# Link project
supabase link --project-ref your-project-ref

# Deploy functions
supabase functions deploy create-payment-order
supabase functions deploy verify-payment
supabase functions deploy send-push-notification
supabase functions deploy update-live-location
supabase functions deploy safety-checkin
```

### Step 7: Configure Secrets

```bash
# Set Razorpay secrets
supabase secrets set RAZORPAY_KEY_ID=rzp_test_your_key_id
supabase secrets set RAZORPAY_KEY_SECRET=your_razorpay_secret

# Set Expo push notification token (if using)
supabase secrets set EXPO_PUSH_TOKEN=your_expo_push_token
```

## 📱 Mobile App Setup

See detailed instructions in [`mobile/README.md`](mobile/README.md)

### Quick Start

1. Navigate to mobile directory:
```bash
cd mobile
```

2. Install dependencies:
```bash
npm install
```

3. Configure environment variables in `mobile/.env`:
```env
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
EXPO_PUBLIC_RAZORPAY_KEY_ID=your_razorpay_key_id
```

4. Start development server:
```bash
npm start
```

5. Choose platform:
   - Press `i` for iOS simulator
   - Press `a` for Android emulator
   - Scan QR code with Expo Go app

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
├── mobile/                # React Native app
│   ├── app/               # Expo Router screens
│   ├── components/        # Mobile components
│   ├── services/          # Mobile services
│   └── lib/               # Mobile utilities
├── shared/                # Shared types and schemas
│   └── schema.ts          # Database schema and types
├── supabase/              # Supabase configuration
│   ├── COMPLETE_SETUP.sql
│   ├── RAPIDO_FEATURES_COMPLETE.sql
│   ├── SEED_DATA.sql
│   └── functions/         # Edge Functions
└── attached_assets/       # Generated images
```

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

## 🔐 Security

### Authentication
- **Supabase Auth**: Secure authentication with email/password
- **JWT Token Management**: Automatic token refresh
- **Row-based Access**: Passenger, Driver, and Admin roles

### Database Security
- **Row Level Security (RLS)**: Enabled on all tables
- **User-specific Access**: Users can only access their own data
- **Encrypted Passwords**: bcrypt hashing

### Payment Security
- **Razorpay Integration**: PCI-compliant payment processing
- **Signature Verification**: Server-side payment verification
- **Secure Keys**: Service keys never exposed to client

### Storage Security
- **Private Buckets**: Sensitive documents (licenses, documents)
- **Public Buckets**: Profile photos, vehicle images
- **Access Policies**: User-specific file access

## ✨ Rapido Features

### Ride Preferences
- AC preference toggle
- Music preference
- Pet-friendly option
- Luggage capacity slider (0-5 bags)

### Auto-Pay System
- Enable/disable automatic payments
- Default payment method selection
- Daily spending limits
- Secure encrypted transactions

### Split Fare
- Equal split or custom amounts
- Email invitations to split participants
- Payment tracking
- Individual payment status

### Geofencing Alerts
- Pickup proximity alerts (500m, 50m)
- Drop location alerts
- Real-time distance calculation
- Visual and haptic feedback

### Safety Check-ins
- Automated prompts every 10 minutes
- "I'm Safe" or "I Need Help" buttons
- Emergency escalation after 2 missed check-ins
- GPS location recording
- Emergency contact notifications

### Trip Replay
- Animated route playback
- Playback controls (play, pause, speed)
- Trip statistics (distance, duration, speed)
- Route visualization on map
- Timeline scrubbing

### Driver Verification
- Photo verification
- Vehicle details confirmation
- License plate display
- Safety checklist
- Report mismatch option

### Enhanced Quick Actions
- Repeat last ride
- Saved places (home, work, favorites)
- Recent destinations
- Smart suggestions

### Offline Mode Indicator
- Real-time connection status
- Visual alert banner
- Auto-hide when online
- User guidance for limited functionality

### Multi-Language Support
- English, Hindi (हिंदी), Marathi (मराठी)
- Native script display
- Persistent language preference
- Easy language switching

### Notification Center
- Real-time notifications via Supabase
- Categorization (bookings, arrivals, payments, offers)
- Filter options (all/unread)
- Mark as read/delete
- Unread count badge

## 🆘 Troubleshooting

### "Invalid API key" Error
- Verify correct API keys from Supabase dashboard
- Use `anon` key for client-side code
- Check `.env` file is in project root

### "Permission denied" or RLS Errors
- Verify RLS policies created correctly
- Check user is authenticated
- Ensure user has correct role
- Review policies in Table Editor → Policies tab

### Storage Upload Fails
- Verify buckets exist and configured correctly
- Check storage policies applied
- Ensure file path follows: `{user_id}/{filename}`
- Verify file size within limits

### Edge Functions Not Working
- Verify functions deployed: `supabase functions list`
- Check logs: `supabase functions logs function-name`
- Ensure secrets set correctly
- Verify `--no-verify-jwt` flag if not using JWT

### Database Connection Errors
- Check internet connection
- Verify Supabase project running (not paused)
- Check database password correct
- Ensure correct project URL

### "Relation does not exist" Error
- Verify SQL scripts ran successfully
- Check SQL Editor for errors
- Try running scripts again
- Verify connected to correct project

## 🎯 Future Enhancements

- Multi-stop trip support
- Automated payout scheduling
- Advanced analytics dashboard
- Trip sharing with deep links
- Dispute resolution workflow
- In-app video chat

## 📄 License

This project is proprietary software for TCSYGO.

## 🤝 Contributing

This is a private project. Contact the team for contribution guidelines.

## 📞 Support

For support, email support@tcsygo.com or open an issue in the repository.

## 📚 Additional Documentation

- [Mobile App Setup](mobile/README.md)
- [Supabase Configuration](supabase/README.md)
- [Supabase Documentation](https://supabase.com/docs)
- [Razorpay Documentation](https://razorpay.com/docs)

---

**Last Updated:** 2025-12-28
