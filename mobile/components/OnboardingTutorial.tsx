import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Image, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');

const STEPS = [
    {
        id: '1',
        title: 'Welcome to TCSYGO!',
        description: 'Your trusted ride-sharing platform in Indore. Share rides, save money, and reduce your carbon footprint.',
        icon: 'rocket-outline',
        color: '#3b82f6'
    },
    {
        id: '2',
        title: 'Quick & Easy Booking',
        description: 'Book rides in seconds. Choose from bikes, autos, or cars based on your preference.',
        icon: 'map-outline',
        color: '#10b981'
    },
    {
        id: '3',
        title: 'Safe & Secure',
        description: 'Your safety is our priority. Track your ride in real-time and share trip details.',
        icon: 'shield-checkmark-outline',
        color: '#8b5cf6'
    },
    {
        id: '4',
        title: 'Seamless Payments',
        description: 'Enjoy hassle-free payments with our integrated wallet and Auto-pay.',
        icon: 'wallet-outline',
        color: '#f59e0b'
    }
];

export function OnboardingTutorial({ visible, onComplete }: { visible: boolean, onComplete: () => void }) {
    const [currentStep, setCurrentStep] = useState(0);

    const handleNext = async () => {
        if (currentStep < STEPS.length - 1) {
            setCurrentStep(currentStep + 1);
        } else {
            await AsyncStorage.setItem('onboarding_completed', 'true');
            onComplete();
        }
    };

    const step = STEPS[currentStep];

    return (
        <Modal visible={visible} animationType="slide">
            <View style={styles.container}>
                <View style={[styles.imageContainer, { backgroundColor: step.color + '20' }]}>
                    <Ionicons name={step.icon as any} size={100} color={step.color} />
                </View>

                <View style={styles.content}>
                    <Text style={styles.title}>{step.title}</Text>
                    <Text style={styles.description}>{step.description}</Text>

                    <View style={styles.dots}>
                        {STEPS.map((_, index) => (
                            <View
                                key={index}
                                style={[
                                    styles.dot,
                                    currentStep === index && { backgroundColor: step.color, width: 24 }
                                ]}
                            />
                        ))}
                    </View>

                    <TouchableOpacity
                        style={[styles.button, { backgroundColor: step.color }]}
                        onPress={handleNext}
                    >
                        <Text style={styles.buttonText}>
                            {currentStep === STEPS.length - 1 ? 'Get Started' : 'Next'}
                        </Text>
                        <Ionicons name="arrow-forward" size={20} color="white" />
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'white',
    },
    imageContainer: {
        flex: 0.6,
        justifyContent: 'center',
        alignItems: 'center',
    },
    content: {
        flex: 0.4,
        padding: 32,
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        textAlign: 'center',
        color: '#1f2937',
        marginBottom: 16,
    },
    description: {
        fontSize: 16,
        color: '#6b7280',
        textAlign: 'center',
        lineHeight: 24,
    },
    dots: {
        flexDirection: 'row',
        gap: 8,
        marginVertical: 32,
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#e5e7eb',
    },
    button: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        paddingHorizontal: 32,
        borderRadius: 50,
        gap: 8,
        width: '100%',
    },
    buttonText: {
        color: 'white',
        fontSize: 18,
        fontWeight: '600',
    },
});
