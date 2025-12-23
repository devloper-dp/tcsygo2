import { Stack } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/contexts/AuthContext';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Toaster } from '@/components/ui/toaster';
import '../global.css';

const queryClient = new QueryClient();

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
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
          </Stack>
          <Toaster />
        </AuthProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
