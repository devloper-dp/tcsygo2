# TCSYGO - Carpooling Platform

## Overview

TCSYGO is a full-stack carpooling platform combining features from BlaBlaCar (long-distance ride sharing) and Rapido (on-demand rides). The system enables passengers to find and book rides while allowing drivers to publish trips and earn money. The platform includes web (React/Vite), mobile (React Native/Expo), and backend (Express.js) applications with real-time location tracking, payment processing, and driver verification.

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

1. **AuthService**: Handles authentication via Supabase Auth.
2. **UserService**: Manages user profiles, role switching (passenger/driver/both), and verification status.
3. **TripService**: Trip CRUD operations and search functionality using Supabase.
4. **BookingService**: Manages seat reservations, availability tracking, and booking lifecycle.
5. **PaymentService**: Razorpay integration for payment processing and order verification.
6. **DriverService**: Driver onboarding, vehicle verification, availability management, rating updates.
7. **LocationService**: Real-time GPS location updates during active trips.
8. **NotificationService**: Event-driven notifications triggered by booking/payment events.
9. **RatingService**: User rating system with automatic driver rating calculation.
10. **AdminService**: Platform analytics, driver verification, system monitoring.

**Event-Driven Communication**
- Central EventBus for inter-service communication.
- Event types include: trip lifecycle, booking status, payment results, location updates, verification changes.
- Services listen to relevant events and react accordingly.

### Data Architecture

The system relies on **Supabase** for authentication, database (PostgreSQL), and real-time features.

**Database Schema (Supabase)**
- **users**: Core user data.
- **drivers**: Driver-specific data.
- **trips**: Published trips.
- **bookings**: Seat reservations.
- **payments**: Razorpay integration tracking.
- **ratings**: Peer ratings system.
- **live_locations**: Real-time GPS coordinates.
- **notifications**: User notifications.

### Authentication & Authorization

The system uses **Supabase Auth** with JWT tokens.

**Middleware**:
- `requireAuth`: Validates tokens, attaches user to request.
- `optionalAuth`: Allows both authenticated and anonymous access.
- `requireRole`: Role-based access control.

## Deployment on Replit

### 1. Environment Configuration

The application requires several API keys to function. Add these to **Tools > Secrets**:

- `VITE_SUPABASE_URL`: Your Supabase project URL
- `VITE_SUPABASE_ANON_KEY`: Your Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY`: Your Supabase service role key
- `RAZORPAY_KEY_ID`: Your Razorpay key ID
- `RAZORPAY_KEY_SECRET`: Your Razorpay secret
- `VITE_MAPBOX_TOKEN`: Your Mapbox public token

### 2. Running the Application

1. **Install dependencies**: `npm install`
2. **Start the development server**: `npm run dev`