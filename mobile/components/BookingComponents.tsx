import { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Modal, ScrollView, Alert, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '@/components/ui/card';
import { Text } from '@/components/ui/text';
import { useTheme } from '@/contexts/ThemeContext';
import { useResponsive } from '@/hooks/useResponsive';
 
interface BookingConfirmationProps {
    visible: boolean;
    onClose: () => void;
    onConfirm: () => void;
    trip: {
        pickupLocation: string;
        dropLocation: string;
        departureTime: string;
        pricePerSeat: number;
    };
    seatsToBook: number;
    totalAmount: number;
}
 
export function BookingConfirmationModal({
    visible,
    onClose,
    onConfirm,
    trip,
    seatsToBook,
    totalAmount,
}: BookingConfirmationProps) {
    const { theme, isDark } = useTheme();
    const { hScale, vScale, spacing } = useResponsive();
    
    // Import RidePreferences dynamically or assume it is imported
    const RidePreferences = require('./RidePreferences').RidePreferences;
 
    const [promoCode, setPromoCode] = useState('');
    const [discount, setDiscount] = useState(0);
    const [appliedPromo, setAppliedPromo] = useState<string | null>(null);
    const { toast } = require('@/components/ui/toast').useToast();
 
    const handleApplyPromo = () => {
        if (promoCode.toUpperCase() === 'FIRST50') {
            const disc = Math.min(totalAmount * 0.5, 100);
            setDiscount(disc);
            setAppliedPromo('FIRST50');
            toast({
                title: 'Success',
                description: 'Promo code applied! ₹' + disc + ' saved.',
            });
        } else if (promoCode.toUpperCase() === 'RAPIDO20') {
            const disc = Math.min(totalAmount * 0.2, 50);
            setDiscount(disc);
            setAppliedPromo('RAPIDO20');
            toast({
                title: 'Success',
                description: 'Promo code applied! ₹' + disc + ' saved.',
            });
        } else {
            toast({
                title: 'Invalid Code',
                description: 'Please enter a valid promo code',
                variant: 'destructive',
            });
            setDiscount(0);
            setAppliedPromo(null);
        }
    };
 
    const finalAmount = totalAmount - discount;
 
    return (
        <Modal
            visible={visible}
            transparent
            animationType="slide"
            onRequestClose={onClose}
        >
            <View className="flex-1 bg-black/50 justify-end">
                <View className="bg-white dark:bg-slate-900 border-t-24 border-white dark:border-slate-900 rounded-t-3xl max-h-[85%]">
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: hScale(20), borderBottomWidth: 1 }} className="border-slate-100 dark:border-slate-800">
                        <Text style={{ fontSize: hScale(20) }} className="font-bold text-slate-900 dark:text-white">Confirm Booking</Text>
                        <TouchableOpacity onPress={onClose}>
                            <Ionicons name="close" size={hScale(24)} color={isDark ? "#94a3b8" : "#64748b"} />
                        </TouchableOpacity>
                    </View>
 
                    <ScrollView style={{ padding: hScale(20) }}>
                        <Card style={{ padding: hScale(16), marginBottom: vScale(16), borderWidth: 1 }} className="bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800">
                            <View style={{ marginBottom: vScale(16) }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: hScale(12), marginBottom: vScale(8) }}>
                                    <Ionicons name="location" size={hScale(20)} color="#10b981" />
                                    <Text style={{ fontSize: hScale(14) }} className="font-bold text-slate-800 dark:text-slate-200">{trip.pickupLocation}</Text>
                                </View>
                                <View style={{ height: 1, marginVertical: vScale(12), marginLeft: hScale(32) }} className="bg-slate-100 dark:bg-slate-800" />
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: hScale(12) }}>
                                    <Ionicons name="flag" size={hScale(20)} color="#ef4444" />
                                    <Text style={{ fontSize: hScale(14) }} className="font-bold text-slate-800 dark:text-slate-200">{trip.dropLocation}</Text>
                                </View>
                            </View>
 
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: hScale(12), marginBottom: vScale(8) }}>
                                <Ionicons name="calendar-outline" size={hScale(18)} color={isDark ? "#94a3b8" : "#64748b"} />
                                <Text style={{ fontSize: hScale(12) }} className="text-slate-500 dark:text-slate-400">
                                    {new Date(trip.departureTime).toLocaleString()}
                                </Text>
                            </View>
 
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: hScale(12) }}>
                                <Ionicons name="people-outline" size={hScale(18)} color={isDark ? "#94a3b8" : "#64748b"} />
                                <Text style={{ fontSize: hScale(12) }} className="text-slate-500 dark:text-slate-400">
                                    {seatsToBook} {seatsToBook === 1 ? 'seat' : 'seats'}
                                </Text>
                            </View>
                        </Card>
 
                        {/* Ride Preferences Integration */}
                        <RidePreferences
                            style={{ marginBottom: vScale(16) }}
                            showSaveButton={false}
                            userId={null}
                        />
 
                        {/* Promo Code Section */}
                        <View style={{ flexDirection: 'row', alignItems: 'center', padding: hScale(12), borderRadius: hScale(12), marginBottom: vScale(16), gap: hScale(12), borderWidth: 1 }} className="bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-900/30">
                            <Ionicons name="pricetag-outline" size={hScale(20)} color="#3b82f6" />
                            <TextInput
                                style={{ flex: 1, fontSize: hScale(14) }}
                                className="text-slate-900 dark:text-white font-bold"
                                placeholder="Enter Promo Code"
                                placeholderTextColor={isDark ? "#475569" : "#94a3b8"}
                                value={promoCode}
                                onChangeText={setPromoCode}
                                autoCapitalize="characters"
                            />
                            <TouchableOpacity onPress={handleApplyPromo} disabled={!!appliedPromo}>
                                <Text style={{ fontSize: hScale(12) }} className={`font-black ${appliedPromo ? 'text-green-600 dark:text-green-400' : 'text-blue-600 dark:text-blue-400'}`}>
                                    {appliedPromo ? 'APPLIED' : 'APPLY'}
                                </Text>
                            </TouchableOpacity>
                        </View>
 
                        <Card style={{ padding: hScale(16), marginBottom: vScale(16), borderWidth: 1 }} className="bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800">
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: vScale(12) }}>
                                <Text style={{ fontSize: hScale(12) }} className="text-slate-500 dark:text-slate-400">Price per seat</Text>
                                <Text style={{ fontSize: hScale(12) }} className="font-bold text-slate-800 dark:text-slate-200">₹{trip.pricePerSeat}</Text>
                            </View>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: vScale(12) }}>
                                <Text style={{ fontSize: hScale(12) }} className="text-slate-500 dark:text-slate-400">Number of seats</Text>
                                <Text style={{ fontSize: hScale(12) }} className="font-bold text-slate-800 dark:text-slate-200">×{seatsToBook}</Text>
                            </View>
                            {discount > 0 && (
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: vScale(12) }}>
                                    <Text style={{ fontSize: hScale(12) }} className="text-green-600 dark:text-green-400">Discount</Text>
                                    <Text style={{ fontSize: hScale(12) }} className="font-bold text-green-600 dark:text-green-400">-₹{discount}</Text>
                                </View>
                            )}
                            <View style={{ height: 1, marginVertical: vScale(12) }} className="bg-slate-100 dark:bg-slate-800" />
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Text style={{ fontSize: hScale(18) }} className="font-black text-slate-900 dark:text-white">Total Amount</Text>
                                <Text style={{ fontSize: hScale(24) }} className="font-black text-blue-600 dark:text-blue-400">₹{finalAmount}</Text>
                            </View>
                        </Card>
 
                        <View style={{ flexDirection: 'row', gap: hScale(12), padding: hScale(16), borderRadius: hScale(12), marginBottom: vScale(40) }} className="bg-slate-50 dark:bg-slate-800/50">
                            <Ionicons name="information-circle-outline" size={hScale(20)} color={isDark ? "#94a3b8" : "#64748b"} />
                            <Text style={{ fontSize: hScale(10), lineHeight: vScale(14) }} className="flex-1 text-slate-500 dark:text-slate-400">
                                By confirming, you agree to our booking terms and cancellation policy.
                            </Text>
                        </View>
                    </ScrollView>
 
                    <View style={{ flexDirection: 'row', padding: hScale(20), gap: hScale(12), borderTopWidth: 1 }} className="border-slate-100 dark:border-slate-800">
                        <TouchableOpacity
                            style={{ height: vScale(56), borderRadius: hScale(16), borderWidth: 1 }}
                            className="flex-1 border-slate-200 dark:border-slate-700 items-center justify-center"
                            onPress={onClose}
                        >
                            <Text style={{ fontSize: hScale(14) }} className="font-black text-slate-600 dark:text-slate-400">Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={{ height: vScale(56), borderRadius: hScale(16) }}
                            className="flex-1 bg-blue-600 items-center justify-center shadow-lg shadow-blue-500/20"
                            onPress={() => onConfirm()}
                        >
                            <Text style={{ fontSize: hScale(14) }} className="font-black text-white">Confirm & Pay</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}
 
