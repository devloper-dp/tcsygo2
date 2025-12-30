import { View, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Text } from '@/components/ui/text';
import { Card } from '@/components/ui/card';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

interface QuickAction {
    id: string;
    title: string;
    description: string;
    icon: keyof typeof Ionicons.glyphMap;
    route: string;
    color: string;
}

// Quick actions configuration
const QUICK_ACTIONS_CONFIG: QuickAction[] = [
    {
        id: 'search',
        title: 'Find a Ride',
        description: 'Search for available trips',
        icon: 'search',
        route: '/search',
        color: '#3b82f6',
    },
    {
        id: 'create',
        title: 'Offer a Ride',
        description: 'Create a new trip',
        icon: 'car',
        route: '/create-trip',
        color: '#10b981',
    },
    {
        id: 'bookings',
        title: 'My Bookings',
        description: 'View your trips',
        icon: 'calendar',
        route: '/bookings',
        color: '#f59e0b',
    },
    {
        id: 'wallet',
        title: 'Wallet',
        description: 'Manage payments',
        icon: 'wallet',
        route: '/wallet',
        color: '#8b5cf6',
    },
];

interface QuickActionsProps {
    onAction?: (action: string, data?: any) => void;
    recentRide?: { destination: string; time: string };
    savedPlaces?: any[];
}

export function QuickActions({ onAction, recentRide, savedPlaces }: QuickActionsProps) {
    const router = useRouter();
    const actions = QUICK_ACTIONS_CONFIG;

    return (
        <View style={styles.container}>
            <Text style={styles.title} className="font-semibold text-gray-900">
                Quick Actions
            </Text>
            <View style={styles.grid}>
                {/* Dynamic Action: Repeat Ride */}
                {recentRide && (
                    <TouchableOpacity
                        style={styles.actionCard}
                        onPress={() => onAction?.('repeat', recentRide)}
                        activeOpacity={0.7}
                    >
                        <View style={[styles.iconContainer, { backgroundColor: '#e0e7ff' }]}>
                            <Ionicons name="reload" size={24} color="#3b82f6" />
                        </View>
                        <Text style={styles.actionTitle} className="font-medium" numberOfLines={1}>
                            Repeat Ride
                        </Text>
                        <Text style={styles.actionDescription} className="text-gray-600" numberOfLines={1}>
                            To {recentRide.destination}
                        </Text>
                    </TouchableOpacity>
                )}

                {actions.map((action) => (
                    <TouchableOpacity
                        key={action.id}
                        style={styles.actionCard}
                        onPress={() => router.push(action.route as any)}
                        activeOpacity={0.7}
                    >
                        <View style={[styles.iconContainer, { backgroundColor: `${action.color}15` }]}>
                            <Ionicons name={action.icon} size={24} color={action.color} />
                        </View>
                        <Text style={styles.actionTitle} className="font-medium">
                            {action.title}
                        </Text>
                        <Text style={styles.actionDescription} className="text-gray-600">
                            {action.description}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>
        </View>
    );
}

interface PopularRoute {
    id: string;
    from: string;
    to: string;
    tripCount: number;
    avgPrice: number;
}

export function PopularRoutesMobile() {
    const router = useRouter();
    const { data: routes, isLoading } = useQuery<PopularRoute[]>({
        queryKey: ['popular-routes-mobile'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('trips')
                .select('pickup_location, drop_location, price_per_seat')
                .eq('status', 'completed')
                .order('created_at', { ascending: false })
                .limit(150);

            if (error) throw error;

            // Aggregate routes
            const routeMap = new Map<string, { from: string; to: string; count: number; totalPrice: number }>();

            data?.forEach((trip: any) => {
                const key = `${trip.pickup_location}|${trip.drop_location}`;
                const existing = routeMap.get(key);
                const price = parseFloat(trip.price_per_seat) || 0;

                if (existing) {
                    existing.count += 1;
                    existing.totalPrice += price;
                } else {
                    routeMap.set(key, {
                        from: trip.pickup_location,
                        to: trip.drop_location,
                        count: 1,
                        totalPrice: price
                    });
                }
            });

            // Convert and calculate average prices
            return Array.from(routeMap.values())
                .map((route, index) => ({
                    id: String(index + 1),
                    from: route.from,
                    to: route.to,
                    tripCount: route.count,
                    avgPrice: Math.round(route.totalPrice / route.count)
                }))
                .sort((a, b) => b.tripCount - a.tripCount)
                .slice(0, 3);
        },
        staleTime: 1000 * 60 * 30, // 30 minutes
    });

    const handleRoutePress = (route: PopularRoute) => {
        router.push({
            pathname: '/search',
            params: {
                pickup: route.from,
                drop: route.to,
            },
        });
    };

    if (isLoading || !routes || routes.length === 0) {
        return null;
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title} className="font-semibold text-gray-900">
                    Popular Routes
                </Text>
                <Ionicons name="trending-up" size={20} color="#3b82f6" />
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.routesScroll}>
                {routes.map((route) => (
                    <TouchableOpacity
                        key={route.id}
                        style={styles.routeCard}
                        onPress={() => handleRoutePress(route)}
                        activeOpacity={0.7}
                    >
                        <View style={styles.routeInfo}>
                            <View style={styles.locationRow}>
                                <Ionicons name="location" size={16} color="#10b981" />
                                <Text style={styles.locationText} className="font-medium">
                                    {route.from}
                                </Text>
                            </View>
                            <Ionicons name="arrow-forward" size={16} color="#9ca3af" style={styles.arrow} />
                            <View style={styles.locationRow}>
                                <Ionicons name="location" size={16} color="#ef4444" />
                                <Text style={styles.locationText} className="font-medium">
                                    {route.to}
                                </Text>
                            </View>
                        </View>
                        <View style={styles.routeStats}>
                            <Text style={styles.tripCount} className="text-gray-600">
                                {route.tripCount} trips
                            </Text>
                            <Text style={styles.price} className="font-semibold text-primary">
                                ₹{route.avgPrice}
                            </Text>
                        </View>
                    </TouchableOpacity>
                ))}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginBottom: 24,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    title: {
        fontSize: 18,
        marginBottom: 16,
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },
    actionCard: {
        width: '48%',
        backgroundColor: '#ffffff',
        borderRadius: 12,
        padding: 16,
        borderWidth: 1,
        borderColor: '#e5e7eb',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    iconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12,
    },
    actionTitle: {
        fontSize: 14,
        marginBottom: 4,
    },
    actionDescription: {
        fontSize: 12,
    },
    routesScroll: {
        marginHorizontal: -16,
        paddingHorizontal: 16,
    },
    routeCard: {
        width: 200,
        backgroundColor: '#ffffff',
        borderRadius: 12,
        padding: 16,
        marginRight: 12,
        borderWidth: 1,
        borderColor: '#e5e7eb',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    routeInfo: {
        marginBottom: 12,
    },
    locationRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 8,
    },
    locationText: {
        fontSize: 14,
        flex: 1,
    },
    arrow: {
        marginLeft: 24,
        marginBottom: 8,
    },
    routeStats: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#f3f4f6',
    },
    tripCount: {
        fontSize: 12,
    },
    price: {
        fontSize: 16,
    },
});
