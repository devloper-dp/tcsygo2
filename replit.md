# TCSYGO - Carpooling Platform

## Overview

TCSYGO is a full-stack carpooling platform combining features from BlaBlaCar (long-distance ride sharing) and Rapido (on-demand rides). The system enables passengers to find and book rides while allowing drivers to publish trips and earn money. The platform includes web (React/Vite), mobile (React Native/Expo), and backend (Express.js) applications with real-time location tracking, payment processing, and driver verification.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Web Application (React + Vite)**
- **UI Framework**: Shadcn UI components with Radix UI primitives for accessible, customizable components
- **Styling**: Tailwind CSS with custom design system following design_guidelines.md (Inter for UI, Poppins for display)
- **State Management**: TanStack Query for server state, React Context for auth state
- **Routing**: Wouter for lightweight client-side routing
- **Maps**: Mapbox GL JS for interactive maps, routing, and geocoding

**Mobile Application (React Native + Expo)**
- **Framework**: Expo managed workflow for cross-platform development
- **Navigation**: Expo Router for file-based routing
- **Maps**: React Native Maps for mobile mapping experience
- **Styling**: NativeWind for Tailwind-like styling on mobile
- **Location**: Expo Location for GPS tracking and geolocation

### Backend Architecture

**Microservices Pattern**
The backend follows a domain-driven microservices architecture with services communicating via an event bus (EventEmitter). Each service handles a specific domain:

1. **AuthService**: Handles authentication with dual-mode support (Supabase Auth in production, local dev tokens in development)
2. **UserService**: Manages user profiles, role switching (passenger/driver/both), and verification status
3. **TripService**: Trip CRUD operations, search functionality, dual implementation (local DB + Supabase)
4. **BookingService**: Manages seat reservations, availability tracking, and booking lifecycle
5. **PaymentService**: Razorpay integration for payment processing and order verification
6. **DriverService**: Driver onboarding, vehicle verification, availability management, rating updates
7. **LocationService**: Real-time GPS location updates during active trips
8. **NotificationService**: Event-driven notifications triggered by booking/payment events
9. **RatingService**: User rating system with automatic driver rating calculation
10. **AdminService**: Platform analytics, driver verification, system monitoring

**Event-Driven Communication**
- Central EventBus for inter-service communication
- Event types include: trip lifecycle, booking status, payment results, location updates, verification changes
- Services listen to relevant events and react accordingly (e.g., NotificationService listens to booking events)

**Dual Database Strategy**
The system supports two modes:
- **Local Development**: PostgreSQL with Drizzle ORM for full local development without external dependencies
- **Production**: Supabase for authentication, database, and real-time features

Services detect the environment and automatically switch between local DB (Drizzle) and Supabase based on environment variables.

### Data Architecture

**Database Schema (Drizzle ORM + PostgreSQL)**
- **users**: Core user data (extends Supabase Auth), roles (passenger/driver/both), verification status
- **drivers**: Driver-specific data (vehicle details, documents, ratings, availability, earnings)
- **trips**: Published trips with pickup/drop locations, pricing, seats, preferences, status
- **bookings**: Seat reservations linking passengers to trips with status tracking
- **payments**: Razorpay integration with order tracking, platform fees, driver earnings
- **ratings**: Peer ratings system for drivers and passengers
- **live_locations**: Real-time GPS coordinates during active trips
- **notifications**: User notifications triggered by platform events

**Key Relationships**:
- Users can be passengers, drivers, or both
- Drivers have one profile linked to user account
- Trips belong to drivers, bookings belong to trips
- Payments link to bookings with fee calculation
- Locations track driver position per trip in real-time

### Authentication & Authorization

**Dual Authentication System**:
- **Production Mode**: Supabase Auth with JWT tokens, OAuth support ready
- **Development Mode**: Simple token-based auth (`dev-token-{userId}`) for local testing without Supabase

**Middleware**:
- `requireAuth`: Validates tokens, attaches user to request
- `optionalAuth`: Allows both authenticated and anonymous access
- `requireRole`: Role-based access control (passenger/driver/admin)

### Real-Time Features

**WebSocket Implementation (Socket.IO)**
- Live location tracking during trips
- Real-time booking status updates
- Driver availability broadcasts
- Event-driven notifications to connected clients

**Supabase Realtime** (Production)
- Database change subscriptions
- Real-time location updates via Supabase channels
- Optimistic updates with automatic sync

### Payment Processing

**Razorpay Integration**:
- Order creation with booking amount
- Platform fee calculation (5% default)
- Driver earnings tracking
- Payment verification with signature validation
- Webhook support for payment status updates
- Refund handling for cancelled bookings

### Maps & Location

**Mapbox Services**:
- Geocoding for address to coordinates conversion
- Directions API for route calculation (distance, duration, geometry)
- Interactive maps with markers, popups, and navigation controls
- Autocomplete for location search

**Location Tracking**:
- GPS tracking during active trips
- Heading and speed data capture
- Real-time position updates to passengers
- Location history for trip verification

## External Dependencies

### Third-Party Services

**Supabase** (Optional - Production)
- Authentication with email/password and OAuth providers
- PostgreSQL database hosting
- Real-time subscriptions for live updates
- File storage for profile photos and driver documents
- Service requires: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`

**Razorpay** (Payment Gateway)
- Payment order creation and processing
- INR currency support
- Webhook verification
- Requires: `VITE_RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`

**Mapbox** (Maps & Geocoding)
- Interactive maps rendering
- Geocoding and reverse geocoding
- Routing and directions
- Location autocomplete
- Requires: `VITE_MAPBOX_ACCESS_TOKEN`

### Database

**PostgreSQL** (via Replit or Supabase)
- Primary data store for all entities
- Drizzle ORM for type-safe queries and migrations
- Connection pooling via @neondatabase/serverless
- Requires: `DATABASE_URL`

### Key NPM Packages

**Backend**:
- `express`: Web server framework
- `drizzle-orm`: Type-safe ORM
- `socket.io`: WebSocket server for real-time features
- `@supabase/supabase-js`: Supabase client library
- `razorpay`: Payment gateway SDK

**Frontend (Web)**:
- `react` + `vite`: Fast development and build
- `@tanstack/react-query`: Data fetching and caching
- `wouter`: Lightweight routing
- `mapbox-gl`: Interactive maps
- `@radix-ui/*`: Accessible UI primitives
- `tailwindcss`: Utility-first styling

**Frontend (Mobile)**:
- `expo`: Managed React Native workflow
- `expo-router`: File-based navigation
- `react-native-maps`: Native maps component
- `expo-location`: GPS and geolocation
- `expo-notifications`: Push notifications
- `nativewind`: Tailwind for React Native