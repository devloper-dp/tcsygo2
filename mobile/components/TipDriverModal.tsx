import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, TextInput, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PaymentService } from '@/services/PaymentService';

interface TipDriverModalProps {
    visible: boolean;
    onClose: () => void;
    tripId: string;
    driverId: string;
    driverName: string;
}

export function TipDriverModal({ visible, onClose, tripId, driverId, driverName }: TipDriverModalProps) {
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
            animationType="slide"
            transparent={true}
            visible={visible}
            onRequestClose={onClose}
        >
            <View style={styles.centeredView}>
                <View style={styles.modalView}>
                    <View style={styles.header}>
                        <Text style={styles.title}>Tip {driverName}</Text>
                        <TouchableOpacity onPress={onClose}>
                            <Ionicons name="close" size={24} color="#1f2937" />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.content}>
                        <Text style={styles.subtitle}>Show your appreciation for the ride!</Text>

                        <View style={styles.presetContainer}>
                            {presets.map((val) => (
                                <TouchableOpacity
                                    key={val}
                                    style={styles.presetBtn}
                                    onPress={() => handleTip(val)}
                                    disabled={isProcessing}
                                >
                                    <Text style={styles.presetText}>₹{val}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <View style={styles.customContainer}>
                            <TextInput
                                style={styles.input}
                                placeholder="Other amount"
                                keyboardType="number-pad"
                                value={amount}
                                onChangeText={setAmount}
                                editable={!isProcessing}
                            />
                            <TouchableOpacity
                                style={[styles.sendBtn, (!amount || isProcessing) && styles.sendBtnDisabled]}
                                onPress={() => handleTip(Number(amount))}
                                disabled={!amount || isProcessing}
                            >
                                {isProcessing ? (
                                    <ActivityIndicator color="white" size="small" />
                                ) : (
                                    <Ionicons name="arrow-forward" size={20} color="white" />
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    centeredView: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    modalView: {
        width: '85%',
        backgroundColor: 'white',
        borderRadius: 20,
        padding: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1f2937',
    },
    content: {
        alignItems: 'center',
    },
    subtitle: {
        fontSize: 14,
        color: '#6b7280',
        marginBottom: 24,
        textAlign: 'center',
    },
    presetContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: 12,
        marginBottom: 24,
    },
    presetBtn: {
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 12,
        backgroundColor: '#eff6ff',
        borderWidth: 1,
        borderColor: '#3b82f6',
    },
    presetText: {
        color: '#3b82f6',
        fontWeight: 'bold',
        fontSize: 16,
    },
    customContainer: {
        flexDirection: 'row',
        width: '100%',
        gap: 12,
    },
    input: {
        flex: 1,
        height: 48,
        borderWidth: 1,
        borderColor: '#e5e7eb',
        borderRadius: 12,
        paddingHorizontal: 16,
        fontSize: 16,
    },
    sendBtn: {
        width: 48,
        height: 48,
        backgroundColor: '#3b82f6',
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    sendBtnDisabled: {
        backgroundColor: '#9ca3af',
    },
});
