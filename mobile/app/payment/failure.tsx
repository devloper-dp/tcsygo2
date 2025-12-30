import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import Animated, { FadeIn, SlideInUp } from 'react-native-reanimated';

export default function PaymentFailureScreen() {
    const router = useRouter();
    const { bookingId, error } = useLocalSearchParams();

    return (
        <View style={styles.container}>
            <Animated.View entering={SlideInUp} style={styles.card}>
                <View style={styles.iconContainer}>
                    <Ionicons name="alert-circle" size={80} color="#ef4444" />
                </View>

                <Text variant="h2" style={styles.title}>Payment Failed</Text>
                <Text style={styles.message}>
                    We couldn't process your payment for booking #{bookingId?.toString().slice(0, 8)}.
                    {error ? `\n\nError: ${error}` : ''}
                </Text>

                <View style={styles.divider} />

                <Button
                    style={styles.button}
                    onPress={() => router.replace(`/payment/${bookingId}`)}
                >
                    <Text style={styles.buttonText}>Try Again</Text>
                </Button>

                <TouchableOpacity
                    style={styles.homeButton}
                    onPress={() => router.replace('/(tabs)')}
                >
                    <Text style={styles.homeButtonText}>Back to Home</Text>
                </TouchableOpacity>
            </Animated.View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f9fafb',
        justifyContent: 'center',
        padding: 20,
    },
    card: {
        backgroundColor: 'white',
        borderRadius: 24,
        padding: 32,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 5,
    },
    iconContainer: {
        marginBottom: 24,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#1f2937',
        marginBottom: 12,
    },
    message: {
        textAlign: 'center',
        color: '#6b7280',
        lineHeight: 20,
        marginBottom: 32,
    },
    divider: {
        width: '100%',
        height: 1,
        backgroundColor: '#f3f4f6',
        marginBottom: 24,
    },
    button: {
        width: '100%',
        height: 52,
        marginBottom: 12,
        backgroundColor: '#ef4444',
    },
    buttonText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 16,
    },
    homeButton: {
        padding: 12,
    },
    homeButtonText: {
        color: '#6b7280',
        fontWeight: '600',
        fontSize: 14,
    }
});
