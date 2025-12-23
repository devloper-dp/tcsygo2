import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin, Clock, TrendingUp } from 'lucide-react';
import { useSearchStore, RecentSearch } from '@/lib/search-store';

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

const POPULAR_ROUTES: PopularRoute[] = [
    { from: 'Mumbai', to: 'Pune', trips: 245 },
    { from: 'Delhi', to: 'Jaipur', trips: 189 },
    { from: 'Bangalore', to: 'Chennai', trips: 167 },
    { from: 'Hyderabad', to: 'Vijayawada', trips: 134 },
];

interface PopularRoutesProps {
    onSelect?: (from: string, to: string) => void;
}

export function PopularRoutes({ onSelect }: PopularRoutesProps) {
    return (
        <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <TrendingUp className="w-4 h-4" />
                <span>Popular Routes</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {POPULAR_ROUTES.map((route, index) => (
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
                                        {route.trips} trips available
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
