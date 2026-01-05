
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
    User, Phone, MapPin, CheckCircle, Navigation
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface TripManifestProps {
    tripId: string;
    currentLocation?: { lat: number; lng: number };
}

export function TripManifest({ tripId, currentLocation }: TripManifestProps) {
    const { toast } = useToast();
    const queryClient = useQueryClient();

    // Fetch all bookings for this trip
    const { data: bookings } = useQuery({
        queryKey: ['trip-manifest', tripId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('bookings')
                .select('*, passenger:users(*)')
                .eq('trip_id', tripId)
                .neq('status', 'cancelled');

            if (error) throw error;
            return data;
        },
        refetchInterval: 3000
    });

    const updateStatusMutation = useMutation({
        mutationFn: async ({ id, status }: { id: string, status: string }) => {
            const { error } = await supabase
                .from('bookings')
                .update({ status })
                .eq('id', id);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['trip-manifest'] });
            toast({ title: "Status Updated" });
        },
        onError: (err) => {
            toast({ title: "Update Failed", description: err.message, variant: "destructive" });
        }
    });

    if (!bookings || bookings.length === 0) return null;

    // Group by status
    const pending = bookings.filter(b => b.status === 'confirmed');
    const onboard = bookings.filter(b => b.status === 'picked_up');
    const completed = bookings.filter(b => b.status === 'completed');

    return (
        <div className="space-y-4">
            <h3 className="font-semibold text-lg flex items-center gap-2">
                <User className="w-5 h-5" /> Passenger Manifest
            </h3>

            {/* UPCOMING PICKUPS */}
            {pending.length > 0 && (
                <div className="space-y-2">
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">To Pickup ({pending.length})</p>
                    {pending.map(booking => (
                        <Card key={booking.id} className="p-3 border-l-4 border-l-orange-500 bg-orange-500/5">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h4 className="font-medium">{booking.passenger.fullName}</h4>
                                    <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                                        <MapPin className="w-3 h-3" />
                                        {booking.pickup_location}
                                    </div>
                                </div>
                                <Button
                                    size="sm"
                                    onClick={() => updateStatusMutation.mutate({ id: booking.id, status: 'picked_up' })}
                                    disabled={updateStatusMutation.isPending}
                                >
                                    Confirm Pickup
                                </Button>
                            </div>
                        </Card>
                    ))}
                </div>
            )}

            {/* ONBOARD */}
            {onboard.length > 0 && (
                <div className="space-y-2">
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">On Board ({onboard.length})</p>
                    {onboard.map(booking => (
                        <Card key={booking.id} className="p-3 border-l-4 border-l-blue-500 bg-blue-500/5">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h4 className="font-medium">{booking.passenger.fullName}</h4>
                                    <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                                        <Navigation className="w-3 h-3" />
                                        {booking.drop_location}
                                    </div>
                                </div>
                                <Button
                                    size="sm"
                                    variant="secondary"
                                    onClick={() => updateStatusMutation.mutate({ id: booking.id, status: 'completed' })}
                                    disabled={updateStatusMutation.isPending}
                                >
                                    Drop Off
                                </Button>
                            </div>
                        </Card>
                    ))}
                </div>
            )}

            {/* COMPLETED */}
            {completed.length > 0 && (
                <div className="space-y-2 opacity-60">
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Dropped Off</p>
                    {completed.map(booking => (
                        <div key={booking.id} className="flex items-center justify-between p-2 bg-muted rounded">
                            <span className="text-sm font-medium">{booking.passenger.fullName}</span>
                            <Badge variant="outline" className="text-xs">Done</Badge>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
