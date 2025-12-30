import { useEffect, useState } from 'react';
import { useLocation, useRoute } from 'wouter';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { queryClient } from '@/lib/queryClient';
import { ArrowLeft, CreditCard, Shield, CheckCircle, Tag } from 'lucide-react';
import { BookingWithDetails } from '@shared/schema';
import { supabase } from '@/lib/supabase';
import { mapBooking } from '@/lib/mapper';
import { PromoCodeInput } from '@/components/PromoCodeInput';
import { useAuth } from '@/contexts/AuthContext';
import { MultiPaymentSelector } from '@/components/MultiPaymentSelector';

export default function Payment() {
  const [, navigate] = useLocation();
  const [, params] = useRoute('/payment/:bookingId');
  const { toast } = useToast();
  const bookingId = params?.bookingId;
  const { user } = useAuth();
  const [showPromoDialog, setShowPromoDialog] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<{
    type: 'upi' | 'card' | 'wallet' | 'cash';
    id?: string;
    details?: any;
    isDefault?: boolean;
  }>({ type: 'wallet', isDefault: false }); // Default to wallet or whatever logic

  // Fetch wallet balance
  const { data: walletBal } = useQuery({
    queryKey: ['wallet-balance-payment', user?.id],
    queryFn: async () => {
      if (!user) return 0;
      const { data } = await supabase.from('wallets').select('balance').eq('user_id', user.id).single();
      return data?.balance || 0;
    },
    enabled: !!user
  });

  // Fetch AutoPay settings (keep this)
  const { data: autoPaySettings } = useQuery({
    queryKey: ['auto-pay-settings', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from('auto_pay_settings')
        .select('*')
        .eq('user_id', user.id)
        .single();
      if (error && error.code !== 'PGRST116') console.error(error);
      return data;
    },
    enabled: !!user,
  });

  // ... (keep booking query)

  const { data: booking, isLoading } = useQuery<BookingWithDetails>({
    queryKey: ['booking-payment', bookingId],
    queryFn: async () => {
      if (!bookingId) throw new Error("Booking ID required");
      const { data, error } = await supabase
        .from('bookings')
        .select('*, trip:trips(*, driver:drivers(*, user:users(*))), passenger:users(*), promoCode:promo_codes(*)')
        .eq('id', bookingId)
        .single();

      if (error) throw error;
      return mapBooking(data);
    },
    enabled: !!bookingId,
  });

  // ... (keep updateBookingAmountMutation)

  const updateBookingAmountMutation = useMutation({
    mutationFn: async ({ amount, promoCodeId }: { amount: number, promoCodeId?: string }) => {
      const { error } = await supabase
        .from('bookings')
        .update({
          total_amount: amount.toString(),
          promo_code_id: promoCodeId
        })
        .eq('id', bookingId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['booking-payment', bookingId] });
      toast({ title: 'Promo code applied', description: 'Total amount updated.' });
    },
    onError: (e: any) => {
      toast({ title: 'Update failed', description: e.message, variant: 'destructive' });
    }
  });

  const handleApplyPromo = (promo: any) => {
    if (!booking) return;
    const fare = parseFloat(trip.pricePerSeat) * booking.seatsBooked;
    const value = parseFloat(promo.discountValue);
    let discount = 0;
    if (promo.discountType === 'percentage') {
      discount = (fare * value) / 100;
    } else {
      discount = value;
    }
    const newSubtotal = Math.max(0, fare - discount);
    const newTotal = newSubtotal * 1.05;
    updateBookingAmountMutation.mutate({
      amount: newTotal,
      promoCodeId: promo.id
    });
  };

  const handleRemovePromo = () => {
    if (!booking) return;
    const fare = parseFloat(trip.pricePerSeat) * booking.seatsBooked;
    const newTotal = fare * 1.05;
    updateBookingAmountMutation.mutate({
      amount: newTotal,
      promoCodeId: undefined
    });
  };

  // ... (keep mutations createPayment and verifyPayment)

  const createPaymentMutation = useMutation({
    mutationFn: async () => {
      console.log('Payment: Initiating order creation for bookingId:', bookingId);
      const { data, error } = await supabase.functions.invoke('create-payment-order', {
        body: { bookingId }
      });
      if (error) {
        console.error('Payment: Order creation function error', error);
        throw error;
      }
      return data;
    },
    onSuccess: (data) => {
      console.log('Payment: Order created successfully', { razorpayOrderId: data.razorpayOrderId });
      handleRazorpayPayment(data);
    },
    onError: (error: any) => {
      toast({
        title: 'Payment failed',
        description: error.message || 'Unable to create payment order. Please try again.',
        variant: 'destructive',
      });
    },
  });

  const verifyPaymentMutation = useMutation({
    mutationFn: async (paymentData: any) => {
      console.log('Payment: Starting verification for paymentData:', paymentData);
      const { data, error } = await supabase.functions.invoke('verify-payment', {
        body: paymentData
      });
      if (error) {
        console.error('Payment: Verification function error', error);
        throw error;
      }
      return data;
    },
    onSuccess: (data) => {
      console.log('Payment: Verification successful', data);
      queryClient.invalidateQueries({ queryKey: ['booking-payment', bookingId] });
      queryClient.invalidateQueries({ queryKey: ['trip-details'] });
      navigate('/payment-success');
    },
    onError: (error: any) => {
      console.error('Payment: Verification mutation error', error);
      // ... (existing error handling)
      toast({
        title: 'Verification failed',
        description: 'Payment verification failed.',
        variant: 'destructive',
      });
    },
  });

  // Razorpay script loading
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    document.body.appendChild(script);
    return () => {
      document.body.removeChild(script);
    };
  }, []);

  const handleRazorpayPayment = (orderData: any) => {
    // ... same logic
    console.log('Payment: Opening Razorpay checkout modal with orderData:', orderData);
    const options = {
      key: import.meta.env.VITE_RAZORPAY_KEY_ID,
      amount: orderData.amount, // from order creation response
      currency: orderData.currency,
      name: 'TCSYGO',
      description: 'Trip Booking Payment',
      order_id: orderData.razorpayOrderId,
      handler: function (response: any) {
        console.log('Payment: Razorpay payment handler triggered', { paymentId: response.razorpay_payment_id });
        verifyPaymentMutation.mutate({
          bookingId,
          razorpayOrderId: orderData.razorpayOrderId,
          razorpayPaymentId: response.razorpay_payment_id,
          razorpaySignature: response.razorpay_signature,
        });
      },
      prefill: {
        name: booking?.passenger.fullName,
        email: booking?.passenger.email,
        contact: booking?.passenger.phone,
      },
      theme: {
        color: '#3b82f6',
      },
      modal: {
        ondismiss: function () {
          console.log('Payment: Razorpay modal dismissed/cancelled by user');
          toast({
            title: 'Payment cancelled',
            description: 'You can try again whenever you\'re ready',
          });
        },
      },
    };

    const razorpay = new window.Razorpay(options);
    razorpay.open();
  };


  const handlePayment = async () => {
    if (!booking) return;
    const currentTotal = parseFloat(booking.totalAmount);

    if (paymentMethod.type === 'card' || paymentMethod.type === 'upi') {
      // Use Razorpay for both card and UPI online payments
      createPaymentMutation.mutate();
    } else if (paymentMethod.type === 'wallet') {
      if ((walletBal || 0) < currentTotal) {
        toast({ title: "Insufficient Balance", description: "Please add money to wallet or choose another method", variant: "destructive" });
        return;
      }
      try {
        const { error } = await supabase.functions.invoke('deduct-wallet', {
          body: { userId: user?.id, amount: currentTotal }
        });

        if (error) throw error;

        await supabase.from('bookings').update({
          status: 'confirmed',
          payment_status: 'success',
          payment_method: 'wallet'
        }).eq('id', bookingId);

        toast({ title: "Payment Successful", description: "Paid via Wallet" });
        navigate('/payment-success');
      } catch (e: any) {
        console.error("Wallet payment error:", e);
        toast({ title: "Payment Failed", description: e.message || "An error occurred", variant: "destructive" });
      }
    } else if (paymentMethod.type === 'cash') {
      try {
        await supabase.from('bookings').update({
          payment_method: 'cash',
          payment_status: 'pending'
        }).eq('id', bookingId);
        toast({ title: "Cash Payment Selected", description: "Please pay the driver" });
        navigate('/payment-success');
      } catch (e: any) {
        toast({ title: "Error", description: e.message });
      }
    }
  };


  // AutoPay effect (keep it, but update setPaymentMethod logic)
  useEffect(() => {
    if (booking && booking.trip.status === 'completed' && booking.status === 'payment_pending' && autoPaySettings?.enabled) {

      if (autoPaySettings.spending_limit && parseFloat(booking.totalAmount) > parseFloat(autoPaySettings.spending_limit)) {
        toast({
          title: "AutoPay Skipped",
          description: `Trip amount (₹${booking.totalAmount}) exceeds your daily limit.`,
          variant: "default"
        });
        return;
      }

      if (autoPaySettings.default_payment_method === 'wallet') {
        if ((walletBal || 0) < parseFloat(booking.totalAmount)) {
          toast({
            title: "AutoPay Skipped",
            description: "Insufficient wallet balance for AutoPay.",
            variant: "destructive"
          });
          return;
        }
        setPaymentMethod({ type: 'wallet' }); // Update for auto selection
        const timer = setTimeout(() => {
          handlePayment();
        }, 1500);
        return () => clearTimeout(timer);
      }
    }
  }, [booking, autoPaySettings, walletBal]);


  if (isLoading || !booking) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading payment details...</p>
        </div>
      </div>
    );
  }

  if (booking.trip.status !== 'completed' && booking.status !== 'payment_pending') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="p-8 max-w-md text-center">
          <Shield className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Payment Not Available Yet</h2>
          <p className="text-muted-foreground mb-4">
            Payment will be available after the driver completes the trip.
          </p>
          <Button onClick={() => navigate('/my-trips')}>
            Go to My Trips
          </Button>
        </Card>
      </div>
    );
  }

  const trip = booking.trip;
  const currentTotal = parseFloat(booking.totalAmount);
  const subtotal = currentTotal / 1.05;
  const platformFee = currentTotal - subtotal;
  const baseFare = parseFloat(trip.pricePerSeat) * booking.seatsBooked;
  const storedPromo = booking.promoCode;

  let displayedDiscountAmount = 0;
  if (storedPromo) {
    const val = parseFloat(storedPromo.discountValue);
    if (storedPromo.discountType === 'percentage') {
      displayedDiscountAmount = (baseFare * val) / 100;
    } else {
      displayedDiscountAmount = val;
    }
  } else {
    displayedDiscountAmount = Math.max(0, baseFare - subtotal);
  }
  const hasDiscount = displayedDiscountAmount > 0.1;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur">
        <div className="container mx-auto px-6 h-16 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => window.history.back()} data-testid="button-back">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-display font-bold">Payment</h1>
        </div>
      </header>

      <div className="container mx-auto px-6 py-8 max-w-2xl">
        <Card className="p-6 mb-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-full bg-success/10 flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-success" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Trip Completed!</h2>
              <p className="text-sm text-muted-foreground">Complete payment for your ride</p>
            </div>
          </div>

          <Separator className="my-6" />

          <div className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">Trip Details</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">From</span>
                  <span className="font-medium text-right">{trip.pickupLocation}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">To</span>
                  <span className="font-medium text-right">{trip.dropLocation}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Driver</span>
                  <span className="font-medium">{trip.driver.user.fullName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Seats Booked</span>
                  <span className="font-medium">{booking.seatsBooked}</span>
                </div>
              </div>
            </div>

            <Separator />

            <div>
              <h3 className="font-semibold mb-3">Payment Breakdown</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    Trip fare ({booking.seatsBooked} × ₹{trip.pricePerSeat})
                  </span>
                  <span className="font-medium">₹{baseFare.toFixed(2)}</span>
                </div>

                {hasDiscount && (
                  <div className="flex justify-between text-success">
                    <span className="flex items-center gap-1">
                      <Tag className="w-3 h-3" />
                      Discount Applied {storedPromo ? `(${storedPromo.code})` : ''}
                    </span>
                    <span className="font-medium">-₹{displayedDiscountAmount.toFixed(2)}</span>
                  </div>
                )}

                <div className="flex justify-between">
                  <span className="text-muted-foreground">Platform fee (5%)</span>
                  <span className="font-medium">₹{platformFee.toFixed(2)}</span>
                </div>

                {/* Promo Code Section */}
                <div className="py-2">
                  <PromoCodeInput
                    onPromoApplied={handleApplyPromo}
                    onPromoRemoved={handleRemovePromo}
                    className="border-none p-0 shadow-none bg-transparent"
                  />
                </div>

                <Separator className="my-2" />

                <div className="flex justify-between items-center text-lg">
                  <span className="font-semibold">Total Amount</span>
                  <span className="text-2xl font-bold text-primary" data-testid="text-total-amount">
                    ₹{currentTotal.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </Card>



        <Card className="p-6 mb-6">
          <MultiPaymentSelector
            amount={currentTotal}
            onPaymentMethodSelect={(method) => setPaymentMethod(method as any)}
            selectedMethod={paymentMethod as any}
            showCashOption={true}
          />
        </Card>

        {/* Tipping Section */}
        <Card className="p-6 mb-6">
          <h3 className="font-semibold mb-3">Tip your driver</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Thank the driver for a safe ride
          </p>
          <div className="grid grid-cols-4 gap-2 mb-4">
            {[10, 20, 50, 100].map((amount) => (
              <Button
                key={amount}
                variant="outline"
                className="h-12 flex-col gap-0"
                onClick={() => {
                  const newTotal = parseFloat(booking.totalAmount) + amount;
                  updateBookingAmountMutation.mutate({ amount: newTotal });
                  toast({ title: `Added ₹${amount} tip` });
                }}
              >
                <span className="font-bold">₹{amount}</span>
              </Button>
            ))}
          </div>
        </Card>

        <Card className="p-6 mb-6">
          <div className="flex items-start gap-3 mb-4">
            <Shield className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold mb-1">Secure Payment</h3>
              <p className="text-sm text-muted-foreground">
                Your payment information is encrypted and secure.
              </p>
            </div>
          </div>

          <Button
            size="lg"
            className="w-full"
            onClick={handlePayment}
            disabled={createPaymentMutation.isPending || verifyPaymentMutation.isPending}
            data-testid="button-pay-now"
          >
            {createPaymentMutation.isPending
              ? 'Processing...'
              : paymentMethod.type === 'cash'
                ? 'Confirm Cash Payment'
                : `Pay ₹${currentTotal.toFixed(2)}`
            }
          </Button>
        </Card>

        <div className="text-center text-sm text-muted-foreground">
          <p>By proceeding, you agree to our Terms of Service and Privacy Policy</p>
        </div>
      </div>
    </div>
  );
}


