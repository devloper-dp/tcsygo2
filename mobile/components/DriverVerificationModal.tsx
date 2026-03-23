import React from 'react';
import { View, Modal, TouchableOpacity, Image } from 'react-native';
import { Text } from './ui/text';
import { Button } from './ui/button';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Shield, Check, X, Car } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
 
interface DriverVerificationModalProps {
    isVisible: boolean;
    onClose: () => void;
    driver: any;
    onVerify: () => void;
}
 
export function DriverVerificationModal({ isVisible, onClose, driver, onVerify }: DriverVerificationModalProps) {
    const { theme } = useTheme();
    const isDark = theme === 'dark';
 
    if (!driver) return null;
 
    return (
        <Modal
            animationType="slide"
            transparent={true}
            visible={isVisible}
            onRequestClose={onClose}
        >
            <View className="flex-1 justify-end bg-black/50">
                <View className="bg-white dark:bg-slate-900 rounded-t-[32px] p-8 shadow-2xl">
                    <View className="items-center mb-8">
                        <View className="w-12 h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full mb-8" />
                        <View className="bg-blue-600/10 dark:bg-blue-400/10 p-5 rounded-3xl mb-4 border border-blue-100 dark:border-blue-900/30">
                            <Shield size={42} color={isDark ? "#60a5fa" : "#2563eb"} />
                        </View>
                        <Text className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Verify Driver Identity</Text>
                        <Text className="text-slate-500 dark:text-slate-400 text-center mt-2 px-4 leading-5 font-medium">
                            For your safety, please ensure the driver and vehicle match the details below.
                        </Text>
                    </View>
 
                    <View className="bg-slate-50 dark:bg-slate-800/40 rounded-[28px] p-6 mb-8 border border-slate-100 dark:border-slate-800/50">
                        <View className="flex-row items-center gap-5 mb-6">
                            <Avatar className="w-20 h-20 rounded-3xl">
                                <AvatarImage src={driver.user?.profile_photo} />
                                <AvatarFallback className="bg-slate-200 dark:bg-slate-700">
                                    <Text className="text-2xl font-black text-slate-600 dark:text-slate-300">
                                        {driver.user?.full_name?.charAt(0)}
                                    </Text>
                                </AvatarFallback>
                            </Avatar>
                            <View className="flex-1">
                                <Text className="text-xl font-black text-slate-900 dark:text-white">{driver.user?.full_name}</Text>
                                <View className="flex-row items-center gap-2 mt-1">
                                    <View className="bg-amber-100 dark:bg-amber-900/30 px-2 py-0.5 rounded-md flex-row items-center gap-1">
                                        <Text className="text-sm font-black text-amber-700 dark:text-amber-400">{driver.rating} ★</Text>
                                    </View>
                                    <Text className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Verified Pro</Text>
                                </View>
                            </View>
                        </View>
 
                        <View className="h-px bg-slate-200 dark:bg-slate-700/50 w-full mb-6" />
 
                        <View className="flex-row items-center gap-5">
                            <View className="w-14 h-14 bg-white dark:bg-slate-800 rounded-2xl justify-center items-center shadow-sm border border-slate-100 dark:border-slate-700">
                                <Car size={28} color={isDark ? "#94a3b8" : "#475569"} />
                            </View>
                            <View className="flex-1">
                                <Text className="text-base font-black text-slate-900 dark:text-white">{driver.vehicle_make} {driver.vehicle_model}</Text>
                                <View className="flex-row items-center gap-2">
                                    <Text className="text-sm font-bold text-slate-500 dark:text-slate-400">{driver.vehicle_plate}</Text>
                                    <View className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-700" />
                                    <Text className="text-sm font-bold text-slate-500 dark:text-slate-400">{driver.vehicle_color}</Text>
                                </View>
                            </View>
                        </View>
                    </View>
 
                    <View className="flex-row gap-4 mb-2">
                        <TouchableOpacity
                            className="flex-1 h-16 rounded-[24px] border-2 border-slate-100 dark:border-slate-800 items-center justify-center bg-white dark:bg-slate-900"
                            onPress={onClose}
                        >
                            <Text className="font-black text-slate-500 dark:text-slate-400">Not Matching</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            className="flex-1 h-16 rounded-[24px] bg-emerald-600 active:bg-emerald-700 items-center justify-center shadow-lg shadow-emerald-500/20"
                            onPress={onVerify}
                        >
                            <View className="flex-row items-center gap-2">
                                <Check size={20} color="white" strokeWidth={3} />
                                <Text className="text-white font-black text-lg">Matches</Text>
                            </View>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}
