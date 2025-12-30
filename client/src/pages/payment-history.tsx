import { useState } from 'react';
import { useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, Search, Download, CreditCard } from 'lucide-react';
import { format } from 'date-fns';

export default function PaymentHistory() {
    const [, navigate] = useLocation();
    const { user } = useAuth();
    const [searchTerm, setSearchTerm] = useState('');

    const { data: payments } = useQuery({
        queryKey: ['payment-history', user?.id],
        queryFn: async () => {
            if (!user) return [];

            const { data: bookings } = await supabase
                .from('bookings')
                .select('*, trip:trips(*), payment:payments(*)')
                .eq('passenger_id', user.id)
                .order('created_at', { ascending: false });

            if (!bookings) return [];

            return bookings
                .filter((b: any) => b.payment && b.payment.length > 0)
                .map((b: any) => ({
                    id: b.payment[0].id,
                    bookingId: b.id,
                    tripId: b.trip.id,
                    date: b.created_at,
                    route: `${b.pickup_location} → ${b.drop_location}`,
                    amount: parseFloat(b.payment[0].amount),
                    platformFee: parseFloat(b.payment[0].platform_fee),
                    status: b.payment[0].status,
                    paymentMethod: b.payment[0].payment_method || 'Razorpay',
                    razorpayPaymentId: b.payment[0].razorpay_payment_id,
                }));
        },
        enabled: !!user,
    });

    const filteredPayments = payments?.filter((p: any) =>
        p.route.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.razorpayPaymentId?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const getStatusColor = (status: string) => {
        const colors: Record<string, string> = {
            completed: 'bg-success/10 text-success',
            pending: 'bg-warning/10 text-warning',
            failed: 'bg-destructive/10 text-destructive',
            refunded: 'bg-muted text-muted-foreground',
        };
        return colors[status] || 'bg-muted text-muted-foreground';
    };

    const totalSpent = payments?.reduce((sum: number, p: any) =>
        p.status === 'completed' ? sum + p.amount : sum, 0) || 0;

    return (
        <div className="min-h-screen bg-background">
            <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur">
                <div className="container mx-auto px-6 h-16 flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => navigate('/profile')}>
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                    <h1 className="text-xl font-display font-bold">Payment History</h1>
                </div>
            </header>

            <div className="container mx-auto px-6 py-8 max-w-4xl">
                {/* Summary Card */}
                <Card className="p-6 mb-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <div className="text-sm text-muted-foreground mb-1">Total Spent</div>
                            <div className="text-3xl font-bold">₹{totalSpent.toFixed(2)}</div>
                        </div>
                        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                            <CreditCard className="w-8 h-8 text-primary" />
                        </div>
                    </div>
                    <div className="mt-4 text-sm text-muted-foreground">
                        {payments?.length || 0} total transactions
                    </div>
                </Card>

                {/* Search */}
                <div className="mb-6 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                        placeholder="Search by route or payment ID..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                    />
                </div>

                {/* Payments List */}
                <div className="space-y-4">
                    {filteredPayments && filteredPayments.length > 0 ? (
                        filteredPayments.map((payment: any) => (
                            <Card key={payment.id} className="p-6">
                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex-1">
                                        <div className="font-semibold mb-1">{payment.route}</div>
                                        <div className="text-sm text-muted-foreground">
                                            {format(new Date(payment.date), 'MMM dd, yyyy • hh:mm a')}
                                        </div>
                                    </div>
                                    <Badge className={getStatusColor(payment.status)}>
                                        {payment.status}
                                    </Badge>
                                </div>

                                <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                                    <div>
                                        <div className="text-muted-foreground">Amount</div>
                                        <div className="font-medium">₹{payment.amount.toFixed(2)}</div>
                                    </div>
                                    <div>
                                        <div className="text-muted-foreground">Platform Fee</div>
                                        <div className="font-medium">₹{payment.platformFee.toFixed(2)}</div>
                                    </div>
                                    <div>
                                        <div className="text-muted-foreground">Payment Method</div>
                                        <div className="font-medium">{payment.paymentMethod}</div>
                                    </div>
                                    {payment.razorpayPaymentId && (
                                        <div>
                                            <div className="text-muted-foreground">Payment ID</div>
                                            <div className="font-mono text-xs">{payment.razorpayPaymentId.slice(0, 20)}...</div>
                                        </div>
                                    )}
                                </div>

                                <div className="flex gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => navigate(`/trip/${payment.tripId}`)}
                                    >
                                        View Trip
                                    </Button>
                                    <Button variant="ghost" size="sm">
                                        <Download className="w-4 h-4 mr-2" />
                                        Receipt
                                    </Button>
                                </div>
                            </Card>
                        ))
                    ) : (
                        <Card className="p-12 text-center">
                            <CreditCard className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                            <h3 className="text-lg font-semibold mb-2">No payments found</h3>
                            <p className="text-muted-foreground">
                                {searchTerm ? 'Try a different search term' : 'Your payment history will appear here'}
                            </p>
                        </Card>
                    )}
                </div>
            </div>
        </div>
    );
}
