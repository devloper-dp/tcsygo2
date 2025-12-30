import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Star, MapPin, Calendar, Clock, Users, Shield, CheckCircle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { mapTrip } from '@/lib/mapper';
import { TripWithDriver } from '@shared/schema';

interface SimilarTripsProps {
    currentTripId: string;
    pickupLocation: string;
    dropLocation: string;
    onTripClick: (tripId: string) => void;
}

export function SimilarTrips({ currentTripId, pickupLocation, dropLocation, onTripClick }: SimilarTripsProps) {
    const { data: similarTrips, isLoading } = useQuery<TripWithDriver[]>({
        queryKey: ['similar-trips', pickupLocation, dropLocation, currentTripId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('trips')
                .select('*, driver:drivers(*, user:users(*))')
                .eq('status', 'upcoming')
                .neq('id', currentTripId)
                // Basic route matching - in production, this would use PostGIS or more advanced matching
                .ilike('pickup_location', `%${pickupLocation}%`)
                .ilike('drop_location', `%${dropLocation}%`)
                .gt('available_seats', 0)
                .limit(3);

            if (error) throw error;
            return (data || []).map(mapTrip);
        },
    });

    if (isLoading || !similarTrips || similarTrips.length === 0) {
        return null;
    }

    return (
        <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Similar Trips</h3>
            <div className="space-y-3">
                {similarTrips.map((trip) => (
                    <div
                        key={trip.id}
                        className="p-4 border rounded-lg hover:bg-accent cursor-pointer transition-colors"
                        onClick={() => onTripClick(trip.id)}
                    >
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                                <Avatar className="w-8 h-8">
                                    <AvatarImage src={trip.driver.user.profilePhoto || undefined} />
                                    <AvatarFallback>{trip.driver.user.fullName[0]}</AvatarFallback>
                                </Avatar>
                                <div>
                                    <p className="text-sm font-medium">{trip.driver.user.fullName}</p>
                                    <div className="flex items-center gap-1">
                                        <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                                        <span className="text-xs text-muted-foreground">{trip.driver.rating}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="font-semibold">₹{trip.pricePerSeat}</p>
                                <p className="text-xs text-muted-foreground">{trip.availableSeats} seats</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>{new Date(trip.departureTime).toLocaleString()}</span>
                        </div>
                        <div className="mt-2 space-y-1">
                            <div className="flex items-center gap-2 text-xs">
                                <MapPin className="w-3 h-3 text-green-500" />
                                <span className="truncate text-muted-foreground">{trip.pickupLocation}</span>
                            </div>
                            <div className="flex items-center gap-2 text-xs">
                                <MapPin className="w-3 h-3 text-red-500" />
                                <span className="truncate text-muted-foreground">{trip.dropLocation}</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </Card>
    );
}

interface TripTimelineProps {
    pickupLocation: string;
    dropLocation: string;
    departureTime: string;
    duration: number;
}

export function TripTimeline({ pickupLocation, dropLocation, departureTime, duration }: TripTimelineProps) {
    const departure = new Date(departureTime);
    const arrival = new Date(departure.getTime() + duration * 60000);

    return (
        <div className="space-y-4">
            <div className="flex items-start gap-4">
                <div className="flex flex-col items-center">
                    <div className="w-3 h-3 rounded-full bg-green-500" />
                    <div className="w-0.5 h-16 bg-gray-300" />
                </div>
                <div className="flex-1">
                    <p className="font-medium">{pickupLocation}</p>
                    <p className="text-sm text-muted-foreground">
                        {departure.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                </div>
            </div>

            <div className="flex items-center gap-4 pl-1">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                    {Math.floor(duration / 60)}h {duration % 60}m journey
                </p>
            </div>

            <div className="flex items-start gap-4">
                <div className="flex flex-col items-center">
                    <div className="w-3 h-3 rounded-full bg-red-500" />
                </div>
                <div className="flex-1">
                    <p className="font-medium">{dropLocation}</p>
                    <p className="text-sm text-muted-foreground">
                        {arrival.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                </div>
            </div>
        </div>
    );
}

