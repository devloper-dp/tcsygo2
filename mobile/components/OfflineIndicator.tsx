import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { Text } from '@/components/ui/text';
import { Ionicons } from '@expo/vector-icons';
import { useNetInfo } from '@react-native-community/netinfo';
import { useTheme } from '@/contexts/ThemeContext';
 
export function OfflineIndicator() {
    const { theme } = useTheme();
    const isDark = theme === 'dark';
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
            className="absolute top-0 left-0 right-0 bg-rose-600 dark:bg-rose-500 flex-row items-center justify-center py-10 px-6 z-[3000] gap-3 shadow-lg shadow-rose-500/20"
            style={[
                {
                    transform: [{
                        translateY: animation.interpolate({
                            inputRange: [0, 1],
                            outputRange: [-100, 0],
                        })
                    }]
                }
            ]}
        >
            <View className="w-8 h-8 rounded-full bg-white/20 items-center justify-center">
                <Ionicons name="cloud-offline" size={18} color="white" />
            </View>
            <Text className="text-white font-black text-sm tracking-tight">You are offline. Some features may be limited.</Text>
        </Animated.View>
    );
}
 
const styles = StyleSheet.create({});
