import React, { useState } from 'react';
import { View, StyleSheet, Modal, TouchableOpacity, TextInput, ActivityIndicator, Alert } from 'react-native';
import { Text } from '@/components/ui/text';
import { Ionicons } from '@expo/vector-icons';
import { PaymentService } from '@/services/PaymentService';
import { useTheme } from '@/contexts/ThemeContext';
import { useResponsive } from '@/hooks/useResponsive';
 
interface TipDriverModalProps {
    visible: boolean;
    onClose: () => void;
    tripId: string;
    driverId: string;
    driverName: string;
}
 
export function TipDriverModal({ visible, onClose, tripId, driverId, driverName }: TipDriverModalProps) {
    const { theme, isDark } = useTheme();
    const { hScale, vScale, spacing } = useResponsive();
 
    const [amount, setAmount] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const presets = [10, 20, 50, 100];
 
    const handleTip = async (tipAmount: number) => {
        setIsProcessing(true);
        try {
            const result = await PaymentService.processTip(
                tripId,
                driverId,
                tipAmount,
                'wallet' // Default to wallet for tips
            );
 
            if (result.success) {
                Alert.alert('Thank You!', `Your tip of ₹${tipAmount} has been sent to ${driverName}.`);
                onClose();
            } else {
                throw new Error(result.error);
            }
        } catch (error: any) {
            Alert.alert('Tip Failed', error.message || 'Could not process tip');
        } finally {
            setIsProcessing(false);
        }
    };
 
    return (
        <Modal
            animationType="fade"
            transparent={true}
            visible={visible}
            onRequestClose={onClose}
        >
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: hScale(24) }} className="bg-black/60">
                <View style={{ width: '100%', borderRadius: hScale(32), padding: hScale(32), borderWidth: 1 }} className="bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 shadow-xl">
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: vScale(24) }}>
                        <Text style={{ fontSize: hScale(20) }} className="font-black text-slate-900 dark:text-white">Tip {driverName}</Text>
                        <TouchableOpacity 
                            onPress={onClose}
                            style={{ width: hScale(40), height: hScale(40), borderRadius: hScale(20) }}
                            className="bg-slate-100 dark:bg-slate-800 items-center justify-center"
                        >
                            <Ionicons name="close" size={hScale(24)} color={isDark ? "#94a3b8" : "#475569"} />
                        </TouchableOpacity>
                    </View>
 
                    <View style={{ alignItems: 'center' }}>
                        <Text style={{ fontSize: hScale(14), marginBottom: vScale(32) }} className="font-medium text-slate-500 dark:text-slate-400 text-center">Show your appreciation for the ride!</Text>
 
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: hScale(12), marginBottom: vScale(32) }}>
                            {presets.map((val) => (
                                <TouchableOpacity
                                    key={val}
                                    style={{ paddingHorizontal: hScale(24), paddingVertical: vScale(16), borderRadius: hScale(16), borderWidth: 1 }}
                                    className="bg-blue-50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-900/30 active:bg-blue-100 dark:active:bg-blue-900/20"
                                    onPress={() => handleTip(val)}
                                    disabled={isProcessing}
                                >
                                    <Text style={{ fontSize: hScale(18) }} className="text-blue-600 dark:text-blue-400 font-black">₹{val}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
 
                        <View style={{ flexDirection: 'row', width: '100%', gap: hScale(12) }}>
                            <TextInput
                                style={{ flex: 1, height: vScale(56), borderRadius: hScale(16), paddingHorizontal: hScale(20), fontSize: hScale(16) }}
                                className="bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-800 font-bold text-slate-900 dark:text-white"
                                placeholder="Other amount"
                                placeholderTextColor={isDark ? "#475569" : "#94a3b8"}
                                keyboardType="number-pad"
                                value={amount}
                                onChangeText={setAmount}
                                editable={!isProcessing}
                            />
                            <TouchableOpacity
                                style={{ width: hScale(56), height: vScale(56), borderRadius: hScale(16) }}
                                className={`items-center justify-center shadow-lg ${
                                    !amount || isProcessing 
                                        ? 'bg-slate-200 dark:bg-slate-800 shadow-none' 
                                        : 'bg-blue-600 shadow-blue-500/20'
                                }`}
                                onPress={() => handleTip(Number(amount))}
                                disabled={!amount || isProcessing}
                            >
                                {isProcessing ? (
                                    <ActivityIndicator color="white" size="small" />
                                ) : (
                                    <Ionicons name="arrow-forward" size={hScale(24)} color={!amount ? (isDark ? "#475569" : "#94a3b8") : "white"} />
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </View>
        </Modal>
    );
}
 
const styles = StyleSheet.create({});
