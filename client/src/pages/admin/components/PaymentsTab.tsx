
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Payment } from '@shared/schema';
import { mapPayment } from '@/lib/mapper';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DollarSign } from 'lucide-react';

export function PaymentsTab() {
    const { data: allPayments } = useQuery<Payment[]>({
        queryKey: ['admin-payments'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('payments')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            return (data || []).map(mapPayment);
        }
    });

    return (
        <Card>
            <div className="p-6 border-b flex items-center justify-between">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-chart-1" />
                    Payment Transactions
                </h2>
            </div>
            <div className="p-6">
                {allPayments && allPayments.length > 0 ? (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Transaction ID</TableHead>
                                <TableHead>Amount</TableHead>
                                <TableHead>Platform Fee</TableHead>
                                <TableHead>Driver Earnings</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Date</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {allPayments.slice(0, 20).map((payment) => (
                                <TableRow key={payment.id}>
                                    <TableCell className="font-mono text-xs">{payment.id.slice(0, 8)}...</TableCell>
                                    <TableCell>₹{payment.amount}</TableCell>
                                    <TableCell>₹{payment.platformFee}</TableCell>
                                    <TableCell>₹{payment.driverEarnings}</TableCell>
                                    <TableCell>
                                        <Badge
                                            variant="outline"
                                            className={
                                                payment.status === 'success'
                                                    ? 'bg-success/10 text-success'
                                                    : payment.status === 'pending'
                                                        ? 'bg-warning/10 text-warning'
                                                        : 'bg-destructive/10 text-destructive'
                                            }
                                        >
                                            {payment.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>{new Date(payment.createdAt).toLocaleDateString()}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                ) : (
                    <div className="text-center py-12">
                        <DollarSign className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                        <p className="text-muted-foreground">No payments found</p>
                    </div>
                )}
            </div>
        </Card>
    );
}
