import React, { useState } from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity, Image } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInRight, FadeOutLeft } from 'react-native-reanimated';

const { width } = Dimensions.get('window');

const slides = [
    {
        id: '1',
        title: 'Ride Smarter',
        description: 'Experience the fastest way to navigate through traffic and reach your destination.',
        icon: 'bicycle',
        color: '#3b82f6' // Primary Blue
    },
    {
        id: '2',
        title: 'Trusted Safety',
        description: 'Your safety is our priority. Real-time GPS tracking and 24/7 SOS support included.',
        icon: 'shield-checkmark',
        color: '#10b981' // Green
    },
    {
        id: '3',
        title: 'Instant Payments',
        description: 'Go cashless with integrated wallets and automatic payment settlements.',
        icon: 'card',
        color: '#f59e0b' // Yellow
    }
];

export default function OnboardingScreen() {
    const router = useRouter();
    const [currentSlideIndex, setCurrentSlideIndex] = useState(0);

    const handleNext = async () => {
        if (currentSlideIndex < slides.length - 1) {
            setCurrentSlideIndex(currentSlideIndex + 1);
        } else {
            // Complete onboarding
            await AsyncStorage.setItem('hasSeenOnboarding', 'true');
            router.replace('/(tabs)');
        }
    };

    const handleSkip = async () => {
        await AsyncStorage.setItem('hasSeenOnboarding', 'true');
        router.replace('/(tabs)');
    };

    const CurrentSlide = slides[currentSlideIndex];

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={handleSkip}>
                    <Text style={styles.skipText}>Skip</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.slideContainer}>
                <Animated.View
                    key={CurrentSlide.id}
                    entering={FadeInRight}
                    exiting={FadeOutLeft}
                    style={styles.slideContent}
                >
                    <View style={[styles.iconContainer, { backgroundColor: CurrentSlide.color }]}>
                        <Ionicons name={CurrentSlide.icon as any} size={80} color="white" />
                    </View>
                    <Text style={styles.title}>{CurrentSlide.title}</Text>
                    <Text style={styles.description}>{CurrentSlide.description}</Text>
                </Animated.View>
            </View>

            <View style={styles.footer}>
                <View style={styles.dots}>
                    {slides.map((_, index) => (
                        <View
                            key={index}
                            style={[
                                styles.dot,
                                currentSlideIndex === index && styles.activeDot
                            ]}
                        />
                    ))}
                </View>

                <TouchableOpacity
                    style={styles.btn}
                    onPress={handleNext}
                >
                    <Text style={styles.btnText}>
                        {currentSlideIndex === slides.length - 1 ? 'Get Started' : 'Next'}
                    </Text>
                    <Ionicons name="arrow-forward" size={20} color="white" />
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'white',
    },
    header: {
        padding: 20,
        alignItems: 'flex-end',
    },
    skipText: {
        fontSize: 16,
        color: '#6b7280',
        fontWeight: '600',
    },
    slideContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    slideContent: {
        alignItems: 'center',
        paddingHorizontal: 40,
    },
    iconContainer: {
        width: 160,
        height: 160,
        borderRadius: 80,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 40,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 10,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#1f2937',
        textAlign: 'center',
        marginBottom: 16,
    },
    description: {
        fontSize: 16,
        color: '#6b7280',
        textAlign: 'center',
        lineHeight: 24,
    },
    footer: {
        padding: 32,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    dots: {
        flexDirection: 'row',
        gap: 8,
    },
    dot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: '#e5e7eb',
    },
    activeDot: {
        backgroundColor: '#3b82f6',
        width: 20,
    },
    btn: {
        backgroundColor: '#1f2937',
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 30,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    btnText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
});
