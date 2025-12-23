import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Text } from '@/components/ui/text';
import { Card } from '@/components/ui/card';
import { Ionicons } from '@expo/vector-icons';

interface TripTimelineProps {
    pickup: string;
    drop: string;
    departureTime: string;
    arrivalTime?: string;
}

export function TripTimelineMobile({ pickup, drop, departureTime, arrivalTime }: TripTimelineProps) {
    return (
        <Card className="p-4 mb-4">
            <Text style={styles.sectionTitle}>Trip Journey</Text>
            <View style={styles.timelineContainer}>
                <View style={styles.timelineLine} />

                <View style={styles.timelineItem}>
                    <View style={[styles.timelineDot, { backgroundColor: '#3b82f6' }]} />
                    <View style={styles.timelineContent}>
                        <Text style={styles.timeText}>{new Date(departureTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                        <Text style={styles.locationLabel}>Pickup</Text>
                        <Text style={styles.locationValue}>{pickup}</Text>
                    </View>
                </View>

                <View style={styles.timelineItem}>
                    <View style={[styles.timelineDot, { backgroundColor: '#ef4444' }]} />
                    <View style={styles.timelineContent}>
                        <Text style={styles.timeText}>
                            {arrivalTime
                                ? new Date(arrivalTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                : 'Estimated +2h'}
                        </Text>
                        <Text style={styles.locationLabel}>Drop-off</Text>
                        <Text style={styles.locationValue}>{drop}</Text>
                    </View>
                </View>
            </View>
        </Card>
    );
}

interface DriverVerificationProps {
    rating: number;
    totalTrips: number;
    isVerified: boolean;
}

export function DriverVerificationMobile({ rating, totalTrips, isVerified }: DriverVerificationProps) {
    return (
        <View style={styles.badgeContainer}>
            <View style={[styles.badge, { backgroundColor: '#fef3c7' }]}>
                <Ionicons name="star" size={14} color="#f59e0b" />
                <Text style={[styles.badgeText, { color: '#92400e' }]}>{rating || 'New'}</Text>
            </View>

            {isVerified && (
                <View style={[styles.badge, { backgroundColor: '#d1fae5' }]}>
                    <Ionicons name="checkmark-circle" size={14} color="#059669" />
                    <Text style={[styles.badgeText, { color: '#065f46' }]}>Verified</Text>
                </View>
            )}

            <View style={[styles.badge, { backgroundColor: '#e0f2fe' }]}>
                <Ionicons name="car" size={14} color="#0284c7" />
                <Text style={[styles.badgeText, { color: '#075985' }]}>{totalTrips} trips</Text>
            </View>
        </View>
    );
}

export function SimilarTripsMobile({ trips, onSelect }: { trips: any[], onSelect: (id: string) => void }) {
    if (!trips || trips.length === 0) return null;

    return (
        <View style={styles.similarTripsContainer}>
            <Text style={styles.sectionTitle}>Similar Trips Nearby</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalScroll}>
                {trips.map((trip) => (
                    <TouchableOpacity
                        key={trip.id}
                        onPress={() => onSelect(trip.id)}
                        style={styles.similarTripCard}
                    >
                        <View style={styles.similarTripHeader}>
                            <Text style={styles.similarTripPrice}>₹{trip.price_per_seat}</Text>
                            <View style={styles.similarTripRating}>
                                <Ionicons name="star" size={12} color="#f59e0b" />
                                <Text style={styles.similarTripRatingText}>{trip.driver_rating || '4.5'}</Text>
                            </View>
                        </View>
                        <Text style={styles.similarTripRoute} numberOfLines={1}>
                            {trip.pickup_location.split(',')[0]} → {trip.drop_location.split(',')[0]}
                        </Text>
                        <Text style={styles.similarTripTime}>
                            {new Date(trip.departure_time).toLocaleDateString()}
                        </Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    sectionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#1f2937',
        marginBottom: 16,
    },
    timelineContainer: {
        position: 'relative',
        paddingLeft: 4,
    },
    timelineLine: {
        position: 'absolute',
        left: 7,
        top: 10,
        bottom: 25,
        width: 2,
        backgroundColor: '#e5e7eb',
        borderStyle: 'dashed',
    },
    timelineItem: {
        flexDirection: 'row',
        marginBottom: 20,
    },
    timelineDot: {
        width: 14,
        height: 14,
        borderRadius: 7,
        marginTop: 4,
        zIndex: 1,
    },
    timelineContent: {
        marginLeft: 16,
        flex: 1,
    },
    timeText: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#1f2937',
    },
    locationLabel: {
        fontSize: 12,
        color: '#6b7280',
        marginTop: 2,
    },
    locationValue: {
        fontSize: 14,
        color: '#374151',
        fontWeight: '500',
    },
    badgeContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginTop: 6,
    },
    badge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        gap: 4,
    },
    badgeText: {
        fontSize: 11,
        fontWeight: '600',
    },
    similarTripsContainer: {
        marginTop: 24,
        marginBottom: 24,
    },
    horizontalScroll: {
        paddingRight: 20,
    },
    similarTripCard: {
        width: 200,
        backgroundColor: 'white',
        borderRadius: 12,
        padding: 12,
        marginRight: 12,
        borderWidth: 1,
        borderColor: '#e5e7eb',
        elevation: 2,
        boxShadow: '0px 2px 4px rgba(0,0,0,0.05)',
    },
    similarTripHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    similarTripPrice: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#3b82f6',
    },
    similarTripRating: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    similarTripRatingText: {
        fontSize: 12,
        color: '#6b7280',
        fontWeight: '500',
    },
    similarTripRoute: {
        fontSize: 13,
        fontWeight: '600',
        color: '#1f2937',
        marginBottom: 4,
    },
    similarTripTime: {
        fontSize: 12,
        color: '#9ca3af',
    },
});
