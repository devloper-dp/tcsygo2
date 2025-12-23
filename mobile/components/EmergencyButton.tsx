import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

interface EmergencyButtonProps {
    tripId: string;
    style?: any;
}

export function EmergencyButton({ tripId, style }: EmergencyButtonProps) {
    const { user } = useAuth();
    const [sending, setSending] = useState(false);

    const handleEmergency = async () => {
        // Haptic feedback
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);

        Alert.alert(
            '🚨 Emergency SOS',
            'This will immediately alert emergency services and share your live location.\n\nAre you sure you want to proceed?',
            [
                {
                    text: 'Cancel',
                    style: 'cancel',
                },
                {
                    text: 'Send Emergency Alert',
                    style: 'destructive',
                    onPress: sendEmergencyAlert,
                },
            ]
        );
    };

    const sendEmergencyAlert = async () => {
        setSending(true);

        try {
            // Strong haptic feedback
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

            // Get current location
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission denied', 'Location permission is required for emergency alerts.');
                return;
            }

            const location = await Location.getCurrentPositionAsync({});

            // Create emergency alert
            const { error: alertError } = await supabase
                .from('emergency_alerts')
                .insert({
                    trip_id: tripId,
                    user_id: user?.id,
                    lat: location.coords.latitude,
                    lng: location.coords.longitude,
                    status: 'active',
                });

            if (alertError) throw alertError;

            // Notification to admin is handled by Database Trigger (server-side)

            // Success feedback
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

            Alert.alert(
                'Emergency Alert Sent',
                'Your location has been shared with emergency services and trip admin.',
                [{ text: 'OK' }]
            );
        } catch (error: any) {
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            Alert.alert('Alert Failed', error.message || 'Unable to send emergency alert. Please call emergency services directly.');
        } finally {
            setSending(false);
        }
    };

    return (
        <TouchableOpacity
            style={[styles.emergencyButton, style]}
            onPress={handleEmergency}
            disabled={sending}
            activeOpacity={0.8}
        >
            <View style={styles.buttonContent}>
                <Ionicons name="warning" size={24} color="white" />
                <Text style={styles.buttonText}>
                    {sending ? 'Sending Alert...' : 'SOS Emergency'}
                </Text>
            </View>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    emergencyButton: {
        backgroundColor: '#ef4444',
        borderRadius: 12,
        padding: 16,
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
    },
    buttonContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    buttonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
});
