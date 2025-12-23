import { View, StyleSheet, TouchableOpacity, ScrollView, Modal, TextInput } from 'react-native';
import { Text } from '@/components/ui/text';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';

export function PaymentMethodSelectorMobile({ selectedMethod, onSelect }: { selectedMethod: string, onSelect: (id: string) => void }) {
    const methods = [
        { id: 'upi', label: 'UPI (GPay, PhonePe)', icon: 'logo-google' },
        { id: 'card', label: 'Credit / Debit Card', icon: 'card-outline' },
        { id: 'netbanking', label: 'Net Banking', icon: 'business-outline' },
        { id: 'wallet', label: 'Wallets', icon: 'wallet-outline' },
    ];

    return (
        <View style={styles.container}>
            <Text style={styles.sectionTitle}>Select Payment Method</Text>
            {methods.map((method) => (
                <TouchableOpacity
                    key={method.id}
                    style={[
                        styles.methodCard,
                        selectedMethod === method.id && styles.methodCardActive
                    ]}
                    onPress={() => onSelect(method.id)}
                >
                    <View style={[styles.iconContainer, selectedMethod === method.id && styles.iconContainerActive]}>
                        <Ionicons
                            name={method.icon as any}
                            size={24}
                            color={selectedMethod === method.id ? '#fff' : '#3b82f6'}
                        />
                    </View>
                    <Text style={[styles.methodLabel, selectedMethod === method.id && styles.methodLabelActive]}>
                        {method.label}
                    </Text>
                    <Ionicons
                        name={selectedMethod === method.id ? 'radio-button-on' : 'radio-button-off'}
                        size={20}
                        color={selectedMethod === method.id ? '#3b82f6' : '#d1d5db'}
                    />
                </TouchableOpacity>
            ))}
        </View>
    );
}

export function PromoCodeDialogMobile({
    visible,
    onClose,
    onApply
}: {
    visible: boolean;
    onClose: () => void;
    onApply: (code: string, discount: number) => void;
}) {
    const [code, setCode] = useState('');
    const [loading, setLoading] = useState(false);

    const availableOffers = [
        { code: 'FIRST50', discount: 50, description: '₹50 off on your first trip' },
        { code: 'SAVE20', discount: 20, description: '20% off up to ₹100' },
    ];

    const handleApply = () => {
        setLoading(true);
        // Mock API call
        setTimeout(() => {
            const offer = availableOffers.find(o => o.code === code.toUpperCase());
            if (offer) {
                onApply(offer.code, offer.discount);
                onClose();
            } else {
                alert('Invalid promo code');
            }
            setLoading(false);
        }, 1000);
    };

    return (
        <Modal visible={visible} animationType="slide" transparent>
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Apply Promo Code</Text>
                        <TouchableOpacity onPress={onClose}>
                            <Ionicons name="close" size={24} color="#6b7280" />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.inputContainer}>
                        <TextInput
                            style={styles.input}
                            placeholder="Enter code (e.g. FIRST50)"
                            value={code}
                            onChangeText={setCode}
                            autoCapitalize="characters"
                        />
                        <Button
                            onPress={handleApply}
                            disabled={!code || loading}
                            className="ml-2"
                        >
                            {loading ? '...' : 'Apply'}
                        </Button>
                    </View>

                    <Text style={styles.offersTitle}>Available Offers</Text>
                    <ScrollView style={styles.offersList}>
                        {availableOffers.map((offer) => (
                            <TouchableOpacity
                                key={offer.code}
                                style={styles.offerItem}
                                onPress={() => setCode(offer.code)}
                            >
                                <View style={styles.offerBadge}>
                                    <Text style={styles.offerCode}>{offer.code}</Text>
                                </View>
                                <Text style={styles.offerDesc}>{offer.description}</Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: {
        marginTop: 24,
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#1f2937',
        marginBottom: 16,
    },
    methodCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'white',
        borderRadius: 12,
        padding: 12,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#e5e7eb',
        gap: 12,
    },
    methodCardActive: {
        borderColor: '#3b82f6',
        backgroundColor: '#eff6ff',
    },
    iconContainer: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#eff6ff',
        justifyContent: 'center',
        alignItems: 'center',
    },
    iconContainerActive: {
        backgroundColor: '#3b82f6',
    },
    methodLabel: {
        flex: 1,
        fontSize: 15,
        fontWeight: '500',
        color: '#374151',
    },
    methodLabelActive: {
        color: '#3b82f6',
        fontWeight: '600',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: 'white',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 24,
        minHeight: 400,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1f2937',
    },
    inputContainer: {
        flexDirection: 'row',
        marginBottom: 24,
    },
    input: {
        flex: 1,
        height: 48,
        borderWidth: 1,
        borderColor: '#d1d5db',
        borderRadius: 8,
        paddingHorizontal: 16,
        fontSize: 16,
    },
    offersTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#6b7280',
        marginBottom: 12,
        textTransform: 'uppercase',
    },
    offersList: {
        flex: 1,
    },
    offerItem: {
        padding: 16,
        borderWidth: 1,
        borderColor: '#e5e7eb',
        borderRadius: 12,
        marginBottom: 12,
    },
    offerBadge: {
        alignSelf: 'flex-start',
        backgroundColor: '#fef3c7',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 4,
        marginBottom: 4,
    },
    offerCode: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#92400e',
    },
    offerDesc: {
        fontSize: 14,
        color: '#374151',
    },
});