interface SeatSelectorProps {
    availableSeats: number;
    selectedSeats: number;
    onSelectSeats: (seats: number) => void;
}
 
export function SeatSelector({ availableSeats, selectedSeats, onSelectSeats }: SeatSelectorProps) {
    const { theme } = useTheme();
    const isDark = theme === 'dark';
    const { hScale, vScale } = useResponsive();
 
    return (
        <View style={{ marginBottom: vScale(16) }}>
            <Text style={{ fontSize: hScale(12), marginBottom: vScale(12) }} className="font-black text-slate-800 dark:text-slate-200">Select Seats</Text>
            <View style={{ flexDirection: 'row', gap: hScale(12) }}>
                {[...Array(Math.min(availableSeats, 4))].map((_, index) => {
                    const seatNumber = index + 1;
                    const isSelected = selectedSeats === seatNumber;
                    return (
                        <TouchableOpacity
                            key={seatNumber}
                            style={{ width: hScale(48), height: hScale(48), borderRadius: hScale(24), borderWidth: 2 }}
                            className={`items-center justify-center ${isSelected 
                                ? 'border-blue-600 bg-blue-600' 
                                : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800'}`}
                            onPress={() => onSelectSeats(seatNumber)}
                        >
                            <Text style={{ fontSize: hScale(16) }} className={`font-black ${isSelected 
                                ? 'text-white' 
                                : 'text-slate-500 dark:text-slate-400'}`}>
                                {seatNumber}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </View>
        </View>
    );
}
