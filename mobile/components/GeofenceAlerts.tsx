import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { Text } from '@/components/ui/text';
import { Card } from '@/components/ui/card';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import { useResponsive } from '@/hooks/useResponsive';
 
export interface LocationCoords {
    lat: number;
    lng: number;
}
 
export function calculateDistance(loc1: LocationCoords, loc2: LocationCoords): number {
    const R = 6371; // Earth's radius in km
    const dLat = ((loc2.lat - loc1.lat) * Math.PI) / 180;
    const dLon = ((loc2.lng - loc1.lng) * Math.PI) / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((loc1.lat * Math.PI) / 180) *
        Math.cos((loc2.lat * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c * 1000; // Return distance in meters
}
 
export function formatDistance(meters: number): string {
    if (meters < 1000) {
        return `${Math.round(meters)} m`;
    }
    return `${(meters / 1000).toFixed(1)} km`;
}
 
interface GeofenceAlertsProps {
    driverLocation: LocationCoords;
    pickupLocation: LocationCoords;
    dropLocation: LocationCoords;
    tripStatus: 'pending' | 'ongoing' | 'completed';
    style?: any;
}
 
export function GeofenceAlerts({
    driverLocation,
    pickupLocation,
    dropLocation,
    tripStatus,
    style,
}: GeofenceAlertsProps) {
    const { theme, isDark } = useTheme();
    const { hScale, vScale, spacing } = useResponsive();
    const [status, setStatus] = useState<any>(null);
    const [lastDistance, setLastDistance] = useState<number>(0);
 
    // Geofence thresholds
    const NEAR_THRESHOLD = 500; // 500m
    const ARRIVED_THRESHOLD = 50; // 50m
 
    useEffect(() => {
        let currentTarget = tripStatus === 'pending' ? pickupLocation : dropLocation;
        const distance = calculateDistance(driverLocation, currentTarget);
        setLastDistance(distance);
 
        const triggerFeedback = async (type: 'nearby' | 'arrived') => {
            const { NotificationService } = await import('@/services/NotificationService');
            const Haptics = await import('expo-haptics');
 
            if (type === 'arrived') {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                NotificationService.sendLocalNotification(
                    tripStatus === 'pending' ? 'Driver Arrived' : 'Destination Reached',
                    tripStatus === 'pending' ? 'Your driver has arrived at the pickup location.' : 'You have reached your destination.',
                    { type: 'geofence' }
                );
            } else {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            }
        };
 
        if (tripStatus === 'pending') {
            if (distance <= ARRIVED_THRESHOLD) {
                if (status?.text !== 'Driver Arrived') {
                    setStatus({ text: 'Driver Arrived', color: '#10b981', icon: 'checkmark-circle' });
                    triggerFeedback('arrived');
                }
            } else if (distance <= NEAR_THRESHOLD) {
                if (status?.text !== 'Driver Nearby') {
                    setStatus({ text: 'Driver Nearby', color: '#f59e0b', icon: 'location' });
                    triggerFeedback('nearby');
                }
            } else {
                setStatus(null);
            }
        } else if (tripStatus === 'ongoing') {
            if (distance <= ARRIVED_THRESHOLD) {
                if (status?.text !== 'Destination Reached') {
                    setStatus({ text: 'Destination Reached', color: '#10b981', icon: 'flag' });
                    triggerFeedback('arrived');
                }
            } else if (distance <= NEAR_THRESHOLD) {
                if (status?.text !== 'Approaching Destination') {
                    setStatus({ text: 'Approaching Destination', color: '#3b82f6', icon: 'navigate' });
                    triggerFeedback('nearby');
                }
            } else {
                setStatus(null);
            }
        } else {
            setStatus(null);
        }
    }, [driverLocation, tripStatus, pickupLocation, dropLocation, status]);
 
    if (!status) return null;
 
    return (
        <Card 
            style={[{ padding: hScale(14), borderRadius: hScale(16) }, style]}
            className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm"
        >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: hScale(16) }}>
                <View 
                    style={{ width: hScale(40), height: hScale(40), borderRadius: hScale(20), backgroundColor: status.color + (isDark ? '30' : '20'), justifyContent: 'center', alignItems: 'center' }} 
                >
                    <Ionicons name={status.icon} size={hScale(20)} color={isDark ? (status.color === '#10b981' ? '#34d399' : status.color === '#f59e0b' ? '#fbbf24' : '#60a5fa') : status.color} />
                </View>
                <View className="flex-1">
                    <Text style={{ fontSize: hScale(16) }} className="font-bold text-slate-900 dark:text-white">{status.text}</Text>
                    <Text style={{ fontSize: hScale(14) }} className="font-medium text-slate-500 dark:text-slate-400">
                        {formatDistance(lastDistance)} away
                    </Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: hScale(12), paddingVertical: vScale(6), borderRadius: hScale(20), gap: hScale(6) }} className="bg-slate-50 dark:bg-slate-800">
                    <Ionicons name="notifications" size={hScale(12)} color={isDark ? "#475569" : "#94a3b8"} />
                    <Text style={{ fontSize: hScale(10) }} className="font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Alert</Text>
                </View>
            </View>
        </Card>
    );
}
 
const styles = StyleSheet.create({});
