import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin, Clock, TrendingUp } from 'lucide-react';
import { useSearchStore, RecentSearch } from '@/lib/search-store';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

interface RecentSearchesProps {
    onSelect?: (search: RecentSearch) => void;
}

export function RecentSearches({ onSelect }: RecentSearchesProps) {
    const { recentSearches } = useSearchStore();

    if (recentSearches.length === 0) {
        return null;
    }

    return (
        <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Clock className="w-4 h-4" />
                <span>Recent Searches</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {recentSearches.slice(0, 4).map((search: RecentSearch, index: number) => (
                    <Card
                        key={index}
                        className="p-3 cursor-pointer hover-elevate transition-all"
                        onClick={() => onSelect?.(search)}
                    >
                        <div className="flex items-start gap-2">
                            <MapPin className="w-4 h-4 text-success mt-0.5 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{search.pickup}</p>
                                <p className="text-xs text-muted-foreground truncate">{search.drop}</p>
                            </div>
                        </div>
                    </Card>
                ))}
            </div>
        </div>
    );
}

interface PopularRoute {
    from: string;
    to: string;
    trips: number;
}

interface PopularRoutesProps {
    onSelect?: (from: string, to: string) => void;
}

export function PopularRoutes({ onSelect }: PopularRoutesProps) {
    const { data: popularRoutes, isLoading } = useQuery<PopularRoute[]>({
        queryKey: ['popular-routes'],
        queryFn: async () => {
            // Fetch popular routes by analyzing trip data
            const { data, error } = await supabase
                .from('trips')
                .select('bookings(pickup_location, drop_location)')
                .eq('status', 'completed')
                .order('created_at', { ascending: false })
                .limit(200); // Analyze last 200 completed trips

            if (error) throw error;

            // Aggregate routes by frequency
            const routeMap = new Map<string, PopularRoute>();

            data?.forEach((trip: any) => {
                const booking = trip.bookings;
                if (!booking) return;

                const key = `${booking.pickup_location}|${booking.drop_location}`;
                const existing = routeMap.get(key);

                if (existing) {
                    existing.trips += 1;
                } else {
                    routeMap.set(key, {
                        from: booking.pickup_location,
                        to: booking.drop_location,
                        trips: 1
                    });
                }
            });

            // Convert to array, sort by frequency, and take top 4
            return Array.from(routeMap.values())
                .sort((a, b) => b.trips - a.trips)
                .slice(0, 4);
        },
        staleTime: 1000 * 60 * 30, // Cache for 30 minutes
    });

    if (isLoading || !popularRoutes || popularRoutes.length === 0) {
        return null;
    }

    return (
        <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <TrendingUp className="w-4 h-4" />
                <span>Popular Routes</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {popularRoutes.map((route, index) => (
                    <Card
                        key={index}
                        className="p-3 cursor-pointer hover-elevate transition-all"
                        onClick={() => onSelect?.(route.from, route.to)}
                    >
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <MapPin className="w-4 h-4 text-primary flex-shrink-0" />
                                <div>
                                    <p className="text-sm font-medium">
                                        {route.from} → {route.to}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        {route.trips} trips completed
                                    </p>
                                </div>
                            </div>
                            <Badge variant="secondary" className="text-xs">
                                Popular
                            </Badge>
                        </div>
                    </Card>
                ))}
            </div>
        </div>
    );
}
