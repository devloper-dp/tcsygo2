
import { useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import {
  ArrowLeft,
  Users,
  Car,
  MapPin,
  DollarSign,
  TrendingUp,
  Shield,
  Ticket
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

// Helper Components
import { UsersTab } from './admin/components/UsersTab';
import { PromoCodesTab } from './admin/components/PromoCodesTab';
import { DriversTab } from './admin/components/DriversTab';
import { TripsTab } from './admin/components/TripsTab';
import { BookingsTab } from './admin/components/BookingsTab';
import { PaymentsTab } from './admin/components/PaymentsTab';
import { AlertsTab } from './admin/components/AlertsTab';
import { SupportTab } from './admin/components/SupportTab';
import { SettingsTab } from './admin/components/SettingsTab';

export default function AdminDashboard() {
  const [, navigate] = useLocation();
  const { user } = useAuth();

  // Access Control: Only admins can view this page
  if (!user || user.role !== 'admin') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <Card className="max-w-md w-full p-8 text-center">
          <Shield className="w-12 h-12 text-destructive mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
          <p className="text-muted-foreground mb-6">You do not have administrative privileges to access this dashboard.</p>
          <Button onClick={() => navigate('/')} className="w-full">
            Return Home
          </Button>
        </Card>
      </div>
    );
  }

  const { data: stats } = useQuery<{
    totalUsers: number;
    totalDrivers: number;
    totalTrips: number;
    totalRevenue: number;
    pendingVerifications: number;
  }>({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      const { count: totalUsers } = await supabase.from('users').select('*', { count: 'exact', head: true });
      const { count: totalDrivers } = await supabase.from('drivers').select('*', { count: 'exact', head: true });
      const { count: totalTrips } = await supabase.from('trips').select('*', { count: 'exact', head: true });
      const { count: pendingVerifications } = await supabase.from('drivers').select('*', { count: 'exact', head: true }).eq('verification_status', 'pending');

      // Revenue (simplified, calculating on client)
      const { data: payments } = await supabase.from('payments').select('amount').eq('status', 'success');
      const totalRevenue = payments?.reduce((sum, p) => sum + parseFloat(p.amount), 0) || 0;

      return {
        totalUsers: totalUsers || 0,
        totalDrivers: totalDrivers || 0,
        totalTrips: totalTrips || 0,
        totalRevenue,
        pendingVerifications: pendingVerifications || 0
      };
    }
  });

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-display font-bold text-primary">TCSYGO Admin</h1>
          </div>

          <div className="flex items-center gap-4">
            <Badge variant="outline" className="gap-1 hidden md:flex">
              <Shield className="w-3 h-3" />
              Admin Access
            </Badge>
            <Button
              variant="destructive"
              size="sm"
              onClick={async () => {
                await supabase.auth.signOut();
                window.location.href = '/login'; // Force reload/redirect to clear state
              }}
            >
              Log Out
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          <Card className="p-6 relative overflow-hidden border-none shadow-lg bg-gradient-to-br from-primary/10 via-primary/5 to-background hover:shadow-xl transition-all duration-300">
            <div className="flex items-center justify-between mb-2 relative z-10">
              <Users className="w-8 h-8 text-primary" />
            </div>
            <div className="text-3xl font-bold relative z-10" data-testid="stat-users">
              {stats?.totalUsers || 0}
            </div>
            <div className="text-sm text-muted-foreground relative z-10">Total Users</div>
            <div className="absolute right-0 bottom-0 opacity-10 transform translate-y-1/4 translate-x-1/4">
              <Users className="w-32 h-32" />
            </div>
          </Card>

          <Card className="p-6 relative overflow-hidden border-none shadow-lg bg-gradient-to-br from-green-500/10 via-green-500/5 to-background hover:shadow-xl transition-all duration-300">
            <div className="flex items-center justify-between mb-2 relative z-10">
              <Car className="w-8 h-8 text-green-600" />
            </div>
            <div className="text-3xl font-bold relative z-10" data-testid="stat-drivers">
              {stats?.totalDrivers || 0}
            </div>
            <div className="text-sm text-muted-foreground relative z-10">Active Drivers</div>
            <div className="absolute right-0 bottom-0 opacity-10 transform translate-y-1/4 translate-x-1/4">
              <Car className="w-32 h-32" />
            </div>
          </Card>

          <Card className="p-6 relative overflow-hidden border-none shadow-lg bg-gradient-to-br from-orange-500/10 via-orange-500/5 to-background hover:shadow-xl transition-all duration-300">
            <div className="flex items-center justify-between mb-2 relative z-10">
              <MapPin className="w-8 h-8 text-orange-600" />
            </div>
            <div className="text-3xl font-bold relative z-10" data-testid="stat-trips">
              {stats?.totalTrips || 0}
            </div>
            <div className="text-sm text-muted-foreground relative z-10">Total Trips</div>
            <div className="absolute right-0 bottom-0 opacity-10 transform translate-y-1/4 translate-x-1/4">
              <MapPin className="w-32 h-32" />
            </div>
          </Card>

          <Card className="p-6 relative overflow-hidden border-none shadow-lg bg-gradient-to-br from-blue-500/10 via-blue-500/5 to-background hover:shadow-xl transition-all duration-300">
            <div className="flex items-center justify-between mb-2 relative z-10">
              <DollarSign className="w-8 h-8 text-blue-600" />
            </div>
            <div className="text-3xl font-bold relative z-10" data-testid="stat-revenue">
              ₹{stats?.totalRevenue.toFixed(2) || '0.00'}
            </div>
            <div className="text-sm text-muted-foreground relative z-10">Total Revenue</div>
            <div className="absolute right-0 bottom-0 opacity-10 transform translate-y-1/4 translate-x-1/4">
              <DollarSign className="w-32 h-32" />
            </div>
          </Card>

          <Card className="p-6 relative overflow-hidden border-none shadow-lg bg-gradient-to-br from-red-500/10 via-red-500/5 to-background hover:shadow-xl transition-all duration-300">
            <div className="flex items-center justify-between mb-2 relative z-10">
              <TrendingUp className="w-8 h-8 text-red-600" />
            </div>
            <div className="text-3xl font-bold relative z-10" data-testid="stat-pending">
              {stats?.pendingVerifications || 0}
            </div>
            <div className="text-sm text-muted-foreground relative z-10">Pending Verifications</div>
            <div className="absolute right-0 bottom-0 opacity-10 transform translate-y-1/4 translate-x-1/4">
              <Shield className="w-32 h-32" />
            </div>
          </Card>
        </div>

        <Tabs defaultValue="verifications" className="space-y-6">
          <TabsList className="flex flex-wrap h-auto gap-2 bg-transparent justify-start p-0">
            {/* Styling TabsList to support many tabs wrapping */}
            <TabsTrigger value="verifications" data-testid="tab-verifications">
              Drivers
            </TabsTrigger>
            <TabsTrigger value="users" data-testid="tab-users">
              Users
            </TabsTrigger>
            <TabsTrigger value="trips" data-testid="tab-trips">Trips</TabsTrigger>
            <TabsTrigger value="bookings" data-testid="tab-bookings">Bookings</TabsTrigger>
            <TabsTrigger value="payments" data-testid="tab-payments">Payments</TabsTrigger>
            <TabsTrigger value="promocodes" data-testid="tab-promocodes">
              Promo Codes
            </TabsTrigger>
            <TabsTrigger value="alerts" data-testid="tab-alerts" className="text-destructive data-[state=active]:text-destructive">
              SOS Alerts
            </TabsTrigger>
            <TabsTrigger value="support" data-testid="tab-support">
              Support
            </TabsTrigger>
            <TabsTrigger value="settings" data-testid="tab-settings">
              Settings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="verifications">
            <DriversTab />
          </TabsContent>

          <TabsContent value="users">
            <UsersTab />
          </TabsContent>

          <TabsContent value="trips">
            <TripsTab />
          </TabsContent>

          <TabsContent value="bookings">
            <BookingsTab />
          </TabsContent>

          <TabsContent value="payments">
            <PaymentsTab />
          </TabsContent>

          <TabsContent value="promocodes">
            <PromoCodesTab />
          </TabsContent>

          <TabsContent value="alerts">
            <AlertsTab />
          </TabsContent>

          <TabsContent value="support">
            <SupportTab />
          </TabsContent>

          <TabsContent value="settings">
            <SettingsTab />
          </TabsContent>

        </Tabs>
      </div>
    </div >
  );
}
