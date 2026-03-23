import React, { useState, useEffect } from 'react';
import { View, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Text } from '@/components/ui/text';
import { Bike, Car, Zap, Clock, IndianRupee } from 'lucide-react-native';
import { Ionicons } from '@expo/vector-icons';
import { RideService, FareEstimate } from '@/services/RideService';
import { useTheme } from '@/contexts/ThemeContext';
 
interface VehicleType {
    id: 'bike' | 'auto' | 'cab' | 'premium';
    name: string;
    icon: string;
    description: string;
    multiplier: number;
    capacity: number;
    features: string[];
}
 
interface VehicleTypeSelectorProps {
    pickupCoords: { lat: number; lng: number };
    dropCoords: { lat: number; lng: number };
    onSelect: (vehicleType: string, price: number, eta: number) => void;
    selectedType?: string;
}
 
export const VehicleTypeSelector: React.FC<VehicleTypeSelectorProps> = ({
    pickupCoords,
    dropCoords,
    onSelect,
    selectedType: initialSelectedType,
}) => {
    const { theme } = useTheme();
    const isDark = theme === 'dark';
    const [selectedType, setSelectedType] = useState<string>(initialSelectedType || 'bike');
    const [loading, setLoading] = useState(true);
    const [baseEstimate, setBaseEstimate] = useState<FareEstimate | null>(null);
    const [surgeActive, setSurgeActive] = useState(false);
 
    const vehicleTypes: VehicleType[] = [
        {
            id: 'bike',
            name: 'Bike',
            icon: 'bicycle',
            description: 'Affordable & Fast',
            multiplier: 0.5,
            capacity: 1,
            features: ['Quick pickup', 'Beat traffic', 'Eco-friendly'],
        },
        {
            id: 'auto',
            name: 'Auto',
            icon: 'car-sport',
            description: 'Comfortable Ride',
            multiplier: 0.8,
            capacity: 3,
            features: ['More space', 'Weather protection', 'Affordable'],
        },
        {
            id: 'cab',
            name: 'Cab',
            icon: 'car',
            description: 'Premium Comfort',
            multiplier: 1.5,
            capacity: 4,
            features: ['AC available', 'Spacious', 'Professional drivers'],
        },
        {
            id: 'premium',
            name: 'Premium',
            icon: 'car-sport-outline',
            description: 'Luxury Experience',
            multiplier: 2.0,
            capacity: 4,
            features: ['Luxury cars', 'Top-rated drivers', 'Premium service'],
        },
    ];
 
    useEffect(() => {
        loadFareEstimate();
    }, [pickupCoords, dropCoords]);
 
    const loadFareEstimate = async () => {
        setLoading(true);
        try {
            const estimate = await RideService.estimateFare(pickupCoords, dropCoords);
            setBaseEstimate(estimate);
            setSurgeActive(estimate.surgeMultiplier > 1);
        } catch (error) {
            console.error('Error loading fare estimate:', error);
        } finally {
            setLoading(false);
        }
    };
 
    const handleSelectVehicle = (vehicle: VehicleType) => {
        if (!baseEstimate) return;
 
        setSelectedType(vehicle.id);
        const price = Math.round(baseEstimate.estimatedPrice * vehicle.multiplier);
        const eta = Math.round(baseEstimate.durationMins + (vehicle.id === 'bike' ? 0 : vehicle.id === 'auto' ? 2 : 5));
 
        onSelect(vehicle.id, price, eta);
    };
 
    const calculatePrice = (multiplier: number): number => {
        if (!baseEstimate) return 0;
        return Math.round(baseEstimate.estimatedPrice * multiplier);
    };
 
    const calculateETA = (vehicleId: string): number => {
        if (!baseEstimate) return 0;
        const baseETA = baseEstimate.durationMins;
 
        switch (vehicleId) {
            case 'bike':
                return baseETA;
            case 'auto':
                return baseETA + 2;
            case 'cab':
            case 'premium':
                return baseETA + 5;
            default:
                return baseETA;
        }
    };
 
    if (loading) {
        return (
            <View className="p-10 items-center justify-center gap-4">
                <ActivityIndicator size="large" color="#3b82f6" />
                <Text className="text-sm font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Finding best options...</Text>
            </View>
        );
    }
 
    return (
        <View className="p-4">
            <View className="flex-row items-center justify-between mb-6">
                <Text className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Choose Your Ride</Text>
                {surgeActive && (
                    <View className="flex-row items-center bg-rose-500 px-3 py-1.5 rounded-full gap-1.5 shadow-lg shadow-rose-500/20">
                        <Zap size={14} color="#fff" fill="#fff" />
                        <Text className="text-[10px] font-black text-white uppercase tracking-widest">
                            {baseEstimate?.surgeMultiplier}x Surge
                        </Text>
                    </View>
                )}
            </View>
 
            {baseEstimate && (
                <View className="flex-row items-center bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl mb-6 border border-slate-100 dark:border-slate-800/30">
                    <View className="flex-row items-center gap-2">
                        <View className="w-8 h-8 rounded-full bg-blue-500/10 items-center justify-center">
                            <Ionicons name="navigate" size={16} color="#3b82f6" />
                        </View>
                        <Text className="text-sm font-black text-slate-700 dark:text-slate-300">
                            {baseEstimate.distanceKm} km
                        </Text>
                    </View>
                    <View className="w-px h-6 bg-slate-200 dark:bg-slate-700 mx-6" />
                    <View className="flex-row items-center gap-2">
                        <View className="w-8 h-8 rounded-full bg-amber-500/10 items-center justify-center">
                            <Clock size={16} color="#f59e0b" />
                        </View>
                        <Text className="text-sm font-black text-slate-700 dark:text-slate-300">
                            ~{baseEstimate.durationMins} mins
                        </Text>
                    </View>
                </View>
            )}
 
            <View className="flex-row flex-wrap gap-3">
                {vehicleTypes.map((vehicle) => {
                    const isSelected = selectedType === vehicle.id;
                    const price = calculatePrice(vehicle.multiplier);
                    const eta = calculateETA(vehicle.id);
 
                    return (
                        <TouchableOpacity
                            key={vehicle.id}
                            className={`w-[48%] rounded-[28px] p-5 border-2 ${
                                isSelected 
                                    ? 'bg-blue-600 border-blue-600 shadow-xl shadow-blue-500/30' 
                                    : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 shadow-sm'
                            }`}
                            onPress={() => handleSelectVehicle(vehicle)}
                            activeOpacity={0.8}
                        >
                            <View className="flex-row justify-between items-start mb-4">
                                <View className={`w-14 h-14 rounded-2xl items-center justify-center ${isSelected ? 'bg-white/20' : 'bg-slate-50 dark:bg-slate-800'}`}>
                                    <Ionicons
                                        name={vehicle.icon as any}
                                        size={32}
                                        color={isSelected ? '#fff' : (isDark ? '#e2e8f0' : '#1e293b')}
                                    />
                                </View>
                                {isSelected && (
                                    <View className="bg-white dark:bg-slate-900 rounded-full p-0.5 shadow-sm">
                                        <Ionicons name="checkmark-circle" size={20} color="#10b981" />
                                    </View>
                                )}
                            </View>
 
                            <Text className={`text-lg font-black ${isSelected ? 'text-white' : 'text-slate-900 dark:text-white'}`}>
                                {vehicle.name}
                            </Text>
                            <Text className={`text-[10px] font-bold uppercase tracking-widest mb-4 ${isSelected ? 'text-blue-100/70' : 'text-slate-400 dark:text-slate-500'}`}>
                                {vehicle.description}
                            </Text>
 
                            <View className="flex-row items-center gap-1.5 mb-6">
                                <Ionicons
                                    name="person"
                                    size={12}
                                    color={isSelected ? '#bfdbfe' : '#94a3b8'}
                                />
                                <Text className={`text-[10px] font-black uppercase ${isSelected ? 'text-blue-100' : 'text-slate-400 dark:text-slate-500'}`}>
                                    {vehicle.capacity} {vehicle.capacity === 1 ? 'seat' : 'seats'}
                                </Text>
                            </View>
 
                            <View className="flex-row items-end justify-between border-t pt-4" style={{ borderTopColor: isSelected ? 'rgba(255,255,255,0.1)' : (isDark ? '#1e293b' : '#f1f5f9') }}>
                                <View className="flex-row items-center">
                                    <Text className={`text-base font-black ${isSelected ? 'text-white' : 'text-slate-900 dark:text-white'}`}>₹</Text>
                                    <Text className={`text-2xl font-black ${isSelected ? 'text-white' : 'text-slate-900 dark:text-white'}`}>
                                        {price}
                                    </Text>
                                </View>
                                <Text className={`text-[10px] font-black uppercase ${isSelected ? 'text-blue-100' : 'text-slate-500 dark:text-slate-400'}`}>
                                    {eta} min
                                </Text>
                            </View>
                        </TouchableOpacity>
                    );
                })}
            </View>
 
            {surgeActive && baseEstimate && (
                <View className="flex-row items-center bg-rose-50 dark:bg-rose-950/20 p-5 rounded-2xl mt-8 gap-4 border border-rose-100 dark:border-rose-900/20">
                    <View className="w-10 h-10 rounded-full bg-rose-500/10 items-center justify-center">
                        <Zap size={20} color="#ef4444" fill="#ef4444" />
                    </View>
                    <Text className="flex-1 text-xs font-medium text-rose-700 dark:text-rose-400 leading-4">
                        High demand in your area. Prices are {baseEstimate.surgeMultiplier}x higher than usual.
                    </Text>
                </View>
            )}
        </View>
    );
};
 
const styles = StyleSheet.create({});
