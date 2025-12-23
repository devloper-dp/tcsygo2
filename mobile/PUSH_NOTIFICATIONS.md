# Push Notifications Setup for TCSYGO Mobile

## Overview

This guide explains how to set up push notifications for the TCSYGO mobile app using Expo Notifications.

## Prerequisites

- Expo account
- Expo CLI installed
- Mobile app running with Expo

## Step 1: Install Dependencies

The required packages are already in `package.json`:

```json
{
  "expo-notifications": "~0.27.6",
  "expo-device": "~5.9.3"
}
```

If not installed, run:
```bash
cd mobile
npm install expo-notifications expo-device
```

## Step 2: Configure Notifications

Create a notification service file:

**File:** `mobile/lib/notifications.ts`

```typescript
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { supabase } from './supabase';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export async function registerForPushNotificationsAsync() {
  let token;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#3b82f6',
    });
  }

  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    if (finalStatus !== 'granted') {
      alert('Failed to get push token for push notification!');
      return;
    }
    
    token = (await Notifications.getExpoPushTokenAsync()).data;
  } else {
    alert('Must use physical device for Push Notifications');
  }

  return token;
}

export async function savePushToken(userId: string, token: string) {
  // Save token to user profile
  const { error } = await supabase
    .from('users')
    .update({ push_token: token })
    .eq('id', userId);

  if (error) {
    console.error('Error saving push token:', error);
  }
}

export function setupNotificationListeners(
  onNotificationReceived?: (notification: Notifications.Notification) => void,
  onNotificationResponse?: (response: Notifications.NotificationResponse) => void
) {
  // Notification received while app is foregrounded
  const notificationListener = Notifications.addNotificationReceivedListener(notification => {
    console.log('Notification received:', notification);
    onNotificationReceived?.(notification);
  });

  // User tapped on notification
  const responseListener = Notifications.addNotificationResponseReceivedListener(response => {
    console.log('Notification response:', response);
    onNotificationResponse?.(response);
  });

  return () => {
    Notifications.removeNotificationSubscription(notificationListener);
    Notifications.removeNotificationSubscription(responseListener);
  };
}
```

## Step 3: Update Database Schema

Add push_token column to users table:

```sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS push_token TEXT;
```

## Step 4: Initialize in App

Update `mobile/app/_layout.tsx`:

```typescript
import { useEffect } from 'react';
import { registerForPushNotificationsAsync, savePushToken, setupNotificationListeners } from '@/lib/notifications';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'expo-router';

export default function RootLayout() {
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Register for push notifications
    if (user) {
      registerForPushNotificationsAsync().then(token => {
        if (token) {
          savePushToken(user.id, token);
        }
      });
    }

    // Setup notification listeners
    const cleanup = setupNotificationListeners(
      (notification) => {
        // Handle foreground notification
        console.log('Received notification:', notification);
      },
      (response) => {
        // Handle notification tap
        const data = response.notification.request.content.data;
        
        // Navigate based on notification type
        if (data.type === 'booking') {
          router.push(`/booking/${data.bookingId}`);
        } else if (data.type === 'trip') {
          router.push(`/trip/${data.tripId}`);
        } else if (data.type === 'message') {
          router.push(`/chat/${data.tripId}`);
        }
      }
    );

    return cleanup;
  }, [user]);

  // ... rest of layout
}
```

## Step 5: Send Notifications from Backend

Create a notification sending function (this would typically be in your backend):

```typescript
// Example: Send notification when booking is confirmed
async function sendBookingConfirmationNotification(userId: string, bookingId: string) {
  // Get user's push token
  const { data: user } = await supabase
    .from('users')
    .select('push_token')
    .eq('id', userId)
    .single();

  if (!user?.push_token) return;

  // Send push notification via Expo Push API
  const message = {
    to: user.push_token,
    sound: 'default',
    title: 'Booking Confirmed! 🎉',
    body: 'Your trip has been confirmed. Get ready to ride!',
    data: { 
      type: 'booking', 
      bookingId: bookingId 
    },
  };

  await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(message),
  });
}
```

## Step 6: Test Notifications

### Test on Physical Device

1. Build and install app on physical device:
   ```bash
   cd mobile
   npx expo start
   # Scan QR code with Expo Go app
   ```

2. Grant notification permissions when prompted

3. Trigger a notification:
   - Create a booking
   - Send a message
   - Trigger an emergency alert

### Test with Expo Push Notification Tool

1. Get your Expo push token from the app logs
2. Visit: https://expo.dev/notifications
3. Enter your token and send a test notification

## Notification Types

The app should send notifications for:

✅ **Booking Events**
- Booking confirmed
- Booking cancelled
- Driver accepted/rejected booking

✅ **Trip Events**
- Trip starting soon (30 min before)
- Trip started
- Trip completed
- Trip cancelled

✅ **Messages**
- New message received
- Driver/passenger replied

✅ **Emergency**
- Emergency alert triggered
- Emergency resolved

✅ **Driver Events**
- New booking request
- Passenger cancelled
- Payment received

## Troubleshooting

### Notifications Not Received

1. Check device permissions: Settings → TCSYGO → Notifications
2. Verify push token is saved in database
3. Check Expo push notification logs
4. Ensure app is not in battery saver mode

### iOS Specific Issues

- Notifications require Apple Developer account for production
- Test with Expo Go app first
- For production, need APNs certificates

### Android Specific Issues

- Ensure notification channel is created
- Check Do Not Disturb settings
- Verify app has notification permissions

## Production Considerations

For production deployment:

1. **iOS**: Set up APNs certificates in Apple Developer Console
2. **Android**: Configure Firebase Cloud Messaging (FCM)
3. **Backend**: Implement notification queue system
4. **Rate Limiting**: Prevent notification spam
5. **User Preferences**: Allow users to customize notification settings

## Next Steps

- [ ] Add notification preferences in user profile
- [ ] Implement notification history
- [ ] Add notification badges
- [ ] Set up notification analytics
- [ ] Test on both iOS and Android devices

---

**Note:** This is a basic setup. For production, consider using a dedicated notification service like OneSignal or Firebase Cloud Messaging for better reliability and features.
