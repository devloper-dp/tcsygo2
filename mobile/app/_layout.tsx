import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { Stack, useRouter, useSegments } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Toaster } from '@/components/ui/toaster';
import { useToast, ToastAction } from '@/components/ui/toast';
import { registerForPushNotificationsAsync, savePushToken, addNotificationResponseListener, handleNotificationTap, removeNotificationSubscription } from '@/lib/notifications';
import '../global.css';

const queryClient = new QueryClient();

import { OfflineIndicator } from '@/components/OfflineIndicator';
import { DriverAcceptanceModal } from '@/components/DriverAcceptanceModal';

function AppContent() {
  // ... previous logic

  return (
    <View style={{ flex: 1 }}>
      <Stack screenOptions={{ headerShown: false }}>
        {/* ... existing screens ... */}
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="onboarding" options={{ headerShown: false }} />
        <Stack.Screen name="trip/[id]" options={{ presentation: 'modal' }} />
        <Stack.Screen name="create-trip" options={{ presentation: 'modal' }} />
        <Stack.Screen name="booking/[id]" options={{ presentation: 'modal' }} />
        <Stack.Screen name="payment/[id]" options={{ presentation: 'modal' }} />
        <Stack.Screen name="profile/edit" options={{ title: 'Edit Profile', headerShown: false }} />
        <Stack.Screen name="profile/vehicles" options={{ title: 'My Vehicles', headerShown: false }} />
        <Stack.Screen name="profile/payment" options={{ title: 'Payment Methods', headerShown: false }} />
        <Stack.Screen name="profile/notifications" options={{ title: 'Notifications', headerShown: false }} />
        <Stack.Screen name="profile/help" options={{ title: 'Help & Support', headerShown: false }} />
        <Stack.Screen name="profile/settings" options={{ title: 'Settings', headerShown: false }} />
        <Stack.Screen name="login" options={{ presentation: 'modal' }} />
        <Stack.Screen name="signup" options={{ presentation: 'modal' }} />
        <Stack.Screen name="notifications" options={{ title: 'Notifications', headerShown: false }} />
        <Stack.Screen name="forgot-password" options={{ presentation: 'modal', headerShown: false }} />
        <Stack.Screen name="become-driver" options={{ title: 'Become a Driver', headerShown: false }} />
        <Stack.Screen name="search" options={{ headerShown: false }} />
        <Stack.Screen name="payment/success" options={{ headerShown: false, presentation: 'modal' }} />
        <Stack.Screen name="chat/[id]" options={{ title: 'Chat' }} />
        <Stack.Screen name="chat/[tripId]" options={{ title: 'Chat' }} />
        <Stack.Screen name="track/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="admin" options={{ headerShown: false }} />
        <Stack.Screen name="profile/earnings" options={{ title: 'Earnings', headerShown: false }} />
        <Stack.Screen name="profile/add-payment-method" options={{ title: 'Add Payment Method', presentation: 'modal' }} />
        <Stack.Screen name="profile/payment-methods" options={{ title: 'Payment Methods', headerShown: false }} />
      </Stack>
      <OfflineIndicator />
      <DriverAcceptanceModal />
    </View>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <AppContent />
          <Toaster />
        </AuthProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
