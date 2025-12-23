import { View, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { Text } from '@/components/ui/text';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef } from 'react';

interface NotificationBannerProps {
    type: 'success' | 'error' | 'warning' | 'info';
    message: string;
    visible: boolean;
    onDismiss: () => void;
    duration?: number;
}

export function NotificationBanner({
    type,
    message,
    visible,
    onDismiss,
    duration = 3000,
}: NotificationBannerProps) {
    const slideAnim = useRef(new Animated.Value(-100)).current;
    const opacityAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (visible) {
            // Slide in
            Animated.parallel([
                Animated.timing(slideAnim, {
                    toValue: 0,
                    duration: 300,
                    useNativeDriver: true,
                }),
                Animated.timing(opacityAnim, {
                    toValue: 1,
                    duration: 300,
                    useNativeDriver: true,
                }),
            ]).start();

            // Auto dismiss
            const timer = setTimeout(() => {
                handleDismiss();
            }, duration);

            return () => clearTimeout(timer);
        }
    }, [visible]);

    const handleDismiss = () => {
        Animated.parallel([
            Animated.timing(slideAnim, {
                toValue: -100,
                duration: 300,
                useNativeDriver: true,
            }),
            Animated.timing(opacityAnim, {
                toValue: 0,
                duration: 300,
                useNativeDriver: true,
            }),
        ]).start(() => {
            onDismiss();
        });
    };

    if (!visible) return null;

    const getConfig = () => {
        switch (type) {
            case 'success':
                return {
                    backgroundColor: '#10b981',
                    icon: 'checkmark-circle' as const,
                };
            case 'error':
                return {
                    backgroundColor: '#ef4444',
                    icon: 'close-circle' as const,
                };
            case 'warning':
                return {
                    backgroundColor: '#f59e0b',
                    icon: 'warning' as const,
                };
            case 'info':
                return {
                    backgroundColor: '#3b82f6',
                    icon: 'information-circle' as const,
                };
        }
    };

    const config = getConfig();

    return (
        <Animated.View
            style={[
                styles.container,
                {
                    backgroundColor: config.backgroundColor,
                    transform: [{ translateY: slideAnim }],
                    opacity: opacityAnim,
                },
            ]}
        >
            <View style={styles.content}>
                <Ionicons name={config.icon} size={24} color="#ffffff" />
                <Text style={styles.message} className="text-white font-medium">
                    {message}
                </Text>
                <TouchableOpacity onPress={handleDismiss} style={styles.closeButton}>
                    <Ionicons name="close" size={20} color="#ffffff" />
                </TouchableOpacity>
            </View>
        </Animated.View>
    );
}

interface PullToRefreshIndicatorProps {
    refreshing: boolean;
}

export function PullToRefreshIndicator({ refreshing }: PullToRefreshIndicatorProps) {
    const rotateAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (refreshing) {
            Animated.loop(
                Animated.timing(rotateAnim, {
                    toValue: 1,
                    duration: 1000,
                    useNativeDriver: true,
                })
            ).start();
        } else {
            rotateAnim.setValue(0);
        }
    }, [refreshing]);

    const spin = rotateAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '360deg'],
    });

    if (!refreshing) return null;

    return (
        <View style={styles.refreshContainer}>
            <Animated.View style={{ transform: [{ rotate: spin }] }}>
                <Ionicons name="sync" size={24} color="#3b82f6" />
            </Animated.View>
            <Text style={styles.refreshText} className="text-gray-600">
                Refreshing...
            </Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        paddingTop: 50,
        paddingHorizontal: 16,
        paddingBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    content: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    message: {
        flex: 1,
        fontSize: 14,
    },
    closeButton: {
        padding: 4,
    },
    refreshContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 16,
    },
    refreshText: {
        fontSize: 14,
    },
});
