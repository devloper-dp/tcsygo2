import { Stack } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/contexts/AuthContext';
import '../global.css';

const queryClient = new QueryClient();

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="trip/[id]" options={{ presentation: 'modal' }} />
          <Stack.Screen name="create-trip" options={{ presentation: 'modal' }} />
          <Stack.Screen name="booking/[id]" options={{ presentation: 'modal' }} />
          <Stack.Screen name="payment/[id]" options={{ presentation: 'modal' }} />
          <Stack.Screen name="login" options={{ presentation: 'modal' }} />
          <Stack.Screen name="signup" options={{ presentation: 'modal' }} />
        </Stack>
      </AuthProvider>
    </QueryClientProvider>
  );
}
