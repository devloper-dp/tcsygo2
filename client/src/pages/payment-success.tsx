import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { CheckCircle2, Home, Receipt } from 'lucide-react';

export default function PaymentSuccess() {
  const [, navigate] = useLocation();

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <Card className="max-w-md w-full p-8 text-center">
        <div className="w-20 h-20 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 className="w-12 h-12 text-success" />
        </div>

        <h1 className="text-3xl font-display font-bold mb-3">Payment Successful!</h1>
        <p className="text-muted-foreground mb-8">
          Your booking has been confirmed and payment processed successfully. 
          You'll receive a confirmation email shortly.
        </p>

        <div className="space-y-3">
          <Button size="lg" className="w-full" onClick={() => navigate('/my-trips')} data-testid="button-view-trips">
            <Receipt className="w-5 h-5 mr-2" />
            View My Trips
          </Button>
          <Button size="lg" variant="outline" className="w-full" onClick={() => navigate('/')} data-testid="button-home">
            <Home className="w-5 h-5 mr-2" />
            Back to Home
          </Button>
        </div>
      </Card>
    </div>
  );
}
