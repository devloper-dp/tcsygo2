import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { OfflineIndicator } from "@/components/OfflineIndicator";
import { PushNotificationHandler } from "@/components/PushNotificationHandler";
import { ProtectedRoute } from "@/lib/protected-route";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import Search from "@/pages/search";
import CreateTrip from "@/pages/create-trip";
import DriverOnboarding from "@/pages/driver-onboarding";
import TrackTrip from "@/pages/track-trip";
import TripDetails from "@/pages/trip-details";
import Login from "@/pages/login";
import Signup from "@/pages/signup";
import ForgotPassword from "@/pages/forgot-password";
import ResetPassword from "@/pages/reset-password";
import MyTrips from "@/pages/my-trips";
import Profile from "@/pages/profile";
import Payment from "@/pages/payment";
import PaymentSuccess from "@/pages/payment-success";
import PaymentMethods from "@/pages/payment-methods";
import PaymentHistory from "@/pages/payment-history";
import Earnings from "@/pages/earnings";
import AdminDashboard from "@/pages/admin";
import Help from "@/pages/help";
import Wallet from "@/pages/wallet";
import SavedPlaces from "@/pages/saved-places";
import Referrals from "@/pages/referrals";
import Statistics from "@/pages/statistics";
import RideRequestWaiting from "@/pages/ride-request";
import DriverRequests from "@/pages/driver-requests";
import SafetyCenter from "@/pages/safety-center";
import Terms from "@/pages/terms";
import Privacy from "@/pages/privacy";
import { ErrorBoundary } from "@/components/ErrorBoundary";

import { OnboardingFlow, useOnboarding } from "@/components/OnboardingFlow";

function Router() {
  const { showOnboarding, setShowOnboarding } = useOnboarding();

  return (
    <>
      <OnboardingFlow isOpen={showOnboarding} onComplete={() => setShowOnboarding(false)} />
      <Switch>
        <Route path="/" component={Home} />
        {/* ... existing routes ... */}

        <ProtectedRoute path="/search" component={Search} allowedRoles={['passenger', 'driver']} />
        <ProtectedRoute path="/create-trip" component={CreateTrip} allowedRoles={['driver']} />
        <ProtectedRoute path="/driver-onboarding" component={DriverOnboarding} allowedRoles={['passenger']} />
        <ProtectedRoute path="/track/:id" component={TrackTrip} allowedRoles={['passenger', 'driver', 'admin']} />
        <ProtectedRoute path="/trip/:id" component={TripDetails} allowedRoles={['passenger', 'driver']} />
        <Route path="/login" component={Login} />
        <Route path="/signup" component={Signup} />
        <Route path="/forgot-password" component={ForgotPassword} />
        <Route path="/reset-password" component={ResetPassword} />
        <ProtectedRoute path="/my-trips" component={MyTrips} allowedRoles={['passenger', 'driver']} />
        <ProtectedRoute path="/profile" component={Profile} allowedRoles={['passenger', 'driver']} />
        <ProtectedRoute path="/payment-methods" component={PaymentMethods} allowedRoles={['passenger', 'driver']} />
        <ProtectedRoute path="/payment-history" component={PaymentHistory} allowedRoles={['passenger', 'driver']} />
        <ProtectedRoute path="/earnings" component={Earnings} allowedRoles={['driver']} />
        <ProtectedRoute path="/payment/:bookingId" component={Payment} allowedRoles={['passenger', 'driver']} />
        <ProtectedRoute path="/payment-success" component={PaymentSuccess} allowedRoles={['passenger', 'driver']} />
        <ProtectedRoute path="/admin" component={AdminDashboard} allowedRoles={['admin']} />
        <ProtectedRoute path="/wallet" component={Wallet} allowedRoles={['passenger', 'driver']} />
        <ProtectedRoute path="/saved-places" component={SavedPlaces} allowedRoles={['passenger', 'driver']} />
        <ProtectedRoute path="/referrals" component={Referrals} allowedRoles={['passenger', 'driver']} />
        <ProtectedRoute path="/statistics" component={Statistics} allowedRoles={['passenger', 'driver']} />
        <ProtectedRoute path="/ride-request/:id" component={RideRequestWaiting} allowedRoles={['passenger']} />
        <ProtectedRoute path="/driver-requests" component={DriverRequests} allowedRoles={['driver']} />
        <ProtectedRoute path="/safety-center" component={SafetyCenter} allowedRoles={['passenger', 'driver']} />
        <Route path="/help" component={Help} />
        <Route path="/terms" component={Terms} />
        <Route path="/privacy" component={Privacy} />
        <Route component={NotFound} />
      </Switch>
    </>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <ErrorBoundary>
            <OfflineIndicator />
            <PushNotificationHandler />
            <Toaster />
            <Router />
          </ErrorBoundary>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
