import { useState } from 'react';
import { useLocation } from 'wouter';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  ArrowLeft,
  Users,
  Car,
  MapPin,
  DollarSign,
  TrendingUp,
  Check,
  X,
  Search,
  Shield,
  AlertTriangle
} from 'lucide-react';
import { NotificationDropdown } from '@/components/NotificationDropdown';
import { Driver, User, TripWithDriver, BookingWithDetails, Payment, SOSAlert } from '@shared/schema';
import { supabase } from '@/lib/supabase';
import { mapDriver, mapTrip, mapBooking, mapPayment, mapSOSAlert } from '@/lib/mapper';

export default function AdminDashboard() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');

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

  const { data: pendingDrivers } = useQuery<(Driver & { user: User })[]>({
    queryKey: ['admin-drivers-pending'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('drivers')
        .select('*, user:users(*)')
        .eq('verification_status', 'pending');

      if (error) throw error;
      return (data || []).map(mapDriver) as (Driver & { user: User })[];
    }
  });

  const { data: allTrips } = useQuery<TripWithDriver[]>({
    queryKey: ['admin-trips'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('trips')
        .select('*, driver:drivers(*, user:users(*))')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []).map(mapTrip);
    }
  });

  const { data: allBookings } = useQuery<BookingWithDetails[]>({
    queryKey: ['admin-bookings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bookings')
        .select('*, trip:trips(*, driver:drivers(*, user:users(*))), passenger:users(*)')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []).map(mapBooking);
    }
  });

  const { data: allPayments } = useQuery<Payment[]>({
    queryKey: ['admin-payments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []).map(mapPayment);
    }
  });

  const { data: allAlerts } = useQuery<(SOSAlert & { user: User })[]>({
    queryKey: ['admin-sos'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('emergency_alerts')
        .select('*, user:users(*)')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []).map(mapSOSAlert);
    }
  });

  const verifyDriverMutation = useMutation({
    mutationFn: async ({ driverId, status }: { driverId: string; status: 'verified' | 'rejected' }) => {
      const { error } = await supabase
        .from('drivers')
        .update({ verification_status: status })
        .eq('id', driverId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-drivers-pending'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
    }
  });

  const filteredTrips = allTrips?.filter(trip =>
    searchTerm ? (
      trip.pickupLocation.toLowerCase().includes(searchTerm.toLowerCase()) ||
      trip.dropLocation.toLowerCase().includes(searchTerm.toLowerCase()) ||
      trip.driver.user.fullName.toLowerCase().includes(searchTerm.toLowerCase())
    ) : true
  );

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/')} data-testid="button-back">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-xl font-display font-bold">Admin Dashboard</h1>
          </div>

          <Badge variant="outline" className="gap-1">
            <Shield className="w-3 h-3" />
            Admin Access
          </Badge>
          <div className="ml-4">
            <NotificationDropdown />
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-2">
              <Users className="w-8 h-8 text-primary" />
            </div>
            <div className="text-3xl font-bold" data-testid="stat-users">
              {stats?.totalUsers || 0}
            </div>
            <div className="text-sm text-muted-foreground">Total Users</div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between mb-2">
              <Car className="w-8 h-8 text-success" />
            </div>
            <div className="text-3xl font-bold" data-testid="stat-drivers">
              {stats?.totalDrivers || 0}
            </div>
            <div className="text-sm text-muted-foreground">Active Drivers</div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between mb-2">
              <MapPin className="w-8 h-8 text-warning" />
            </div>
            <div className="text-3xl font-bold" data-testid="stat-trips">
              {stats?.totalTrips || 0}
            </div>
            <div className="text-sm text-muted-foreground">Total Trips</div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between mb-2">
              <DollarSign className="w-8 h-8 text-chart-1" />
            </div>
            <div className="text-3xl font-bold" data-testid="stat-revenue">
              ₹{stats?.totalRevenue.toFixed(2) || '0.00'}
            </div>
            <div className="text-sm text-muted-foreground">Total Revenue</div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between mb-2">
              <TrendingUp className="w-8 h-8 text-destructive" />
            </div>
            <div className="text-3xl font-bold" data-testid="stat-pending">
              {stats?.pendingVerifications || 0}
            </div>
            <div className="text-sm text-muted-foreground">Pending Verifications</div>
          </Card>
        </div>

        <Tabs defaultValue="verifications" className="space-y-6">
          <TabsList>
            <TabsTrigger value="verifications" data-testid="tab-verifications">
              Driver Verifications
            </TabsTrigger>
            <TabsTrigger value="trips" data-testid="tab-trips">Trips</TabsTrigger>
            <TabsTrigger value="bookings" data-testid="tab-bookings">Bookings</TabsTrigger>
            <TabsTrigger value="payments" data-testid="tab-payments">Payments</TabsTrigger>
            <TabsTrigger value="alerts" data-testid="tab-alerts" className="text-destructive data-[state=active]:text-destructive">
              SOS Alerts
            </TabsTrigger>
          </TabsList>

          <TabsContent value="verifications">
            <Card>
              <div className="p-6 border-b">
                <h2 className="text-lg font-semibold">Pending Driver Verifications</h2>
              </div>
              <div className="p-6">
                {pendingDrivers && pendingDrivers.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Driver</TableHead>
                        <TableHead>License</TableHead>
                        <TableHead>Vehicle</TableHead>
                        <TableHead>Applied</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pendingDrivers.map((driver) => (
                        <TableRow key={driver.id} data-testid={`driver-row-${driver.id}`}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar className="w-10 h-10">
                                <AvatarImage src={driver.user.profilePhoto || undefined} />
                                <AvatarFallback>{driver.user.fullName.charAt(0)}</AvatarFallback>
                              </Avatar>
                              <div>
                                <div className="font-medium">{driver.user.fullName}</div>
                                <div className="text-sm text-muted-foreground">{driver.user.email}</div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>{driver.licenseNumber}</TableCell>
                          <TableCell>
                            {driver.vehicleMake} {driver.vehicleModel} ({driver.vehicleYear})
                          </TableCell>
                          <TableCell>{new Date(driver.createdAt).toLocaleDateString()}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                className="gap-1"
                                data-testid={`button-approve-${driver.id}`}
                                onClick={() => verifyDriverMutation.mutate({ driverId: driver.id, status: 'verified' })}
                                disabled={verifyDriverMutation.isPending}
                              >
                                <Check className="w-3 h-3" />
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="gap-1 text-destructive"
                                data-testid={`button-reject-${driver.id}`}
                                onClick={() => verifyDriverMutation.mutate({ driverId: driver.id, status: 'rejected' })}
                                disabled={verifyDriverMutation.isPending}
                              >
                                <X className="w-3 h-3" />
                                Reject
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-12">
                    <Car className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No pending verifications</p>
                  </div>
                )}
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="trips">
            <Card>
              <div className="p-6 border-b flex items-center justify-between">
                <h2 className="text-lg font-semibold">All Trips</h2>
                <div className="relative w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search trips..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                    data-testid="input-search-trips"
                  />
                </div>
              </div>
              <div className="p-6">
                {filteredTrips && filteredTrips.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Driver</TableHead>
                        <TableHead>Route</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Seats</TableHead>
                        <TableHead>Price</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredTrips.slice(0, 10).map((trip) => (
                        <TableRow key={trip.id}>
                          <TableCell>{trip.driver.user.fullName}</TableCell>
                          <TableCell>
                            <div className="text-sm">
                              <div className="font-medium">{trip.pickupLocation}</div>
                              <div className="text-muted-foreground">→ {trip.dropLocation}</div>
                            </div>
                          </TableCell>
                          <TableCell>{new Date(trip.departureTime).toLocaleDateString()}</TableCell>
                          <TableCell>{trip.availableSeats}/{trip.totalSeats}</TableCell>
                          <TableCell>₹{trip.pricePerSeat}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="capitalize">{trip.status}</Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-12">
                    <MapPin className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No trips found</p>
                  </div>
                )}
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="bookings">
            <Card>
              <div className="p-6 border-b">
                <h2 className="text-lg font-semibold">Recent Bookings</h2>
              </div>
              <div className="p-6">
                {allBookings && allBookings.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Passenger</TableHead>
                        <TableHead>Trip</TableHead>
                        <TableHead>Seats</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {allBookings.slice(0, 10).map((booking) => (
                        <TableRow key={booking.id}>
                          <TableCell>{booking.passenger.fullName}</TableCell>
                          <TableCell>
                            <div className="text-sm max-w-xs truncate">
                              {booking.trip.pickupLocation} → {booking.trip.dropLocation}
                            </div>
                          </TableCell>
                          <TableCell>{booking.seatsBooked}</TableCell>
                          <TableCell>₹{booking.totalAmount}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="capitalize">{booking.status}</Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-12">
                    <Users className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No bookings found</p>
                  </div>
                )}
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="payments">
            <Card>
              <div className="p-6 border-b">
                <h2 className="text-lg font-semibold">Payment Transactions</h2>
              </div>
              <div className="p-6">
                {allPayments && allPayments.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Transaction ID</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Platform Fee</TableHead>
                        <TableHead>Driver Earnings</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {allPayments.slice(0, 10).map((payment) => (
                        <TableRow key={payment.id}>
                          <TableCell className="font-mono text-xs">{payment.id.slice(0, 8)}...</TableCell>
                          <TableCell>₹{payment.amount}</TableCell>
                          <TableCell>₹{payment.platformFee}</TableCell>
                          <TableCell>₹{payment.driverEarnings}</TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={
                                payment.status === 'success'
                                  ? 'bg-success/10 text-success'
                                  : payment.status === 'pending'
                                    ? 'bg-warning/10 text-warning'
                                    : 'bg-destructive/10 text-destructive'
                              }
                            >
                              {payment.status}
                            </Badge>
                          </TableCell>
                          <TableCell>{new Date(payment.createdAt).toLocaleDateString()}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-12">
                    <DollarSign className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No payments found</p>
                  </div>
                )}
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="alerts">
            <Card>
              <div className="p-6 border-b">
                <h2 className="text-lg font-semibold text-destructive flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5" />
                  Emergency Alerts
                </h2>
              </div>
              <div className="p-6">
                {allAlerts && allAlerts.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Time</TableHead>
                        <TableHead>Reporter</TableHead>
                        <TableHead>Location</TableHead>
                        <TableHead>Trip ID</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {allAlerts.map((alert) => (
                        <TableRow key={alert.id} className="bg-destructive/5">
                          <TableCell>{new Date(alert.createdAt).toLocaleString()}</TableCell>
                          <TableCell>
                            <div className="font-medium">{alert.user?.fullName || 'Unknown'}</div>
                            <div className="text-xs text-muted-foreground">{alert.user?.phone || '-'}</div>
                          </TableCell>
                          <TableCell>
                            <a
                              href={`https://www.google.com/maps?q=${alert.lat},${alert.lng}`}
                              target="_blank"
                              className="text-primary hover:underline flex items-center gap-1"
                            >
                              <MapPin className="w-3 h-3" />
                              Map
                            </a>
                          </TableCell>
                          <TableCell className="font-mono text-xs">{alert.tripId.slice(0, 8)}...</TableCell>
                          <TableCell>
                            <Badge variant={alert.status === 'triggered' ? 'destructive' : 'outline'}>
                              {alert.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button size="sm" variant="outline" onClick={() => navigate(`/track/${alert.tripId}`)}>
                              Track Trip
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-12">
                    <Shield className="w-16 h-16 text-muted-foreground/50 mx-auto mb-4" />
                    <p className="text-muted-foreground">No active SOS alerts</p>
                  </div>
                )}
              </div>
            </Card>
          </TabsContent>

        </Tabs>
      </div>
    </div>
  );
}
