import React, { useState, useEffect } from 'react';
import { View, TouchableOpacity, Modal, ScrollView, ActivityIndicator, Pressable } from 'react-native';
import Animated, {
    FadeInDown,
    FadeOut,
    SlideInDown,
    Layout
} from 'react-native-reanimated';
import { Text } from '@/components/ui/text';
import { Ionicons } from '@expo/vector-icons';
import { RideService, FareEstimate } from '@/services/RideService';
import { QuickBookService } from '@/services/QuickBookService';
import { PromoCodeService, PromoCodeValidation } from '@/services/PromoCodeService';
import { Coordinates } from '@/lib/maps';
import { Input } from '@/components/ui/input';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/contexts/ThemeContext';
 
interface QuickBookModalProps {
    visible: boolean;
    onClose: () => void;
    pickup: { address: string; coords: Coordinates };
    drop: { address: string; coords: Coordinates };
    onBookingSuccess: (bookingId: string) => void;
}
 
const VEHICLE_TYPES = [
    { id: 'bike', name: 'BIKE', icon: 'bicycle-outline', description: 'FASTEST FOR CITY TRAFFIC' },
    { id: 'auto', name: 'AUTO', icon: 'car-outline', description: 'COMFORTABLE AT LOCAL RATES' },
    { id: 'car', name: 'CAB', icon: 'car-sport-outline', description: 'PREMIUM \u0026 AC COMFORT' },
] as const;
 
