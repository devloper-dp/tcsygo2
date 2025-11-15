# TCSYGO Mobile App

React Native mobile application for TCSYGO carpooling platform built with Expo.

## Setup Instructions

### Prerequisites
- Node.js 18+ installed
- Expo CLI installed globally: `npm install -g expo-cli`
- iOS Simulator (Mac only) or Android Studio for Android Emulator
- Expo Go app on your physical device (optional)

### Installation

1. Navigate to the mobile directory:
```bash
cd mobile
```

2. Install dependencies:
```bash
npm install
```

3. Configure environment variables:
Create a `.env` file in the mobile directory:
```
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN=your_mapbox_token
EXPO_PUBLIC_RAZORPAY_KEY_ID=your_razorpay_key_id
```

### Running the App

Start the development server:
```bash
npm start
```

Then choose one of the following options:
- Press `i` for iOS simulator
- Press `a` for Android emulator
- Scan the QR code with Expo Go app on your phone

## Project Structure

```
mobile/
├── app/                    # Expo Router screens
│   ├── (tabs)/            # Bottom tab navigation
│   │   ├── index.tsx      # Home/Map screen
│   │   ├── search.tsx     # Search trips screen
│   │   ├── trips.tsx      # My trips screen
│   │   └── profile.tsx    # Profile screen
│   ├── trip/[id].tsx      # Trip details
│   ├── create-trip.tsx    # Create trip (driver)
│   ├── booking/[id].tsx   # Booking flow
│   ├── payment/[id].tsx   # Payment screen
│   └── _layout.tsx        # Root layout
├── components/            # Reusable components
│   ├── TripCard.tsx
│   ├── MapView.tsx
│   ├── LocationInput.tsx
│   └── ...
├── lib/                   # Utilities and configs
│   ├── supabase.ts
│   ├── mapbox.ts
│   └── razorpay.ts
├── contexts/              # React contexts
│   └── AuthContext.tsx
├── assets/                # Images and fonts
└── package.json

```

## Features

- **Map-based Home**: Interactive map showing nearby trips
- **Trip Search**: Search and filter available rides
- **Create Trip**: Drivers can publish new trips
- **Real-time Tracking**: Live GPS tracking during trips
- **In-app Payments**: Secure Razorpay integration
- **Push Notifications**: Trip updates and booking confirmations
- **Profile Management**: User profiles and driver verification
- **Rating System**: Rate drivers and passengers after trips

## Tech Stack

- **Expo**: Framework for React Native
- **Expo Router**: File-based routing
- **React Native Maps**: Interactive maps
- **Supabase**: Backend and realtime database
- **TanStack Query**: Data fetching and caching
- **NativeWind**: Tailwind CSS for React Native
- **Zustand**: State management
- **Expo Location**: GPS and location services
- **Expo Notifications**: Push notifications

## Note

This mobile app is designed to complement the web application and shares the same backend infrastructure via Supabase. It requires the backend services to be running and properly configured.
