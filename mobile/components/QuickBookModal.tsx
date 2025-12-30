import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Modal, ScrollView, ActivityIndicator, Pressable } from 'react-native';
import Animated, {
    FadeIn,
    FadeInDown,
    FadeOut,
    SlideInDown,
    useAnimatedStyle,
    withSpring,
    withTiming,
    Layout
} from 'react-native-reanimated';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Ionicons } from '@expo/vector-icons';
import { RideService, FareEstimate } from '@/services/RideService';
import { QuickBookService } from '@/services/QuickBookService';
import { PromoCodeService, PromoCodeValidation } from '@/services/PromoCodeService';
import { Coordinates } from '@/lib/maps';
import { Input } from '@/components/ui/input';
import { supabase } from '@/lib/supabase';

interface QuickBookModalProps {
    visible: boolean;
    onClose: () => void;
    pickup: { address: string; coords: Coordinates };
    drop: { address: string; coords: Coordinates };
    onBookingSuccess: (bookingId: string) => void;
}

const VEHICLE_TYPES = [
    { id: 'bike', name: 'Bike', icon: 'bicycle-outline', description: 'Fastest for city traffic' },
    { id: 'auto', name: 'Auto', icon: 'car-outline', description: 'Comfortable at local rates' },
    { id: 'car', name: 'Car', icon: 'car-sport-outline', description: 'Premium & AC comfort' },
] as const;

