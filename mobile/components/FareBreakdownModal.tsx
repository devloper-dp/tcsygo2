import React, { useState } from 'react';
import { View, StyleSheet, Modal, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { Text } from '@/components/ui/text';
import { Ionicons } from '@expo/vector-icons';
import { ReceiptService } from '@/services/ReceiptService';
import { logger } from '@/services/LoggerService';
import { useTheme } from '@/contexts/ThemeContext';
import { useResponsive } from '@/hooks/useResponsive';
 
interface FareBreakdownModalProps {
    visible: boolean;
    onClose: () => void;
    trip: any; // Using any for flexibility with booking/trip objects
    booking?: any;
}
 
export function FareBreakdownModal({ visible, onClose, trip, booking }: FareBreakdownModalProps) {
    const { theme, isDark } = useTheme();
    const { hScale, vScale, spacing } = useResponsive();
 
    if (!visible) return null;
 
    // Calculate generic values if booking not provided (e.g. for driver view)
    const seats = booking?.seats_booked || 1;
    const subtotal = (booking?.total_amount || 0) / (booking?.surge_multiplier || 1);
    const baseFare = booking?.fare_breakdown?.base_fare || (parseFloat(trip.price_per_seat) * seats);
    const distanceFare = booking?.fare_breakdown?.distance_fare || 0;
    const surgeCharge = booking?.fare_breakdown?.surge_charge || (booking?.surge_multiplier > 1 ? (baseFare + distanceFare) * (booking.surge_multiplier - 1) : 0);
    const taxes = booking?.fare_breakdown?.taxes || (baseFare + distanceFare + surgeCharge) * 0.05;
    const platformFee = booking?.fare_breakdown?.platform_fee || 0;
    const discount = booking?.discount_amount || 0;
    const totalAmount = booking ? parseFloat(booking.total_amount) : (baseFare + distanceFare + surgeCharge + taxes + platformFee);
    const [isSharing, setIsSharing] = useState(false);
 
    const handleShare = async () => {
        if (!booking?.id) return;
        setIsSharing(true);
        try {
            const data = await ReceiptService.generateReceiptData(booking.id);
            if (data) {
                await ReceiptService.shareReceipt(data);
            }
        } catch (error) {
            logger.error('Error sharing receipt:', error);
        } finally {
            setIsSharing(false);
        }
    };
 
    return (
        <Modal
            animationType="slide"
            transparent={true}
            visible={visible}
            onRequestClose={onClose}
        >
            <View style={{ flex: 1, justifyContent: 'flex-end' }} className="bg-black/60">
                <View style={{ height: '85%', borderTopLeftRadius: hScale(40), borderTopRightRadius: hScale(40), padding: hScale(32), borderTopWidth: 1 }} className="bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 shadow-xl">
                    <View style={{ width: hScale(48), height: vScale(6), borderRadius: hScale(3), marginBottom: vScale(32) }} className="bg-slate-100 dark:bg-slate-800 self-center" />
                    
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: vScale(32) }}>
                        <Text style={{ fontSize: hScale(24) }} className="font-black text-slate-900 dark:text-white">Ride Receipt</Text>
                        <TouchableOpacity 
                            onPress={onClose} 
                            style={{ width: hScale(40), height: hScale(40), borderRadius: hScale(20) }}
                            className="bg-slate-100 dark:bg-slate-800 items-center justify-center"
                        >
                            <Ionicons name="close" size={hScale(24)} color={isDark ? "#94a3b8" : "#475569"} />
                        </TouchableOpacity>
                    </View>
 
                    <ScrollView showsVerticalScrollIndicator={false}>
                        <View style={{ marginBottom: vScale(32) }}>
                            <Text style={{ fontSize: hScale(10), marginBottom: vScale(6) }} className="font-black text-slate-400 dark:text-slate-600 uppercase tracking-[2px]">Receipt ID: #SYGO-{trip.id.slice(0, 8).toUpperCase()}</Text>
                            <Text style={{ fontSize: hScale(14) }} className="font-bold text-slate-600 dark:text-slate-300">{new Date(trip.departure_time || trip.created_at).toLocaleString(undefined, { dateStyle: 'long', timeStyle: 'short' })}</Text>
                        </View>
 
                        <View style={{ borderRadius: hScale(24), padding: hScale(24), marginBottom: vScale(32), borderWidth: 1 }} className="bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-800/50">
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: hScale(16) }}>
                                <View style={{ width: hScale(20), height: hScale(20), borderRadius: hScale(10) }} className="bg-blue-500/10 items-center justify-center">
                                    <View style={{ width: hScale(10), height: hScale(10), borderRadius: hScale(5) }} className="bg-blue-500" />
                                </View>
                                <Text style={{ fontSize: hScale(14) }} className="font-bold text-slate-900 dark:text-white flex-1" numberOfLines={1}>{trip.pickup_location}</Text>
                            </View>
                            <View style={{ width: hScale(2), height: vScale(24), marginLeft: hScale(10), marginVertical: vScale(4) }} className="bg-slate-200 dark:bg-slate-700" />
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: hScale(16) }}>
                                <View style={{ width: hScale(20), height: hScale(20), borderRadius: hScale(10) }} className="bg-rose-500/10 items-center justify-center">
                                    <View style={{ width: hScale(10), height: hScale(10), borderRadius: hScale(5) }} className="bg-rose-500" />
                                </View>
                                <Text style={{ fontSize: hScale(14) }} className="font-bold text-slate-900 dark:text-white flex-1" numberOfLines={1}>{trip.drop_location}</Text>
                            </View>
                        </View>
 
                        <View style={{ height: 1, marginBottom: vScale(32) }} className="bg-slate-100 dark:bg-slate-800" />
 
                        <View style={{ marginBottom: vScale(32) }}>
                            <Text style={{ fontSize: hScale(12), marginBottom: vScale(24) }} className="font-black text-slate-400 dark:text-slate-600 uppercase tracking-widest">Fare Breakdown</Text>
                            
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: vScale(16) }}>
                                <Text style={{ fontSize: hScale(14) }} className="font-medium text-slate-500 dark:text-slate-400">Ride Fare ({seats} seat{seats > 1 ? 's' : ''})</Text>
                                <Text style={{ fontSize: hScale(14) }} className="font-black text-slate-900 dark:text-white">₹{baseFare.toFixed(2)}</Text>
                            </View>
 
                            {distanceFare > 0 && (
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: vScale(16) }}>
                                    <Text style={{ fontSize: hScale(14) }} className="font-medium text-slate-500 dark:text-slate-400">Distance Fare</Text>
                                    <Text style={{ fontSize: hScale(14) }} className="font-black text-slate-900 dark:text-white">₹{distanceFare.toFixed(2)}</Text>
                                </View>
                            )}
 
                            {surgeCharge > 0 && (
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: vScale(16) }}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: hScale(6) }}>
                                        <Ionicons name="flash" size={hScale(14)} color="#f59e0b" />
                                        <Text style={{ fontSize: hScale(14) }} className="font-black text-amber-500">Surge Pricing</Text>
                                    </View>
                                    <Text style={{ fontSize: hScale(14) }} className="font-black text-amber-500">₹{surgeCharge.toFixed(2)}</Text>
                                </View>
                            )}
 
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: vScale(16) }}>
                                <Text style={{ fontSize: hScale(14) }} className="font-medium text-slate-500 dark:text-slate-400">Taxes & Fees</Text>
                                <Text style={{ fontSize: hScale(14) }} className="font-black text-slate-900 dark:text-white">₹{(taxes + platformFee).toFixed(2)}</Text>
                            </View>
 
                            {discount > 0 && (
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: vScale(16) }}>
                                    <Text style={{ fontSize: hScale(14) }} className="font-black text-emerald-500">Promotion/Discount</Text>
                                    <Text style={{ fontSize: hScale(14) }} className="font-black text-emerald-500">-₹{parseFloat(discount.toString()).toFixed(2)}</Text>
                                </View>
                            )}
 
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, paddingTop: vScale(24), marginTop: vScale(8) }} className="border-slate-100 dark:border-slate-800">
                                <View>
                                    <Text style={{ fontSize: hScale(20) }} className="font-black text-slate-900 dark:text-white">Total Amount</Text>
                                    <Text style={{ fontSize: Math.max(8, hScale(10)), marginTop: vScale(4) }} className="font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Paid via {booking?.payment_method?.toUpperCase() || 'WALLET'}</Text>
                                </View>
                                <Text style={{ fontSize: hScale(30) }} className="font-black text-blue-600 dark:text-blue-400">₹{totalAmount.toFixed(2)}</Text>
                            </View>
                        </View>
 
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: hScale(16), padding: hScale(20), borderRadius: hScale(16), marginBottom: vScale(40), borderWidth: 1 }} className="bg-emerald-50 dark:bg-emerald-900/10 border-emerald-100 dark:border-emerald-900/20">
                            <View style={{ width: hScale(40), height: hScale(40), borderRadius: hScale(20) }} className="bg-emerald-100 dark:bg-emerald-900/30 items-center justify-center">
                                <Ionicons name="shield-checkmark" size={hScale(24)} color="#10b981" />
                            </View>
                            <Text style={{ fontSize: hScale(12), lineHeight: vScale(16) }} className="text-emerald-700 dark:text-emerald-400 flex-1 font-medium">This is a computer-generated receipt and doesn't require a signature.</Text>
                        </View>
                    </ScrollView>
 
                    <TouchableOpacity
                        style={{ height: vScale(64), borderRadius: hScale(16), gap: hScale(12) }}
                        className={`bg-blue-600 active:bg-blue-700 flex-row items-center justify-center shadow-lg ${
                            !booking?.id || isSharing ? 'opacity-50 shadow-none' : 'shadow-blue-500/20'
                        }`}
                        onPress={handleShare}
                        disabled={!booking?.id || isSharing}
                    >
                        {isSharing ? (
                            <ActivityIndicator color="white" size="small" />
                        ) : (
                            <>
                                <Ionicons name="share-outline" size={hScale(24)} color="white" />
                                <Text style={{ fontSize: hScale(18) }} className="text-white font-black">Share Receipt</Text>
                            </>
                        )}
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
}
 
const styles = StyleSheet.create({});
