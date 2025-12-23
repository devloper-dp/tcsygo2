import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

export default function MyVehiclesScreen() {
    const router = useRouter();
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [driverProfile, setDriverProfile] = useState<any>(null);

    const [formData, setFormData] = useState({
        vehicleMake: '',
        vehicleModel: '',
        vehicleYear: '',
        vehicleColor: '',
        vehiclePlate: '',
    });

    useEffect(() => {
        if (user) {
            fetchDriverProfile();
        }
    }, [user]);

    const fetchDriverProfile = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('drivers')
                .select('*')
                .eq('userId', user?.id)
                .single();

            if (data) {
                setDriverProfile(data);
                setFormData({
                    vehicleMake: data.vehicleMake || '',
                    vehicleModel: data.vehicleModel || '',
                    vehicleYear: String(data.vehicleYear || ''),
                    vehicleColor: data.vehicleColor || '',
                    vehiclePlate: data.vehiclePlate || '',
                });
            }
        } catch (error) {
            console.error('Error fetching driver profile:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!formData.vehicleMake || !formData.vehicleModel || !formData.vehiclePlate) {
            Alert.alert('Error', 'Please fill in required vehicle details (Make, Model, License Plate)');
            return;
        }

        try {
            setSaving(true);
            const { error } = await supabase
                .from('drivers')
                .update({
                    vehicleMake: formData.vehicleMake,
                    vehicleModel: formData.vehicleModel,
                    vehicleYear: parseInt(formData.vehicleYear) || null,
                    vehicleColor: formData.vehicleColor,
                    vehiclePlate: formData.vehiclePlate,
                })
                .eq('userId', user?.id);

            if (error) throw error;

            Alert.alert('Success', 'Vehicle information updated successfully');
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to update vehicle information');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" color="#3b82f6" />
            </View>
        );
    }

    if (!driverProfile && user?.role === 'passenger') {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={24} color="#1f2937" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>My Vehicles</Text>
                    <View style={{ width: 40 }} />
                </View>
                <View style={[styles.centered, { padding: 40 }]}>
                    <Ionicons name="car-outline" size={80} color="#d1d5db" />
                    <Text style={styles.noDriverTitle}>Not a Driver Yet</Text>
                    <Text style={styles.noDriverText}>
                        You need to register as a driver to manage vehicle information.
                    </Text>
                    <TouchableOpacity
                        style={styles.registerButton}
                        onPress={() => router.push('/become-driver')}
                    >
                        <Text style={styles.registerButtonText}>Become a Driver</Text>
                    </TouchableOpacity>
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
                <Text style={styles.headerTitle}>My Vehicle</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={styles.statusCard}>
                    <View style={styles.statusInfo}>
                        <Text style={styles.statusLabel}>Verification Status</Text>
                        <View style={[
                            styles.badge,
                            driverProfile?.verificationStatus === 'verified' ? styles.badgeSuccess : styles.badgeWarning
                        ]}>
                            <Text style={[
                                styles.badgeText,
                                driverProfile?.verificationStatus === 'verified' ? styles.badgeTextSuccess : styles.badgeTextWarning
                            ]}>
                                {driverProfile?.verificationStatus?.toUpperCase() || 'PENDING'}
                            </Text>
                        </View>
                    </View>
                    <Ionicons
                        name={driverProfile?.verificationStatus === 'verified' ? "shield-checkmark" : "time-outline"}
                        size={32}
                        color={driverProfile?.verificationStatus === 'verified' ? "#22c55e" : "#f59e0b"}
                    />
                </View>

                <View style={styles.form}>
                    <View style={styles.inputRow}>
                        <View style={[styles.inputGroup, { flex: 1 }]}>
                            <Text style={styles.label}>Make</Text>
                            <TextInput
                                style={styles.input}
                                value={formData.vehicleMake}
                                onChangeText={(text) => setFormData({ ...formData, vehicleMake: text })}
                                placeholder="e.g. Toyota"
                            />
                        </View>
                        <View style={[styles.inputGroup, { flex: 1 }]}>
                            <Text style={styles.label}>Model</Text>
                            <TextInput
                                style={styles.input}
                                value={formData.vehicleModel}
                                onChangeText={(text) => setFormData({ ...formData, vehicleModel: text })}
                                placeholder="e.g. Corolla"
                            />
                        </View>
                    </View>

                    <View style={styles.inputRow}>
                        <View style={[styles.inputGroup, { flex: 1 }]}>
                            <Text style={styles.label}>Year</Text>
                            <TextInput
                                style={styles.input}
                                value={formData.vehicleYear}
                                onChangeText={(text) => setFormData({ ...formData, vehicleYear: text })}
                                placeholder="2020"
                                keyboardType="numeric"
                            />
                        </View>
                        <View style={[styles.inputGroup, { flex: 1 }]}>
                            <Text style={styles.label}>Color</Text>
                            <TextInput
                                style={styles.input}
                                value={formData.vehicleColor}
                                onChangeText={(text) => setFormData({ ...formData, vehicleColor: text })}
                                placeholder="White"
                            />
                        </View>
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>License Plate</Text>
                        <TextInput
                            style={styles.input}
                            value={formData.vehiclePlate}
                            onChangeText={(text) => setFormData({ ...formData, vehiclePlate: text })}
                            placeholder="KA-01-AB-1234"
                            autoCapitalize="characters"
                        />
                    </View>

                    <TouchableOpacity
                        style={[styles.saveButton, saving && styles.disabledButton]}
                        onPress={handleSave}
                        disabled={saving}
                    >
                        {saving ? (
                            <ActivityIndicator color="white" />
                        ) : (
                            <Text style={styles.saveButtonText}>Update Vehicle Details</Text>
                        )}
                    </TouchableOpacity>
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
    centered: {
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
    statusCard: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#fff',
        padding: 20,
        borderRadius: 12,
        marginBottom: 24,
        borderWidth: 1,
        borderColor: '#e5e7eb',
    },
    statusInfo: {
        gap: 8,
    },
    statusLabel: {
        fontSize: 14,
        color: '#6b7280',
    },
    badge: {
        alignSelf: 'flex-start',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    badgeSuccess: {
        backgroundColor: '#dcfce7',
    },
    badgeWarning: {
        backgroundColor: '#fef3c7',
    },
    badgeText: {
        fontSize: 12,
        fontWeight: 'bold',
    },
    badgeTextSuccess: {
        color: '#166534',
    },
    badgeTextWarning: {
        color: '#92400e',
    },
    form: {
        gap: 20,
    },
    inputRow: {
        flexDirection: 'row',
        gap: 16,
    },
    inputGroup: {
        gap: 8,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: '#4b5563',
    },
    input: {
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#d1d5db',
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
        color: '#1f2937',
    },
    saveButton: {
        backgroundColor: '#3b82f6',
        padding: 16,
        borderRadius: 8,
        alignItems: 'center',
        marginTop: 10,
    },
    disabledButton: {
        opacity: 0.7,
    },
    saveButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
    noDriverTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#1f2937',
        marginTop: 16,
    },
    noDriverText: {
        fontSize: 16,
        color: '#6b7280',
        textAlign: 'center',
        marginTop: 8,
        marginBottom: 24,
    },
    registerButton: {
        backgroundColor: '#3b82f6',
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 8,
    },
    registerButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
});
