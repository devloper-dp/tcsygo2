import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function TripsScreen() {
    const router = useRouter();

    // Mock data - would be fetched from API
    const trips = [
        {
            id: '1',
            type: 'upcoming',
            driver: { name: 'John Doe', rating: 4.8 },
            pickup: 'Delhi',
            drop: 'Jaipur',
            date: '2024-01-20',
            time: '10:00 AM',
            price: 500,
            seats: 2,
        },
    ];

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>My Trips</Text>
            </View>

            <View style={styles.tabs}>
                <TouchableOpacity style={[styles.tab, styles.tabActive]}>
                    <Text style={[styles.tabText, styles.tabTextActive]}>Upcoming</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.tab}>
                    <Text style={styles.tabText}>Past</Text>
                </TouchableOpacity>
            </View>

            <ScrollView style={styles.scrollView} contentContainerStyle={styles.tripList}>
                {trips.length === 0 ? (
                    <View style={styles.emptyState}>
                        <Ionicons name="car-outline" size={64} color="#9ca3af" />
                        <Text style={styles.emptyTitle}>No trips yet</Text>
                        <Text style={styles.emptyText}>Book your first ride to get started</Text>
                        <TouchableOpacity
                            style={styles.searchBtn}
                            onPress={() => router.push('/(tabs)')}
                        >
                            <Text style={styles.searchBtnText}>Search Rides</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    trips.map((trip) => (
                        <TouchableOpacity
                            key={trip.id}
                            style={styles.tripCard}
                            onPress={() => router.push(`/trip/${trip.id}`)}
                        >
                            <View style={styles.tripHeader}>
                                <View style={styles.badge}>
                                    <Text style={styles.badgeText}>Upcoming</Text>
                                </View>
                                <Text style={styles.tripDate}>{trip.date}</Text>
                            </View>

                            <View style={styles.routeSection}>
                                <View style={styles.routeItem}>
                                    <Ionicons name="location-outline" size={18} color="#22c55e" />
                                    <Text style={styles.location}>{trip.pickup}</Text>
                                </View>
                                <View style={styles.routeItem}>
                                    <Ionicons name="location-outline" size={18} color="#ef4444" />
                                    <Text style={styles.location}>{trip.drop}</Text>
                                </View>
                            </View>

                            <View style={styles.tripFooter}>
                                <View style={styles.driverInfo}>
                                    <View style={styles.driverAvatar}>
                                        <Text style={styles.avatarText}>
                                            {trip.driver.name.charAt(0)}
                                        </Text>
                                    </View>
                                    <View>
                                        <Text style={styles.driverName}>{trip.driver.name}</Text>
                                        <View style={styles.rating}>
                                            <Ionicons name="star" size={12} color="#f59e0b" />
                                            <Text style={styles.ratingText}>{trip.driver.rating}</Text>
                                        </View>
                                    </View>
                                </View>
                                <View style={styles.priceSection}>
                                    <Text style={styles.price}>₹{trip.price}</Text>
                                    <Text style={styles.seats}>{trip.seats} seats</Text>
                                </View>
                            </View>
                        </TouchableOpacity>
                    ))
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f9fafb',
    },
    header: {
        paddingHorizontal: 20,
        paddingVertical: 16,
        backgroundColor: 'white',
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#1f2937',
    },
    tabs: {
        flexDirection: 'row',
        backgroundColor: 'white',
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
    },
    tab: {
        flex: 1,
        paddingVertical: 12,
        alignItems: 'center',
    },
    tabActive: {
        borderBottomWidth: 2,
        borderBottomColor: '#3b82f6',
    },
    tabText: {
        fontSize: 16,
        color: '#6b7280',
    },
    tabTextActive: {
        color: '#3b82f6',
        fontWeight: '600',
    },
    scrollView: {
        flex: 1,
    },
    tripList: {
        padding: 16,
        gap: 16,
    },
    emptyState: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 60,
    },
    emptyTitle: {
        fontSize: 20,
        fontWeight: '600',
        color: '#1f2937',
        marginTop: 16,
    },
    emptyText: {
        fontSize: 14,
        color: '#6b7280',
        marginTop: 8,
        marginBottom: 24,
    },
    searchBtn: {
        backgroundColor: '#3b82f6',
        borderRadius: 12,
        paddingVertical: 12,
        paddingHorizontal: 24,
    },
    searchBtnText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600',
    },
    tripCard: {
        backgroundColor: 'white',
        borderRadius: 16,
        padding: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 3,
    },
    tripHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    badge: {
        backgroundColor: '#dbeafe',
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 12,
    },
    badgeText: {
        color: '#3b82f6',
        fontSize: 12,
        fontWeight: '600',
    },
    tripDate: {
        fontSize: 14,
        color: '#6b7280',
    },
    routeSection: {
        gap: 8,
        marginBottom: 16,
    },
    routeItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    location: {
        fontSize: 16,
        color: '#1f2937',
        fontWeight: '500',
    },
    tripFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#e5e7eb',
    },
    driverInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    driverAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#3b82f6',
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600',
    },
    driverName: {
        fontSize: 14,
        fontWeight: '600',
        color: '#1f2937',
    },
    rating: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    ratingText: {
        fontSize: 12,
        color: '#6b7280',
    },
    priceSection: {
        alignItems: 'flex-end',
    },
    price: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#3b82f6',
    },
    seats: {
        fontSize: 12,
        color: '#6b7280',
    },
});
