import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNetInfo } from '@react-native-community/netinfo';

export function OfflineIndicator() {
    const netInfo = useNetInfo();
    const isOnline = netInfo.isConnected !== false; // Treat null (unknown) as online to avoid flash
    const [animation] = useState(new Animated.Value(0));

    useEffect(() => {
        Animated.timing(animation, {
            toValue: isOnline ? 0 : 1,
            duration: 300,
            useNativeDriver: true,
        }).start();
    }, [isOnline]);

    if (isOnline) return null;

    return (
        <Animated.View
            style={[
                styles.container,
                {
                    transform: [{
                        translateY: animation.interpolate({
                            inputRange: [0, 1],
                            outputRange: [-50, 0],
                        })
                    }]
                }
            ]}
        >
            <Ionicons name="cloud-offline" size={20} color="white" />
            <Text style={styles.text}>You are offline. Some features may be limited.</Text>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        backgroundColor: '#ef4444',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
        zIndex: 1000,
        gap: 8,
    },
    text: {
        color: 'white',
        fontSize: 14,
        fontWeight: '500',
    },
});
