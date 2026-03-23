import { View } from 'react-native';
import { Text } from '@/components/ui/text';
import { Card } from '@/components/ui/card';
import { Ionicons } from '@expo/vector-icons';
import { useState, useEffect } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
 
const safetyTips = [
    {
        icon: 'shield-checkmark',
        title: 'VERIFY DRIVER',
        description: 'Always check driver details and vehicle number before boarding',
    },
    {
        icon: 'people',
        title: 'SHARE TRIP DETAILS',
        description: 'Share your trip details with friends or family',
    },
    {
        icon: 'call',
        title: 'EMERGENCY CONTACT',
        description: 'Keep emergency contacts handy and accessible',
    },
    {
        icon: 'location',
        title: 'TRACK YOUR RIDE',
        description: 'Use real-time tracking to monitor your journey',
    },
    {
        icon: 'star',
        title: 'RATE & REVIEW',
        description: 'Help the community by rating your experience',
    },
];
 
export function SafetyTips() {
    const { isDark } = useTheme();
    const [currentTip, setCurrentTip] = useState(0);
 
    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentTip((prev) => (prev + 1) % safetyTips.length);
        }, 5000);
 
        return () => clearInterval(interval);
    }, []);
 
    const tip = safetyTips[currentTip];
 
    return (
        <Card className="p-10 bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/20 rounded-[40px] shadow-2xl shadow-amber-900/5">
            <View className="items-center">
                <View className="w-20 h-20 rounded-[28px] bg-amber-100 dark:bg-amber-900/30 items-center justify-center mb-8 shadow-xl shadow-amber-900/20">
                    <Ionicons name={tip.icon as any} size={36} color={isDark ? "#fbbf24" : "#f59e0b"} />
                </View>
                <Text className="font-black text-2xl text-amber-900 dark:text-amber-200 mb-4 text-center tracking-tighter uppercase">{tip.title}</Text>
                <Text className="text-sm text-amber-800/70 dark:text-amber-100/60 text-center mb-10 leading-6 font-black px-6 uppercase tracking-tight">
                    {tip.description}
                </Text>
                <View className="flex-row gap-3">
                    {safetyTips.map((_, index) => (
                        <View
                            key={index}
                            className={`h-3 rounded-full transition-all ${index === currentTip 
                                ? 'bg-amber-500 w-10' 
                                : 'bg-amber-200 dark:bg-amber-900/40 w-3'
                            }`}
                        />
                    ))}
                </View>
            </View>
        </Card>
    );
}
