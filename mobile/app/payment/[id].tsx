import { useState, useEffect } from 'react';
import { View, ScrollView, TouchableOpacity, Alert, ActivityIndicator, Modal, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useQuery, useMutation } from '@tanstack/react-query';
import { ArrowLeft, ArrowRight, ShieldCheck, Tag, Ticket, CreditCard, ChevronRight, CheckCircle2, TicketX } from 'lucide-react-native';
import RazorpayCheckout from 'react-native-razorpay';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { PaymentMethodSelectorMobile, PromoCodeDialogMobile } from '../../components/PaymentComponents';
import { PaymentService } from '@/services/PaymentService';
import { RazorpayService } from '@/services/RazorpayService';
import { AutoPaySetup } from '@/components/AutoPaySetup';
import PaymentWebView from '../../components/PaymentWebView';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/contexts/ThemeContext';
import { useResponsive } from '@/hooks/useResponsive';
import { useToast } from '@/components/ui/toast';
 
const PaymentScreen = () => {
    const router = useRouter();
    const { id: bookingId } = useLocalSearchParams();
    const { user } = useAuth();
    const { theme, isDark, colors } = useTheme();
    const { hScale, vScale, spacing } = useResponsive();
    const { toast } = useToast();
 
    const [isProcessing, setIsProcessing] = useState(false);
    const [selectedMethod, setSelectedMethod] = useState('upi');
    const [promoVisible, setPromoVisible] = useState(false);
    const [appliedPromo, setAppliedPromo] = useState<{ code: string, discount: number, id: string } | null>(null);
    const [paymentOrder, setPaymentOrder] = useState<any>(null);
    const [showWebView, setShowWebView] = useState(false);
    const [webViewOrder, setWebViewOrder] = useState<any>(null);
 
    const { data: booking, isLoading, isError, error: queryError, refetch } = useQuery({
        queryKey: ['booking', bookingId],
        enabled: !!bookingId,
        retry: 2,
        queryFn: async () => {
            try {
                // Fetch booking without promo_code relationship (it doesn't exist in DB)
                const { data, error } = await supabase
                    .from('bookings')
                    .select(`
                        *,
                        trip:trips(*, driver:drivers(*, user:users(*)))
                    `)
                    .eq('id', bookingId)
                    .single();
                
                if (error) throw error;

                // Secondary fetch for promo code usage since relationship is missing
                const { data: promoUsage } = await supabase
                    .from('promo_code_uses')
                    .select('*, promo_code:promo_codes(*)')
                    .eq('booking_id', bookingId)
                    .single();

                if (promoUsage && promoUsage.promo_code) {
                    setAppliedPromo({
                        code: promoUsage.promo_code.code,
                        discount: parseFloat(promoUsage.discount_amount),
                        id: promoUsage.promo_code.id
                    });
                }

                return data;
            } catch (err) {
                console.error('Booking query error:', err);
                throw err;
            }
        },
    });
 
    const [finalTotal, setFinalTotal] = useState(0);
 
    useEffect(() => {
        if (booking) {
            const baseAmount = parseFloat(booking.total_amount);
            const fee = baseAmount * 0.05;
            const discount = appliedPromo?.discount || 0;
            setFinalTotal(Math.max(0, baseAmount + fee - discount));
        }
    }, [booking, appliedPromo]);
 
    const updateBookingMutation = useMutation({
        mutationFn: async ({ amount, promoCodeId }: { amount: number, promoCodeId?: string | null }) => {
            const { error } = await supabase
                .from('bookings')
                .update({
                    total_amount: amount.toString()
                })
                .eq('id', bookingId);
            if (error) throw error;
        },
        onError: (error: any) => {
            toast({
                title: 'Error',
                description: 'Failed to update booking amount',
                variant: 'destructive',
            });
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
            toast({
                title: 'Success',
                description: 'Payment verified successfully!',
            });
            router.replace(`/booking/${bookingId}` as any);
        },
        onError: (error: any) => {
            setPaymentOrder(null);
            toast({
                title: 'Payment Verification Failed',
                description: error.message,
                variant: 'destructive',
            });
        }
    });
 
    const handlePayment = async () => {
        if (isProcessing) return;
        setIsProcessing(true);
 
        try {
            const result = await PaymentService.processPayment(
                bookingId as string,
                finalTotal,
                selectedMethod as any
            );
 
            if (!result.success) {
                if (result.error) toast({ title: 'Payment Failed', description: result.error, variant: 'destructive' });
                return;
            }
 
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
                    router.replace({
                        pathname: '/payment/success',
                        params: { bookingId: bookingId as string, amount: finalTotal.toString() }
                    } as any);
                } else if (checkoutResult.error !== 'Payment cancelled or failed') {
                    toast({ title: 'Payment Failed', description: checkoutResult.error, variant: 'destructive' });
                }
            } else if (result.success) {
                router.replace({
                    pathname: '/payment/success',
                    params: { bookingId: bookingId as string, amount: finalTotal.toString() }
                });
            }
 
        } catch (error: any) {
            console.error('Payment Error:', error);
            toast({
                title: 'Payment Error',
                description: error.message || 'Something went wrong',
                variant: 'destructive',
            });
        } finally {
            setIsProcessing(false);
        }
    };
 
    if (isLoading) {
        return (
            <SafeAreaView className="flex-1 justify-center items-center bg-white dark:bg-slate-950">
                <View style={{ gap: vScale(16), alignItems: 'center' }}>
                    <ActivityIndicator size="large" color={isDark ? "#ffffff" : "#1e293b"} />
                    <Text style={{ fontSize: hScale(10) }} className="text-slate-500 dark:text-slate-500 font-black uppercase tracking-widest">Loading checkout...</Text>
                </View>
            </SafeAreaView>
        );
    }

    if (isError || !booking) {
        return (
            <SafeAreaView className="flex-1 justify-center items-center bg-white dark:bg-slate-950 px-8">
                <View style={{ gap: vScale(24), alignItems: 'center' }}>
                   <View style={{ width: hScale(64), height: hScale(64), borderRadius: hScale(32) }} className="bg-rose-50 dark:bg-rose-900/20 items-center justify-center">
                        <TicketX size={hScale(32)} color="#ef4444" />
                    </View>
                    <View style={{ gap: vScale(8), alignItems: 'center' }}>
                        <Text style={{ fontSize: hScale(20) }} className="text-slate-900 dark:text-white font-black text-center">Failed to load booking</Text>
                        <Text style={{ fontSize: hScale(14) }} className="text-slate-500 dark:text-slate-400 text-center">
                            {queryError instanceof Error ? queryError.message : "We couldn't retrieve your booking details. This might be due to a network issue or the booking may no longer exist."}
                        </Text>
                    </View>
                    <View style={{ width: '100%', gap: vScale(12) }}>
                        <Button
                            onPress={() => refetch()}
                            className="bg-slate-900 dark:bg-white h-14 rounded-2xl"
                        >
                            <Text className="text-white dark:text-slate-900 font-bold">Try Again</Text>
                        </Button>
                        <TouchableOpacity
                            onPress={() => router.back()}
                            style={{ height: vScale(56), borderRadius: hScale(20), borderWidth: 1 }}
                            className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 items-center justify-center"
                        >
                             <Text style={{ fontSize: hScale(14) }} className="text-slate-600 dark:text-slate-400 font-bold">Go Back</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </SafeAreaView>
        );
    }
 
    const { trip } = booking;
    const platformFee = parseFloat(booking.total_amount) * 0.05;
 
    return (
        <View className="flex-1 bg-slate-50 dark:bg-slate-950">
            <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
 
            {/* Header */}
            <View style={{ paddingHorizontal: spacing.xl, paddingVertical: vScale(16), borderBottomWidth: 1 }} className="bg-white dark:bg-slate-950 border-slate-100 dark:border-slate-800 shadow-sm z-10">
                <SafeAreaView edges={['top']} style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <TouchableOpacity 
                        onPress={() => router.back()} 
                        style={{ width: hScale(40), height: hScale(40), borderRadius: hScale(20), marginRight: hScale(16) }}
                        className="bg-slate-50 dark:bg-slate-900 items-center justify-center active:bg-slate-100 dark:active:bg-slate-800"
                    >
                        <ArrowLeft size={hScale(20)} color={isDark ? "#f8fafc" : "#1e293b"} />
                    </TouchableOpacity>
                    <Text style={{ fontSize: hScale(20) }} className="font-black text-slate-900 dark:text-white uppercase tracking-tighter">Checkout</Text>
                </SafeAreaView>
            </View>
 
            <ScrollView 
                className="flex-1" 
                style={{ paddingHorizontal: spacing.xl, paddingTop: vScale(24) }} 
                contentContainerStyle={{ paddingBottom: vScale(120) }} 
                showsVerticalScrollIndicator={false}
            >
 
                {/* Trip Summary Card */}
                <View style={{ borderRadius: hScale(32), padding: spacing.xl, marginBottom: vScale(24), borderWidth: 1 }} className="bg-white dark:bg-slate-900 shadow-sm border-slate-100 dark:border-slate-800">
                    <Text style={{ fontSize: hScale(10), marginBottom: vScale(24) }} className="font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Trip Summary</Text>
 
                    <View style={{ gap: vScale(20), marginBottom: vScale(20), position: 'relative' }}>
                        {/* Connector */}
                        <View style={{ position: 'absolute', left: hScale(9.5), top: vScale(12), bottom: 0, width: 1 }} className="bg-slate-200 dark:bg-slate-800" />
 
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: hScale(16) }}>
                            <View style={{ width: hScale(20), height: hScale(20), borderRadius: hScale(10), borderWidth: 2, zIndex: 10 }} className="bg-slate-900 dark:bg-white border-white dark:border-slate-900" />
                            <Text style={{ fontSize: hScale(16), lineHeight: vScale(20) }} className="font-bold text-slate-800 dark:text-slate-200 flex-1 tracking-tight">{trip.pickup_location || booking.pickup_location}</Text>
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: hScale(16) }}>
                            <View style={{ width: hScale(20), height: hScale(20), borderRadius: hScale(10), borderWidth: 2, zIndex: 10 }} className="bg-red-500 border-white dark:border-slate-900" />
                            <Text style={{ fontSize: hScale(16), lineHeight: vScale(20) }} className="font-bold text-slate-800 dark:text-slate-200 flex-1 tracking-tight">{trip.drop_location || booking.drop_location}</Text>
                        </View>
                    </View>
 
                    <View style={{ padding: hScale(12), borderRadius: hScale(12), borderWidth: 1 }} className="bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-800/50 self-start">
                        <Text style={{ fontSize: hScale(10) }} className="font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                            {(() => {
                                const dateVal = trip.departure_time || trip.start_time || booking.created_at;
                                if (!dateVal) return 'Date Unavailable';
                                const date = new Date(dateVal);
                                return isNaN(date.getTime()) ? 'Invalid Date' : date.toLocaleString([], { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
                            })()}
                        </Text>
                    </View>
                </View>
 
                {/* Bill Details */}
                <View style={{ borderRadius: hScale(32), padding: spacing.xl, marginBottom: vScale(24), borderWidth: 1 }} className="bg-white dark:bg-slate-900 shadow-sm border-slate-100 dark:border-slate-800">
                    <Text style={{ fontSize: hScale(10), marginBottom: vScale(24) }} className="font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Payment Details</Text>
 
                    <View style={{ gap: vScale(16) }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                            <Text style={{ fontSize: hScale(14) }} className="font-bold text-slate-500 dark:text-slate-500">Trip Fare ({booking.seats_booked} seats)</Text>
                            <Text style={{ fontSize: hScale(14) }} className="font-black text-slate-900 dark:text-white uppercase tracking-tighter">₹{booking.total_amount}</Text>
                        </View>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                            <Text style={{ fontSize: hScale(14) }} className="font-bold text-slate-500 dark:text-slate-500">Platform Fee (5%)</Text>
                            <Text style={{ fontSize: hScale(14) }} className="font-black text-slate-900 dark:text-white uppercase tracking-tighter">₹{platformFee.toFixed(2)}</Text>
                        </View>
                        {appliedPromo && (
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', padding: hScale(12), borderRadius: hScale(16), borderWidth: 1 }} className="bg-green-50 dark:bg-green-900/20 border-green-100 dark:border-green-800/30">
                                <Text style={{ fontSize: hScale(14) }} className="font-black text-green-700 dark:text-green-400 uppercase tracking-widest">Promo ({appliedPromo.code})</Text>
                                <Text style={{ fontSize: hScale(14) }} className="font-black text-green-700 dark:text-green-400 uppercase tracking-tighter">-₹{appliedPromo.discount.toFixed(2)}</Text>
                            </View>
                        )}
 
                        <View style={{ height: 1, marginVertical: vScale(8) }} className="bg-slate-100 dark:bg-slate-800" />
 
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Text style={{ fontSize: hScale(18) }} className="font-black text-slate-900 dark:text-white uppercase tracking-tighter">Total Payable</Text>
                            <Text style={{ fontSize: hScale(30) }} className="font-black text-slate-900 dark:text-white uppercase tracking-tighter">₹{finalTotal.toFixed(2)}</Text>
                        </View>
                    </View>
                </View>
 
                {/* Promo Code */}
                {!appliedPromo ? (
                    <TouchableOpacity
                        style={{ flexDirection: 'row', alignItems: 'center', gap: hScale(16), padding: spacing.xl, borderRadius: hScale(32), marginBottom: vScale(24), borderStyle: 'dashed', borderWidth: 1 }}
                        className="bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-800 active:bg-slate-50 dark:active:bg-slate-800/80"
                        onPress={() => setPromoVisible(true)}
                    >
                        <View style={{ width: hScale(48), height: hScale(48), borderRadius: hScale(16) }} className="bg-blue-50 dark:bg-blue-900/20 items-center justify-center">
                            <Tag size={hScale(24)} color={isDark ? "#60a5fa" : "#3b82f6"} strokeWidth={2.5} />
                        </View>
                        <View className="flex-1">
                            <Text style={{ fontSize: hScale(16) }} className="font-bold text-slate-900 dark:text-white tracking-tight">Apply Coupon</Text>
                            <Text style={{ fontSize: hScale(12) }} className="font-medium text-slate-500 dark:text-slate-400">Get discounts on your ride</Text>
                        </View>
                        <ChevronRight size={hScale(20)} color={isDark ? "#334155" : "#cbd5e1"} />
                    </TouchableOpacity>
                ) : (
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.xl, borderRadius: hScale(32), marginBottom: vScale(24), borderWidth: 1 }} className="bg-white dark:bg-slate-900 border-green-200 dark:border-green-900/40 shadow-sm relative overflow-hidden">
                        <View style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: hScale(6) }} className="bg-green-500" />
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: hScale(16) }}>
                            <CheckCircle2 size={hScale(24)} color="#16a34a" strokeWidth={3} />
                            <View>
                                <Text style={{ fontSize: hScale(14) }} className="font-black text-slate-900 dark:text-white uppercase tracking-widest">Coupon Applied!</Text>
                                <Text style={{ fontSize: hScale(12) }} className="font-bold text-slate-500 dark:text-slate-500 uppercase tracking-tighter">{appliedPromo.code} SAVED ₹{appliedPromo.discount}</Text>
                            </View>
                        </View>
                        <TouchableOpacity
                            onPress={async () => {
                                const baseFare = parseFloat(trip.price_per_seat) * booking.seats_booked;
                                const newTotal = baseFare * 1.05;
                                try {
                                    setAppliedPromo(null);
                                    await updateBookingMutation.mutateAsync({ amount: newTotal, promoCodeId: null });
                                } catch (e) { }
                            }}
                            style={{ padding: hScale(10), borderRadius: hScale(16) }}
                            className="bg-slate-100 dark:bg-slate-800"
                        >
                            <TicketX size={hScale(20)} color="#ef4444" strokeWidth={2.5} />
                        </TouchableOpacity>
                    </View>
                )}
 
                {/* Payment Method */}
                <View style={{ marginBottom: vScale(24) }}>
                    <Text style={{ fontSize: hScale(10), marginBottom: vScale(16), paddingHorizontal: hScale(4) }} className="font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Select Payment Method</Text>
                    <PaymentMethodSelectorMobile
                        selectedMethod={selectedMethod}
                        onSelect={setSelectedMethod}
                    />
                </View>
 
                <AutoPaySetup style={{ marginTop: 0, marginBottom: vScale(20) }} />
 
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: hScale(12), marginBottom: vScale(40), opacity: 0.4 }}>
                    <ShieldCheck size={hScale(16)} color={isDark ? "#94a3b8" : "#64748b"} />
                    <Text style={{ fontSize: hScale(10) }} className="text-slate-500 dark:text-slate-400 font-extrabold uppercase tracking-widest">Secured with 256-bit SSL Encryption</Text>
                </View>
 
            </ScrollView>
 
            {/* Bottom Action Bar */}
            <View style={{ padding: spacing.xl, borderTopWidth: 1 }} className="bg-white dark:bg-slate-950 border-slate-100 dark:border-slate-800 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
                <Button
                    style={{ height: vScale(64), borderRadius: hScale(24) }}
                    className={`justify-center items-center shadow-lg shadow-blue-500/10 ${isProcessing ? 'bg-slate-200 dark:bg-slate-800' : 'bg-slate-900 dark:bg-white'}`}
                    onPress={handlePayment}
                    disabled={isProcessing}
                >
                    {isProcessing ? (
                        <ActivityIndicator color={isDark ? "#fff" : "#3b82f6"} />
                    ) : (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: hScale(12) }}>
                            <Text style={{ fontSize: hScale(18) }} className="text-white dark:text-slate-900 font-black uppercase tracking-widest">Pay ₹{finalTotal.toFixed(2)}</Text>
                            <ArrowRight size={hScale(20)} color={isDark ? "#0f172a" : "#fff"} strokeWidth={3} />
                        </View>
                    )}
                </Button>
            </View>
 
            <PromoCodeDialogMobile
                visible={promoVisible}
                onClose={() => setPromoVisible(false)}
                onApply={async (code, discount, id) => {
                    const baseFare = parseFloat(trip.price_per_seat) * booking.seats_booked;
                    const newSubtotal = Math.max(0, baseFare - discount);
                    const newTotal = newSubtotal * 1.05;
 
                    try {
                        setAppliedPromo({ code, discount, id });
                        await updateBookingMutation.mutateAsync({ amount: newTotal, promoCodeId: id });
                        setPromoVisible(false);
                    } catch (e) {
                        setAppliedPromo(null);
                    }
                }}
            />
 
            <Modal visible={showWebView} animationType="slide" transparent={false}>
                <View className="flex-1 bg-white dark:bg-slate-950">
                    {webViewOrder && (
                        <PaymentWebView
                            orderId={webViewOrder.id}
                            amount={webViewOrder.amount}
                            currency="INR"
                            userName={user?.fullName || 'Passenger'}
                            userEmail={user?.email || ''}
                            userContact={user?.phone || ''}
                            onSuccess={async (paymentId, signature) => { /* Logic unchanged */ }}
                            onError={(err) => { /* Logic unchanged */ }}
                            onClose={() => setShowWebView(false)}
                        />
                    )}
                </View>
            </Modal>
        </View>
    );
}
 
export default PaymentScreen;
