import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { CheckCircle, Heart, Settings } from 'lucide-react';
import { TipDriver } from '@/components/TipDriver';
import { AutoPaySetup } from '@/components/AutoPaySetup';
import { PaymentReceipt } from '@/components/PaymentReceipt';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

export default function PaymentSuccess() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const [showTipDriver, setShowTipDriver] = useState(true);
  const [showAutoPaySetup, setShowAutoPaySetup] = useState(false);
  const [tipCompleted, setTipCompleted] = useState(false);

  // Get the latest completed booking for this user
  const { data: latestBooking } = useQuery({
    queryKey: ['latest-completed-booking', user?.id],
    queryFn: async () => {
      if (!user) return null;

      const { data, error } = await supabase
        .from('bookings')
        .select('*, trip:trips(*, driver:drivers(*, user:users(*))), payment:payments(*)')
        .eq('passenger_id', user.id)
        .eq('status', 'completed')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error) {
        console.error('Error fetching latest booking:', error);
        return null;
      }

      return data;
    },
    enabled: !!user,
  });

  useEffect(() => {
    // Auto-redirect after 30 seconds if user doesn't interact
    const timer = setTimeout(() => {
      navigate('/my-trips');
    }, 30000);

    return () => clearTimeout(timer);
  }, [navigate]);

  const handleTipCompleted = () => {
    setTipCompleted(true);
    setShowTipDriver(false);
    setShowAutoPaySetup(true);
  };

  const handleSkipTip = () => {
    setShowTipDriver(false);
    setShowAutoPaySetup(true);
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="container mx-auto max-w-2xl space-y-6">
        {/* Success Message */}
        <Card className="p-8 text-center">
          <div className="w-20 h-20 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-4 animate-bounce">
            <CheckCircle className="w-12 h-12 text-success" />
          </div>
          <h1 className="text-3xl font-bold mb-2">Payment Successful!</h1>
          <p className="text-muted-foreground mb-6">
            Your payment has been processed successfully. Thank you for riding with TCSYGO!
          </p>

          {latestBooking && (
            <div className="text-sm text-muted-foreground space-y-1">
              <p>Trip from <strong>{latestBooking.pickup_location}</strong></p>
              <p>to <strong>{latestBooking.drop_location}</strong></p>
              <p className="text-2xl font-bold text-primary mt-3">
                ₹{parseFloat(latestBooking.total_amount).toFixed(2)}
              </p>
            </div>
          )}
        </Card>

        {/* Payment Receipt */}
        {latestBooking?.payment?.[0] && (
          <PaymentReceipt
            bookingId={latestBooking.id}
            tripDate={new Date(latestBooking.trip.departure_time)}
            driverName={latestBooking.trip.driver.user.full_name}
            vehicleNumber={latestBooking.trip.driver.vehicle_number || latestBooking.trip.driver.vehicle_plate}
            pickupLocation={latestBooking.pickup_location}
            dropLocation={latestBooking.drop_location}
            distance={parseFloat(latestBooking.trip.distance)}
            duration={parseInt(latestBooking.trip.duration)}
            baseFare={parseFloat(latestBooking.total_amount) * 0.4} // Simplified breakdown for success page
            distanceCharge={parseFloat(latestBooking.total_amount) * 0.4}
            timeCharge={parseFloat(latestBooking.total_amount) * 0.1}
            platformFee={parseFloat(latestBooking.total_amount) * 0.05}
            gst={parseFloat(latestBooking.total_amount) * 0.05}
            totalFare={parseFloat(latestBooking.total_amount)}
            paymentMethod={latestBooking.payment[0].payment_method || 'Razorpay'}
            paymentId={latestBooking.payment[0].razorpay_payment_id || latestBooking.payment[0].id}
            autoDownload={true}
          />
        )}

        {/* Tip Driver Section */}
        {showTipDriver && latestBooking && (
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-warning/10 flex items-center justify-center">
                <Heart className="w-5 h-5 text-warning" />
              </div>
              <div>
                <h3 className="font-semibold">Enjoyed your ride?</h3>
                <p className="text-sm text-muted-foreground">
                  Show your appreciation to {latestBooking.trip.driver.user.full_name}
                </p>
              </div>
            </div>

            <TipDriver
              driverName={latestBooking.trip.driver.user.full_name}
              onTipSelected={handleTipCompleted}
            />

            <Button
              variant="ghost"
              size="sm"
              onClick={handleSkipTip}
              className="w-full mt-3"
            >
              Skip for now
            </Button>
          </Card>
        )}

        {/* Auto-Pay Setup Section */}
        {showAutoPaySetup && (
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Settings className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">Enable Auto-Pay</h3>
                <p className="text-sm text-muted-foreground">
                  Save time on future rides with automatic payments
                </p>
              </div>
            </div>

            <AutoPaySetup />

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAutoPaySetup(false)}
              className="w-full mt-3"
            >
              Maybe later
            </Button>
          </Card>
        )}

        <Separator />

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            onClick={() => navigate('/my-trips')}
            className="flex-1"
            size="lg"
          >
            View My Trips
          </Button>
          <Button
            onClick={() => navigate('/')}
            variant="outline"
            className="flex-1"
            size="lg"
          >
            Book Another Ride
          </Button>
        </div>

        {tipCompleted && (
          <Card className="p-4 bg-success/5 border-success/20 text-center">
            <p className="text-sm text-success font-medium">
              ✨ Thank you for tipping! Your driver will appreciate it.
            </p>
          </Card>
        )}
      </div>
    </div>
  );
}
