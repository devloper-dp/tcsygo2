import { useEffect, useRef, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { Stack, useRouter, useSegments, useRootNavigationState } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Toaster } from '@/components/ui/toaster';
import { useToast, ToastAction } from '@/components/ui/toast';
import { registerForPushNotificationsAsync, savePushToken, addNotificationResponseListener, handleNotificationTap, removeNotificationSubscription } from '@/lib/notifications';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider, useTheme } from '@/contexts/ThemeContext';
import '@/lib/i18n';
import { useResponsive } from '@/hooks/useResponsive';

const queryClient = new QueryClient();

import { OfflineIndicator } from '@/components/OfflineIndicator';
import { DriverAcceptanceModal } from '@/components/DriverAcceptanceModal';

function AppContent() {
  const { session, user, loading } = useAuth();
  const { colors, theme } = useTheme();
  const { hScale, vScale, spacing, fontSize } = useResponsive();
  const isDark = theme === 'dark';
  const segments = useSegments();
  const router = useRouter();
  const rootNavigationState = useRootNavigationState();

  const [initialRouteSet, setInitialRouteSet] = useState(false);
  // Mutex ref: prevents concurrent or re-entrant routing calls that cause loops
  const isRoutingRef = useRef(false);
  // Cooldown ref: ignore segment-change re-renders shortly after a navigation
  const lastNavigatedAt = useRef(0);

  useEffect(() => {
    // Guard: don't run if auth is still loading or navigator not ready
    if (loading) return;
    if (!rootNavigationState?.key) return;
    // Guard: skip if session exists but profile not loaded yet
    if (session && !user && loading) return;
    // Guard: prevent concurrent calls
    if (isRoutingRef.current) return;
    // Guard: cooldown — don't re-route within 800 ms of the last navigation
    if (Date.now() - lastNavigatedAt.current < 800) return;

    const handleRouting = async () => {
      isRoutingRef.current = true;
      try {
        const firstSegment = segments[0] as string | undefined;
        const currentPath = segments.join('/');

        const inAuthGroup = firstSegment === '(tabs)';
        const isOnOnboarding = firstSegment === 'onboarding';
        const isOnAdmin = firstSegment === 'admin';
        const isOnDriver = firstSegment === 'driver';
        const isOnLogin = firstSegment === 'login';
        const isOnSignup = firstSegment === 'signup';
        const isAuthRoute = isOnLogin || isOnSignup || firstSegment === 'forgot-password';

        const hasSeenOnboarding = await AsyncStorage.getItem('hasSeenOnboarding');

        console.log('[AppContent] Routing check:', {
          loading,
          role: user?.role,
          segment: firstSegment,
          path: currentPath
        });

        const navigate = (path: string) => {
          lastNavigatedAt.current = Date.now();
          router.replace(path as any);
        };

        // 1. Onboarding Check
        if (!hasSeenOnboarding && !isOnOnboarding) {
          navigate('/onboarding');
          setInitialRouteSet(true);
          return;
        }

        // 2. Auth Check: not logged in
        if (!session) {
          setInitialRouteSet(true);
          if (!isOnOnboarding && !isAuthRoute) {
            console.log('[AppContent] Not authenticated, redirecting to login');
            navigate('/login');
          }
          return;
        }

        // 3. Role-Based Routing (Authenticated)
        if (user && session) {
          const role = user.role;

          // ADMIN
          if (role === 'admin') {
            if (!isOnAdmin) {
              console.log('[AppContent] Admin user on non-admin route, redirecting to /admin');
              navigate('/admin');
              return;
            }
            setInitialRouteSet(true);
            return;
          }

          // DRIVER
          if (role === 'driver') {
            if (!firstSegment || isOnAdmin || inAuthGroup || isAuthRoute) {
              console.log('[AppContent] Driver on unauthorized or root route, redirecting to /driver');
              navigate('/driver');
              // Keep overlay visible until navigation takes effect
              return;
            }
            setInitialRouteSet(true);
            return;
          }

          // PASSENGER / USERS
          if (role === 'passenger' || role === 'user' || !role) {
            if (isOnAdmin || isOnDriver || isAuthRoute) {
              console.log('[AppContent] Passenger on unauthorized route, redirecting to home');
              if (!inAuthGroup && currentPath !== '') {
                navigate('/');
                return;
              }
            }
            setInitialRouteSet(true);
            return;
          }
        }

        // Final fallback to ensure the app doesn't stay on the loading screen forever
        setInitialRouteSet(true);
      } finally {
        setTimeout(() => { isRoutingRef.current = false; }, 600);
      }
    };

    handleRouting();
  // Only re-run on auth state changes — NOT on segment changes to avoid loops
  }, [session, loading, user, rootNavigationState?.key]);

  // Always render the Stack so the navigator is mounted and can handle navigation.
  // Show the loading overlay on top without unmounting the navigator.
  const showOverlay = loading || !initialRouteSet;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Stack screenOptions={{
        headerShown: false,
        headerStyle: { backgroundColor: colors.background },
        headerShadowVisible: false,
        headerTintColor: colors.text,
        headerTitleStyle: { fontWeight: '600', fontSize: hScale(18), color: colors.text }
      }}>
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
        <Stack.Screen name="driver" options={{ headerShown: false }} />
        <Stack.Screen name="profile/earnings" options={{ title: 'Earnings', headerShown: false }} />
        <Stack.Screen name="profile/add-payment-method" options={{ title: 'Add Payment Method', presentation: 'modal' }} />
        <Stack.Screen name="profile/payment-methods" options={{ title: 'Payment Methods', headerShown: false }} />
      </Stack>

      {/* Loading overlay — rendered on top so the Stack stays mounted */}
      {showOverlay && (
        <View style={{ ...StyleSheet.absoluteFillObject, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center', zIndex: 9999 }}>
          <ActivityIndicator size="large" color={isDark ? "#60a5fa" : "#2563EB"} />
        </View>
      )}

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
          <SafeAreaProvider>
            <ThemeProvider>
              <AppContent />
              <Toaster />
            </ThemeProvider>
          </SafeAreaProvider>
        </AuthProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
