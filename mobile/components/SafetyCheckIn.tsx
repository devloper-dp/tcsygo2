import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '@/components/ui/card';
import { supabase } from '@/lib/supabase';
import { SafetyService } from '@/services/SafetyService';
import { useAuth } from '@/contexts/AuthContext';

export function SafetyCheckIn({ tripId, style }: { tripId: string, style?: any }) {
    const { user } = useAuth();
    const [visible, setVisible] = useState(false);
    const [timeLeft, setTimeLeft] = useState(600); // 10 minutes
    const [missedChecks, setMissedChecks] = useState(0);

    // Timer logic
    useEffect(() => {
        if (!visible) {
            const timer = setInterval(() => {
                setTimeLeft((prev) => {
                    if (prev <= 0) {
                        setVisible(true);
                        return 600; // Reset
                    }
                    return prev - 1;
                });
            }, 1000);
            return () => clearInterval(timer);
        }
    }, [visible]);

    const handleCheckIn = async (safe: boolean) => {
        if (!user) return;
        setVisible(false);
        if (safe) {
            setTimeLeft(600); // Reset timer
            await SafetyService.createSafetyCheckIn(tripId, user.id, 'safe');
            Alert.alert('Thank You', 'We are glad you are safe. We will check in again in 10 minutes.');
        } else {
            await SafetyService.createSafetyCheckIn(tripId, user.id, 'need_help');
            Alert.alert('Emergency Alert', 'Notifying trusted contacts and support team immediately.');
        }
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        return `${mins}m`;
    };

    return (
        <>
            <TouchableOpacity style={[styles.floatingButton, style]} onPress={() => setVisible(true)}>
                <View style={styles.shieldIcon}>
                    <Ionicons name="shield-checkmark" size={16} color="white" />
                </View>
                <Text style={styles.checkInText}>Safety Check</Text>
            </TouchableOpacity>

            <Modal visible={visible} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <Card style={styles.modalContent}>
                        <View style={styles.header}>
                            <View style={styles.iconContainer}>
                                <Ionicons name="shield-outline" size={32} color="#3b82f6" />
                            </View>
                            <Text style={styles.title}>Safety Check-in</Text>
                            <Text style={styles.subtitle}>Are you feeling safe in your ride?</Text>
                        </View>

                        <View style={styles.actions}>
                            <TouchableOpacity
                                style={[styles.button, styles.safeButton]}
                                onPress={() => handleCheckIn(true)}
                            >
                                <Ionicons name="checkmark-circle-outline" size={24} color="white" />
                                <Text style={styles.buttonText}>Yes, I'm Safe</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.button, styles.dangerButton]}
                                onPress={() => handleCheckIn(false)}
                            >
                                <Ionicons name="alert-circle-outline" size={24} color="white" />
                                <Text style={styles.buttonText}>No, Need Help</Text>
                            </TouchableOpacity>
                        </View>

                        <Text style={styles.footerText}>
                            Automated check-in every 10 minutes
                        </Text>
                    </Card>
                </View>
            </Modal>
        </>
    );
}

const styles = StyleSheet.create({
    floatingButton: {
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        flexDirection: 'row',
        alignItems: 'center',
        padding: 8,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#e5e7eb',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    shieldIcon: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: '#10b981',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 8,
    },
    checkInText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#374151',
        marginRight: 4,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        padding: 24,
    },
    modalContent: {
        backgroundColor: 'white',
        borderRadius: 24,
        padding: 24,
        alignItems: 'center',
    },
    header: {
        alignItems: 'center',
        marginBottom: 24,
    },
    iconContainer: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: '#eff6ff',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#1f2937',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 16,
        color: '#6b7280',
        textAlign: 'center',
    },
    actions: {
        width: '100%',
        gap: 12,
        marginBottom: 16,
    },
    button: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        borderRadius: 12,
        gap: 8,
    },
    safeButton: {
        backgroundColor: '#10b981',
    },
    dangerButton: {
        backgroundColor: '#ef4444',
    },
    buttonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600',
    },
    footerText: {
        fontSize: 12,
        color: '#9ca3af',
    },
});
