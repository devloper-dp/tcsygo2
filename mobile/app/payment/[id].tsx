import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import RazorpayCheckout from 'react-native-razorpay';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { PaymentMethodSelectorMobile, PromoCodeDialogMobile } from '../../components/PaymentComponents';
import { PaymentService } from '@/services/PaymentService';
import { RazorpayService } from '@/services/RazorpayService';
import { AutoPaySetup } from '@/components/AutoPaySetup';
import PaymentWebView from '../../components/PaymentWebView';

const PaymentScreen = () => {
    const router = useRouter();
    const { id: bookingId } = useLocalSearchParams();
    const { user } = useAuth();

    const [isProcessing, setIsProcessing] = useState(false);
    const [selectedMethod, setSelectedMethod] = useState('upi');
    const [promoVisible, setPromoVisible] = useState(false);
    const [appliedPromo, setAppliedPromo] = useState<{ code: string, discount: number, id: string } | null>(null);
    const [paymentOrder, setPaymentOrder] = useState<any>(null); // To keep track of current order if needed
    const [showWebView, setShowWebView] = useState(false);
    const [webViewOrder, setWebViewOrder] = useState<any>(null);

    const { data: booking, isLoading } = useQuery({
        queryKey: ['booking', bookingId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('bookings')
                .select(`
                    *,
                    trip:trips(*, driver:users(*)),
                    promo_code:promo_codes(*)
                `)
                .eq('id', bookingId)
                .single();
            if (error) throw error;
            return data;
        },
    });

    // Simplified promo calculation
    const [finalTotal, setFinalTotal] = useState(0);

    useEffect(() => {
        if (booking) {
            const baseAmount = parseFloat(booking.total_amount);
            const fee = baseAmount * 0.05; // 5% platform fee if not in DB
            const discount = appliedPromo?.discount || 0;
            setFinalTotal(Math.max(0, baseAmount + fee - discount));
        }
    }, [booking, appliedPromo]);

    const updateBookingMutation = useMutation({
        mutationFn: async ({ amount, promoCodeId }: { amount: number, promoCodeId?: string | null }) => {
            const { error } = await supabase
                .from('bookings')
                .update({
                    total_amount: amount.toString(),
                    promo_code_id: promoCodeId
                })
                .eq('id', bookingId);
            if (error) throw error;
        },
        onError: (error: any) => {
            Alert.alert('Error', 'Failed to update booking amount');
        }
    });

    const createOrderMutation = useMutation({
        mutationFn: async () => {
            const { data: orderData, error: orderError } = await supabase.functions.invoke('create-payment-order', {
                body: { bookingId } // We should send final amount here if promo logic was server-side, but standard flow uses booking total
            });
            if (orderError) throw orderError;
            return orderData;
        },
        onSuccess: (data) => {
            setPaymentOrder(data);
            setIsProcessing(false);
        },
        onError: (error: any) => {
            Alert.alert('Error', error.message || 'Failed to create payment order');
            setIsProcessing(false);
        }
    });

    const verifyPaymentMutation = useMutation({
        mutationFn: async (paymentData: {
            razorpayPaymentId: string,
            razorpayOrderId: string,
            razorpaySignature: string
        }) => {
            const { data, error } = await supabase.functions.invoke('verify-payment', {
                body: {
                    bookingId,
                    ...paymentData
                }
            });
            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            setPaymentOrder(null);
            Alert.alert('Success', 'Payment verified successfully!');
            router.replace(`/booking/${bookingId}` as any);
        },
        onError: (error: any) => {
            setPaymentOrder(null);
            Alert.alert('Payment Verification Failed', error.message);
        }
    });

    const handlePayment = async () => {
        if (isProcessing) return;
        setIsProcessing(true);

        try {
            // 1. Process via PaymentService
            const result = await PaymentService.processPayment(
                bookingId as string,
                finalTotal,
                selectedMethod as any
            );

            if (!result.success) {
                if (result.error) Alert.alert('Payment Failed', result.error);
                return;
            }

            // 2. If online method, we got an orderId back, now open Razorpay
            if (result.orderId) {
                const checkoutResult = await RazorpayService.openCheckout({
                    description: `Ride Payment #${bookingId}`,
                    amount: Math.round(finalTotal * 100),
                    orderId: result.orderId,
                    prefill: {
                        name: user?.fullName || 'Passenger',
                        email: user?.email || '',
                        contact: user?.phone || '',
                    }
                });

                if (checkoutResult.success) {
                    // Success is handled by verification in openCheckout,
                    // but we should still navigate to success screen
                    router.replace({
                        pathname: '/payment/success',
                        params: { bookingId: bookingId as string, amount: finalTotal.toString() }
                    });
                } else if (checkoutResult.error !== 'Payment cancelled or failed') {
                    Alert.alert('Payment Failed', checkoutResult.error);
                }
            } else if (result.success) {
                // Cash or Wallet already succeeded
                router.replace({
                    pathname: '/payment/success',
                    params: { bookingId: bookingId as string, amount: finalTotal.toString() }
                });
            }

        } catch (error: any) {
            console.error('Payment Error:', error);
            Alert.alert('Payment Error', error.message || 'Something went wrong');
        } finally {
            setIsProcessing(false);
        }
    };

    if (isLoading || !booking) {
        return (
            <View style={styles.loading}>
                <ActivityIndicator size="large" color="#3b82f6" />
                <Text style={styles.loadingText}>Loading payment details...</Text>
            </View>
        );
    }

    const { trip } = booking;
    const platformFee = parseFloat(booking.total_amount) * 0.05;

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={24} color="#1f2937" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Secure Payment</Text>
                <View style={{ width: 24 }} />
            </View>

            <ScrollView style={styles.scrollView}>
                <View style={styles.summaryCard}>
                    <Text style={styles.summaryTitle}>Payment Summary</Text>

                    <View style={styles.tripPreview}>
                        <View style={styles.routePreview}>
                            <Text style={styles.routeText} numberOfLines={1}>{trip.pickup_location}</Text>
                            <Ionicons name="arrow-forward" size={16} color="#9ca3af" />
                            <Text style={styles.routeText} numberOfLines={1}>{trip.drop_location}</Text>
                        </View>
                        <Text style={styles.dateTimeText}>
                            {new Date(trip.departure_time).toLocaleString()}
                        </Text>
                    </View>

                    <View style={styles.divider} />

                    <View style={styles.priceList}>
                        <View style={styles.priceRow}>
                            <Text style={styles.priceLabel}>Trip Fare ({booking.seats_booked} seats)</Text>
                            <Text style={styles.priceValue}>₹{booking.total_amount}</Text>
                        </View>
                        <View style={styles.priceRow}>
                            <Text style={styles.priceLabel}>Platform Fee (5%)</Text>
                            <Text style={styles.priceValue}>₹{platformFee.toFixed(2)}</Text>
                        </View>
                        {appliedPromo && (
                            <View style={styles.priceRow}>
                                <Text style={[styles.priceLabel, { color: '#059669' }]}>Promo Code ({appliedPromo.code})</Text>
                                <Text style={[styles.priceValue, { color: '#059669' }]}>-₹{appliedPromo.discount.toFixed(2)}</Text>
                            </View>
                        )}
                        <View style={[styles.priceRow, styles.totalRow]}>
                            <Text style={styles.totalLabel}>Total Amount</Text>
                            <Text style={styles.totalValue}>₹{finalTotal.toFixed(2)}</Text>
                        </View>
                    </View>
                </View>

                {!appliedPromo ? (
                    <TouchableOpacity
                        style={styles.promoBtn}
                        onPress={() => setPromoVisible(true)}
                    >
                        <Ionicons name="pricetag-outline" size={20} color="#3b82f6" />
                        <Text style={styles.promoBtnText}>Have a promo code?</Text>
                    </TouchableOpacity>
                ) : (
                    <View style={styles.appliedPromoCard}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <Ionicons name="checkmark-circle" size={20} color="#059669" />
                            <Text style={styles.appliedPromoText}>Code {appliedPromo.code} applied!</Text>
                        </View>
                        <TouchableOpacity onPress={async () => {
                            // Calculate total without discount
                            const platformFee = booking.total_amount * 0.05; // Note: booking.total_amount might be outdated if we updated local state but not refetched. 
                            // Better: Recalculate from base fare
                            const baseFare = parseFloat(trip.price_per_seat) * booking.seats_booked;
                            const newTotal = baseFare * 1.05;

                            try {
                                setAppliedPromo(null);
                                await updateBookingMutation.mutateAsync({ amount: newTotal, promoCodeId: null });
                            } catch (e) { /* Error alert handled in mutation */ }
                        }}>
                            <Text style={styles.removePromoText}>Remove</Text>
                        </TouchableOpacity>
                    </View>
                )}

                <PaymentMethodSelectorMobile
                    selectedMethod={selectedMethod}
                    onSelect={setSelectedMethod}
                />

                <AutoPaySetup style={{ marginTop: 20 }} />

                <View style={styles.securityInfo}>
                    <Ionicons name="shield-checkmark" size={20} color="#22c55e" />
                    <Text style={styles.securityText}>
                        Your transaction is secured with 128-bit SSL encryption.
                    </Text>
                </View>
            </ScrollView>

            <View style={styles.footer}>
                <TouchableOpacity
                    style={[styles.payBtn, isProcessing && styles.payBtnDisabled]}
                    onPress={handlePayment}
                    disabled={isProcessing}
                >
                    {isProcessing ? (
                        <ActivityIndicator color="white" />
                    ) : (
                        <Text style={styles.payBtnText}>Pay ₹{finalTotal.toFixed(2)}</Text>
                    )}
                </TouchableOpacity>
            </View>

            <PromoCodeDialogMobile
                visible={promoVisible}
                onClose={() => setPromoVisible(false)}
                onApply={async (code, discount, id) => {
                    // Update DB immediately
                    const baseFare = parseFloat(trip.price_per_seat) * booking.seats_booked;
                    const newSubtotal = Math.max(0, baseFare - discount);
                    const newTotal = newSubtotal * 1.05;

                    try {
                        setAppliedPromo({ code, discount, id });
                        await updateBookingMutation.mutateAsync({ amount: newTotal, promoCodeId: id });
                        setPromoVisible(false); // Close after successful update
                    } catch (e) {
                        setAppliedPromo(null); // Revert if failed
                    }
                }}
            />

            <Modal visible={showWebView} animationType="slide">
                {webViewOrder && (
                    <PaymentWebView
                        orderId={webViewOrder.id}
                        amount={webViewOrder.amount}
                        currency="INR"
                        userName={user?.fullName || 'Passenger'}
                        userEmail={user?.email || ''}
                        userContact={user?.phone || ''}
                        onSuccess={async (paymentId, signature) => {
                            setShowWebView(false);
                            setIsProcessing(true);
                            try {
                                await verifyPaymentMutation.mutateAsync({
                                    razorpayPaymentId: paymentId,
                                    razorpayOrderId: webViewOrder.id,
                                    razorpaySignature: signature
                                });
                                router.replace({
                                    pathname: '/payment/success',
                                    params: { bookingId: bookingId as string, amount: finalTotal.toString() }
                                });
                            } catch (e) {
                                router.replace({
                                    pathname: '/payment/failure' as any,
                                    params: { bookingId: bookingId as string, error: 'Verification failed' }
                                });
                            } finally {
                                setIsProcessing(false);
                            }
                        }}
                        onError={(err) => {
                            setShowWebView(false);
                            router.replace({
                                pathname: '/payment/failure' as any,
                                params: { bookingId: bookingId as string, error: err }
                            });
                        }}
                        onClose={() => setShowWebView(false)}
                    />
                )}
            </Modal>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f9fafb',
    },
    loading: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 12,
    },
    loadingText: {
        color: '#6b7280',
        fontSize: 14,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 16,
        backgroundColor: 'white',
        borderBottomWidth: 1,
        borderBottomColor: '#f3f4f6',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1f2937',
    },
    scrollView: {
        flex: 1,
        padding: 20,
    },
    summaryCard: {
        backgroundColor: 'white',
        borderRadius: 16,
        padding: 20,
        boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.05)',
        elevation: 2,
        marginBottom: 20,
    },
    summaryTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#1f2937',
        marginBottom: 16,
    },
    tripPreview: {
        gap: 4,
    },
    routePreview: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    routeText: {
        fontSize: 15,
        color: '#374151',
        fontWeight: '500',
        maxWidth: '40%',
    },
    dateTimeText: {
        fontSize: 13,
        color: '#6b7280',
    },
    divider: {
        height: 1,
        backgroundColor: '#f3f4f6',
        marginVertical: 16,
    },
    priceList: {
        gap: 12,
    },
    priceRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    priceLabel: {
        fontSize: 14,
        color: '#6b7280',
    },
    priceValue: {
        fontSize: 14,
        color: '#1f2937',
        fontWeight: '500',
    },
    totalRow: {
        marginTop: 4,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#f3f4f6',
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
    promoBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        padding: 16,
        backgroundColor: 'white',
        borderRadius: 12,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#e5e7eb',
        borderStyle: 'dashed',
    },
    promoBtnText: {
        fontSize: 15,
        color: '#3b82f6',
        fontWeight: '500',
    },
    appliedPromoCard: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        backgroundColor: '#d1fae5',
        borderRadius: 12,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#10b981',
    },
    appliedPromoText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#065f46',
    },
    removePromoText: {
        fontSize: 13,
        color: '#ef4444',
        fontWeight: '500',
    },
    securityInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingHorizontal: 12,
        marginBottom: 40,
    },
    securityText: {
        fontSize: 12,
        color: '#6b7280',
        flex: 1,
    },
    footer: {
        padding: 24,
        backgroundColor: 'white',
        borderTopWidth: 1,
        borderTopColor: '#f3f4f6',
    },
    payBtn: {
        backgroundColor: '#3b82f6',
        height: 56,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    payBtnDisabled: {
        backgroundColor: '#9ca3af',
    },
    payBtnText: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
    },
});

export default PaymentScreen;
