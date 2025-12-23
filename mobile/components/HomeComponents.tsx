import { View, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Text } from '@/components/ui/text';
import { Card } from '@/components/ui/card';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

interface QuickAction {
    id: string;
    title: string;
    description: string;
    icon: keyof typeof Ionicons.glyphMap;
    route: string;
    color: string;
}

export function QuickActions() {
    const router = useRouter();

    const actions: QuickAction[] = [
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

    return (
        <View style={styles.container}>
            <Text style={styles.title} className="font-semibold text-gray-900">
                Quick Actions
            </Text>
            <View style={styles.grid}>
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

    const routes: PopularRoute[] = [
        {
            id: '1',
            from: 'Whitefield',
            to: 'Koramangala',
            tripCount: 45,
            avgPrice: 150,
        },
        {
            id: '2',
            from: 'Electronic City',
            to: 'MG Road',
            tripCount: 38,
            avgPrice: 200,
        },
        {
            id: '3',
            from: 'Hebbal',
            to: 'Indiranagar',
            tripCount: 32,
            avgPrice: 120,
        },
    ];

    const handleRoutePress = (route: PopularRoute) => {
        router.push({
            pathname: '/search',
            params: {
                pickup: route.from,
                drop: route.to,
            },
        });
    };

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
