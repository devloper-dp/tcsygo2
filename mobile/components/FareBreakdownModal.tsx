import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ReceiptService } from '@/services/ReceiptService';
import { logger } from '@/services/LoggerService';

interface FareBreakdownModalProps {
    visible: boolean;
    onClose: () => void;
    trip: any; // Using any for flexibility with booking/trip objects
    booking?: any;
}

export function FareBreakdownModal({ visible, onClose, trip, booking }: FareBreakdownModalProps) {
    if (!visible) return null;

    // Calculate generic values if booking not provided (e.g. for driver view)
    // Driver view might need total earnings, but for now let's focus on passenger receipt
    const seats = booking?.seats_booked || 1;
    // Total amount should be consistent with what was paid
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
            <View style={styles.centeredView}>
                <View style={styles.modalView}>
                    <View style={styles.header}>
                        <Text style={styles.modalText}>Ride Receipt</Text>
                        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                            <Ionicons name="close" size={24} color="#1f2937" />
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                        <View style={styles.tripSummary}>
                            <Text style={styles.receiptId}>Receipt ID: #SYGO-{trip.id.slice(0, 8).toUpperCase()}</Text>
                            <Text style={styles.date}>{new Date(trip.departure_time || trip.created_at).toLocaleString()}</Text>
                        </View>

                        <View style={styles.routeContainer}>
                            <View style={styles.locationRow}>
                                <Ionicons name="radio-button-on" size={16} color="#3b82f6" />
                                <Text style={styles.locationText} numberOfLines={1}>{trip.pickup_location}</Text>
                            </View>
                            <View style={styles.connector} />
                            <View style={styles.locationRow}>
                                <Ionicons name="location" size={16} color="#ef4444" />
                                <Text style={styles.locationText} numberOfLines={1}>{trip.drop_location}</Text>
                            </View>
                        </View>

                        <View style={styles.divider} />

                        <View style={styles.priceBreakdown}>
                            <Text style={styles.sectionTitle}>Fare Breakdown</Text>
                            <View style={styles.row}>
                                <Text style={styles.label}>Ride Fare ({seats} seat{seats > 1 ? 's' : ''})</Text>
                                <Text style={styles.value}>₹{baseFare.toFixed(2)}</Text>
                            </View>
                            {distanceFare > 0 && (
                                <View style={styles.row}>
                                    <Text style={styles.label}>Distance Fare</Text>
                                    <Text style={styles.value}>₹{distanceFare.toFixed(2)}</Text>
                                </View>
                            )}
                            {surgeCharge > 0 && (
                                <View style={styles.row}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                        <Ionicons name="flash" size={14} color="#f59e0b" style={{ marginRight: 4 }} />
                                        <Text style={[styles.label, { color: '#d97706' }]}>Surge Pricing</Text>
                                    </View>
                                    <Text style={[styles.value, { color: '#d97706' }]}>₹{surgeCharge.toFixed(2)}</Text>
                                </View>
                            )}
                            <View style={styles.row}>
                                <Text style={styles.label}>Taxes & Fees</Text>
                                <Text style={styles.value}>₹{(taxes + platformFee).toFixed(2)}</Text>
                            </View>

                            {discount > 0 && (
                                <View style={styles.row}>
                                    <Text style={[styles.label, { color: '#059669' }]}>Promotion/Discount</Text>
                                    <Text style={[styles.value, { color: '#059669' }]}>-₹{parseFloat(discount.toString()).toFixed(2)}</Text>
                                </View>
                            )}

                            <View style={[styles.row, styles.totalRow]}>
                                <View>
                                    <Text style={styles.totalLabel}>Total Amount</Text>
                                    <Text style={styles.paymentMethod}>Paid via {booking?.payment_method?.toUpperCase() || 'WALLET'}</Text>
                                </View>
                                <Text style={styles.totalValue}>₹{totalAmount.toFixed(2)}</Text>
                            </View>
                        </View>

                        <View style={styles.securityBox}>
                            <Ionicons name="shield-checkmark" size={20} color="#059669" />
                            <Text style={styles.securityText}>This is a computer-generated receipt and doesn't require a signature.</Text>
                        </View>
                    </ScrollView>

                    <TouchableOpacity
                        style={[styles.downloadBtn, (!booking?.id || isSharing) && styles.downloadBtnDisabled]}
                        onPress={handleShare}
                        disabled={!booking?.id || isSharing}
                    >
                        {isSharing ? (
                            <ActivityIndicator color="white" size="small" />
                        ) : (
                            <>
                                <Ionicons name="share-outline" size={20} color="white" />
                                <Text style={styles.downloadText}>Share Receipt</Text>
                            </>
                        )}
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    centeredView: {
        flex: 1,
        justifyContent: 'flex-end',
        backgroundColor: 'rgba(0,0,0,0.6)',
    },
    modalView: {
        backgroundColor: 'white',
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        padding: 24,
        height: '80%',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 20,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
    },
    modalText: {
        fontSize: 22,
        fontWeight: '800',
        color: '#1f2937',
    },
    closeBtn: {
        backgroundColor: '#f3f4f6',
        borderRadius: 20,
        padding: 8,
    },
    content: {
        flex: 1,
    },
    tripSummary: {
        marginBottom: 24,
    },
    receiptId: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#9ca3af',
        letterSpacing: 1,
        marginBottom: 4,
    },
    date: {
        color: '#4b5563',
        fontSize: 14,
        fontWeight: '500',
    },
    routeContainer: {
        backgroundColor: '#f9fafb',
        borderRadius: 16,
        padding: 16,
        marginBottom: 24,
    },
    locationRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    locationText: {
        fontSize: 14,
        color: '#1f2937',
        fontWeight: '500',
        flex: 1,
    },
    connector: {
        width: 2,
        height: 16,
        backgroundColor: '#e5e7eb',
        marginLeft: 7,
        marginVertical: 4,
    },
    divider: {
        height: 1,
        backgroundColor: '#f3f4f6',
        marginBottom: 24,
    },
    priceBreakdown: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1f2937',
        marginBottom: 16,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 14,
    },
    label: {
        color: '#6b7280',
        fontSize: 14,
        fontWeight: '500',
    },
    value: {
        color: '#1f2937',
        fontSize: 15,
        fontWeight: '600',
    },
    totalRow: {
        borderTopWidth: 1,
        borderTopColor: '#f3f4f6',
        paddingTop: 20,
        marginTop: 6,
        alignItems: 'center',
    },
    totalLabel: {
        fontSize: 18,
        fontWeight: '800',
        color: '#1f2937',
    },
    paymentMethod: {
        fontSize: 12,
        color: '#9ca3af',
        fontWeight: '600',
        marginTop: 2,
    },
    totalValue: {
        fontSize: 24,
        fontWeight: '900',
        color: '#3b82f6',
    },
    securityBox: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        backgroundColor: '#f0fdf4',
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#dcfce7',
        marginBottom: 24,
    },
    securityText: {
        fontSize: 12,
        color: '#166534',
        fontWeight: '500',
        flex: 1,
    },
    downloadBtn: {
        backgroundColor: '#3b82f6',
        height: 56,
        borderRadius: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        shadowColor: '#3b82f6',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 10,
    },
    downloadBtnDisabled: {
        backgroundColor: '#9ca3af',
        shadowColor: 'transparent',
    },
    downloadText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
});
