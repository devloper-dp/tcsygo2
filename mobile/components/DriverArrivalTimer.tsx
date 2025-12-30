import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Clock, MapPin } from 'lucide-react-native';
import { MapService, Coordinates } from '@/services/MapService';

interface DriverArrivalTimerProps {
    driverLocation: Coordinates;
    pickupLocation: Coordinates;
    onArrival?: () => void;
}

export const DriverArrivalTimer: React.FC<DriverArrivalTimerProps> = ({
    driverLocation,
    pickupLocation,
    onArrival
}) => {
    const [eta, setEta] = useState<number>(0); // in seconds
    const [distance, setDistance] = useState<number>(0); // in meters
    const [isNearby, setIsNearby] = useState(false);
    const pulseAnim = useState(new Animated.Value(1))[0];

    useEffect(() => {
        calculateETA();
        const interval = setInterval(calculateETA, 10000); // Update every 10 seconds

        return () => clearInterval(interval);
    }, [driverLocation, pickupLocation]);

    useEffect(() => {
        if (isNearby) {
            // Pulse animation when driver is nearby
            Animated.loop(
                Animated.sequence([
                    Animated.timing(pulseAnim, {
                        toValue: 1.2,
                        duration: 800,
                        useNativeDriver: true,
                    }),
                    Animated.timing(pulseAnim, {
                        toValue: 1,
                        duration: 800,
                        useNativeDriver: true,
                    }),
                ])
            ).start();
        }
    }, [isNearby]);

    const calculateETA = async () => {
        try {
            const result = await MapService.getDistance(driverLocation, pickupLocation);
            setDistance(result.distance);
            setEta(result.duration);

            // Check if driver is nearby (within 100 meters)
            if (result.distance <= 100) {
                setIsNearby(true);
                if (onArrival) {
                    onArrival();
                }
            } else {
                setIsNearby(false);
            }
        } catch (error) {
            console.error('Error calculating ETA:', error);
        }
    };

    const formatTime = (seconds: number): string => {
        if (seconds < 60) {
            return '< 1 min';
        }
        const minutes = Math.round(seconds / 60);
        return `${minutes} min${minutes > 1 ? 's' : ''}`;
    };

    const formatDistance = (meters: number): string => {
        if (meters < 1000) {
            return `${Math.round(meters)} m`;
        }
        return `${(meters / 1000).toFixed(1)} km`;
    };

    const getStatusColor = (): string => {
        if (distance <= 100) return '#10b981'; // Green - arrived
        if (distance <= 500) return '#f59e0b'; // Amber - very close
        if (eta <= 120) return '#3b82f6'; // Blue - close
        return '#6b7280'; // Gray - far
    };

    const getStatusText = (): string => {
        if (distance <= 100) return 'Driver has arrived!';
        if (distance <= 500) return 'Driver is very close';
        if (eta <= 120) return 'Driver arriving soon';
        return 'Driver on the way';
    };

    return (
        <View style={styles.container}>
            <Animated.View
                style={[
                    styles.timerCard,
                    {
                        borderColor: getStatusColor(),
                        transform: [{ scale: isNearby ? pulseAnim : 1 }],
                    },
                ]}
            >
                <View style={styles.header}>
                    <View style={[styles.statusDot, { backgroundColor: getStatusColor() }]} />
                    <Text style={styles.statusText}>{getStatusText()}</Text>
                </View>

                <View style={styles.content}>
                    <View style={styles.etaSection}>
                        <Clock size={32} color={getStatusColor()} />
                        <View style={styles.etaInfo}>
                            <Text style={styles.etaLabel}>ETA</Text>
                            <Text style={[styles.etaValue, { color: getStatusColor() }]}>
                                {formatTime(eta)}
                            </Text>
                        </View>
                    </View>

                    <View style={styles.divider} />

                    <View style={styles.distanceSection}>
                        <MapPin size={24} color="#6b7280" />
                        <View style={styles.distanceInfo}>
                            <Text style={styles.distanceLabel}>Distance</Text>
                            <Text style={styles.distanceValue}>{formatDistance(distance)}</Text>
                        </View>
                    </View>
                </View>

                {isNearby && (
                    <View style={styles.arrivalBanner}>
                        <Text style={styles.arrivalText}>
                            🎉 Your driver is here! Please proceed to the pickup point.
                        </Text>
                    </View>
                )}
            </Animated.View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        padding: 16,
    },
    timerCard: {
        backgroundColor: '#fff',
        borderRadius: 16,
        borderWidth: 2,
        padding: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    statusDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        marginRight: 8,
    },
    statusText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#4b5563',
    },
    content: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    etaSection: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
    },
    etaInfo: {
        marginLeft: 12,
    },
    etaLabel: {
        fontSize: 12,
        color: '#9ca3af',
        marginBottom: 4,
    },
    etaValue: {
        fontSize: 24,
        fontWeight: '800',
    },
    divider: {
        width: 1,
        height: 50,
        backgroundColor: '#e5e7eb',
        marginHorizontal: 16,
    },
    distanceSection: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
    },
    distanceInfo: {
        marginLeft: 12,
    },
    distanceLabel: {
        fontSize: 12,
        color: '#9ca3af',
        marginBottom: 4,
    },
    distanceValue: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1f2937',
    },
    arrivalBanner: {
        marginTop: 16,
        backgroundColor: '#d1fae5',
        padding: 12,
        borderRadius: 8,
    },
    arrivalText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#065f46',
        textAlign: 'center',
    },
});
