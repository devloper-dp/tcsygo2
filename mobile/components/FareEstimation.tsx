import React, { useEffect, useState } from 'react';
import { View, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Text } from '@/components/ui/text';
import { Card } from '@/components/ui/card';
import { Ionicons } from '@expo/vector-icons';
import { RideService, FareEstimate } from '@/services/RideService';
import { useTheme } from '@/contexts/ThemeContext';
 
interface FareEstimationProps {
    pickupCoords: { lat: number; lng: number };
    dropCoords: { lat: number; lng: number };
    onBook: (vehicleType: string, price: number) => void;
}
 
export function FareEstimation({ pickupCoords, dropCoords, onBook }: FareEstimationProps) {
    const { isDark } = useTheme();
    const [loading, setLoading] = useState(false);
    const [estimate, setEstimate] = useState<FareEstimate | null>(null);
    const [selectedType, setSelectedType] = useState<string>('bike');
 
    useEffect(() => {
        fetchEstimate();
    }, [pickupCoords, dropCoords]);
 
    const fetchEstimate = async () => {
        setLoading(true);
        try {
            const data = await RideService.estimateFare(pickupCoords, dropCoords);
            setEstimate(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };
 
    if (loading) {
        return (
            <View className="p-8 items-center gap-4">
                <ActivityIndicator size="small" color={isDark ? "#ffffff" : "#3b82f6"} />
                <Text className="text-slate-500 dark:text-slate-500 text-[10px] font-black uppercase tracking-widest text-center">Syncing Terminal Fares...</Text>
            </View>
        );
    }
 
    if (!estimate) return null;
 
    const vehicles = [
        { id: 'bike', name: 'BIKE', icon: 'bicycle', multiplier: 0.5, time: estimate.durationMins },
        { id: 'auto', name: 'AUTO', icon: 'car-sport', multiplier: 0.8, time: estimate.durationMins + 2 },
        { id: 'cab', name: 'CAB', icon: 'car', multiplier: 1.5, time: estimate.durationMins + 5 },
    ];
 
    return (
        <Card className="p-8 bg-white dark:bg-slate-900 rounded-[40px] mb-6 border border-slate-100 dark:border-slate-800 shadow-xl overflow-visible">
            <View className="flex-row items-center justify-between mb-8">
                <Text className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tighter">Tactical Deployment</Text>
                {estimate.surgeMultiplier > 1 && (
                    <View className="flex-row items-center bg-red-500 dark:bg-red-600 px-3 py-1.5 rounded-full g-1.5">
                        <Ionicons name="flash" size={12} color="white" />
                        <Text className="text-[9px] font-black text-white uppercase tracking-widest ml-1">
                            SURGE ACTIVE {estimate.surgeMultiplier}X
                        </Text>
                    </View>
                )}
            </View>
 
            <View className="flex-row gap-4 mb-8">
                {vehicles.map((v) => {
                    const price = Math.round(estimate.estimatedPrice * v.multiplier);
                    const isActive = selectedType === v.id;
 
                    return (
                        <TouchableOpacity
                            key={v.id}
                            className={`flex-1 p-5 rounded-[24px] items-center border-2 transition-all ${isActive 
                                ? 'bg-slate-900 dark:bg-white border-slate-900 dark:border-white shadow-lg' 
                                : 'bg-slate-50 dark:bg-slate-950 border-slate-100 dark:border-slate-800'}`}
                            onPress={() => setSelectedType(v.id)}
                        >
                            <View className={`mb-3 w-10 h-10 rounded-xl items-center justify-center ${isActive ? 'bg-white/10 dark:bg-slate-900/10' : 'bg-white dark:bg-slate-900'}`}>
                                <Ionicons
                                    name={v.icon as any}
                                    size={20}
                                    color={isActive ? (isDark ? '#0f172a' : '#ffffff') : (isDark ? '#475569' : '#94a3b8')}
                                />
                            </View>
                            <Text className={`text-[9px] font-black mb-1 uppercase tracking-widest ${isActive ? 'text-white dark:text-slate-900' : 'text-slate-500 dark:text-slate-500'}`}>
                                {v.name}
                            </Text>
                            <Text className={`text-[10px] font-bold mb-2 uppercase tracking-tight ${isActive ? 'text-blue-200 dark:text-blue-800' : 'text-slate-400 dark:text-slate-600'}`}>
                                {v.time} MIN
                            </Text>
                            <Text className={`text-sm font-black uppercase tracking-tighter ${isActive ? 'text-white dark:text-slate-900' : 'text-slate-900 dark:text-white'}`}>
                                ₹{price}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </View>
 
            <TouchableOpacity
                className="bg-slate-900 dark:bg-white h-16 rounded-[24px] flex-row items-center justify-center gap-3 shadow-2xl active:opacity-90"
                onPress={() => {
                    const vehicle = vehicles.find(v => v.id === selectedType);
                    if (vehicle) {
                        const price = Math.round(estimate.estimatedPrice * vehicle.multiplier);
                        onBook(selectedType, price);
                    }
                }}
            >
                <Text className="text-white dark:text-slate-900 font-black uppercase tracking-[3px] text-sm">
                    BOOK {vehicles.find(v => v.id === selectedType)?.name}
                </Text>
                <Ionicons name="arrow-forward" size={18} color={isDark ? "#0f172a" : "#ffffff"} />
            </TouchableOpacity>
        </Card>
    );
}
