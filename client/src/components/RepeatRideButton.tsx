import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { RotateCcw, MapPin, Navigation } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

interface LastTrip {
    id: string;
    pickup_location: string;
    pickup_lat: number;
    pickup_lng: number;
    drop_location: string;
    drop_lat: number;
    drop_lng: number;
    created_at: string;
}

interface RepeatRideButtonProps {
    variant?: 'button' | 'card';
    className?: string;
}

export function RepeatRideButton({ variant = 'button', className = '' }: RepeatRideButtonProps) {
    const [, navigate] = useLocation();
    const { user } = useAuth();
    const { toast } = useToast();
    const [lastTrip, setLastTrip] = useState<LastTrip | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user) {
            fetchLastTrip();
        }
    }, [user]);

    const fetchLastTrip = async () => {
        if (!user) return;

        try {
            setLoading(true);

            // Get the last completed booking for this user
            const { data: bookings, error } = await supabase
                .from('bookings')
                .select(`
          id,
          trip_id,
          created_at,
          pickup_location,
          pickup_lat,
          pickup_lng,
          drop_location,
          drop_lat,
          drop_lng
        `)
                .eq('passenger_id', user.id)
                .eq('status', 'completed')
                .order('created_at', { ascending: false })
                .limit(1);

            if (error) throw error;

            if (bookings && bookings.length > 0) {
                const booking = bookings[0];
                setLastTrip({
                    id: booking.trip_id,
                    pickup_location: booking.pickup_location,
                    pickup_lat: booking.pickup_lat,
                    pickup_lng: booking.pickup_lng,
                    drop_location: booking.drop_location,
                    drop_lat: booking.drop_lat,
                    drop_lng: booking.drop_lng,
                    created_at: booking.created_at,
                });
            }
        } catch (error) {
            console.error('Error fetching last trip:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleRepeatRide = () => {
        if (!lastTrip) {
            toast({
                title: 'No previous rides',
                description: 'You haven\'t completed any rides yet.',
                variant: 'destructive',
            });
            return;
        }

        // Navigate to search with pre-filled data
        const params = new URLSearchParams({
            pickup: lastTrip.pickup_location,
            drop: lastTrip.drop_location,
            pickupLat: lastTrip.pickup_lat.toString(),
            pickupLng: lastTrip.pickup_lng.toString(),
            dropLat: lastTrip.drop_lat.toString(),
            dropLng: lastTrip.drop_lng.toString(),
        });

        navigate(`/search?${params.toString()}`);
    };

    if (!user || loading || !lastTrip) {
        return null;
    }

    if (variant === 'card') {
        return (
            <Card className={`p-4 hover:shadow-md transition-shadow cursor-pointer ${className}`} onClick={handleRepeatRide}>
                <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <RotateCcw className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <h3 className="font-semibold mb-2">Repeat Last Ride</h3>
                        <div className="space-y-1 text-sm text-muted-foreground">
                            <div className="flex items-start gap-2">
                                <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0 text-success" />
                                <span className="truncate">{lastTrip.pickup_location}</span>
                            </div>
                            <div className="flex items-start gap-2">
                                <Navigation className="w-4 h-4 mt-0.5 flex-shrink-0 text-destructive" />
                                <span className="truncate">{lastTrip.drop_location}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </Card>
        );
    }

    return (
        <Button
            variant="outline"
            className={`gap-2 ${className}`}
            onClick={handleRepeatRide}
        >
            <RotateCcw className="w-4 h-4" />
            Repeat Last Ride
        </Button>
    );
}
