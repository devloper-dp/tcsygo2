import React, { useState } from 'react';
import { View, Modal, TouchableOpacity, Dimensions } from 'react-native';
import { Text } from '@/components/ui/text';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '@/contexts/ThemeContext';
 
const STEPS = [
    {
        id: '1',
        title: 'WELCOME TO TCSYGO!',
        description: 'Your trusted ride-sharing platform in Indore. Share rides, save money, and reduce your carbon footprint.',
        icon: 'rocket-outline',
        color: '#3b82f6'
    },
    {
        id: '2',
        title: 'QUICK & EASY BOOKING',
        description: 'Book rides in seconds. Choose from bikes, autos, or cars based on your preference.',
        icon: 'map-outline',
        color: '#10b981'
    },
    {
        id: '3',
        title: 'SAFE & SECURE',
        description: 'Your safety is our priority. Track your ride in real-time and share trip details.',
        icon: 'shield-checkmark-outline',
        color: '#8b5cf6'
    },
    {
        id: '4',
        title: 'SEAMLESS PAYMENTS',
        description: 'Enjoy hassle-free payments with our integrated wallet and Auto-pay.',
        icon: 'wallet-outline',
        color: '#f59e0b'
    }
];
 
export function OnboardingTutorial({ visible, onComplete }: { visible: boolean, onComplete: () => void }) {
    const { isDark } = useTheme();
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
        <Modal visible={visible} animationType="fade" transparent={false}>
            <View className="flex-1 bg-white dark:bg-slate-950">
                <View 
                    style={{ backgroundColor: step.color + (isDark ? '15' : '10') }}
                    className="flex-[0.6] justify-center items-center"
                >
                    <View className="w-56 h-56 rounded-[48px] bg-white dark:bg-slate-900 items-center justify-center shadow-2xl shadow-slate-200/50 dark:shadow-black">
                        <Ionicons name={step.icon as any} size={110} color={step.color} />
                    </View>
                </View>
 
                <View className="flex-[0.4] p-12 items-center justify-between">
                    <View className="items-center">
                        <Text className="text-3xl font-black text-center text-slate-900 dark:text-white mb-5 tracking-tighter uppercase">{step.title}</Text>
                        <Text className="text-base font-medium text-slate-500 dark:text-slate-400 text-center leading-6 uppercase tracking-tight">{step.description}</Text>
                    </View>
 
                    <View className="flex-row gap-3 my-10">
                        {STEPS.map((_, index) => (
                            <View
                                key={index}
                                style={{ 
                                    backgroundColor: currentStep === index ? step.color : (isDark ? '#1e293b' : '#e2e8f0'),
                                    width: currentStep === index ? 40 : 12 
                                }}
                                className="h-3 rounded-full"
                            />
                        ))}
                    </View>
 
                    <TouchableOpacity
                        style={{ backgroundColor: step.color }}
                        className="flex-row items-center justify-center h-20 rounded-[32px] px-12 gap-4 w-full shadow-2xl shadow-blue-500/30"
                        onPress={handleNext}
                        activeOpacity={0.9}
                    >
                        <Text className="text-white font-black text-xl uppercase tracking-[3px]">
                            {currentStep === STEPS.length - 1 ? 'Deploy' : 'Next'}
                        </Text>
                        <Ionicons name="arrow-forward" size={24} color="white" />
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
}
