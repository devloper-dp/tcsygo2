import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { Text } from './ui/text';
import { Clock, MapPin } from 'lucide-react-native';
import { MapService, Coordinates } from '@/services/MapService';
import { useTheme } from '@/contexts/ThemeContext';
 
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
    const { theme } = useTheme();
    const isDark = theme === 'dark';
    
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
                        toValue: 1.05,
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
        return isDark ? '#475569' : '#6b7280'; // Gray - far
    };
 
    const getStatusText = (): string => {
        if (distance <= 100) return 'Driver has arrived!';
        if (distance <= 500) return 'Driver is very close';
        if (eta <= 120) return 'Driver arriving soon';
        return 'Driver on the way';
    };
 
    return (
        <View className="p-4">
            <Animated.View
                className="bg-white dark:bg-slate-900 rounded-2xl border-2 p-4 shadow-sm"
                style={{
                    borderColor: getStatusColor(),
                    transform: [{ scale: isNearby ? pulseAnim : 1 }],
                }}
            >
                <View className="flex-row items-center mb-4">
                    <View className="w-2.5 h-2.5 rounded-full mr-2" style={{ backgroundColor: getStatusColor() }} />
                    <Text className="text-sm font-bold text-slate-600 dark:text-slate-300">{getStatusText()}</Text>
                </View>
 
                <View className="flex-row items-center">
                    <View className="flex-1 flex-row items-center">
                        <Clock size={32} color={getStatusColor()} strokeWidth={2.5} />
                        <View className="ml-3">
                            <Text className="text-xs text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">ETA</Text>
                            <Text className="text-2xl font-black" style={{ color: getStatusColor() }}>
                                {formatTime(eta)}
                            </Text>
                        </View>
                    </View>
 
                    <View className="w-[1px] h-10 bg-slate-100 dark:bg-slate-800 mx-4" />
 
                    <View className="flex-1 flex-row items-center">
                        <MapPin size={24} color={isDark ? "#475569" : "#6b7280"} />
                        <View className="ml-3">
                            <Text className="text-xs text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">Distance</Text>
                            <Text className="text-lg font-bold text-slate-800 dark:text-slate-200">{formatDistance(distance)}</Text>
                        </View>
                    </View>
                </View>
 
                {isNearby && (
                    <View className="mt-4 bg-emerald-50 dark:bg-emerald-900/30 p-3 rounded-xl border border-emerald-100 dark:border-emerald-900/40">
                        <Text className="text-xs font-bold text-emerald-700 dark:text-emerald-400 text-center leading-5">
                            🎉 Your driver is here! Please proceed to the pickup point.
                        </Text>
                    </View>
                )}
            </Animated.View>
        </View>
    );
};
 
const styles = StyleSheet.create({});
