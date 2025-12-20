import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
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
import MyTrips from "@/pages/my-trips";
import Profile from "@/pages/profile";
import Payment from "@/pages/payment";
import PaymentSuccess from "@/pages/payment-success";
import AdminDashboard from "@/pages/admin";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/search" component={Search} />
      <ProtectedRoute path="/create-trip" component={CreateTrip} />
      <ProtectedRoute path="/driver-onboarding" component={DriverOnboarding} />
      <ProtectedRoute path="/track/:id" component={TrackTrip} />
      <ProtectedRoute path="/trip/:id" component={TripDetails} />
      <Route path="/login" component={Login} />
      <Route path="/signup" component={Signup} />
      <ProtectedRoute path="/my-trips" component={MyTrips} />
      <ProtectedRoute path="/profile" component={Profile} />
      <ProtectedRoute path="/payment/:bookingId" component={Payment} />
      <ProtectedRoute path="/payment-success" component={PaymentSuccess} />
      <ProtectedRoute path="/admin" component={AdminDashboard} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
