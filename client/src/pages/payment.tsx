import { useEffect } from 'react';
import { useLocation, useRoute } from 'wouter';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { ArrowLeft, CreditCard, Shield, CheckCircle } from 'lucide-react';
import { BookingWithDetails } from '@shared/schema';

declare global {
  interface Window {
    Razorpay: any;
  }
}

export default function Payment() {
  const [, navigate] = useLocation();
  const [, params] = useRoute('/payment/:bookingId');
  const { toast } = useToast();
  const bookingId = params?.bookingId;

  const { data: booking, isLoading } = useQuery<BookingWithDetails>({
    queryKey: ['/api/bookings', bookingId],
    enabled: !!bookingId,
  });

  const createPaymentMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest('POST', '/api/payments/create-order', { bookingId });
    },
    onSuccess: (data) => {
      handleRazorpayPayment(data);
    },
    onError: () => {
      toast({
        title: 'Payment failed',
        description: 'Unable to create payment order. Please try again.',
        variant: 'destructive',
      });
    },
  });

  const verifyPaymentMutation = useMutation({
    mutationFn: async (paymentData: any) => {
      return await apiRequest('POST', '/api/payments/verify', paymentData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/bookings'] });
      navigate('/payment-success');
    },
    onError: () => {
      toast({
        title: 'Verification failed',
        description: 'Payment verification failed. Please contact support.',
        variant: 'destructive',
      });
    },
  });

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
    const options = {
      key: import.meta.env.VITE_RAZORPAY_KEY_ID || 'rzp_test_placeholder',
      amount: parseFloat(booking?.totalAmount || '0') * 100,
      currency: 'INR',
      name: 'TCSYGO',
      description: 'Trip Booking Payment',
      order_id: orderData.razorpayOrderId,
      handler: function (response: any) {
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

  const trip = booking.trip;
  const platformFee = parseFloat(booking.totalAmount) * 0.05;
  const total = parseFloat(booking.totalAmount);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur">
        <div className="container mx-auto px-6 h-16 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} data-testid="button-back">
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
              <h2 className="text-xl font-bold">Booking Confirmed!</h2>
              <p className="text-sm text-muted-foreground">Complete payment to secure your seat</p>
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
                  <span className="font-medium">₹{(parseFloat(trip.pricePerSeat) * booking.seatsBooked).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Platform fee (5%)</span>
                  <span className="font-medium">₹{platformFee.toFixed(2)}</span>
                </div>

                <Separator className="my-2" />

                <div className="flex justify-between items-center text-lg">
                  <span className="font-semibold">Total Amount</span>
                  <span className="text-2xl font-bold text-primary" data-testid="text-total-amount">
                    ₹{total.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-6 mb-6">
          <div className="flex items-start gap-3 mb-4">
            <Shield className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold mb-1">Secure Payment</h3>
              <p className="text-sm text-muted-foreground">
                Your payment information is encrypted and secure. We use Razorpay for safe transactions.
              </p>
            </div>
          </div>

          <Button
            size="lg"
            className="w-full"
            onClick={() => createPaymentMutation.mutate()}
            disabled={createPaymentMutation.isPending || verifyPaymentMutation.isPending}
            data-testid="button-pay-now"
          >
            <CreditCard className="w-5 h-5 mr-2" />
            {createPaymentMutation.isPending || verifyPaymentMutation.isPending
              ? 'Processing...'
              : `Pay ₹${total.toFixed(2)}`}
          </Button>
        </Card>

        <div className="text-center text-sm text-muted-foreground">
          <p>By proceeding, you agree to our Terms of Service and Privacy Policy</p>
        </div>
      </div>
    </div>
  );
}
