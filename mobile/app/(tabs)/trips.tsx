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

export default function MyTripsScreen() {
    const router = useRouter();
    const { user } = useAuth();
    const queryClient = useQueryClient();
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
            // 1. Get booking details
            const booking = bookings?.find((b: any) => b.id === bookingId);
            if (!booking) throw new Error('Booking not found');

            // 2. Update booking status
            const { error: bookingError } = await supabase
                .from('bookings')
                .update({ status: 'cancelled' })
                .eq('id', bookingId);

            if (bookingError) throw bookingError;

            // 3. Restore available seats
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
        // Return variant for Badge
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
        <SafeAreaView style={{ flex: 1, backgroundColor: '#f9fafb' }} edges={['top']}>
            <View className="flex-row items-center justify-between px-4 py-3 bg-white border-b border-gray-200">
                <Text variant="h3" className="font-bold">My Trips</Text>
                <View className="flex-row items-center gap-2">
                    <Button onPress={() => router.push('/create-trip')} size="sm" variant="outline">
                        <Text>+ Create</Text>
                    </Button>
                    <NotificationDropdown />
                </View>
            </View>

            <View className="flex-1 p-4">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList className="flex-row w-full mb-4">
                        <TabsTrigger value="bookings" className="flex-1">My Bookings</TabsTrigger>
                        <TabsTrigger value="trips" className="flex-1">My Trips</TabsTrigger>
                    </TabsList>

                    <TabsContent value="bookings" className="flex-1">
                        <ScrollView
                            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                            contentContainerStyle={{ paddingBottom: 20 }}
                        >
                            {loadingBookings ? (
                                <ActivityIndicator size="large" className="mt-10" color="#3b82f6" />
                            ) : bookings && bookings.length > 0 ? (
                                <View className="gap-4">
                                    {bookings.map((booking: any) => (
                                        <Card key={booking.id} className="p-4">
                                            <View className="flex-row justify-between items-start mb-2">
                                                <Badge variant={getStatusColor(booking.status)}>
                                                    <Text>{booking.status}</Text>
                                                </Badge>
                                                <View className="items-end">
                                                    <Text className="font-bold text-lg">₹{booking.totalAmount}</Text>
                                                    <Text className="text-xs text-gray-500">{booking.seatsBooked} seats</Text>
                                                </View>
                                            </View>

                                            <View className="flex-row items-center gap-3 mb-4">
                                                <Avatar className="w-10 h-10">
                                                    <AvatarImage src={booking.trip.driver.user.profilePhoto || undefined} />
                                                    <AvatarFallback>{booking.trip.driver.user.fullName.charAt(0)}</AvatarFallback>
                                                </Avatar>
                                                <View>
                                                    <Text className="font-semibold">{booking.trip.driver.user.fullName}</Text>
                                                    <View className="flex-row items-center">
                                                        <Ionicons name="star" size={12} color="#eab308" />
                                                        <Text className="text-xs ml-1">{booking.trip.driver.rating}</Text>
                                                    </View>
                                                </View>
                                            </View>

                                            <View className="gap-2 mb-4">
                                                <View className="flex-row gap-2 items-center">
                                                    <Ionicons name="location" size={16} color="green" />
                                                    <Text className="text-sm flex-1" numberOfLines={1}>{booking.trip.pickupLocation}</Text>
                                                </View>
                                                <View className="flex-row gap-2 items-center">
                                                    <Ionicons name="location" size={16} color="red" />
                                                    <Text className="text-sm flex-1" numberOfLines={1}>{booking.trip.dropLocation}</Text>
                                                </View>
                                                <View className="flex-row gap-2 items-center">
                                                    <Ionicons name="calendar" size={16} color="gray" />
                                                    <Text className="text-sm text-gray-500">{format(new Date(booking.trip.departureTime), 'MMM dd, hh:mm a')}</Text>
                                                </View>
                                            </View>

                                            <View className="gap-2">
                                                <Button onPress={() => router.push(`/trip/${booking.trip.id}`)} variant="outline">
                                                    <Text>View Trip</Text>
                                                </Button>

                                                {/* Rate Driver button for completed trips */}
                                                {booking.status === 'confirmed' && new Date(booking.trip.departureTime) < new Date() && (
                                                    <Button onPress={() => setRatingBooking(booking)} variant="secondary">
                                                        <Text>Rate Driver</Text>
                                                    </Button>
                                                )}

                                                {/* Cancel button for pending/confirmed bookings */}
                                                {(booking.status === 'confirmed' || booking.status === 'pending') &&
                                                    new Date(booking.trip.departureTime) > new Date() && (
                                                        <Button
                                                            onPress={() => handleCancelBooking(booking.id)}
                                                            variant="destructive"
                                                            disabled={cancelBookingMutation.isPending}
                                                        >
                                                            <Text>Cancel Booking</Text>
                                                        </Button>
                                                    )}
                                            </View>
                                        </Card>
                                    ))}
                                </View>
                            ) : (
                                <View className="items-center py-10">
                                    <Text className="text-gray-500 mb-4">No bookings found</Text>
                                    <Button onPress={() => router.push('/search')}>
                                        <Text>Find a Ride</Text>
                                    </Button>
                                </View>
                            )}
                        </ScrollView>
                    </TabsContent>

                    <TabsContent value="trips" className="flex-1">
                        <ScrollView
                            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                            contentContainerStyle={{ paddingBottom: 20 }}
                        >
                            {loadingTrips ? (
                                <ActivityIndicator size="large" className="mt-10" color="#3b82f6" />
                            ) : myTrips && myTrips.length > 0 ? (
                                <View className="gap-4">
                                    {myTrips.map((trip: any) => (
                                        <Card key={trip.id} className="p-4">
                                            <View className="flex-row justify-between items-start mb-2">
                                                <Badge variant={getStatusColor(trip.status)}>
                                                    <Text>{trip.status}</Text>
                                                </Badge>
                                                <View className="items-end">
                                                    <Text className="font-bold text-lg">₹{trip.pricePerSeat}</Text>
                                                    <Text className="text-xs text-gray-500">per seat</Text>
                                                </View>
                                            </View>

                                            <View className="gap-2 mb-4">
                                                <View className="flex-row gap-2 items-center">
                                                    <Ionicons name="location" size={16} color="green" />
                                                    <Text className="text-sm flex-1" numberOfLines={1}>{trip.pickupLocation}</Text>
                                                </View>
                                                <View className="flex-row gap-2 items-center">
                                                    <Ionicons name="location" size={16} color="red" />
                                                    <Text className="text-sm flex-1" numberOfLines={1}>{trip.dropLocation}</Text>
                                                </View>
                                            </View>

                                            <View className="flex-row gap-2">
                                                <Button className="flex-1" variant="outline" onPress={() => router.push(`/trip/${trip.id}`)}>
                                                    <Text>View Details</Text>
                                                </Button>
                                                {trip.status === 'ongoing' && (
                                                    <Button className="flex-1" onPress={() => router.push(`/track/${trip.id}`)}>
                                                        <Text>Track Live</Text>
                                                    </Button>
                                                )}
                                            </View>
                                        </Card>
                                    ))}
                                </View>
                            ) : (
                                <View className="items-center py-10">
                                    <Text className="text-gray-500 mb-4">No trips posted yet</Text>
                                    <Button onPress={() => router.push('/create-trip')}>
                                        <Text>Create a Trip</Text>
                                    </Button>
                                </View>
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
                    tripId={ratingBooking.trip.id}
                    driverId={ratingBooking.trip.driver.userId}
                    driverName={ratingBooking.trip.driver.user.fullName}
                />
            )}
        </SafeAreaView>
    );
}
