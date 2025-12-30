import React, { useState } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Alert, Modal, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '@/components/ui/card';

interface DriverProps {
    name: string;
    photoUrl?: string;
    vehicleModel: string;
    vehicleColor: string;
    plateNumber: string;
    rating: number;
    trips: number;
}

export function DriverVerification({ driver, visible, onClose, onVerified }: { driver: DriverProps, visible: boolean, onClose: () => void, onVerified: () => void }) {
    const [step, setStep] = useState(0);

    const steps = [
        { title: 'Check License Plate', desc: `Does the plate match ${driver.plateNumber}?`, icon: 'car-outline' },
        { title: 'Verify Driver Photo', desc: 'Does the driver match the photo?', icon: 'person-outline' },
        { title: 'Confirm Car Details', desc: `Is it a ${driver.vehicleColor} ${driver.vehicleModel}?`, icon: 'information-circle-outline' },
    ];

    const handleNext = () => {
        if (step < steps.length - 1) {
            setStep(step + 1);
        } else {
            onVerified();
        }
    };

    return (
        <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
            <View style={styles.container}>
                <View style={styles.header}>
                    <Text style={styles.headerTitle}>Verify Your Ride</Text>
                    <TouchableOpacity onPress={onClose}>
                        <Ionicons name="close" size={24} color="#1f2937" />
                    </TouchableOpacity>
                </View>

                <ScrollView contentContainerStyle={styles.content}>
                    <View style={styles.driverCard}>
                        <Image
                            source={{ uri: driver.photoUrl || 'https://via.placeholder.com/150' }}
                            style={styles.driverPhoto}
                        />
                        <View style={styles.driverInfo}>
                            <Text style={styles.driverName}>{driver.name}</Text>
                            <View style={styles.ratingRow}>
                                <Ionicons name="star" size={16} color="#f59e0b" />
                                <Text style={styles.ratingText}>{driver.rating} • {driver.trips} trips</Text>
                            </View>
                        </View>
                    </View>

                    <Card style={styles.stepCard}>
                        <View style={styles.stepIconContainer}>
                            <Ionicons name={steps[step].icon as any} size={48} color="#3b82f6" />
                        </View>
                        <Text style={styles.stepTitle}>{steps[step].title}</Text>
                        <Text style={styles.stepDesc}>{steps[step].desc}</Text>

                        <View style={styles.plateContainer}>
                            <Text style={styles.plateText}>{driver.plateNumber}</Text>
                        </View>
                    </Card>

                    <View style={styles.dots}>
                        {steps.map((_, i) => (
                            <View key={i} style={[styles.dot, i === step && styles.activeDot]} />
                        ))}
                    </View>
                </ScrollView>

                <View style={styles.footer}>
                    <TouchableOpacity style={styles.reportButton} onPress={() => Alert.alert('Report', 'Details do not match')}>
                        <Text style={styles.reportText}>Report Mismatch</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.verifyButton} onPress={handleNext}>
                        <Text style={styles.verifyText}>
                            {step === steps.length - 1 ? 'Everything Matches' : 'Yes, Matches'}
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
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
        padding: 20,
        backgroundColor: 'white',
        borderBottomWidth: 1,
        borderBottomColor: '#f3f4f6',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1f2937',
    },
    content: {
        padding: 20,
    },
    driverCard: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 24,
    },
    driverPhoto: {
        width: 60,
        height: 60,
        borderRadius: 30,
        marginRight: 16,
    },
    driverInfo: {
        flex: 1,
    },
    driverName: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1f2937',
        marginBottom: 4,
    },
    ratingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    ratingText: {
        fontSize: 14,
        color: '#6b7280',
    },
    stepCard: {
        padding: 32,
        alignItems: 'center',
        marginBottom: 24,
    },
    stepIconContainer: {
        width: 96,
        height: 96,
        borderRadius: 48,
        backgroundColor: '#eff6ff',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24,
    },
    stepTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#1f2937',
        marginBottom: 8,
        textAlign: 'center',
    },
    stepDesc: {
        fontSize: 16,
        color: '#6b7280',
        textAlign: 'center',
        marginBottom: 24,
    },
    plateContainer: {
        backgroundColor: '#fbbf24',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 8,
        borderWidth: 2,
        borderColor: '#000',
    },
    plateText: {
        fontSize: 20,
        fontWeight: 'bold',
        fontFamily: 'monospace',
    },
    dots: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 8,
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#d1d5db',
    },
    activeDot: {
        backgroundColor: '#3b82f6',
        width: 24,
    },
    footer: {
        padding: 20,
        backgroundColor: 'white',
        borderTopWidth: 1,
        borderTopColor: '#f3f4f6',
        flexDirection: 'row',
        gap: 12,
    },
    reportButton: {
        flex: 1,
        padding: 16,
        borderRadius: 12,
        backgroundColor: '#fee2e2',
        alignItems: 'center',
    },
    reportText: {
        color: '#ef4444',
        fontWeight: '600',
        fontSize: 16,
    },
    verifyButton: {
        flex: 1,
        padding: 16,
        borderRadius: 12,
        backgroundColor: '#10b981',
        alignItems: 'center',
    },
    verifyText: {
        color: 'white',
        fontWeight: '600',
        fontSize: 16,
    },
});