export function QuickBookModal({ visible, onClose, pickup, drop, onBookingSuccess }: QuickBookModalProps) {
    const { isDark } = useTheme();
    const [selectedType, setSelectedType] = useState<'bike' | 'auto' | 'car'>('bike');
    const [estimates, setEstimates] = useState<Record<string, FareEstimate>>({});
    const [loading, setLoading] = useState(true);
    const [bookingInProgress, setBookingInProgress] = useState(false);
    const [promoCode, setPromoCode] = useState('');
    const [promoValidation, setPromoValidation] = useState<PromoCodeValidation | null>(null);
    const [validatingPromo, setValidatingPromo] = useState(false);
 
    useEffect(() => {
        if (visible) {
            fetchEstimates();
        }
    }, [visible, pickup.coords, drop.coords]);
 
    const fetchEstimates = async () => {
        setLoading(true);
        try {
            const results = await Promise.all(
                VEHICLE_TYPES.map(t => RideService.estimateFare(pickup.coords, drop.coords, t.id))
            );
            const newEstimates: Record<string, FareEstimate> = {};
            VEHICLE_TYPES.forEach((t, i) => {
                newEstimates[t.id] = results[i];
            });
            setEstimates(newEstimates);
        } catch (error) {
            console.error('Error fetching estimates:', error);
        } finally {
            setLoading(false);
        }
    };
 
    const handleApplyPromo = async () => {
        if (!promoCode) return;
        setValidatingPromo(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('User not found');
 
            const estimate = estimates[selectedType];
            const result = await PromoCodeService.validatePromoCode(
                promoCode,
                user.id,
                estimate?.estimatedPrice || 0,
                selectedType
            );
            setPromoValidation(result);
        } catch (error) {
            console.error('Promo validation error:', error);
        } finally {
            setValidatingPromo(false);
        }
    };
 
    const handleBook = async () => {
        setBookingInProgress(true);
        try {
            const response = await QuickBookService.quickBook({
                pickupLocation: {
                    latitude: pickup.coords.lat,
                    longitude: pickup.coords.lng,
                    address: pickup.address,
                },
                dropLocation: {
                    latitude: drop.coords.lat,
                    longitude: drop.coords.lng,
                    address: drop.address,
                },
                vehicleType: selectedType,
                promoCode: promoValidation?.valid ? promoCode : undefined,
                discountAmount: promoValidation?.valid ? promoValidation.discount : 0,
            });
 
            if (response.success && response.bookingId) {
                onBookingSuccess(response.bookingId);
                onClose();
            } else {
                alert(response.error || 'Failed to book ride. Please try again.');
            }
        } catch (error) {
            console.error('Booking error:', error);
            alert('Something went wrong. Please check your connection.');
        } finally {
            setBookingInProgress(false);
        }
    };
 
    return (
        <Modal
            visible={visible}
            animationType="fade"
            transparent={true}
            onRequestClose={onClose}
        >
            <View className="flex-1 justify-end bg-black/60">
                <Animated.View
                    entering={SlideInDown.springify().damping(20).stiffness(100)}
                    exiting={FadeOut}
                    className="bg-white dark:bg-slate-900 rounded-t-[48px] p-10 max-h-[90%] overflow-hidden shadow-2xl border-t border-slate-100 dark:border-slate-800"
                >
                    <View className="flex-row items-center justify-between mb-10">
                        <Text className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter uppercase">DEPLOY UNIT</Text>
                        <TouchableOpacity 
                            onPress={onClose} 
                            className="w-12 h-12 rounded-2xl bg-slate-50 dark:bg-slate-800 items-center justify-center border border-slate-100 dark:border-slate-700"
                        >
                            <Ionicons name="close" size={24} color={isDark ? "#ffffff" : "#0f172a"} />
                        </TouchableOpacity>
                    </View>
 
                    <View className="bg-slate-50 dark:bg-slate-950 rounded-[32px] p-6 mb-10 border border-slate-100 dark:border-slate-800/50">
                        <View className="flex-row items-center gap-5">
                            <View className="w-3 h-3 rounded-full bg-blue-500 border-2 border-white dark:border-slate-900 shadow-xl" />
                            <Text className="flex-1 text-sm font-black text-slate-600 dark:text-slate-400 uppercase tracking-tight" numberOfLines={1}>{pickup.address}</Text>
                        </View>
                        <View className="ml-[6px] w-[1px] h-6 bg-slate-200 dark:bg-slate-800 my-1" />
                        <View className="flex-row items-center gap-5">
                            <View className="w-3 h-3 rounded-full bg-slate-900 dark:bg-white border-2 border-white dark:border-slate-800 shadow-xl" />
                            <Text className="flex-1 text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight" numberOfLines={1}>{drop.address}</Text>
                        </View>
                    </View>
 
                    {loading ? (
                        <View className="py-24 items-center justify-center">
                            <ActivityIndicator size="small" color={isDark ? "#ffffff" : "#3b82f6"} />
                            <Text className="mt-4 text-[10px] font-black text-slate-500 dark:text-slate-500 uppercase tracking-widest text-center">Syncing Tactical Fares...</Text>
                        </View>
                    ) : (
                        <ScrollView className="mb-10" showsVerticalScrollIndicator={false}>
                            {VEHICLE_TYPES.map((type, index) => {
                                const estimate = estimates[type.id];
                                const isSelected = selectedType === type.id;
 
                                return (
                                    <Animated.View
                                        key={type.id}
                                        entering={FadeInDown.delay(100 * index)}
                                        layout={Layout.springify()}
                                    >
                                        <Pressable
                                            className={`flex-row items-center p-6 rounded-[32px] border-2 mb-4 transition-all ${isSelected ? 'border-slate-900 dark:border-white bg-slate-50 dark:bg-slate-800/50 shadow-2xl' : 'border-slate-50 dark:border-slate-800/50 bg-transparent'}`}
                                            onPress={() => setSelectedType(type.id)}
                                        >
                                            <View className={`w-16 h-16 rounded-[20px] items-center justify-center border-2 ${isSelected ? 'bg-slate-900 dark:bg-white border-slate-900 dark:border-white shadow-xl shadow-black/20' : 'bg-slate-50 dark:bg-slate-800 border-slate-100 dark:border-slate-700'}`}>
                                                <Ionicons name={type.icon} size={28} color={isSelected ? (isDark ? '#0f172a' : '#ffffff') : (isDark ? '#475569' : '#94a3b8')} />
                                            </View>
                                            <View className="flex-1 ml-6">
                                                <View className="flex-row items-center gap-3 mb-1.5">
                                                    <Text className={`text-xl font-black tracking-tight ${isSelected ? 'text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400'}`}>{type.name}</Text>
                                                    {isSelected && (
                                                       <View className="bg-blue-600 dark:bg-blue-500 px-2 py-0.5 rounded-lg">
                                                            <Text className="text-[8px] font-black text-white uppercase tracking-tighter">OPTIMAL</Text>
                                                       </View>
                                                    )}
                                                </View>
                                                <Text className="text-[9px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-widest leading-3">{type.description}</Text>
                                                {!!estimate && estimate.surgeMultiplier > 1 && (
                                                    <View className="flex-row items-center gap-1 bg-red-500 dark:bg-red-600 self-start px-2 py-0.5 rounded-full mt-2.5">
                                                        <Ionicons name="flash" size={8} color="white" />
                                                        <Text className="text-[8px] font-black text-white uppercase tracking-tighter">
                                                            ACTIVE {estimate.surgeMultiplier}X
                                                        </Text>
                                                    </View>
                                                )}
                                            </View>
                                            <View className="items-end">
                                                <Text className={`text-2xl font-black tracking-tighter ${isSelected ? 'text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400'}`}>
                                                    ₹{estimate?.estimatedPrice || '--'}
                                                </Text>
                                                {!!estimate && estimate.surgeMultiplier > 1 && (
                                                    <Text className="text-[10px] font-black text-slate-400 dark:text-slate-600 line-through uppercase tracking-tighter">₹{estimate.basePrice}</Text>
                                                )}
                                            </View>
                                        </Pressable>
                                    </Animated.View>
                                );
                            })}
                        </ScrollView>
                    )}
 
                    <View className="border-t border-slate-100 dark:border-slate-800 pt-10">
                        <View className="mb-8">
                            <View className="flex-row items-center bg-slate-50 dark:bg-slate-950 rounded-[28px] px-6 border border-slate-100 dark:border-slate-800">
                                <Ionicons name="pricetag-outline" size={20} color={isDark ? "#94a3b8" : "#4b5563"} />
                                <Input
                                    placeholder="PROMO CODE"
                                    value={promoCode}
                                    onChangeText={(text) => {
                                        setPromoCode(text.toUpperCase());
                                        setPromoValidation(null);
                                    }}
                                    className="flex-1 h-14 font-black border-0 bg-transparent uppercase tracking-widest text-sm"
                                    placeholderTextColor={isDark ? "#475569" : "#94a3b8"}
                                    autoCapitalize="characters"
                                />
                                <TouchableOpacity
                                    onPress={handleApplyPromo}
                                    disabled={!promoCode || validatingPromo}
                                    className="bg-slate-900 dark:bg-white px-5 py-2.5 rounded-2xl shadow-xl shadow-black/10"
                                >
                                    {validatingPromo ? (
                                        <ActivityIndicator size="small" color={isDark ? '#0f172a' : '#fff'} />
                                    ) : (
                                        <Text className="text-white dark:text-slate-900 font-black text-[10px] uppercase tracking-[2px]">Apply</Text>
                                    )}
                                </TouchableOpacity>
                            </View>
                            {!!promoValidation && (
                                <Text className={`text-[10px] font-black uppercase tracking-widest mt-3 ml-4 ${promoValidation.valid ? 'text-emerald-500' : 'text-rose-500'}`}>
                                    {promoValidation.message}
                                </Text>
                            )}
                        </View>
 
                        <View className="flex-row items-center justify-between mb-10 bg-slate-50/50 dark:bg-slate-950/50 p-6 rounded-[32px] border border-slate-100 dark:border-slate-800">
                            <View className="flex-row items-center gap-5">
                                <View className="w-12 h-12 rounded-2xl bg-white dark:bg-slate-900 items-center justify-center border border-slate-100 dark:border-slate-700 shadow-sm">
                                    <Ionicons name="wallet-outline" size={24} color={isDark ? "#ffffff" : "#0f172a"} />
                                </View>
                                <View>
                                    <Text className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">PERSONAL • WALLET</Text>
                                    {!!promoValidation && promoValidation.valid && (
                                        <Text className="text-[10px] font-black text-emerald-500 dark:text-emerald-400 uppercase tracking-tighter mt-1">DISCOUNT: -₹{promoValidation.discount} APPLIED</Text>
                                    )}
                                </View>
                            </View>
                            <TouchableOpacity className="bg-slate-100 dark:bg-slate-800 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 active:opacity-90">
                                <Text className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Change</Text>
                            </TouchableOpacity>
                        </View>
 
                        <TouchableOpacity
                            onPress={handleBook}
                            disabled={loading || bookingInProgress}
                            className={`h-20 rounded-[32px] flex-row items-center justify-center gap-4 shadow-2xl shadow-black/20 ${bookingInProgress ? 'bg-slate-200 dark:bg-slate-800 opacity-50 shadow-none' : 'bg-slate-900 dark:bg-white active:opacity-95'}`}
                        >
                            {bookingInProgress ? (
                                <ActivityIndicator color={isDark ? "black" : "white"} />
                            ) : (
                                <>
                                    <Text className="text-white dark:text-slate-900 font-black text-xl uppercase tracking-[4px]">INITIATE BOOKING</Text>
                                    <Ionicons name="arrow-forward" size={24} color={isDark ? "black" : "white"} />
                                </>
                            )}
                        </TouchableOpacity>
                    </View>
                </Animated.View>
            </View>
        </Modal>
    );
}
