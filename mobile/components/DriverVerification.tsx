import React, { useState } from 'react';
import { View, StyleSheet, Image, TouchableOpacity, Alert, Modal, ScrollView } from 'react-native';
import { Text } from '@/components/ui/text';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '@/components/ui/card';
import { useTheme } from '@/contexts/ThemeContext';
 
interface DriverProps {
    name: string;
    photoUrl?: string;
    vehicleModel: string;
    vehicleColor: string;
    plateNumber: string;
    rating: number;
    trips: number;
}
 
export function DriverVerification({ driver, visible, onClose, onVerified }: { driver: DriverProps, visible: boolean, onClose: () => void, onVerified: () => void }) {
    const { theme } = useTheme();
    const isDark = theme === 'dark';
    const [step, setStep] = useState(0);
 
    const steps = [
        { title: 'Check License Plate', desc: `Does the plate match ${driver.plateNumber}?`, icon: 'car-outline' },
        { title: 'Verify Driver Photo', desc: 'Does the driver match the photo?', icon: 'person-outline' },
        { title: 'Confirm Car Details', desc: `Is it a ${driver.vehicleColor} ${driver.vehicleModel}?`, icon: 'information-circle-outline' },
    ];
 
    const handleNext = () => {
        if (step < steps.length - 1) {
            setStep(step + 1);
        } else {
            onVerified();
        }
    };
 
    return (
        <Modal visible={visible} animationType="fade" presentationStyle="pageSheet">
            <View className="flex-1 bg-slate-50 dark:bg-slate-950">
                <View className="flex-row justify-between items-center p-6 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 shadow-sm">
                    <Text className="text-xl font-black text-slate-900 dark:text-white">Verify Your Ride</Text>
                    <TouchableOpacity 
                        onPress={onClose}
                        className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 items-center justify-center"
                    >
                        <Ionicons name="close" size={24} color={isDark ? "#94a3b8" : "#475569"} />
                    </TouchableOpacity>
                </View>
 
                <ScrollView contentContainerStyle={{ padding: 24 }}>
                    <View className="flex-row items-center mb-10 bg-white dark:bg-slate-900 p-6 rounded-[32px] border border-slate-100 dark:border-slate-800 shadow-sm">
                        <Image
                            source={{ uri: driver.photoUrl || 'https://via.placeholder.com/150' }}
                            className="w-20 h-20 rounded-full mr-6 border-4 border-slate-50 dark:border-slate-800"
                        />
                        <View className="flex-1">
                            <Text className="text-2xl font-black text-slate-900 dark:text-white mb-1">{driver.name}</Text>
                            <View className="flex-row items-center gap-2">
                                <Ionicons name="star" size={16} color="#f59e0b" />
                                <Text className="text-sm font-bold text-slate-500 dark:text-slate-400">{driver.rating} • {driver.trips} trips</Text>
                            </View>
                        </View>
                    </View>
 
                    <Card className="p-10 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[40px] items-center mb-10 shadow-xl shadow-slate-200/50 dark:shadow-slate-950">
                        <View className="w-32 h-32 rounded-full bg-blue-50 dark:bg-blue-900/10 items-center justify-center mb-10 border-4 border-white dark:border-slate-900 shadow-lg shadow-blue-500/10">
                            <Ionicons name={steps[step].icon as any} size={64} color="#3b82f6" />
                        </View>
                        <Text className="text-2xl font-black text-slate-900 dark:text-white mb-3 text-center tracking-tight">{steps[step].title}</Text>
                        <Text className="text-base font-medium text-slate-500 dark:text-slate-400 text-center mb-10 leading-6">{steps[step].desc}</Text>
 
                        <View className="bg-amber-400 dark:bg-amber-500 px-8 py-4 rounded-2xl border-4 border-slate-900 dark:border-slate-800 shadow-lg shadow-amber-500/20">
                            <Text className="text-2xl font-black text-slate-900 tracking-[4px] uppercase">{driver.plateNumber}</Text>
                        </View>
                    </Card>
 
                    <View className="flex-row justify-center gap-3">
                        {steps.map((_, i) => (
                            <View 
                                key={i} 
                                className={`h-2.5 rounded-full ${i === step ? 'bg-blue-600 w-10' : 'bg-slate-200 dark:bg-slate-800 w-2.5'}`}
                            />
                        ))}
                    </View>
                </ScrollView>
 
                <View className="p-6 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex-row gap-4">
                    <TouchableOpacity 
                        className="flex-1 h-16 rounded-[24px] bg-rose-50 dark:bg-rose-900/10 items-center justify-center border border-rose-100 dark:border-rose-900/20" 
                        onPress={() => Alert.alert('Report', 'Details do not match')}
                    >
                        <Text className="text-rose-600 dark:text-rose-400 font-bold text-base">Report Mismatch</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                        className="flex-[1.5] h-16 rounded-[24px] bg-emerald-600 active:bg-emerald-700 items-center justify-center shadow-lg shadow-emerald-500/20" 
                        onPress={handleNext}
                    >
                        <Text className="text-white font-black text-lg">
                            {step === steps.length - 1 ? 'Everything Matches' : 'Yes, Matches'}
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
}
 
const styles = StyleSheet.create({});
