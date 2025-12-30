
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { TripWithDriver } from '@shared/schema';
import { mapTrip } from '@/lib/mapper';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin, Search } from 'lucide-react';

export function TripsTab() {
    const [searchTerm, setSearchTerm] = useState('');

    const { data: allTrips } = useQuery<TripWithDriver[]>({
        queryKey: ['admin-trips'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('trips')
                .select('*, driver:drivers(*, user:users(*))')
                .order('created_at', { ascending: false });

            if (error) throw error;
            return (data || []).map(mapTrip);
        }
    });

    const filteredTrips = allTrips?.filter(trip =>
        searchTerm ? (
            trip.pickupLocation.toLowerCase().includes(searchTerm.toLowerCase()) ||
            trip.dropLocation.toLowerCase().includes(searchTerm.toLowerCase()) ||
            trip.driver.user.fullName.toLowerCase().includes(searchTerm.toLowerCase())
        ) : true
    );

    return (
        <Card>
            <div className="p-6 border-b flex items-center justify-between">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-primary" />
                    All Trips
                </h2>
                <div className="relative w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                        placeholder="Search trips..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-9"
                    />
                </div>
            </div>
            <div className="p-6">
                {filteredTrips && filteredTrips.length > 0 ? (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Driver</TableHead>
                                <TableHead>Route</TableHead>
                                <TableHead>Date</TableHead>
                                <TableHead>Seats</TableHead>
                                <TableHead>Price</TableHead>
                                <TableHead>Status</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredTrips.slice(0, 20).map((trip) => (
                                <TableRow key={trip.id}>
                                    <TableCell>{trip.driver.user.fullName}</TableCell>
                                    <TableCell>
                                        <div className="text-sm">
                                            <div className="font-medium">{trip.pickupLocation}</div>
                                            <div className="text-muted-foreground">→ {trip.dropLocation}</div>
                                        </div>
                                    </TableCell>
                                    <TableCell>{new Date(trip.departureTime).toLocaleDateString()}</TableCell>
                                    <TableCell>{trip.availableSeats}/{trip.totalSeats}</TableCell>
                                    <TableCell>₹{trip.pricePerSeat}</TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className="capitalize">{trip.status}</Badge>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                ) : (
                    <div className="text-center py-12">
                        <MapPin className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                        <p className="text-muted-foreground">No trips found</p>
                    </div>
                )}
            </div>
        </Card>
    );
}
