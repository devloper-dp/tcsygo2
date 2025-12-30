import { useState } from 'react';
import { View, ScrollView, RefreshControl, ActivityIndicator, Alert, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Text } from '@/components/ui/text';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
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
} from 'lucide-react-native';
import { NotificationDropdown } from '@/components/NotificationDropdown';
import { mapDriver, mapTrip, mapBooking, mapPayment, mapEmergencyAlert } from '@/lib/mapper';

export default function AdminDashboard() {
    const router = useRouter();
    const queryClient = useQueryClient();
    const [refreshing, setRefreshing] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    const { data: stats, refetch: refetchStats } = useQuery({
        queryKey: ['admin-stats'],
        queryFn: async () => {
            const { count: totalUsers } = await supabase.from('users').select('*', { count: 'exact', head: true });
            const { count: totalDrivers } = await supabase.from('drivers').select('*', { count: 'exact', head: true });
            const { count: totalTrips } = await supabase.from('trips').select('*', { count: 'exact', head: true });
            const { count: pendingVerifications } = await supabase.from('drivers').select('*', { count: 'exact', head: true }).eq('verification_status', 'pending');

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

    const { data: pendingDrivers, refetch: refetchDrivers } = useQuery({
        queryKey: ['admin-drivers-pending'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('drivers')
                .select('*, user:users(*)')
                .eq('verification_status', 'pending');

            if (error) throw error;
            return (data || []).map(mapDriver);
        }
    });

    const { data: allTrips, refetch: refetchTrips } = useQuery({
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

    const { data: allBookings, refetch: refetchBookings } = useQuery({
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

    const { data: allPayments, refetch: refetchPayments } = useQuery({
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

    const { data: allAlerts, refetch: refetchAlerts } = useQuery({
        queryKey: ['admin-sos'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('emergency_alerts')
                .select('*, user:users(*)')
                .order('created_at', { ascending: false });

            if (error) throw error;
            return (data || []).map(mapEmergencyAlert);
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
            Alert.alert("Success", "Driver verification updated");
            queryClient.invalidateQueries({ queryKey: ['admin-drivers-pending'] });
            queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
        },
        onError: (e) => {
            Alert.alert("Error", e.message);
        }
    });

    const onRefresh = async () => {
        setRefreshing(true);
        await Promise.all([
            refetchStats(), refetchDrivers(), refetchTrips(), refetchBookings(), refetchPayments(), refetchAlerts()
        ]);
        setRefreshing(false);
    };

    const filteredTrips = allTrips?.filter((trip: any) =>
        searchTerm ? (
            trip.pickupLocation.toLowerCase().includes(searchTerm.toLowerCase()) ||
            trip.dropLocation.toLowerCase().includes(searchTerm.toLowerCase()) ||
            trip.driver.user.fullName.toLowerCase().includes(searchTerm.toLowerCase())
        ) : true
    );

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: '#f9fafb' }}>
            {/* Header */}
            <View className="flex-row items-center justify-between px-4 py-3 bg-white border-b border-gray-200">
                <View className="flex-row items-center gap-2">
                    <Button variant="ghost" size="icon" onPress={() => router.back()}>
                        <ArrowLeft size={20} color="#000" />
                    </Button>
                    <Text variant="h3" className="font-bold">Admin</Text>
                </View>

                <View className="flex-row items-center gap-2">
                    <Badge variant="outline" className="flex-row items-center gap-1">
                        <Shield size={12} color="#000" />
                        <Text className="text-xs">Access</Text>
                    </Badge>
                    <NotificationDropdown />
                </View>
            </View>

            <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
                <View className="p-4 gap-4">
                    {/* Stats Grid */}
                    <View className="flex-row flex-wrap gap-2">
                        <Card className="flex-1 min-w-[45%] p-4">
                            <View className="flex-row justify-between mb-2">
                                <Users size={24} color="#3b82f6" />
                            </View>
                            <Text variant="h2" className="font-bold">{stats?.totalUsers || 0}</Text>
                            <Text className="text-sm text-gray-500">Users</Text>
                        </Card>
                        <Card className="flex-1 min-w-[45%] p-4">
                            <View className="flex-row justify-between mb-2">
                                <Car size={24} color="#22c55e" />
                            </View>
                            <Text variant="h2" className="font-bold">{stats?.totalDrivers || 0}</Text>
                            <Text className="text-sm text-gray-500">Drivers</Text>
                        </Card>
                        <Card className="flex-1 min-w-[45%] p-4">
                            <View className="flex-row justify-between mb-2">
                                <MapPin size={24} color="#eab308" />
                            </View>
                            <Text variant="h2" className="font-bold">{stats?.totalTrips || 0}</Text>
                            <Text className="text-sm text-gray-500">Trips</Text>
                        </Card>
                        <Card className="flex-1 min-w-[45%] p-4">
                            <View className="flex-row justify-between mb-2">
                                <DollarSign size={24} color="#a855f7" />
                            </View>
                            <Text variant="h2" className="font-bold">₹{stats?.totalRevenue.toFixed(0) || '0'}</Text>
                            <Text className="text-sm text-gray-500">Revenue</Text>
                        </Card>
                        <Card className="w-full p-4">
                            <View className="flex-row justify-between mb-2">
                                <TrendingUp size={24} color="#ef4444" />
                            </View>
                            <Text variant="h2" className="font-bold">{stats?.pendingVerifications || 0}</Text>
                            <Text className="text-sm text-gray-500">Pending Verifications</Text>
                        </Card>
                    </View>

                    {/* Tabs */}
                    <Tabs defaultValue="verifications" className="w-full">
                        <TabsList className="mb-4 flex-wrap h-auto py-2">
                            <TabsTrigger value="verifications" className="flex-grow">Verifications</TabsTrigger>
                            <TabsTrigger value="trips" className="flex-grow">Trips</TabsTrigger>
                            <TabsTrigger value="bookings" className="flex-grow">Bookings</TabsTrigger>
                            <TabsTrigger value="payments" className="flex-grow">Payments</TabsTrigger>
                            <TabsTrigger value="alerts" className="flex-grow text-red-500">Alerts</TabsTrigger>
                        </TabsList>

                        <TabsContent value="verifications">
                            <Card className="p-0 overflow-hidden">
                                <View className="p-4 border-b border-gray-100">
                                    <Text className="font-semibold text-lg">Pending Driver Verifications</Text>
                                </View>
                                {pendingDrivers && pendingDrivers.length > 0 ? (
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead className="w-[200px]"><Text>Driver</Text></TableHead>
                                                <TableHead className="w-[150px]"><Text>License</Text></TableHead>
                                                <TableHead className="w-[200px]"><Text>Vehicle</Text></TableHead>
                                                <TableHead className="w-[100px]"><Text>Date</Text></TableHead>
                                                <TableHead className="w-[150px]"><Text>Actions</Text></TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {pendingDrivers.map((driver: any) => (
                                                <TableRow key={driver.id}>
                                                    <TableCell className="w-[200px]">
                                                        <View className="flex-row items-center gap-2">
                                                            <Avatar className="w-8 h-8">
                                                                <AvatarImage src={driver.user.profilePhoto || undefined} />
                                                                <AvatarFallback>{driver.user.fullName.charAt(0)}</AvatarFallback>
                                                            </Avatar>
                                                            <View>
                                                                <Text className="font-medium">{driver.user.fullName}</Text>
                                                                <Text className="text-xs text-gray-500">{driver.user.email}</Text>
                                                            </View>
                                                        </View>
                                                    </TableCell>
                                                    <TableCell className="w-[150px]">
                                                        <Text>{driver.licenseNumber}</Text>
                                                    </TableCell>
                                                    <TableCell className="w-[200px]">
                                                        <Text>{driver.vehicleMake} {driver.vehicleModel}</Text>
                                                    </TableCell>
                                                    <TableCell className="w-[100px]">
                                                        <Text>{new Date(driver.createdAt).toLocaleDateString()}</Text>
                                                    </TableCell>
                                                    <TableCell className="w-[150px]">
                                                        <View className="flex-row gap-2">
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                className="h-8 w-8 p-0"
                                                                onPress={() => verifyDriverMutation.mutate({ driverId: driver.id, status: 'verified' })}
                                                            >
                                                                <Check size={14} color="green" />
                                                            </Button>
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                className="h-8 w-8 p-0"
                                                                onPress={() => verifyDriverMutation.mutate({ driverId: driver.id, status: 'rejected' })}
                                                            >
                                                                <X size={14} color="red" />
                                                            </Button>
                                                        </View>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                ) : (
                                    <View className="p-8 items-center">
                                        <Car size={32} color="#9ca3af" />
                                        <Text className="text-gray-500 mt-2">No pending verifications</Text>
                                    </View>
                                )}
                            </Card>
                        </TabsContent>

                        <TabsContent value="trips">
                            <Card className="p-0 overflow-hidden">
                                <View className="p-4 border-b border-gray-100 flex-row items-center gap-2">
                                    <Search size={16} color="#9ca3af" />
                                    <Input
                                        placeholder="Search trips..."
                                        value={searchTerm}
                                        onChangeText={setSearchTerm}
                                        className="h-9 flex-1"
                                    />
                                </View>
                                {filteredTrips && filteredTrips.length > 0 ? (
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead className="w-[150px]"><Text>Driver</Text></TableHead>
                                                <TableHead className="w-[200px]"><Text>Route</Text></TableHead>
                                                <TableHead className="w-[100px]"><Text>Date</Text></TableHead>
                                                <TableHead className="w-[80px]"><Text>Seats</Text></TableHead>
                                                <TableHead className="w-[100px]"><Text>Price</Text></TableHead>
                                                <TableHead className="w-[100px]"><Text>Status</Text></TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {filteredTrips.slice(0, 10).map((trip: any) => (
                                                <TableRow key={trip.id}>
                                                    <TableCell className="w-[150px]">
                                                        <Text numberOfLines={1}>{trip.driver.user.fullName}</Text>
                                                    </TableCell>
                                                    <TableCell className="w-[200px]">
                                                        <View>
                                                            <Text className="font-medium" numberOfLines={1}>{trip.pickupLocation}</Text>
                                                            <Text className="text-xs text-gray-500" numberOfLines={1}>{trip.dropLocation}</Text>
                                                        </View>
                                                    </TableCell>
                                                    <TableCell className="w-[100px]">
                                                        <Text>{new Date(trip.departureTime).toLocaleDateString()}</Text>
                                                    </TableCell>
                                                    <TableCell className="w-[80px]">
                                                        <Text>{trip.availableSeats}/{trip.totalSeats}</Text>
                                                    </TableCell>
                                                    <TableCell className="w-[100px]">
                                                        <Text>₹{trip.pricePerSeat}</Text>
                                                    </TableCell>
                                                    <TableCell className="w-[100px]">
                                                        <Badge variant="outline"><Text className="capitalize text-xs">{trip.status}</Text></Badge>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                ) : (
                                    <View className="p-8 items-center">
                                        <MapPin size={32} color="#9ca3af" />
                                        <Text className="text-gray-500 mt-2">No trips found</Text>
                                    </View>
                                )}
                            </Card>
                        </TabsContent>

                        <TabsContent value="bookings">
                            <Card className="p-0 overflow-hidden">
                                <View className="p-4 border-b border-gray-100">
                                    <Text className="font-semibold text-lg">Recent Bookings</Text>
                                </View>
                                {allBookings && allBookings.length > 0 ? (
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead className="w-[150px]"><Text>Passenger</Text></TableHead>
                                                <TableHead className="w-[200px]"><Text>Trip</Text></TableHead>
                                                <TableHead className="w-[80px]"><Text>Seats</Text></TableHead>
                                                <TableHead className="w-[100px]"><Text>Amount</Text></TableHead>
                                                <TableHead className="w-[100px]"><Text>Status</Text></TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {allBookings.slice(0, 10).map((booking: any) => (
                                                <TableRow key={booking.id}>
                                                    <TableCell className="w-[150px]">
                                                        <Text numberOfLines={1}>{booking.passenger.fullName}</Text>
                                                    </TableCell>
                                                    <TableCell className="w-[200px]">
                                                        <Text numberOfLines={1}>{booking.trip.pickupLocation}</Text>
                                                    </TableCell>
                                                    <TableCell className="w-[80px]">
                                                        <Text>{booking.seatsBooked}</Text>
                                                    </TableCell>
                                                    <TableCell className="w-[100px]">
                                                        <Text>₹{booking.totalAmount}</Text>
                                                    </TableCell>
                                                    <TableCell className="w-[100px]">
                                                        <Badge variant="outline"><Text className="capitalize text-xs">{booking.status}</Text></Badge>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                ) : (
                                    <View className="p-8 items-center">
                                        <Users size={32} color="#9ca3af" />
                                        <Text className="text-gray-500 mt-2">No bookings found</Text>
                                    </View>
                                )}
                            </Card>
                        </TabsContent>

                        <TabsContent value="payments">
                            <Card className="p-0 overflow-hidden">
                                <View className="p-4 border-b border-gray-100">
                                    <Text className="font-semibold text-lg">Payments</Text>
                                </View>
                                {allPayments && allPayments.length > 0 ? (
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead className="w-[100px]"><Text>ID</Text></TableHead>
                                                <TableHead className="w-[100px]"><Text>Amount</Text></TableHead>
                                                <TableHead className="w-[100px]"><Text>Fee</Text></TableHead>
                                                <TableHead className="w-[100px]"><Text>Earnings</Text></TableHead>
                                                <TableHead className="w-[100px]"><Text>Status</Text></TableHead>
                                                <TableHead className="w-[100px]"><Text>Date</Text></TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {allPayments.slice(0, 10).map((payment: any) => (
                                                <TableRow key={payment.id}>
                                                    <TableCell className="w-[100px]"><Text className="text-xs" numberOfLines={1}>{payment.id.slice(0, 8)}</Text></TableCell>
                                                    <TableCell className="w-[100px]"><Text>₹{payment.amount}</Text></TableCell>
                                                    <TableCell className="w-[100px]"><Text>₹{payment.platformFee}</Text></TableCell>
                                                    <TableCell className="w-[100px]"><Text>₹{payment.driverEarnings}</Text></TableCell>
                                                    <TableCell className="w-[100px]">
                                                        <Badge variant="outline"><Text className="text-xs">{payment.status}</Text></Badge>
                                                    </TableCell>
                                                    <TableCell className="w-[100px]"><Text className="text-xs">{new Date(payment.createdAt).toLocaleDateString()}</Text></TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                ) : (
                                    <View className="p-8 items-center">
                                        <DollarSign size={32} color="#9ca3af" />
                                        <Text className="text-gray-500 mt-2">No payments found</Text>
                                    </View>
                                )}
                            </Card>
                        </TabsContent>

                        <TabsContent value="alerts">
                            <Card className="p-0 overflow-hidden">
                                <View className="p-4 border-b border-gray-100">
                                    <Text className="font-semibold text-lg text-red-500">SOS Alerts</Text>
                                </View>
                                {allAlerts && allAlerts.length > 0 ? (
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead className="w-[150px]"><Text>Time</Text></TableHead>
                                                <TableHead className="w-[150px]"><Text>Reporter</Text></TableHead>
                                                <TableHead className="w-[100px]"><Text>Status</Text></TableHead>
                                                <TableHead className="w-[150px]"><Text>Action</Text></TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {allAlerts.map((alert: any) => (
                                                <TableRow key={alert.id}>
                                                    <TableCell className="w-[150px]"><Text>{new Date(alert.createdAt).toLocaleString()}</Text></TableCell>
                                                    <TableCell className="w-[150px]">
                                                        <View>
                                                            <Text>{alert.user?.fullName || 'Unknown'}</Text>
                                                            <Text className="text-xs text-gray-500">{alert.user?.phone}</Text>
                                                        </View>
                                                    </TableCell>
                                                    <TableCell className="w-[100px]">
                                                        <Badge variant="destructive"><Text className="text-xs text-white">{alert.status}</Text></Badge>
                                                    </TableCell>
                                                    <TableCell className="w-[150px]">
                                                        <Button size="sm" variant="outline" onPress={() => router.push(`/track/${alert.tripId}`)}>
                                                            <Text>Track</Text>
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                ) : (
                                    <View className="p-8 items-center">
                                        <Shield size={32} color="#9ca3af" />
                                        <Text className="text-gray-500 mt-2">No active SOS alerts</Text>
                                    </View>
                                )}
                            </Card>
                        </TabsContent>
                    </Tabs>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}