export function QuickBookModal({ visible, onClose, pickup, drop, onBookingSuccess }: QuickBookModalProps) {
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
            animationType="slide"
            transparent={true}
            onRequestClose={onClose}
        >
            <View style={styles.modalOverlay}>
                <Animated.View
                    entering={SlideInDown.springify().damping(15)}
                    exiting={FadeOut}
                    style={styles.modalContent}
                >
                    <View style={styles.header}>
                        <Text variant="h3" style={styles.title}>Choose Your Ride</Text>
                        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                            <Ionicons name="close" size={24} color="#6b7280" />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.routeInfo}>
                        <View style={styles.routeRow}>
                            <View style={[styles.dot, { backgroundColor: '#10b981' }]} />
                            <Text style={styles.addressText} numberOfLines={1}>{pickup.address}</Text>
                        </View>
                        <View style={styles.line} />
                        <View style={styles.routeRow}>
                            <View style={[styles.dot, { backgroundColor: '#ef4444' }]} />
                            <Text style={styles.addressText} numberOfLines={1}>{drop.address}</Text>
                        </View>
                    </View>

                    {loading ? (
                        <View style={styles.loaderContainer}>
                            <ActivityIndicator size="large" color="#3b82f6" />
                            <Text style={styles.loaderText}>Calculating best fares...</Text>
                        </View>
                    ) : (
                        <ScrollView style={styles.vehicleList} showsVerticalScrollIndicator={false}>
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
                                            style={[
                                                styles.vehicleCard,
                                                isSelected && styles.selectedCard
                                            ]}
                                            onPress={() => setSelectedType(type.id)}
                                        >
                                            <Animated.View style={[
                                                styles.iconBox,
                                                isSelected && styles.selectedIconBox,
                                            ]}>
                                                <Ionicons name={type.icon} size={28} color={isSelected ? 'white' : '#3b82f6'} />
                                            </Animated.View>
                                            <View style={styles.vehicleDetails}>
                                                <View style={styles.typeHeader}>
                                                    <Text style={[styles.typeName, isSelected && styles.selectedText]}>{type.name}</Text>
                                                    <View style={styles.etaBadge}>
                                                        <Ionicons name="time-outline" size={12} color="#10b981" />
                                                        <Text style={styles.etaText}>3-5 min</Text>
                                                    </View>
                                                </View>
                                                <Text style={styles.typeDesc}>{type.description}</Text>
                                                {estimate?.surgeMultiplier > 1 && (
                                                    <View style={styles.surgeBadge}>
                                                        <Ionicons name="flash" size={10} color="#f59e0b" />
                                                        <Text style={styles.surgeText}>
                                                            {estimate.surgeReason || 'High Demand'} ({estimate.surgeMultiplier}x)
                                                        </Text>
                                                    </View>
                                                )}
                                            </View>
                                            <View style={styles.priceContainer}>
                                                <Text style={[styles.price, isSelected && styles.selectedText]}>
                                                    ₹{estimate?.estimatedPrice || '--'}
                                                </Text>
                                                {estimate?.surgeMultiplier > 1 && (
                                                    <Text style={styles.originalPrice}>₹{estimate.basePrice}</Text>
                                                )}
                                            </View>
                                        </Pressable>
                                    </Animated.View>
                                );
                            })}
                        </ScrollView>
                    )}

                    <View style={styles.footer}>
                        <View style={styles.promoSection}>
                            <View style={styles.promoInputRow}>
                                <Ionicons name="pricetag-outline" size={20} color="#4b5563" />
                                <Input
                                    placeholder="Enter Promo Code"
                                    value={promoCode}
                                    onChangeText={(text) => {
                                        setPromoCode(text.toUpperCase());
                                        setPromoValidation(null);
                                    }}
                                    style={styles.promoInput}
                                    autoCapitalize="characters"
                                />
                                <TouchableOpacity
                                    onPress={handleApplyPromo}
                                    disabled={!promoCode || validatingPromo}
                                    style={styles.applyBtn}
                                >
                                    {validatingPromo ? (
                                        <ActivityIndicator size="small" color="#3b82f6" />
                                    ) : (
                                        <Text style={styles.applyBtnText}>Apply</Text>
                                    )}
                                </TouchableOpacity>
                            </View>
                            {promoValidation && (
                                <Text style={[
                                    styles.promoMessage,
                                    { color: promoValidation.valid ? '#10b981' : '#ef4444' }
                                ]}>
                                    {promoValidation.message}
                                </Text>
                            )}
                        </View>

                        <View style={styles.paymentMethod}>
                            <Ionicons name="wallet-outline" size={20} color="#4b5563" />
                            <View style={{ flex: 1, marginLeft: 8 }}>
                                <Text style={styles.paymentText}>Personal • Wallet</Text>
                                {promoValidation?.valid && (
                                    <Text style={styles.discountText}>Discount applied: -₹{promoValidation.discount}</Text>
                                )}
                            </View>
                            <TouchableOpacity style={styles.changeBtn}>
                                <Text style={styles.changeBtnText}>Change</Text>
                            </TouchableOpacity>
                        </View>

                        <Button
                            onPress={handleBook}
                            disabled={loading || bookingInProgress}
                            size="lg"
                            className="w-full"
                        >
                            {bookingInProgress ? (
                                <ActivityIndicator color="white" />
                            ) : (
                                <>
                                    <Text className="text-white font-bold text-lg mr-2">Book {selectedType.toUpperCase()}</Text>
                                    <Ionicons name="arrow-forward" size={20} color="white" />
                                </>
                            )}
                        </Button>
                    </View>
                </Animated.View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
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
        maxHeight: '80%',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    title: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#1f2937',
    },
    closeBtn: {
        padding: 4,
    },
    routeInfo: {
        backgroundColor: '#f9fafb',
        borderRadius: 16,
        padding: 16,
        marginBottom: 20,
    },
    routeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    line: {
        width: 1,
        height: 12,
        backgroundColor: '#e5e7eb',
        marginLeft: 3,
        marginVertical: 4,
    },
    addressText: {
        fontSize: 14,
        color: '#4b5563',
        flex: 1,
    },
    loaderContainer: {
        padding: 40,
        alignItems: 'center',
    },
    loaderText: {
        marginTop: 12,
        color: '#6b7280',
    },
    vehicleList: {
        marginBottom: 20,
    },
    vehicleCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#e5e7eb',
        marginBottom: 12,
    },
    selectedCard: {
        borderColor: '#3b82f6',
        backgroundColor: '#eff6ff',
    },
    iconBox: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: '#f3f4f6',
        justifyContent: 'center',
        alignItems: 'center',
    },
    selectedIconBox: {
        backgroundColor: '#3b82f6',
    },
    vehicleDetails: {
        flex: 1,
        marginLeft: 16,
    },
    typeHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    typeName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#1f2937',
    },
    selectedText: {
        color: '#1f2937',
    },
    typeDesc: {
        fontSize: 12,
        color: '#6b7280',
        marginTop: 2,
    },
    etaBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#dcfce7',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
        gap: 2,
    },
    etaText: {
        fontSize: 10,
        fontWeight: 'bold',
        color: '#16a34a',
    },
    surgeBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fef3c7',
        alignSelf: 'flex-start',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
        gap: 2,
        marginTop: 4,
    },
    surgeText: {
        fontSize: 10,
        fontWeight: 'bold',
        color: '#d97706',
    },
    priceContainer: {
        alignItems: 'flex-end',
    },
    price: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1f2937',
    },
    originalPrice: {
        fontSize: 12,
        color: '#9ca3af',
        textDecorationLine: 'line-through',
    },
    footer: {
        borderTopWidth: 1,
        borderTopColor: '#f3f4f6',
        paddingTop: 16,
    },
    promoSection: {
        marginBottom: 16,
    },
    promoInputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f9fafb',
        borderRadius: 12,
        paddingHorizontal: 12,
        borderWidth: 1,
        borderColor: '#e5e7eb',
    },
    promoInput: {
        flex: 1,
        height: 48,
        borderWidth: 0,
        paddingHorizontal: 8,
    },
    applyBtn: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        backgroundColor: '#eff6ff',
        borderRadius: 8,
    },
    applyBtnText: {
        color: '#3b82f6',
        fontWeight: 'bold',
        fontSize: 14,
    },
    promoMessage: {
        fontSize: 12,
        marginTop: 4,
        marginLeft: 4,
    },
    discountText: {
        fontSize: 12,
        color: '#10b981',
        fontWeight: '600',
    },
    paymentMethod: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    paymentText: {
        fontSize: 14,
        color: '#4b5563',
    },
    changeBtnText: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#3b82f6',
    },
    changeBtn: {
        padding: 4,
    }
});
