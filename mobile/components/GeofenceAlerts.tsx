import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '@/components/ui/card';
import * as Location from 'expo-location';
// import { useToast } from '@/hooks/use-toast'; // Mobile toast hook

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
        <Card style={[styles.container, style]}>
            <View style={styles.content}>
                <View style={[styles.iconBox, { backgroundColor: status.color + '20' }]}>
                    <Ionicons name={status.icon} size={20} color={status.color} />
                </View>
                <View style={styles.textContainer}>
                    <Text style={styles.statusText}>{status.text}</Text>
                    <Text style={styles.distanceText}>
                        {formatDistance(lastDistance)} away
                    </Text>
                </View>
                <View style={styles.badge}>
                    <Ionicons name="notifications" size={12} color="#6b7280" />
                    <Text style={styles.badgeText}>Alert</Text>
                </View>
            </View>
        </Card>
    );
}

const styles = StyleSheet.create({
    container: {
        padding: 12,
        backgroundColor: 'white',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#e5e7eb',
    },
    content: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    iconBox: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
    },
    textContainer: {
        flex: 1,
    },
    statusText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1f2937',
    },
    distanceText: {
        fontSize: 13,
        color: '#6b7280',
    },
    badge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f3f4f6',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        gap: 4,
    },
    badgeText: {
        fontSize: 10,
        fontWeight: '600',
        color: '#6b7280',
        textTransform: 'uppercase',
    },
});
