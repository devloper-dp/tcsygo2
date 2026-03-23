import { useState } from 'react';
import { View, ScrollView, RefreshControl, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Text } from '@/components/ui/text';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Ionicons } from '@expo/vector-icons';
import { mapBooking, mapTrip } from '@/lib/mapper';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import { NotificationDropdown } from '@/components/NotificationDropdown';
import { RateDriverModal } from '@/components/RateDriverModal';
import { NoBookingsYet, NoTripsCreated } from '@/components/EmptyStates';
import { useResponsive } from '@/hooks/useResponsive';

export default function MyTripsScreen() {
    const router = useRouter();
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const { hScale, vScale, spacing, fontSize } = useResponsive();
    const [activeTab, setActiveTab] = useState('bookings');
    const [refreshing, setRefreshing] = useState(false);
    const [ratingBooking, setRatingBooking] = useState<any>(null);

    const { data: bookings, isLoading: loadingBookings, refetch: refetchBookings } = useQuery({
        queryKey: ['my-bookings', user?.id],
        queryFn: async () => {
            if (!user) return [];
            const { data, error } = await supabase
                .from('bookings')
                .select('*, trip:trips(*, driver:drivers(*, user:users(*)))')
                .eq('passenger_id', user.id);

            if (error) throw error;
            return (data || []).map(mapBooking);
        },
        enabled: !!user,
    });

    const { data: myTrips, isLoading: loadingTrips, refetch: refetchTrips } = useQuery({
        queryKey: ['my-created-trips', user?.id],
        queryFn: async () => {
            if (!user) return [];
            const { data: driver } = await supabase
                .from('drivers')
                .select('id')
                .eq('user_id', user.id)
                .single();

            if (!driver) return [];

            const { data, error } = await supabase
                .from('trips')
                .select('*, driver:drivers(*, user:users(*))')
                .eq('driver_id', driver.id)
                .order('departure_time', { ascending: false });

            if (error) throw error;
            return (data || []).map(mapTrip);
        },
        enabled: !!user,
    });

    const cancelBookingMutation = useMutation({
        mutationFn: async (bookingId: string) => {
            const booking = bookings?.find((b: any) => b.id === bookingId);
            if (!booking) throw new Error('Booking not found');

            const { error: bookingError } = await supabase
                .from('bookings')
                .update({ status: 'cancelled' })
                .eq('id', bookingId);

            if (bookingError) throw bookingError;

            const { data: trip } = await supabase
                .from('trips')
                .select('available_seats')
                .eq('id', booking.trip.id)
                .single();

            if (trip) {
                await supabase
                    .from('trips')
                    .update({ available_seats: trip.available_seats + booking.seatsBooked })
                    .eq('id', booking.trip.id);
            }
            return true;
        },
        onSuccess: () => {
            Alert.alert('Success', 'Booking cancelled successfully');
            queryClient.invalidateQueries({ queryKey: ['my-bookings'] });
        },
        onError: (error: any) => {
            Alert.alert('Error', error.message || 'Failed to cancel booking');
        }
    });

    const handleCancelBooking = (bookingId: string) => {
        Alert.alert(
            'Cancel Booking',
            'Are you sure you want to cancel this booking? This action cannot be undone.',
            [
                { text: 'No', style: 'cancel' },
                {
                    text: 'Yes, Cancel',
                    style: 'destructive',
                    onPress: () => cancelBookingMutation.mutate(bookingId)
                }
            ]
        );
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await Promise.all([refetchBookings(), refetchTrips()]);
        setRefreshing(false);
    };

    const getStatusColor = (status: string) => {
        const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
            upcoming: 'default',
            ongoing: 'secondary',
            completed: 'outline',
            cancelled: 'destructive',
            confirmed: 'default',
            pending: 'secondary',
            rejected: 'destructive',
        };
        return variants[status] || 'outline';
    };

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: '#f8fafc' }} edges={['top']}>
            <View style={{ paddingHorizontal: spacing.xl, paddingVertical: vScale(16), borderBottomWidth: 1 }} className="flex-row items-center justify-between bg-f8fafc border-border/50">
                <Text style={{ fontSize: fontSize.xxl }} className="font-bold text-text-primary tracking-tight">My Trips</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
                    <Button onPress={() => router.push('/create-trip')} size="sm" style={{ height: vScale(36), paddingHorizontal: hScale(16), borderRadius: hScale(18) }} className="bg-primary-50">
                        <Text style={{ fontSize: fontSize.xs }} className="text-primary-600 font-bold">+ Create</Text>
                    </Button>
                    <NotificationDropdown />
                </View>
            </View>

            <View style={{ flex: 1, paddingHorizontal: spacing.lg, paddingTop: vScale(16) }} className="bg-background">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList style={{ flexDirection: 'row', width: '100%', marginBottom: vScale(24), padding: vScale(6), borderRadius: hScale(16), borderWidth: 1 }} className="bg-surface border-border shadow-soft-sm">
                        <TabsTrigger value="bookings" style={{ borderRadius: hScale(12), paddingVertical: vScale(10) }} className="flex-1 data-[state=active]:bg-primary-50 data-[state=active]:text-primary-700">My Bookings</TabsTrigger>
                        <TabsTrigger value="trips" style={{ borderRadius: hScale(12), paddingVertical: vScale(10) }} className="flex-1 data-[state=active]:bg-primary-50 data-[state=active]:text-primary-700">Created Trips</TabsTrigger>
                    </TabsList>

                    <TabsContent value="bookings" className="flex-1">
                        <ScrollView
                            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                            contentContainerStyle={{ paddingBottom: 100, flexGrow: 1 }}
                            showsVerticalScrollIndicator={false}
                        >
                            {loadingBookings ? (
                                <ActivityIndicator size="large" className="mt-10" color="#2563eb" />
                            ) : bookings && bookings.length > 0 ? (
                                <View style={{ gap: vScale(32) }}>
                                    {/* Active Bookings */}
                                    {bookings.filter((b: any) => ['upcoming', 'ongoing', 'confirmed', 'pending'].includes(b.status)).length > 0 && (
                                        <View>
                                            <Text style={{ fontSize: fontSize.sm, marginBottom: vScale(12), marginLeft: hScale(4) }} className="font-bold text-text-secondary uppercase tracking-widest">Active Rides</Text>
                                            <View style={{ gap: vScale(16) }}>
                                                {bookings
                                                    .filter((b: any) => ['upcoming', 'ongoing', 'confirmed', 'pending'].includes(b.status))
                                                    .map((booking: any) => (
                                                        <BookingCard
                                                            key={booking.id}
                                                            booking={booking}
                                                            onCancel={handleCancelBooking}
                                                            onRate={(b: any) => setRatingBooking(b)}
                                                            getStatusColor={getStatusColor}
                                                        />
                                                    ))}
                                            </View>
                                        </View>
                                    )}

                                    {/* Past Bookings */}
                                    {bookings.filter((b: any) => ['completed', 'cancelled', 'rejected'].includes(b.status)).length > 0 && (
                                        <View>
                                            <Text style={{ fontSize: fontSize.sm, marginBottom: vScale(12), marginLeft: hScale(4) }} className="font-bold text-text-secondary uppercase tracking-widest">Past Rides</Text>
                                            <View style={{ gap: vScale(16) }}>
                                                {bookings
                                                    .filter((b: any) => ['completed', 'cancelled', 'rejected'].includes(b.status))
                                                    .map((booking: any) => (
                                                        <BookingCard
                                                            key={booking.id}
                                                            booking={booking}
                                                            onCancel={handleCancelBooking}
                                                            onRate={(b: any) => setRatingBooking(b)}
                                                            getStatusColor={getStatusColor}
                                                        />
                                                    ))}
                                            </View>
                                        </View>
                                    )}
                                </View>
                            ) : (
                                <NoBookingsYet onCreate={() => router.push('/search')} />
                            )}
                        </ScrollView>
                    </TabsContent>

                    <TabsContent value="trips" className="flex-1">
                        <ScrollView
                            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                            contentContainerStyle={{ paddingBottom: 100, flexGrow: 1 }}
                            showsVerticalScrollIndicator={false}
                        >
                            {loadingTrips ? (
                                <ActivityIndicator size="large" className="mt-10" color="#2563eb" />
                            ) : myTrips && myTrips.length > 0 ? (
                                <View style={{ gap: vScale(16) }}>
                                    {myTrips.map((trip: any) => (
                                        <Card key={trip.id} style={{ borderRadius: hScale(12), padding: spacing.lg, marginBottom: vScale(12), borderWidth: 1 }} className="bg-white shadow-soft border-border">
                                            {/* Header: Status & Price */}
                                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: vScale(16) }}>
                                                <Badge variant={getStatusColor(trip.status)} style={{ borderRadius: hScale(6), paddingHorizontal: hScale(8), paddingVertical: vScale(4) }}>
                                                    <Text style={{ fontSize: hScale(10) }} className="uppercase font-bold tracking-wider">{trip.status}</Text>
                                                </Badge>
                                                <View className="items-end">
                                                    <Text style={{ fontSize: fontSize.lg }} className="font-bold text-primary">₹{trip.pricePerSeat}</Text>
                                                </View>
                                            </View>

                                            {/* Route Info */}
                                            <View style={{ marginBottom: vScale(20), paddingLeft: hScale(4) }}>
                                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: vScale(12) }}>
                                                    <View style={{ width: hScale(8), height: hScale(8), borderRadius: hScale(4) }} className="bg-blue-600 ring-2 ring-blue-100" />
                                                    <Text style={{ fontSize: fontSize.base }} className="font-medium text-text-primary flex-1" numberOfLines={1}>{trip.pickupLocation}</Text>
                                                </View>
                                                <View style={{ left: hScale(3.5), top: vScale(16), height: vScale(24), width: 1 }} className="absolute bg-gray-200" />
                                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
                                                    <View style={{ width: hScale(8), height: hScale(8), borderRadius: hScale(4) }} className="bg-slate-400 ring-2 ring-slate-100" />
                                                    <Text style={{ fontSize: fontSize.base }} className="font-medium text-text-secondary flex-1" numberOfLines={1}>{trip.dropLocation}</Text>
                                                </View>
                                            </View>

                                            {/* Action Row */}
                                            <View style={{ flexDirection: 'row', gap: spacing.md, marginTop: vScale(8) }}>
                                                <Button
                                                    onPress={() => router.push(`/trip/${trip.id}`)}
                                                    size="sm"
                                                    variant="outline"
                                                    style={{ height: vScale(40), borderRadius: hScale(8) }}
                                                    className="flex-1 border-blue-200 bg-blue-50"
                                                >
                                                    <Text style={{ fontSize: fontSize.sm }} className="text-blue-700 font-semibold">View Details</Text>
                                                </Button>
                                                {trip.status === 'ongoing' && (
                                                    <Button
                                                        onPress={() => router.push(`/track/${trip.id}`)}
                                                        size="sm"
                                                        style={{ height: vScale(40), borderRadius: hScale(8) }}
                                                        className="flex-1 bg-green-600 shadow-none"
                                                    >
                                                        <Text style={{ fontSize: fontSize.sm }} className="text-white font-semibold">Track Ride</Text>
                                                    </Button>
                                                )}
                                            </View>
                                        </Card>
                                    ))}
                                </View>
                            ) : (
                                <NoTripsCreated onCreate={() => router.push('/create-trip')} />
                            )}
                        </ScrollView>
                    </TabsContent>
                </Tabs>
            </View>

            {/* Rating Modal */}
            {ratingBooking && (
                <RateDriverModal
                    visible={!!ratingBooking}
                    onClose={() => setRatingBooking(null)}
                    tripId={ratingBooking?.trip?.id}
                    driverId={ratingBooking?.trip?.driver?.userId}
                    driverName={ratingBooking?.trip?.driver?.user?.fullName || 'Unknown Driver'}
                />
            )}
        </SafeAreaView>
    );
}

