import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';

const BookingDetailsScreen = () => {
    const router = useRouter();
    const { id } = useLocalSearchParams();

    const { data: booking, isLoading, isError, error } = useQuery({
        queryKey: ['booking', id],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('bookings')
                .select(`
                    *,
                    trip:trips(*, driver:users(*))
                `)
                .eq('id', id)
                .single();
            if (error) throw error;
            return data;
        },
    });

    if (isLoading) {
        return (
            <View style={styles.loading}>
                <Text>Loading booking details...</Text>
            </View>
        );
    }

    if (isError || !booking) {
        return (
            <View style={styles.errorContainer}>
                <Ionicons name="alert-circle" size={48} color="#ef4444" />
                <Text style={styles.errorTitle}>Oops! Something went wrong</Text>
                <Text style={styles.errorText}>
                    {error instanceof Error ? error.message : "Failed to load booking details. Please check your connection."}
                </Text>
                <TouchableOpacity
                    style={styles.retryBtn}
                    onPress={() => router.back()}
                >
                    <Text style={styles.retryBtnText}>Go Back</Text>
                </TouchableOpacity>
            </View>
        );
    }

    const { trip } = booking;

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={24} color="#1f2937" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Booking Confirmed</Text>
                <View style={{ width: 24 }} />
            </View>

            <ScrollView style={styles.scrollView}>
                <View style={styles.successCard}>
                    <View style={styles.successIcon}>
                        <Ionicons name="checkmark-circle" size={64} color="#22c55e" />
                    </View>
                    <Text style={styles.successTitle}>Booking Successful!</Text>
                    <Text style={styles.successSubtitle}>Your seat is reserved. Get ready for your trip!</Text>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Trip Summary</Text>
                    <View style={styles.infoCard}>
                        <View style={styles.routeRow}>
                            <View style={styles.dot} />
                            <Text style={styles.locationText}>{trip.pickup_location}</Text>
                        </View>
                        <View style={styles.line} />
                        <View style={styles.routeRow}>
                            <View style={[styles.dot, { backgroundColor: '#ef4444' }]} />
                            <Text style={styles.locationText}>{trip.drop_location}</Text>
                        </View>

                        <View style={styles.divider} />

                        <View style={styles.bookingDetails}>
                            <View style={styles.detailRow}>
                                <Text style={styles.detailLabel}>Date & Time</Text>
                                <Text style={styles.detailValue}>
                                    {new Date(trip.departure_time).toLocaleString()}
                                </Text>
                            </View>
                            <View style={styles.detailRow}>
                                <Text style={styles.detailLabel}>Seats Booked</Text>
                                <Text style={styles.detailValue}>{booking.seats_booked} seats</Text>
                            </View>
                            <View style={styles.detailRow}>
                                <Text style={styles.detailLabel}>Amount Paid</Text>
                                <Text style={styles.detailValue}>₹{booking.total_amount}</Text>
                            </View>
                        </View>
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Driver Information</Text>
                    <View style={styles.driverCard}>
                        <View style={styles.avatar}>
                            <Text style={styles.avatarText}>{trip.driver?.full_name?.charAt(0)}</Text>
                        </View>
                        <View style={styles.driverInfo}>
                            <Text style={styles.driverName}>{trip.driver?.full_name}</Text>
                            <Text style={styles.driverSubtext}>Contact information will be shared shortly</Text>
                        </View>
                    </View>
                </View>

                <TouchableOpacity
                    style={[styles.homeBtn, { backgroundColor: '#22c55e', marginBottom: 12 }]}
                    onPress={() => router.push(`/track/${trip.id}` as any)}
                >
                    <Text style={styles.homeBtnText}>Track Trip & SOS</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.homeBtn}
                    onPress={() => router.replace('/(tabs)/trips' as any)}
                >
                    <Text style={styles.homeBtnText}>Go to My Trips</Text>
                </TouchableOpacity>
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'white',
    },
    loading: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
        backgroundColor: 'white',
    },
    errorTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#1f2937',
        marginTop: 16,
        marginBottom: 8,
    },
    errorText: {
        fontSize: 16,
        color: '#6b7280',
        textAlign: 'center',
        marginBottom: 24,
    },
    retryBtn: {
        backgroundColor: '#3b82f6',
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 8,
    },
    retryBtnText: {
        color: 'white',
        fontWeight: '600',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#f3f4f6',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1f2937',
    },
    scrollView: {
        flex: 1,
        padding: 20,
    },
    successCard: {
        alignItems: 'center',
        marginVertical: 32,
    },
    successIcon: {
        marginBottom: 16,
    },
    successTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#1f2937',
        marginBottom: 8,
    },
    successSubtitle: {
        fontSize: 16,
        color: '#6b7280',
        textAlign: 'center',
        paddingHorizontal: 20,
    },
    section: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#374151',
        marginBottom: 12,
    },
    infoCard: {
        backgroundColor: '#f9fafb',
        borderRadius: 16,
        padding: 20,
        borderWidth: 1,
        borderColor: '#f3f4f6',
    },
    routeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    dot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: '#22c55e',
    },
    line: {
        width: 1,
        height: 20,
        backgroundColor: '#e5e7eb',
        marginLeft: 4,
        marginVertical: 4,
    },
    locationText: {
        fontSize: 16,
        color: '#1f2937',
        fontWeight: '500',
    },
    divider: {
        height: 1,
        backgroundColor: '#e5e7eb',
        marginVertical: 16,
    },
    bookingDetails: {
        gap: 12,
    },
    detailRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    detailLabel: {
        fontSize: 14,
        color: '#6b7280',
    },
    detailValue: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#1f2937',
    },
    driverCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f9fafb',
        borderRadius: 16,
        padding: 16,
        gap: 16,
        borderWidth: 1,
        borderColor: '#f3f4f6',
    },
    avatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: '#3b82f6',
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarText: {
        color: 'white',
        fontSize: 20,
        fontWeight: 'bold',
    },
    driverInfo: {
        flex: 1,
    },
    driverName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#1f2937',
    },
    driverSubtext: {
        fontSize: 12,
        color: '#6b7280',
        marginTop: 2,
    },
    homeBtn: {
        backgroundColor: '#3b82f6',
        height: 52,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 12,
        marginBottom: 40,
    },
    homeBtnText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
});

export default BookingDetailsScreen;
