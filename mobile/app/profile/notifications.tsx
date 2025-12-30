import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Switch, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import { saveNotificationPreferences, getNotificationPreferences } from '@/lib/notifications';

export default function NotificationsScreen() {
    const router = useRouter();
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [preferences, setPreferences] = useState({
        messages: true,
        trips: true,
        bookings: true,
        payments: true,
        marketing: false,
    });

    useEffect(() => {
        if (user) {
            setLoading(true);
            getNotificationPreferences(user.id).then(prefs => {
                if (prefs) {
                    setPreferences(prefs);
                }
                setLoading(false);
            }).catch(() => setLoading(false));
        }
    }, [user]);

    const togglePreference = async (key: keyof typeof preferences) => {
        if (!user) return;

        const newPrefs = { ...preferences, [key]: !preferences[key] };
        setPreferences(newPrefs);

        try {
            await saveNotificationPreferences(user.id, newPrefs);
        } catch (error) {
            Alert.alert('Error', 'Failed to save preferences');
            // Revert on error
            setPreferences(preferences);
        }
    };

    if (loading) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.loading}>
                    <ActivityIndicator size="large" color="#3b82f6" />
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#1f2937" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Notifications</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Push Notifications</Text>
                    <View style={styles.card}>
                        <View style={styles.settingItem}>
                            <View style={styles.settingInfo}>
                                <Text style={styles.settingLabel}>Trip Updates</Text>
                                <Text style={styles.settingDesc}>Receive alerts when your trip status changes</Text>
                            </View>
                            <Switch
                                value={preferences.trips}
                                onValueChange={() => togglePreference('trips')}
                                trackColor={{ false: '#d1d5db', true: '#93c5fd' }}
                                thumbColor={preferences.trips ? '#3b82f6' : '#f3f4f6'}
                            />
                        </View>
                        <View style={styles.separator} />
                        <View style={styles.settingItem}>
                            <View style={styles.settingInfo}>
                                <Text style={styles.settingLabel}>Booking Requests</Text>
                                <Text style={styles.settingDesc}>Get notified about new booking requests</Text>
                            </View>
                            <Switch
                                value={preferences.bookings}
                                onValueChange={() => togglePreference('bookings')}
                                trackColor={{ false: '#d1d5db', true: '#93c5fd' }}
                                thumbColor={preferences.bookings ? '#3b82f6' : '#f3f4f6'}
                            />
                        </View>
                        <View style={styles.separator} />
                        <View style={styles.settingItem}>
                            <View style={styles.settingInfo}>
                                <Text style={styles.settingLabel}>Messages</Text>
                                <Text style={styles.settingDesc}>New message alerts from drivers or passengers</Text>
                            </View>
                            <Switch
                                value={preferences.messages}
                                onValueChange={() => togglePreference('messages')}
                                trackColor={{ false: '#d1d5db', true: '#93c5fd' }}
                                thumbColor={preferences.messages ? '#3b82f6' : '#f3f4f6'}
                            />
                        </View>
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Transactional</Text>
                    <View style={styles.card}>
                        <View style={styles.settingItem}>
                            <View style={styles.settingInfo}>
                                <Text style={styles.settingLabel}>Payments & Earnings</Text>
                                <Text style={styles.settingDesc}>Confirmations for successful payments</Text>
                            </View>
                            <Switch
                                value={preferences.payments}
                                onValueChange={() => togglePreference('payments')}
                                trackColor={{ false: '#d1d5db', true: '#93c5fd' }}
                                thumbColor={preferences.payments ? '#3b82f6' : '#f3f4f6'}
                            />
                        </View>
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Marketing</Text>
                    <View style={styles.card}>
                        <View style={styles.settingItem}>
                            <View style={styles.settingInfo}>
                                <Text style={styles.settingLabel}>Promotions & Offers</Text>
                                <Text style={styles.settingDesc}>Updates on discounts and new features</Text>
                            </View>
                            <Switch
                                value={preferences.marketing}
                                onValueChange={() => togglePreference('marketing')}
                                trackColor={{ false: '#d1d5db', true: '#93c5fd' }}
                                thumbColor={preferences.marketing ? '#3b82f6' : '#f3f4f6'}
                            />
                        </View>
                    </View>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

// Add loading style to existing styles
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f9fafb',
    },
    loading: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#f3f4f6',
    },
    backButton: {
        padding: 4,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1f2937',
    },
    scrollContent: {
        padding: 20,
    },
    section: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#6b7280',
        textTransform: 'uppercase',
        marginBottom: 8,
        marginLeft: 4,
    },
    card: {
        backgroundColor: '#fff',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#e5e7eb',
        overflow: 'hidden',
    },
    settingItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
    },
    settingInfo: {
        flex: 1,
        paddingRight: 16,
    },
    settingLabel: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1f2937',
    },
    settingDesc: {
        fontSize: 14,
        color: '#6b7280',
        marginTop: 2,
    },
    separator: {
        height: 1,
        backgroundColor: '#f3f4f6',
        marginHorizontal: 16,
    },
});