function BookingCard({ booking, onCancel, onRate, getStatusColor }: any) {
    const router = useRouter();
    const { hScale, vScale, spacing, fontSize } = useResponsive();
    return (
        <Card style={{ padding: spacing.lg, borderRadius: hScale(12), marginBottom: vScale(12), borderWidth: 1 }} className="bg-white shadow-soft border-border">
            {/* Header: Driver & Status */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: vScale(16) }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
                    <Avatar style={{ width: hScale(40), height: hScale(40), borderWidth: 1 }} className="border-gray-100">
                        <AvatarImage src={booking?.trip?.driver?.user?.profilePhoto || undefined} />
                        <AvatarFallback className="bg-blue-50">
                            <Text style={{ fontSize: fontSize.base }} className="text-blue-600 font-bold">{booking?.trip?.driver?.user?.fullName?.charAt(0) || '?'}</Text>
                        </AvatarFallback>
                    </Avatar>
                    <View>
                        <Text style={{ fontSize: fontSize.base }} className="font-semibold text-text-primary">{booking?.trip?.driver?.user?.fullName || 'Unknown Driver'}</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
                            <Ionicons name="star" size={hScale(12)} color="#F59E0B" />
                            <Text style={{ fontSize: fontSize.xs }} className="text-text-secondary font-medium">{booking?.trip?.driver?.rating || '0.0'}</Text>
                        </View>
                    </View>
                </View>
                <Badge variant={getStatusColor(booking.status)} style={{ borderRadius: hScale(6), paddingHorizontal: hScale(8), paddingVertical: vScale(2) }}>
                    <Text style={{ fontSize: hScale(10) }} className="font-bold uppercase tracking-wider">{booking.status}</Text>
                </Badge>
            </View>

            {/* Locations */}
            <View style={{ gap: vScale(12), marginBottom: vScale(16), paddingLeft: hScale(4) }}>
                <View style={{ flexDirection: 'row', gap: spacing.md, alignItems: 'center' }}>
                    <Ionicons name="location" size={hScale(16)} color="#2563EB" />
                    <Text style={{ fontSize: fontSize.sm }} className="font-medium text-text-primary flex-1" numberOfLines={1}>{booking?.trip?.pickupLocation || 'Unknown Location'}</Text>
                </View>
                <View style={{ flexDirection: 'row', gap: spacing.md, alignItems: 'center' }}>
                    <Ionicons name="location-outline" size={hScale(16)} color="#64748B" />
                    <Text style={{ fontSize: fontSize.sm }} className="font-medium text-text-secondary flex-1" numberOfLines={1}>{booking?.trip?.dropLocation || 'Unknown Location'}</Text>
                </View>
            </View>

            {/* Footer Info */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: vScale(12), borderTopWidth: 1, marginBottom: vScale(16) }} className="border-gray-100">
                <View style={{ flexDirection: 'row', gap: spacing.lg }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
                        <Ionicons name="calendar-outline" size={hScale(14)} color="#94A3B8" />
                        <Text style={{ fontSize: fontSize.xs }} className="text-text-secondary font-medium">
                            {booking?.trip?.departureTime ? format(new Date(booking.trip.departureTime), 'MMM dd, hh:mm a') : 'N/A'}
                        </Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
                        <Ionicons name="people-outline" size={hScale(14)} color="#94A3B8" />
                        <Text style={{ fontSize: fontSize.xs }} className="text-text-secondary font-medium">{booking.seatsBooked} seats</Text>
                    </View>
                </View>
                <Text style={{ fontSize: fontSize.lg }} className="font-bold text-primary">₹{booking.totalAmount}</Text>
            </View>

            {/* Action Row */}
            <View style={{ flexDirection: 'row', gap: spacing.xs }}>
                <Button
                    onPress={() => booking?.trip?.id && router.push(`/trip/${booking.trip.id}`)}
                    variant="outline"
                    size="sm"
                    style={{ height: vScale(36), borderRadius: hScale(8), borderWidth: 1 }}
                    className="flex-1 border-gray-200"
                >
                    <Text style={{ fontSize: fontSize.xs }} className="text-text-secondary font-semibold">View</Text>
                </Button>

                {(booking.status === 'confirmed' || booking.status === 'pending') &&
                    booking?.trip?.departureTime && new Date(booking.trip.departureTime) > new Date() && (
                        <Button
                            onPress={() => onCancel(booking.id)}
                            variant="destructive"
                            size="sm"
                            style={{ height: vScale(36), borderRadius: hScale(8), borderWidth: 1 }}
                            className="flex-1 bg-red-50 border-red-100 shadow-none"
                        >
                            <Text style={{ fontSize: fontSize.xs }} className="text-red-600 font-semibold">Cancel</Text>
                        </Button>
                    )}

                {booking.status === 'confirmed' && booking?.trip?.departureTime && new Date(booking.trip.departureTime) < new Date() && (
                    <Button
                        onPress={() => onRate(booking)}
                        variant="secondary"
                        size="sm"
                        style={{ height: vScale(36), borderRadius: hScale(8), borderWidth: 1 }}
                        className="flex-1 bg-amber-50 border-amber-100"
                    >
                        <Text style={{ fontSize: fontSize.xs }} className="text-amber-700 font-semibold">Rate Driver</Text>
                    </Button>
                )}
            </View>
        </Card>
    );
}
