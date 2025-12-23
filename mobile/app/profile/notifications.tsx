import React, { useState } from 'react';
import { View, Text, StyleSheet, Switch, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function NotificationsScreen() {
    const router = useRouter();
    const [pushEnabled, setPushEnabled] = useState(true);
    const [emailEnabled, setEmailEnabled] = useState(false);
    const [tripUpdates, setTripUpdates] = useState(true);
    const [promotions, setPromotions] = useState(false);

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
                    <Text style={styles.sectionTitle}>Main Settings</Text>
                    <View style={styles.card}>
                        <View style={styles.settingItem}>
                            <View style={styles.settingInfo}>
                                <Text style={styles.settingLabel}>Push Notifications</Text>
                                <Text style={styles.settingDesc}>Receive alerts on your device</Text>
                            </View>
                            <Switch
                                value={pushEnabled}
                                onValueChange={setPushEnabled}
                                trackColor={{ false: '#d1d5db', true: '#93c5fd' }}
                                thumbColor={pushEnabled ? '#3b82f6' : '#f3f4f6'}
                            />
                        </View>
                        <View style={styles.separator} />
                        <View style={styles.settingItem}>
                            <View style={styles.settingInfo}>
                                <Text style={styles.settingLabel}>Email Notifications</Text>
                                <Text style={styles.settingDesc}>Receive updates via email</Text>
                            </View>
                            <Switch
                                value={emailEnabled}
                                onValueChange={setEmailEnabled}
                                trackColor={{ false: '#d1d5db', true: '#93c5fd' }}
                                thumbColor={emailEnabled ? '#3b82f6' : '#f3f4f6'}
                            />
                        </View>
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Notification Content</Text>
                    <View style={styles.card}>
                        <View style={styles.settingItem}>
                            <View style={styles.settingInfo}>
                                <Text style={styles.settingLabel}>Trip Updates</Text>
                                <Text style={styles.settingDesc}>Status changes and driver messages</Text>
                            </View>
                            <Switch
                                value={tripUpdates}
                                onValueChange={setTripUpdates}
                                trackColor={{ false: '#d1d5db', true: '#93c5fd' }}
                                thumbColor={tripUpdates ? '#3b82f6' : '#f3f4f6'}
                            />
                        </View>
                        <View style={styles.separator} />
                        <View style={styles.settingItem}>
                            <View style={styles.settingInfo}>
                                <Text style={styles.settingLabel}>Promotions & Offers</Text>
                                <Text style={styles.settingDesc}>Updates on discounts and new features</Text>
                            </View>
                            <Switch
                                value={promotions}
                                onValueChange={setPromotions}
                                trackColor={{ false: '#d1d5db', true: '#93c5fd' }}
                                thumbColor={promotions ? '#3b82f6' : '#f3f4f6'}
                            />
                        </View>
                    </View>
                </View>
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
