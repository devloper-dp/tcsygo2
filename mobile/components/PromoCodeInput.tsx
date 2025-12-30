import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    ActivityIndicator,
    FlatList,
} from 'react-native';
import { Tag, X, Check, Gift } from 'lucide-react-native';
import { PromoCodeService, PromoCode } from '@/services/PromoCodeService';
import { useAuth } from '@/contexts/AuthContext';

interface PromoCodeInputProps {
    orderAmount: number;
    vehicleType?: string;
    onPromoApplied: (discount: number, promoCode: PromoCode) => void;
    onPromoRemoved: () => void;
}

export const PromoCodeInput: React.FC<PromoCodeInputProps> = ({
    orderAmount,
    vehicleType,
    onPromoApplied,
    onPromoRemoved,
}) => {
    const { user } = useAuth();
    const [promoCode, setPromoCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [appliedPromo, setAppliedPromo] = useState<PromoCode | null>(null);
    const [discount, setDiscount] = useState(0);
    const [error, setError] = useState('');
    const [showAvailable, setShowAvailable] = useState(false);
    const [availablePromos, setAvailablePromos] = useState<PromoCode[]>([]);

    useEffect(() => {
        if (showAvailable && user) {
            loadAvailablePromos();
        }
    }, [showAvailable, user]);

    const loadAvailablePromos = async () => {
        if (!user) return;
        setLoading(true);
        try {
            const promos = await PromoCodeService.getAvailablePromoCodes(user.id);
            setAvailablePromos(promos);
        } catch (error) {
            console.error('Error loading available promos:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleApplyPromo = async (code?: string) => {
        if (!user) return;

        const codeToApply = code || promoCode;
        if (!codeToApply.trim()) {
            setError('Please enter a promo code');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const result = await PromoCodeService.validatePromoCode(
                codeToApply,
                user.id,
                orderAmount,
                vehicleType
            );

            if (result.valid && result.promoCode) {
                setAppliedPromo(result.promoCode);
                setDiscount(result.discount);
                setError('');
                onPromoApplied(result.discount, result.promoCode);
                setShowAvailable(false);
            } else {
                setError(result.message);
                setAppliedPromo(null);
                setDiscount(0);
            }
        } catch (error: any) {
            setError('Failed to apply promo code');
            console.error('Error applying promo:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleRemovePromo = () => {
        setPromoCode('');
        setAppliedPromo(null);
        setDiscount(0);
        setError('');
        onPromoRemoved();
    };

    const renderPromoItem = ({ item }: { item: PromoCode }) => {
        const discountText =
            item.discount_type === 'percentage'
                ? `${item.discount_value}% OFF`
                : `₹${item.discount_value} OFF`;

        return (
            <TouchableOpacity
                style={styles.promoItem}
                onPress={() => handleApplyPromo(item.code)}
                disabled={loading}
            >
                <View style={styles.promoIcon}>
                    <Gift size={24} color="#10b981" />
                </View>
                <View style={styles.promoDetails}>
                    <Text style={styles.promoCode}>{item.code}</Text>
                    <Text style={styles.promoDescription}>{item.description}</Text>
                    {item.min_order_value > 0 && (
                        <Text style={styles.promoCondition}>
                            Min. order: ₹{item.min_order_value}
                        </Text>
                    )}
                </View>
                <View style={styles.promoDiscount}>
                    <Text style={styles.discountText}>{discountText}</Text>
                    <Text style={styles.applyText}>APPLY</Text>
                </View>
            </TouchableOpacity>
        );
    };

    if (appliedPromo) {
        return (
            <View style={styles.appliedContainer}>
                <View style={styles.appliedContent}>
                    <Check size={20} color="#10b981" />
                    <View style={styles.appliedInfo}>
                        <Text style={styles.appliedCode}>{appliedPromo.code} Applied</Text>
                        <Text style={styles.appliedSavings}>You saved ₹{discount}!</Text>
                    </View>
                </View>
                <TouchableOpacity onPress={handleRemovePromo} style={styles.removeButton}>
                    <X size={20} color="#ef4444" />
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.inputContainer}>
                <Tag size={20} color="#6b7280" />
                <TextInput
                    style={styles.input}
                    placeholder="Enter promo code"
                    placeholderTextColor="#9ca3af"
                    value={promoCode}
                    onChangeText={(text) => {
                        setPromoCode(text.toUpperCase());
                        setError('');
                    }}
                    autoCapitalize="characters"
                    editable={!loading}
                />
                {loading ? (
                    <ActivityIndicator size="small" color="#3b82f6" />
                ) : (
                    <TouchableOpacity
                        onPress={() => handleApplyPromo()}
                        style={styles.applyButton}
                        disabled={!promoCode.trim()}
                    >
                        <Text
                            style={[
                                styles.applyButtonText,
                                !promoCode.trim() && styles.applyButtonTextDisabled,
                            ]}
                        >
                            Apply
                        </Text>
                    </TouchableOpacity>
                )}
            </View>

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <TouchableOpacity
                style={styles.viewOffersButton}
                onPress={() => setShowAvailable(!showAvailable)}
            >
                <Gift size={16} color="#3b82f6" />
                <Text style={styles.viewOffersText}>
                    {showAvailable ? 'Hide' : 'View'} Available Offers
                </Text>
            </TouchableOpacity>

            {showAvailable && (
                <View style={styles.availableContainer}>
                    {loading ? (
                        <View style={styles.loadingContainer}>
                            <ActivityIndicator size="small" color="#3b82f6" />
                            <Text style={styles.loadingText}>Loading offers...</Text>
                        </View>
                    ) : availablePromos.length > 0 ? (
                        <FlatList
                            data={availablePromos}
                            renderItem={renderPromoItem}
                            keyExtractor={(item) => item.id}
                            scrollEnabled={false}
                        />
                    ) : (
                        <Text style={styles.noOffersText}>No offers available</Text>
                    )}
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginVertical: 12,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#d1d5db',
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 10,
        backgroundColor: '#fff',
        gap: 8,
    },
    input: {
        flex: 1,
        fontSize: 14,
        color: '#1f2937',
        fontWeight: '600',
    },
    applyButton: {
        paddingHorizontal: 16,
        paddingVertical: 6,
        borderRadius: 6,
        backgroundColor: '#dbeafe',
    },
    applyButtonText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#3b82f6',
    },
    applyButtonTextDisabled: {
        color: '#9ca3af',
    },
    errorText: {
        fontSize: 12,
        color: '#ef4444',
        marginTop: 4,
        marginLeft: 4,
    },
    viewOffersButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 12,
        gap: 6,
    },
    viewOffersText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#3b82f6',
    },
    availableContainer: {
        marginTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#e5e7eb',
        paddingTop: 12,
    },
    loadingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
        gap: 12,
    },
    loadingText: {
        fontSize: 14,
        color: '#6b7280',
    },
    noOffersText: {
        fontSize: 14,
        color: '#6b7280',
        textAlign: 'center',
        padding: 20,
    },
    promoItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        backgroundColor: '#f9fafb',
        borderRadius: 8,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: '#e5e7eb',
    },
    promoIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#d1fae5',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    promoDetails: {
        flex: 1,
    },
    promoCode: {
        fontSize: 14,
        fontWeight: '700',
        color: '#1f2937',
        marginBottom: 2,
    },
    promoDescription: {
        fontSize: 12,
        color: '#6b7280',
        marginBottom: 2,
    },
    promoCondition: {
        fontSize: 11,
        color: '#9ca3af',
    },
    promoDiscount: {
        alignItems: 'flex-end',
    },
    discountText: {
        fontSize: 16,
        fontWeight: '800',
        color: '#10b981',
        marginBottom: 4,
    },
    applyText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#3b82f6',
    },
    appliedContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 12,
        backgroundColor: '#d1fae5',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#10b981',
        marginVertical: 12,
    },
    appliedContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    appliedInfo: {
        gap: 2,
    },
    appliedCode: {
        fontSize: 14,
        fontWeight: '700',
        color: '#065f46',
    },
    appliedSavings: {
        fontSize: 12,
        color: '#047857',
    },
    removeButton: {
        padding: 4,
    },
});
