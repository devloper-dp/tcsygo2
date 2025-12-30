import { useState } from 'react';
import { useLocation } from 'wouter';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { queryClient } from '@/lib/queryClient';
import { useAuth } from '@/contexts/AuthContext';
import { ArrowLeft, DollarSign, TrendingUp, Calendar, Download } from 'lucide-react';
import { format, subDays } from 'date-fns';
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';

export default function Earnings() {
    const [, navigate] = useLocation();
    const { user } = useAuth();
    const { toast } = useToast();
    const [timeRange, setTimeRange] = useState('30');

    const { data: driverProfile } = useQuery({
        queryKey: ['driver-profile', user?.id],
        queryFn: async () => {
            if (!user) return null;
            const { data } = await supabase
                .from('drivers')
                .select('*')
                .eq('user_id', user.id)
                .single();
            return data;
        },
        enabled: !!user,
    });

    const { data: earnings } = useQuery({
        queryKey: ['earnings', driverProfile?.id, timeRange],
        queryFn: async () => {
            if (!driverProfile) return null;

            const daysAgo = parseInt(timeRange);
            const startDate = subDays(new Date(), daysAgo);

            const { data: trips } = await supabase
                .from('trips')
                .select('*, bookings:bookings(*, payment:payments(*))')
                .eq('driver_id', driverProfile.id)
                .gte('departure_time', startDate.toISOString())
                .order('departure_time', { ascending: false });

            if (!trips) return { total: 0, pending: 0, paid: 0, transactions: [], chartData: [] };

            let total = 0;
            let pending = 0;
            let paid = 0;
            const transactions: any[] = [];
            const dailyEarnings: Record<string, number> = {};

            trips.forEach((trip: any) => {
                trip.bookings?.forEach((booking: any) => {
                    const payment = booking.payment?.[0];
                    if (payment && payment.status === 'success') {
                        const amount = parseFloat(payment.driver_earnings || 0);
                        total += amount;

                        if (payment.payout_status === 'paid') {
                            paid += amount;
                        } else {
                            pending += amount;
                        }

                        const date = format(new Date(trip.departure_time), 'MMM dd');
                        dailyEarnings[date] = (dailyEarnings[date] || 0) + amount;

                        transactions.push({
                            id: payment.id,
                            date: trip.departure_time,
                            tripId: trip.id,
                            amount: amount,
                            status: payment.payout_status || 'pending',
                            route: `${booking.pickup_location} → ${booking.drop_location}`,
                        });
                    }
                });
            });

            const chartData = Object.entries(dailyEarnings).map(([date, amount]) => ({
                date,
                earnings: amount,
            }));

            return { total, pending, paid, transactions, chartData };
        },
        enabled: !!driverProfile,
    });

    const requestPayoutMutation = useMutation({
        mutationFn: async () => {
            if (!driverProfile) return;
            const { data, error } = await supabase.rpc('request_payout', {
                p_driver_id: driverProfile.id
            });

            if (error) throw error;
            if (!data.success) throw new Error(data.message);
            return data;
        },
        onSuccess: (data: any) => {
            toast({
                title: 'Payout Requested',
                description: `Successfully requested ₹${data.amount}.`,
            });
            queryClient.invalidateQueries({ queryKey: ['earnings'] });
        },
        onError: (error: any) => {
            toast({
                title: 'Request Failed',
                description: error.message || 'Could not request payout',
                variant: 'destructive',
            });
        }
    });


    if (!user || user.role === 'passenger') {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <Card className="p-8 text-center">
                    <h2 className="text-xl font-semibold mb-4">Driver Access Only</h2>
                    <p className="text-muted-foreground mb-4">This page is only available for drivers.</p>
                    <Button onClick={() => navigate('/')}>Go Home</Button>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background">
            <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur">
                <div className="container mx-auto px-6 h-16 flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => navigate('/profile')}>
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                    <h1 className="text-xl font-display font-bold">Earnings</h1>
                    <div className="ml-auto">
                        <Select value={timeRange} onValueChange={setTimeRange}>
                            <SelectTrigger className="w-32">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="7">Last 7 days</SelectItem>
                                <SelectItem value="30">Last 30 days</SelectItem>
                                <SelectItem value="90">Last 90 days</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </header>

            <div className="container mx-auto px-6 py-8 max-w-6xl">
                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <Card className="p-6">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm text-muted-foreground">Total Earnings</span>
                            <DollarSign className="w-5 h-5 text-success" />
                        </div>
                        <div className="text-3xl font-bold">₹{earnings?.total.toFixed(2) || '0.00'}</div>
                        <p className="text-xs text-muted-foreground mt-1">Last {timeRange} days</p>
                    </Card>

                    <Card className="p-6">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm text-muted-foreground">Pending Payout</span>
                            <Calendar className="w-5 h-5 text-warning" />
                        </div>
                        <div className="text-3xl font-bold">₹{earnings?.pending.toFixed(2) || '0.00'}</div>
                        <div className="flex items-center justify-between mt-1">
                            <p className="text-xs text-muted-foreground">Awaiting transfer</p>
                            <Button
                                size="sm"
                                variant="outline"
                                className="h-6 text-xs"
                                disabled={!earnings?.pending || earnings.pending <= 0 || requestPayoutMutation.isPending}
                                onClick={() => requestPayoutMutation.mutate()}
                            >
                                {requestPayoutMutation.isPending ? 'Requesting...' : 'Request Payout'}
                            </Button>
                        </div>
                    </Card>

                    <Card className="p-6">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm text-muted-foreground">Paid Out</span>
                            <TrendingUp className="w-5 h-5 text-primary" />
                        </div>
                        <div className="text-3xl font-bold">₹{earnings?.paid.toFixed(2) || '0.00'}</div>
                        <p className="text-xs text-muted-foreground mt-1">Already transferred</p>
                    </Card>
                </div>

                {/* Earnings Chart */}
                <Card className="p-6 mb-8">
                    <h2 className="text-lg font-semibold mb-6">Earnings Trend</h2>
                    {earnings?.chartData && earnings.chartData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={300}>
                            <LineChart data={earnings.chartData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="date" />
                                <YAxis />
                                <Tooltip formatter={(value: any) => `₹${value.toFixed(2)}`} />
                                <Line type="monotone" dataKey="earnings" stroke="#3b82f6" strokeWidth={2} />
                            </LineChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="h-64 flex items-center justify-center text-muted-foreground">
                            No earnings data for this period
                        </div>
                    )}
                </Card>

                {/* Transactions List */}
                <Card className="p-6">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-lg font-semibold">Transaction History</h2>
                        <Button variant="outline" size="sm">
                            <Download className="w-4 h-4 mr-2" />
                            Export
                        </Button>
                    </div>

                    <div className="space-y-4">
                        {earnings?.transactions && earnings.transactions.length > 0 ? (
                            earnings.transactions.map((transaction: any) => (
                                <div key={transaction.id} className="flex items-center justify-between p-4 border rounded-lg">
                                    <div className="flex-1">
                                        <div className="font-medium">{transaction.route}</div>
                                        <div className="text-sm text-muted-foreground">
                                            {format(new Date(transaction.date), 'MMM dd, yyyy • hh:mm a')}
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="font-semibold text-success">+₹{transaction.amount.toFixed(2)}</div>
                                        <div className={`text-xs ${transaction.status === 'paid' ? 'text-success' : 'text-warning'}`}>
                                            {transaction.status === 'paid' ? 'Paid' : 'Pending'}
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-8 text-muted-foreground">
                                No transactions found
                            </div>
                        )}
                    </div>
                </Card>
            </div>
        </div>
    );
}
