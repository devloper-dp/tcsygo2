import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView, Alert, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '@/components/ui/card';

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
    // Import RidePreferences dynamically or assume it is imported
    const RidePreferences = require('./RidePreferences').RidePreferences;

    const [promoCode, setPromoCode] = useState('');
    const [discount, setDiscount] = useState(0);
    const [appliedPromo, setAppliedPromo] = useState<string | null>(null);

    const handleApplyPromo = () => {
        if (promoCode.toUpperCase() === 'FIRST50') {
            const disc = Math.min(totalAmount * 0.5, 100);
            setDiscount(disc);
            setAppliedPromo('FIRST50');
            Alert.alert('Success', 'Promo code applied! ₹' + disc + ' saved.');
        } else if (promoCode.toUpperCase() === 'RAPIDO20') {
            const disc = Math.min(totalAmount * 0.2, 50);
            setDiscount(disc);
            setAppliedPromo('RAPIDO20');
            Alert.alert('Success', 'Promo code applied! ₹' + disc + ' saved.');
        } else {
            Alert.alert('Invalid Code', 'Please enter a valid promo code');
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
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Confirm Booking</Text>
                        <TouchableOpacity onPress={onClose}>
                            <Ionicons name="close" size={24} color="#6b7280" />
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.modalBody}>
                        <Card style={styles.summaryCard}>
                            <View style={styles.routeInfo}>
                                <View style={styles.locationRow}>
                                    <Ionicons name="location" size={20} color="#10b981" />
                                    <Text style={styles.locationText}>{trip.pickupLocation}</Text>
                                </View>
                                <View style={styles.divider} />
                                <View style={styles.locationRow}>
                                    <Ionicons name="flag" size={20} color="#ef4444" />
                                    <Text style={styles.locationText}>{trip.dropLocation}</Text>
                                </View>
                            </View>

                            <View style={styles.detailRow}>
                                <Ionicons name="calendar-outline" size={18} color="#6b7280" />
                                <Text style={styles.detailText}>
                                    {new Date(trip.departureTime).toLocaleString()}
                                </Text>
                            </View>

                            <View style={styles.detailRow}>
                                <Ionicons name="people-outline" size={18} color="#6b7280" />
                                <Text style={styles.detailText}>
                                    {seatsToBook} {seatsToBook === 1 ? 'seat' : 'seats'}
                                </Text>
                            </View>
                        </Card>

                        {/* Ride Preferences Integration */}
                        <RidePreferences
                            style={{ marginBottom: 16 }}
                            showSaveButton={false}
                            userId={null} // Pass user ID if available in context
                        />

                        {/* Promo Code Section */}
                        <View style={styles.promoContainer}>
                            <Ionicons name="pricetag-outline" size={20} color="#3b82f6" />
                            <TextInput
                                style={styles.promoInput}
                                placeholder="Enter Promo Code"
                                value={promoCode}
                                onChangeText={setPromoCode}
                                autoCapitalize="characters"
                            />
                            <TouchableOpacity onPress={handleApplyPromo} disabled={!!appliedPromo}>
                                <Text style={[styles.applyText, appliedPromo && { color: 'green' }]}>
                                    {appliedPromo ? 'APPLIED' : 'APPLY'}
                                </Text>
                            </TouchableOpacity>
                        </View>

                        <Card style={styles.priceCard}>
                            <View style={styles.priceRow}>
                                <Text style={styles.priceLabel}>Price per seat</Text>
                                <Text style={styles.priceValue}>₹{trip.pricePerSeat}</Text>
                            </View>
                            <View style={styles.priceRow}>
                                <Text style={styles.priceLabel}>Number of seats</Text>
                                <Text style={styles.priceValue}>×{seatsToBook}</Text>
                            </View>
                            {discount > 0 && (
                                <View style={styles.priceRow}>
                                    <Text style={[styles.priceLabel, { color: '#10b981' }]}>Discrete</Text>
                                    <Text style={[styles.priceValue, { color: '#10b981' }]}>-₹{discount}</Text>
                                </View>
                            )}
                            <View style={styles.divider} />
                            <View style={styles.priceRow}>
                                <Text style={styles.totalLabel}>Total Amount</Text>
                                <Text style={styles.totalValue}>₹{finalAmount}</Text>
                            </View>
                        </Card>

                        <View style={styles.termsContainer}>
                            <Ionicons name="information-circle-outline" size={20} color="#6b7280" />
                            <Text style={styles.termsText}>
                                By confirming, you agree to our booking terms and cancellation policy.
                            </Text>
                        </View>
                    </ScrollView>

                    <View style={styles.modalFooter}>
                        <TouchableOpacity
                            style={styles.cancelBtn}
                            onPress={onClose}
                        >
                            <Text style={styles.cancelBtnText}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.confirmBtn}
                            onPress={() => onConfirm()}
                        >
                            <Text style={styles.confirmBtnText}>Confirm & Pay</Text>
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
    return (
        <View style={styles.seatSelector}>
            <Text style={styles.seatLabel}>Select Seats</Text>
            <View style={styles.seatButtons}>
                {[...Array(Math.min(availableSeats, 4))].map((_, index) => {
                    const seatNumber = index + 1;
                    const isSelected = selectedSeats === seatNumber;
                    return (
                        <TouchableOpacity
                            key={seatNumber}
                            style={[
                                styles.seatButton,
                                isSelected && styles.seatButtonActive
                            ]}
                            onPress={() => onSelectSeats(seatNumber)}
                        >
                            <Text style={[
                                styles.seatButtonText,
                                isSelected && styles.seatButtonTextActive
                            ]}>
                                {seatNumber}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: 'white',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        maxHeight: '80%',
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#f3f4f6',
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#1f2937',
    },
    modalBody: {
        padding: 20,
    },
    summaryCard: {
        padding: 16,
        marginBottom: 16,
    },
    routeInfo: {
        marginBottom: 16,
    },
    locationRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: 8,
    },
    locationText: {
        fontSize: 16,
        color: '#374151',
        fontWeight: '500',
    },
    divider: {
        height: 1,
        backgroundColor: '#e5e7eb',
        marginVertical: 12,
    },
    detailRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: 8,
    },
    detailText: {
        fontSize: 14,
        color: '#6b7280',
    },
    priceCard: {
        padding: 16,
        marginBottom: 16,
    },
    priceRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    priceLabel: {
        fontSize: 14,
        color: '#6b7280',
    },
    priceValue: {
        fontSize: 14,
        color: '#374151',
        fontWeight: '500',
    },
    totalLabel: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#1f2937',
    },
    totalValue: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#3b82f6',
    },
    termsContainer: {
        flexDirection: 'row',
        gap: 12,
        padding: 16,
        backgroundColor: '#f9fafb',
        borderRadius: 12,
    },
    termsText: {
        flex: 1,
        fontSize: 12,
        color: '#6b7280',
        lineHeight: 18,
    },
    modalFooter: {
        flexDirection: 'row',
        padding: 20,
        gap: 12,
        borderTopWidth: 1,
        borderTopColor: '#f3f4f6',
    },
    cancelBtn: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#d1d5db',
        alignItems: 'center',
    },
    cancelBtnText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#6b7280',
    },
    confirmBtn: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 12,
        backgroundColor: '#3b82f6',
        alignItems: 'center',
    },
    confirmBtnText: {
        fontSize: 16,
        fontWeight: '600',
        color: 'white',
    },
    seatSelector: {
        marginBottom: 16,
    },
    seatLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#374151',
        marginBottom: 12,
    },
    seatButtons: {
        flexDirection: 'row',
        gap: 12,
    },
    seatButton: {
        width: 48,
        height: 48,
        borderRadius: 24,
        borderWidth: 2,
        borderColor: '#d1d5db',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'white',
    },
    seatButtonActive: {
        borderColor: '#3b82f6',
        backgroundColor: '#3b82f6',
    },
    seatButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#6b7280',
    },
    seatButtonTextActive: {
        color: 'white',
    },
    promoContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#eff6ff',
        padding: 12,
        borderRadius: 12,
        marginBottom: 16,
        gap: 12,
        borderWidth: 1,
        borderColor: '#bfdbfe',
    },
    promoInput: {
        flex: 1,
        fontSize: 16,
        color: '#1f2937',
        fontWeight: '600',
    },
    applyText: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#3b82f6',
    },
});
