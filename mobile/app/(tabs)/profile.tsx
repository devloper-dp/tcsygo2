import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function ProfileScreen() {
    const router = useRouter();

    // Mock user data
    const user = {
        name: 'Guest User',
        email: 'guest@tcsygo.com',
        phone: '+91 98765 43210',
        rating: 4.8,
        trips: 12,
    };

    const menuItems = [
        { icon: 'person-outline', label: 'Edit Profile', route: '/profile/edit' },
        { icon: 'car-outline', label: 'My Vehicles', route: '/profile/vehicles' },
        { icon: 'wallet-outline', label: 'Payment Methods', route: '/profile/payment' },
        { icon: 'notifications-outline', label: 'Notifications', route: '/profile/notifications' },
        { icon: 'help-circle-outline', label: 'Help & Support', route: '/profile/help' },
        { icon: 'settings-outline', label: 'Settings', route: '/profile/settings' },
    ];

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView>
                <View style={styles.header}>
                    <View style={styles.profileSection}>
                        <View style={styles.avatar}>
                            <Text style={styles.avatarText}>{user.name.charAt(0)}</Text>
                        </View>
                        <View style={styles.userInfo}>
                            <Text style={styles.userName}>{user.name}</Text>
                            <Text style={styles.userEmail}>{user.email}</Text>
                            <View style={styles.rating}>
                                <Ionicons name="star" size={16} color="#f59e0b" />
                                <Text style={styles.ratingText}>{user.rating}</Text>
                                <Text style={styles.tripCount}>• {user.trips} trips</Text>
                            </View>
                        </View>
                    </View>
                </View>

                <View style={styles.statsSection}>
                    <View style={styles.statCard}>
                        <Ionicons name="car-outline" size={24} color="#3b82f6" />
                        <Text style={styles.statValue}>{user.trips}</Text>
                        <Text style={styles.statLabel}>Total Trips</Text>
                    </View>
                    <View style={styles.statCard}>
                        <Ionicons name="star-outline" size={24} color="#f59e0b" />
                        <Text style={styles.statValue}>{user.rating}</Text>
                        <Text style={styles.statLabel}>Rating</Text>
                    </View>
                    <View style={styles.statCard}>
                        <Ionicons name="cash-outline" size={24} color="#22c55e" />
                        <Text style={styles.statValue}>₹0</Text>
                        <Text style={styles.statLabel}>Saved</Text>
                    </View>
                </View>

                <View style={styles.menuSection}>
                    {menuItems.map((item, index) => (
                        <TouchableOpacity
                            key={index}
                            style={styles.menuItem}
                            onPress={() => {
                                // router.push(item.route);
                            }}
                        >
                            <View style={styles.menuItemLeft}>
                                <Ionicons name={item.icon as any} size={24} color="#6b7280" />
                                <Text style={styles.menuItemText}>{item.label}</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
                        </TouchableOpacity>
                    ))}
                </View>

                <TouchableOpacity style={styles.logoutBtn}>
                    <Ionicons name="log-out-outline" size={20} color="#ef4444" />
                    <Text style={styles.logoutText}>Logout</Text>
                </TouchableOpacity>

                <Text style={styles.version}>Version 1.0.0</Text>
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
        backgroundColor: 'white',
        paddingBottom: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
    },
    profileSection: {
        flexDirection: 'row',
        padding: 20,
        alignItems: 'center',
    },
    avatar: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#3b82f6',
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarText: {
        color: 'white',
        fontSize: 32,
        fontWeight: 'bold',
    },
    userInfo: {
        flex: 1,
        marginLeft: 16,
    },
    userName: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#1f2937',
        marginBottom: 4,
    },
    userEmail: {
        fontSize: 14,
        color: '#6b7280',
        marginBottom: 8,
    },
    rating: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    ratingText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#1f2937',
    },
    tripCount: {
        fontSize: 14,
        color: '#6b7280',
        marginLeft: 4,
    },
    statsSection: {
        flexDirection: 'row',
        padding: 16,
        gap: 12,
    },
    statCard: {
        flex: 1,
        backgroundColor: 'white',
        borderRadius: 12,
        padding: 16,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    statValue: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#1f2937',
        marginTop: 8,
    },
    statLabel: {
        fontSize: 12,
        color: '#6b7280',
        marginTop: 4,
    },
    menuSection: {
        backgroundColor: 'white',
        marginTop: 16,
        borderTopWidth: 1,
        borderBottomWidth: 1,
        borderColor: '#e5e7eb',
    },
    menuItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#f3f4f6',
    },
    menuItemLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    menuItemText: {
        fontSize: 16,
        color: '#1f2937',
    },
    logoutBtn: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 8,
        margin: 20,
        padding: 16,
        backgroundColor: 'white',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#fecaca',
    },
    logoutText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#ef4444',
    },
    version: {
        textAlign: 'center',
        fontSize: 12,
        color: '#9ca3af',
        marginBottom: 20,
    },
});
