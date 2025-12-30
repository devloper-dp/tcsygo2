import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Linking, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { SafetyCheckIn } from '@/components/SafetyCheckIn';
import { SafetyTipsModal } from '@/components/SafetyTipsModal';
import { RideInsuranceCard } from '@/components/RideInsuranceCard';
import { DriverVerification } from '@/components/DriverVerification';

export default function SafetyCenterScreen() {
    const router = useRouter();
    const { user } = useAuth();
    const [activeTrip, setActiveTrip] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [showTips, setShowTips] = useState(false);
    const [showVerification, setShowVerification] = useState(false);

    useEffect(() => {
        if (user) {
            fetchActiveTrip();
        }
    }, [user]);

    const fetchActiveTrip = async () => {
        try {
            const { data, error } = await supabase
                .from('trips')
                .select('*, driver:drivers(*, user:users(*))')
                .or(`passenger_id.eq.${user?.id},driver_id.eq.${user?.id}`)
                .eq('status', 'ongoing')
                .limit(1)
                .maybeSingle();

            if (!error && data) {
                setActiveTrip(data);
            }
        } catch (error) {
            console.error('Error fetching active trip:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleEmergencyCall = () => {
        Alert.alert(
            "Emergency SOS",
            "Call Police (100)?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Call 100",
                    style: "destructive",
                    onPress: () => Linking.openURL('tel:100')
                }
            ]
        );
    };

    const safetyFeatures = [
        {
            title: 'Trusted Contacts',
            description: 'Share your ride status automatically with family and friends.',
            icon: 'people',
            action: () => router.push('/profile/emergency'),
            status: 'Setup'
        },
        {
            title: 'Safety Tips',
            description: 'Best practices for a safe ride.',
            icon: 'bulb',
            action: () => setShowTips(true),
        },
        {
            title: 'Ride Insurance',
            description: 'Every trip is insured for accidents.',
            icon: 'shield-checkmark',
            action: () => Alert.alert('Insured', 'Every trip on TCSYGO is insured against accidents.'),
        }
    ];

    if (activeTrip && activeTrip.driver) {
        // Create driver object for verification
        var driverForVerification = {
            name: activeTrip.driver.user.fullName,
            photoUrl: activeTrip.driver.user.profilePhoto,
            rating: activeTrip.driver.rating,
            trips: activeTrip.driver.total_trips,
            plateNumber: activeTrip.driver.vehiclePlateNumber,
            vehicleModel: activeTrip.driver.vehicleModel,
            vehicleColor: activeTrip.driver.vehicleColor
        };
    }

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color="#1f2937" />
                </TouchableOpacity>
                <Text variant="h3" style={styles.title}>Safety Center</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                <View style={styles.banner}>
                    <View style={styles.shieldContainer}>
                        <Ionicons name="shield" size={32} color="#3b82f6" />
                    </View>
                    <Text style={styles.bannerTitle}>Your safety is our top priority</Text>
                    <Text style={styles.bannerSubtitle}>Access all safety tools and emergency features here.</Text>
                </View>

                {/* Active Trip Monitoring */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Safety Monitoring</Text>
                    {loading ? (
                        <ActivityIndicator style={{ marginTop: 20 }} color="#3b82f6" />
                    ) : activeTrip ? (
                        <Card style={styles.monitoringCard}>
                            <View style={styles.monitoringHeader}>
                                <View style={styles.liveIndicator}>
                                    <View style={styles.dot} />
                                    <Text style={styles.liveText}>Active Trip Monitored</Text>
                                </View>
                                <Text style={styles.tripId}>ID: {activeTrip.id.substring(0, 8)}</Text>
                            </View>

                            <View style={styles.monitoringActions}>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onPress={() => setShowVerification(true)}
                                    style={{ flex: 1, marginRight: 8 }}
                                >
                                    <Ionicons name="scan-outline" size={18} color="#3b82f6" style={{ marginRight: 4 }} />
                                    <Text style={{ color: '#3b82f6' }}>Verify Driver</Text>
                                </Button>
                                {/* SafetyCheckIn is strictly a floating button in current implementation, 
                                    but we can't easily embed it if it is absolute. 
                                    Let's rely on it being present in the trip screen, 
                                    or reimplement checks here. 
                                    Actually, SafetyCheckIn component creates a floating button. 
                                    Let's check if we can style it to be inline. 
                                    Looking at SafetyCheckIn.tsx, style prop is applied to floatingButton.
                                    We can override position absolute if it has it (it doesn't seem to have absolute by default).
                                */}
                            </View>

                            <SafetyCheckIn
                                tripId={activeTrip.id}
                                style={{ marginTop: 12, backgroundColor: '#eff6ff', borderWidth: 0 }}
                            />
                        </Card>
                    ) : (
                        <Card style={styles.inactiveCard}>
                            <Ionicons name="shield-outline" size={48} color="#9ca3af" />
                            <Text style={styles.inactiveText}>No active trip monitoring</Text>
                            <Text style={styles.inactiveSubtext}>Safety features activate during a ride</Text>
                        </Card>
                    )}
                </View>

                {/* Emergency Section */}
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: '#ef4444' }]}>Emergency</Text>
                    <Card style={styles.emergencyCard}>
                        <TouchableOpacity style={styles.sosButton} onPress={handleEmergencyCall}>
                            <Ionicons name="call" size={24} color="white" />
                            <Text style={styles.sosText}>CALL 100</Text>
                        </TouchableOpacity>
                        <Text style={styles.sosDisclaim}>
                            Only use in case of real emergency. Our team will be notified immediately.
                        </Text>
                    </Card>
                </View>

                {/* Features Grid */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Safety Features</Text>
                    <View style={styles.featuresGrid}>
                        {safetyFeatures.map((feature, index) => (
                            <TouchableOpacity key={index} style={styles.featureItem} onPress={feature.action}>
                                <View style={[styles.featureIcon, feature.title === 'Safety Tips' ? { backgroundColor: '#fef3c7' } : { backgroundColor: '#eff6ff' }]}>
                                    <Ionicons
                                        name={feature.icon as any}
                                        size={24}
                                        color={feature.title === 'Safety Tips' ? '#d97706' : '#3b82f6'}
                                    />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.featureTitle}>{feature.title}</Text>
                                    <Text style={styles.featureDesc}>{feature.description}</Text>
                                </View>
                                <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* Ride Insurance */}
                <View style={styles.section}>
                    <RideInsuranceCard />
                </View>

                <View style={{ height: 40 }} />
            </ScrollView>

            <SafetyTipsModal visible={showTips} onClose={() => setShowTips(false)} />

            {activeTrip && activeTrip.driver && (
                <DriverVerification
                    visible={showVerification}
                    onClose={() => setShowVerification(false)}
                    driver={{
                        name: activeTrip.driver.user.fullName,
                        photoUrl: activeTrip.driver.user.profilePhoto,
                        rating: activeTrip.driver.rating || 'New',
                        trips: activeTrip.driver.total_trips || 0,
                        plateNumber: activeTrip.driver.vehicle_plate_number || activeTrip.driver.license_number, // Fallback
                        vehicleModel: activeTrip.driver.vehicle_model || 'Car',
                        vehicleColor: activeTrip.driver.vehicle_color || 'White'
                    }}
                    onVerified={() => {
                        setShowVerification(false);
                        Alert.alert('Verified', 'Driver verified successfully.');
                    }}
                />
            )}
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
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: 'white',
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
    },
    backBtn: {
        padding: 4,
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1f2937',
    },
    content: {
        flex: 1,
        padding: 16,
    },
    banner: {
        alignItems: 'center',
        marginBottom: 24,
    },
    shieldContainer: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: '#eff6ff',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
        borderWidth: 4,
        borderColor: '#dbeafe',
    },
    bannerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#1f2937',
        textAlign: 'center',
        marginBottom: 8,
    },
    bannerSubtitle: {
        fontSize: 14,
        color: '#6b7280',
        textAlign: 'center',
    },
    section: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#1f2937',
        marginBottom: 12,
    },
    monitoringCard: {
        padding: 16,
        borderWidth: 1,
        borderColor: '#bfdbfe',
        backgroundColor: '#f0f9ff',
    },
    monitoringHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    liveIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#22c55e',
    },
    liveText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#15803d',
    },
    tripId: {
        fontSize: 12,
        color: '#6b7280',
        backgroundColor: 'white',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 10,
        overflow: 'hidden',
    },
    monitoringActions: {
        flexDirection: 'row',
        marginBottom: 8,
    },
    inactiveCard: {
        padding: 24,
        alignItems: 'center',
        borderStyle: 'dashed',
        borderWidth: 2,
        borderColor: '#e5e7eb',
        backgroundColor: 'transparent',
    },
    inactiveText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#9ca3af',
        marginTop: 12,
    },
    inactiveSubtext: {
        fontSize: 12,
        color: '#9ca3af',
        marginTop: 4,
    },
    emergencyCard: {
        padding: 16,
        backgroundColor: '#fef2f2',
        borderWidth: 1,
        borderColor: '#fecaca',
    },
    sosButton: {
        backgroundColor: '#ef4444',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        borderRadius: 12,
        gap: 8,
        marginBottom: 12,
    },
    sosText: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
    },
    sosDisclaim: {
        fontSize: 12,
        color: '#7f1d1d',
        textAlign: 'center',
    },
    featuresGrid: {
        gap: 12,
    },
    featureItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'white',
        padding: 16,
        borderRadius: 16,
        gap: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2,
    },
    featureIcon: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
    },
    featureTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1f2937',
        marginBottom: 4,
    },
    featureDesc: {
        fontSize: 12,
        color: '#6b7280',
        lineHeight: 18,
    },
});
