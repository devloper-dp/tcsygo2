
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { BookingWithDetails } from '@shared/schema';
import { mapBooking } from '@/lib/mapper';
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
import { Users, Calendar } from 'lucide-react';

export function BookingsTab() {
    const { data: allBookings } = useQuery<BookingWithDetails[]>({
        queryKey: ['admin-bookings'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('bookings')
                .select('*, trip:trips(*, driver:drivers(*, user:users(*))), passenger:users(*)')
                .order('created_at', { ascending: false });

            if (error) throw error;
            return (data || []).map(mapBooking);
        }
    });

    return (
        <Card>
            <div className="p-6 border-b flex items-center justify-between">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-primary" />
                    Recent Bookings
                </h2>
            </div>
            <div className="p-6">
                {allBookings && allBookings.length > 0 ? (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Passenger</TableHead>
                                <TableHead>Trip</TableHead>
                                <TableHead>Seats</TableHead>
                                <TableHead>Amount</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Date</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {allBookings.slice(0, 20).map((booking) => (
                                <TableRow key={booking.id}>
                                    <TableCell>{booking.passenger.fullName}</TableCell>
                                    <TableCell>
                                        <div className="text-sm max-w-xs truncate">
                                            {booking.trip.pickupLocation} → {booking.trip.dropLocation}
                                        </div>
                                    </TableCell>
                                    <TableCell>{booking.seatsBooked}</TableCell>
                                    <TableCell>₹{booking.totalAmount}</TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className="capitalize">{booking.status}</Badge>
                                    </TableCell>
                                    <TableCell>{new Date(booking.createdAt).toLocaleDateString()}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                ) : (
                    <div className="text-center py-12">
                        <Users className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                        <p className="text-muted-foreground">No bookings found</p>
                    </div>
                )}
            </div>
        </Card>
    );
}
