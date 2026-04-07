import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '@/contexts/ThemeContext';
import { useResponsive } from '@/hooks/useResponsive';

const slides = [
    {
        id: '1',
        title: 'Book a Ride',
        description: 'Choose your destination and pick your favorite vehicle type.',
        icon: 'car-outline',
        color: '#3B82F6',
    },
    {
        id: '2',
        title: 'Track Location',
        description: 'Real-time tracking of your driver and estimated arrival time.',
        icon: 'location-outline',
        color: '#10B981',
    },
    {
        id: '3',
        title: 'Enjoy Your Trip',
        description: 'Safe and comfortable rides at your fingertips.',
        icon: 'happy-outline',
        color: '#F59E0B',
    },
];

export default function OnboardingScreen() {
    const router = useRouter();
    const { theme, isDark } = useTheme();
    const { spacing, fontSize, hScale, vScale } = useResponsive();
    const [currentSlideIndex, setCurrentSlideIndex] = useState(0);

    const handleNext = async () => {
        if (currentSlideIndex < slides.length - 1) {
            setCurrentSlideIndex(currentSlideIndex + 1);
        } else {
            // Complete onboarding
            await AsyncStorage.setItem('hasSeenOnboarding', 'true');
            router.replace('/login');
        }
    };

    const handleSkip = async () => {
        await AsyncStorage.setItem('hasSeenOnboarding', 'true');
        router.replace('/login');
    };

    const CurrentSlide = slides[currentSlideIndex];

    return (
        <SafeAreaView edges={['top']} className="flex-1 bg-white dark:bg-slate-950">
            <View style={{ padding: spacing.base, alignItems: 'flex-end' }}>
                <TouchableOpacity onPress={handleSkip}>
                    <Text style={{ fontSize: fontSize.base }} className="text-slate-500 dark:text-slate-400 font-black uppercase tracking-widest">Skip</Text>
                </TouchableOpacity>
            </View>

            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: spacing.xxl }}>
                <View 
                    style={{ 
                        backgroundColor: CurrentSlide.color,
                        width: hScale(160),
                        height: hScale(160),
                        borderRadius: hScale(80),
                        marginBottom: vScale(40)
                    }}
                    className="justify-center items-center shadow-lg shadow-black/10"
                >
                    <Ionicons name={CurrentSlide.icon as any} size={hScale(80)} color="white" />
                </View>
                <Text style={{ fontSize: fontSize.xxl }} className="font-black text-slate-900 dark:text-white text-center mb-4">{CurrentSlide.title}</Text>
                <Text style={{ fontSize: fontSize.base, lineHeight: fontSize.base * 1.5 }} className="text-slate-500 dark:text-slate-400 text-center font-medium">{CurrentSlide.description}</Text>
            </View>

            <View style={{ padding: spacing.xl, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View className="flex-row gap-2">
                    {slides.map((_, index) => (
                        <View
                            key={index}
                            style={{
                                height: hScale(10),
                                width: currentSlideIndex === index ? hScale(20) : hScale(10),
                                borderRadius: hScale(5)
                            }}
                            className={`${currentSlideIndex === index ? 'bg-blue-500' : 'bg-slate-200 dark:bg-slate-800'}`}
                        />
                    ))}
                </View>

                <TouchableOpacity 
                    style={{ paddingVertical: vScale(12), paddingHorizontal: hScale(24) }}
                    className="rounded-full flex-row items-center gap-2 bg-slate-100 dark:bg-slate-900"
                    onPress={handleNext}
                >
                    <Text style={{ fontSize: fontSize.base }} className="text-slate-900 dark:text-white font-black uppercase tracking-widest">
                        {currentSlideIndex === slides.length - 1 ? 'Get Started' : 'Next'}
                    </Text>
                    <Ionicons name="arrow-forward" size={hScale(20)} color={CurrentSlide.color} />
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}
