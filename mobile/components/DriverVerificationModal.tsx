import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Image, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { SafetyService } from '@/services/SafetyService';

interface DriverVerificationModalProps {
    visible: boolean;
    onClose: () => void;
    bookingId: string;
    driver: {
        id: string;
        name: string;
        photo?: string;
        vehicle_make: string;
        vehicle_model: string;
        vehicle_plate: string;
    };
    onVerified: () => void;
}

export function DriverVerificationModal({ visible, onClose, bookingId, driver, onVerified }: DriverVerificationModalProps) {
    const [photoMatch, setPhotoMatch] = useState<boolean | null>(null);
    const [vehicleMatch, setVehicleMatch] = useState<boolean | null>(null);
    const [plateMatch, setPlateMatch] = useState<boolean | null>(null);
    const [loading, setLoading] = useState(false);

    const handleVerify = async () => {
        if (photoMatch === null || vehicleMatch === null || plateMatch === null) return;

        setLoading(true);
        try {
            await SafetyService.verifyDriver(bookingId, driver.id, {
                photoMatch,
                vehicleMatch,
                licensePlateMatch: plateMatch
            });
            onVerified();
            onClose();
        } catch (error) {
            console.error('Error verifying driver:', error);
        } finally {
            setLoading(false);
        }
    };

    const isAllSelected = photoMatch !== null && vehicleMatch !== null && plateMatch !== null;

    return (
        <Modal visible={visible} transparent animationType="slide">
            <View style={styles.overlay}>
                <Card style={styles.container}>
                    <View style={styles.header}>
                        <Text style={styles.title}>Safety Verification</Text>
                        <Text style={styles.subtitle}>Please verify these details for your safety</Text>
                    </View>

                    <ScrollView style={styles.content}>
                        {/* Driver Photo */}
                        <View style={styles.section}>
                            <Image
                                source={driver.photo ? { uri: driver.photo } : require('@/assets/images/default-avatar.png')}
                                style={styles.driverPhoto}
                            />
                            <View style={styles.sectionInfo}>
                                <Text style={styles.label}>Does the driver match this photo?</Text>
                                <Text style={styles.value}>{driver.name}</Text>
                            </View>
                            <View style={styles.choiceGroup}>
                                <TouchableOpacity
                                    style={[styles.choiceBtn, photoMatch === true && styles.choiceBtnSelected]}
                                    onPress={() => setPhotoMatch(true)}
                                >
                                    <Ionicons name="checkmark-circle" size={24} color={photoMatch === true ? 'white' : '#10b981'} />
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.choiceBtn, photoMatch === false && styles.choiceBtnSelectedDanger]}
                                    onPress={() => setPhotoMatch(false)}
                                >
                                    <Ionicons name="close-circle" size={24} color={photoMatch === false ? 'white' : '#ef4444'} />
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* Vehicle */}
                        <View style={styles.section}>
                            <View style={styles.iconContainer}>
                                <Ionicons name="car" size={32} color="#3b82f6" />
                            </View>
                            <View style={styles.sectionInfo}>
                                <Text style={styles.label}>Is this the correct vehicle?</Text>
                                <Text style={styles.value}>{driver.vehicle_make} {driver.vehicle_model}</Text>
                            </View>
                            <View style={styles.choiceGroup}>
                                <TouchableOpacity
                                    style={[styles.choiceBtn, vehicleMatch === true && styles.choiceBtnSelected]}
                                    onPress={() => setVehicleMatch(true)}
                                >
                                    <Ionicons name="checkmark-circle" size={24} color={vehicleMatch === true ? 'white' : '#10b981'} />
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.choiceBtn, vehicleMatch === false && styles.choiceBtnSelectedDanger]}
                                    onPress={() => setVehicleMatch(false)}
                                >
                                    <Ionicons name="close-circle" size={24} color={vehicleMatch === false ? 'white' : '#ef4444'} />
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* License Plate */}
                        <View style={styles.section}>
                            <View style={styles.iconContainer}>
                                <Ionicons name="card" size={32} color="#3b82f6" />
                            </View>
                            <View style={styles.sectionInfo}>
                                <Text style={styles.label}>Match the license plate</Text>
                                <Text style={styles.plateNumber}>{driver.vehicle_plate}</Text>
                            </View>
                            <View style={styles.choiceGroup}>
                                <TouchableOpacity
                                    style={[styles.choiceBtn, plateMatch === true && styles.choiceBtnSelected]}
                                    onPress={() => setPlateMatch(true)}
                                >
                                    <Ionicons name="checkmark-circle" size={24} color={plateMatch === true ? 'white' : '#10b981'} />
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.choiceBtn, plateMatch === false && styles.choiceBtnSelectedDanger]}
                                    onPress={() => setPlateMatch(false)}
                                >
                                    <Ionicons name="close-circle" size={24} color={plateMatch === false ? 'white' : '#ef4444'} />
                                </TouchableOpacity>
                            </View>
                        </View>
                    </ScrollView>

                    <View style={styles.footer}>
                        <Button
                            onPress={handleVerify}
                            disabled={!isAllSelected || loading}
                            className="w-full"
                        >
                            {loading ? 'Confirming...' : 'Confirm & Start Ride'}
                        </Button>
                        <TouchableOpacity onPress={onClose} style={styles.skipBtn}>
                            <Text style={styles.skipText}>Verify Later</Text>
                        </TouchableOpacity>
                    </View>
                </Card>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    container: {
        backgroundColor: 'white',
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        padding: 24,
        maxHeight: '85%',
    },
    header: {
        alignItems: 'center',
        marginBottom: 24,
    },
    title: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#1f2937',
    },
    subtitle: {
        fontSize: 14,
        color: '#6b7280',
        marginTop: 4,
    },
    content: {
        marginBottom: 24,
    },
    section: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#f3f4f6',
    },
    driverPhoto: {
        width: 60,
        height: 60,
        borderRadius: 30,
    },
    iconContainer: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: '#eff6ff',
        justifyContent: 'center',
        alignItems: 'center',
    },
    sectionInfo: {
        flex: 1,
        marginLeft: 16,
    },
    label: {
        fontSize: 12,
        color: '#6b7280',
    },
    value: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1f2937',
        marginTop: 2,
    },
    plateNumber: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#3b82f6',
        letterSpacing: 2,
        marginTop: 2,
    },
    choiceGroup: {
        flexDirection: 'row',
        gap: 8,
    },
    choiceBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        borderWidth: 1,
        borderColor: '#e5e7eb',
        justifyContent: 'center',
        alignItems: 'center',
    },
    choiceBtnSelected: {
        backgroundColor: '#10b981',
        borderColor: '#10b981',
    },
    choiceBtnSelectedDanger: {
        backgroundColor: '#ef4444',
        borderColor: '#ef4444',
    },
    footer: {
        gap: 12,
    },
    skipBtn: {
        alignItems: 'center',
        paddingVertical: 8,
    },
    skipText: {
        color: '#6b7280',
        fontSize: 14,
    }
});
