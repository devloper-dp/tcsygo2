import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Zap, MapPin, Clock, Star, Home, Briefcase, Heart } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

interface SavedPlace {
    id: string;
    name: string;
    address: string;
    lat: number;
    lng: number;
    icon: 'home' | 'work' | 'favorite';
}

interface RecentTrip {
    id: string;
    pickupLocation: string;
    dropLocation: string;
    pickupLat: number;
    pickupLng: number;
    dropLat: number;
    dropLng: number;
    vehicleType: string;
    createdAt: string;
}

interface QuickActionsProps {
    className?: string;
}

export function QuickActions({ className = '' }: QuickActionsProps) {
    const [, navigate] = useLocation();
    const { user } = useAuth();
    const [lastTrip, setLastTrip] = useState<RecentTrip | null>(null);
    const [savedPlaces, setSavedPlaces] = useState<SavedPlace[]>([]);
    const [recentDestinations, setRecentDestinations] = useState<string[]>([]);

    useEffect(() => {
        if (user) {
            loadQuickActions();
        }
    }, [user]);

    const loadQuickActions = async () => {
        try {
            // Load last trip
            const { data: trips } = await supabase
                .from('bookings')
                .select('*')
                .eq('passenger_id', user?.id)
                .order('created_at', { ascending: false })
                .limit(1);

            if (trips && trips.length > 0) {
                const trip = trips[0]; // trips[0] is the booking itself
                setLastTrip({
                    id: trip.id,
                    pickupLocation: trip.pickup_location,
                    dropLocation: trip.drop_location,
                    pickupLat: trip.pickup_lat,
                    pickupLng: trip.pickup_lng,
                    dropLat: trip.drop_lat,
                    dropLng: trip.drop_lng,
                    vehicleType: 'auto',
                    createdAt: trip.created_at,
                });
            }

            // Load saved places
            const { data: places } = await supabase
                .from('saved_places')
                .select('*')
                .eq('user_id', user?.id)
                .limit(3);

            if (places) {
                setSavedPlaces(
                    places.map((p) => ({
                        id: p.id,
                        name: p.name,
                        address: p.address,
                        lat: p.lat,
                        lng: p.lng,
                        icon: p.type || 'favorite',
                    }))
                );
            }

            // Load recent destinations
            const { data: recentTrips } = await supabase
                .from('bookings')
                .select('drop_location')
                .eq('passenger_id', user?.id)
                .order('created_at', { ascending: false })
                .limit(5);

            if (recentTrips) {
                const destinations = recentTrips
                    .map((t: any) => t.drop_location)
                    .filter((v): v is string => typeof v === 'string')
                    .filter((v, i, a) => a.indexOf(v) === i) // Remove duplicates
                    .slice(0, 3);
                setRecentDestinations(destinations);
            }
        } catch (error) {
            console.error('Error loading quick actions:', error);
        }
    };

    const handleRepeatLastRide = () => {
        if (!lastTrip) return;

        const params = new URLSearchParams({
            pickup: lastTrip.pickupLocation,
            drop: lastTrip.dropLocation,
            pickupLat: lastTrip.pickupLat.toString(),
            pickupLng: lastTrip.pickupLng.toString(),
            dropLat: lastTrip.dropLat.toString(),
            dropLng: lastTrip.dropLng.toString(),
            vehicleType: lastTrip.vehicleType,
        });

        navigate(`/search?${params.toString()}`);
    };

    const handleSavedPlace = (place: SavedPlace) => {
        // Get current location and navigate to search with saved place as destination
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition((position) => {
                const params = new URLSearchParams({
                    pickup: 'Current Location',
                    drop: place.address,
                    pickupLat: position.coords.latitude.toString(),
                    pickupLng: position.coords.longitude.toString(),
                    dropLat: place.lat.toString(),
                    dropLng: place.lng.toString(),
                });
                navigate(`/search?${params.toString()}`);
            });
        }
    };

    const getPlaceIcon = (icon: string) => {
        switch (icon) {
            case 'home':
                return Home;
            case 'work':
                return Briefcase;
            default:
                return Heart;
        }
    };

    return (
        <div className={`space-y-4 ${className}`}>
            {/* Repeat Last Ride */}
            {lastTrip && (
                <Card className="p-4 hover:shadow-md transition-shadow cursor-pointer" onClick={handleRepeatLastRide}>
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <Zap className="w-6 h-6 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <h4 className="font-semibold mb-1">Repeat Last Ride</h4>
                            <p className="text-sm text-muted-foreground truncate">
                                {lastTrip.pickupLocation} → {lastTrip.dropLocation}
                            </p>
                        </div>
                        <Badge variant="secondary">Quick</Badge>
                    </div>
                </Card>
            )}

            {/* Saved Places */}
            {savedPlaces.length > 0 && (
                <div>
                    <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                        <Star className="w-4 h-4" />
                        Saved Places
                    </h3>
                    <div className="grid grid-cols-1 gap-2">
                        {savedPlaces.map((place) => {
                            const Icon = getPlaceIcon(place.icon);
                            return (
                                <Button
                                    key={place.id}
                                    variant="outline"
                                    className="justify-start h-auto py-3"
                                    onClick={() => handleSavedPlace(place)}
                                >
                                    <Icon className="w-4 h-4 mr-3 flex-shrink-0" />
                                    <div className="text-left flex-1 min-w-0">
                                        <p className="font-medium text-sm">{place.name}</p>
                                        <p className="text-xs text-muted-foreground truncate">
                                            {place.address}
                                        </p>
                                    </div>
                                </Button>
                            );
                        })}
                    </div>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="w-full mt-2"
                        onClick={() => navigate('/saved-places')}
                    >
                        Manage Saved Places
                    </Button>
                </div>
            )}

            {/* Recent Destinations */}
            {recentDestinations.length > 0 && (
                <div>
                    <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        Recent Destinations
                    </h3>
                    <div className="flex flex-wrap gap-2">
                        {recentDestinations.map((destination, index) => (
                            <Button
                                key={index}
                                variant="outline"
                                size="sm"
                                className="text-xs"
                                onClick={() => {
                                    // Navigate to search with this destination
                                    if (navigator.geolocation) {
                                        navigator.geolocation.getCurrentPosition((position) => {
                                            const params = new URLSearchParams({
                                                pickup: 'Current Location',
                                                drop: destination,
                                                pickupLat: position.coords.latitude.toString(),
                                                pickupLng: position.coords.longitude.toString(),
                                            });
                                            navigate(`/search?${params.toString()}`);
                                        });
                                    }
                                }}
                            >
                                <MapPin className="w-3 h-3 mr-1" />
                                {destination.length > 25 ? destination.substring(0, 25) + '...' : destination}
                            </Button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
