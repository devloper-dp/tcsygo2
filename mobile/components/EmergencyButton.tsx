import { useState } from 'react';
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { AlertTriangle } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';
import { useAuth } from '@/contexts/AuthContext';
import { SafetyService } from '@/services/SafetyService';
import { useTheme } from '@/contexts/ThemeContext';
 
interface EmergencyButtonProps {
    tripId: string;
    style?: any;
}
 
export function EmergencyButton({ tripId, style }: EmergencyButtonProps) {
    const { user } = useAuth();
    const { theme } = useTheme();
    const isDark = theme === 'dark';
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
 
            // Trigger emergency protocol via service
            if (user) {
                await SafetyService.triggerEmergencyProtocol(tripId, user.id, {
                    lat: location.coords.latitude,
                    lng: location.coords.longitude,
                });
            }
 
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
            style={style}
            onPress={handleEmergency}
            disabled={sending}
            activeOpacity={0.8}
            className={`bg-red-600 dark:bg-red-500 rounded-2xl p-4 shadow-lg ${isDark ? 'shadow-red-900/40' : 'shadow-red-200'} ${sending ? 'opacity-70' : ''}`}
        >
            <View className="flex-row items-center justify-center gap-3">
                <AlertTriangle size={24} color="white" strokeWidth={2.5} />
                <Text className="text-white text-base font-black uppercase tracking-wider">
                    {sending ? 'Sending Alert...' : 'SOS Emergency'}
                </Text>
            </View>
        </TouchableOpacity>
    );
}
