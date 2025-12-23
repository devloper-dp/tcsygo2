import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Search, Calendar, MapPin, Users, TrendingUp, Shield } from 'lucide-react';

interface EmptyStateProps {
    icon: React.ReactNode;
    title: string;
    description: string;
    actionLabel?: string;
    onAction?: () => void;
}

function EmptyState({ icon, title, description, actionLabel, onAction }: EmptyStateProps) {
    return (
        <Card className="p-12 text-center">
            <div className="flex justify-center mb-6">
                <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center text-gray-400">
                    {icon}
                </div>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">{title}</h3>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">{description}</p>
            {actionLabel && onAction && (
                <Button onClick={onAction} size="lg">
                    {actionLabel}
                </Button>
            )}
        </Card>
    );
}

export function NoTripsFound({ onAdjustFilters }: { onAdjustFilters?: () => void }) {
    return (
        <EmptyState
            icon={<Search className="w-10 h-10" />}
            title="No trips found"
            description="We couldn't find any trips matching your search criteria. Try adjusting your filters or search for a different route."
            actionLabel="Adjust Filters"
            onAction={onAdjustFilters}
        />
    );
}

export function NoBookingsYet({ onFindTrips }: { onFindTrips?: () => void }) {
    return (
        <EmptyState
            icon={<Calendar className="w-10 h-10" />}
            title="No bookings yet"
            description="You haven't booked any trips yet. Start exploring available rides and book your first trip!"
            actionLabel="Find Trips"
            onAction={onFindTrips}
        />
    );
}

export function NoTripsCreated({ onCreateTrip }: { onCreateTrip?: () => void }) {
    return (
        <EmptyState
            icon={<MapPin className="w-10 h-10" />}
            title="No trips created"
            description="You haven't created any trips yet. Start sharing rides and earn money by creating your first trip!"
            actionLabel="Create Trip"
            onAction={onCreateTrip}
        />
    );
}

export function VerificationPending() {
    return (
        <EmptyState
            icon={<Shield className="w-10 h-10" />}
            title="Verification Pending"
            description="Your driver application is under review. We'll notify you once your account is verified. This usually takes 24-48 hours."
        />
    );
}

export function NoRecentSearches() {
    return (
        <div className="text-center py-8">
            <Search className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">No recent searches</p>
        </div>
    );
}

export function NoSavedSearches({ onSearch }: { onSearch?: () => void }) {
    return (
        <div className="text-center py-8">
            <MapPin className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 text-sm mb-3">No saved searches</p>
            {onSearch && (
                <Button variant="outline" size="sm" onClick={onSearch}>
                    Start Searching
                </Button>
            )}
        </div>
    );
}

export function NoPassengers() {
    return (
        <div className="text-center py-12">
            <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h4 className="font-medium text-gray-900 mb-2">No passengers yet</h4>
            <p className="text-gray-500 text-sm">
                Passengers will appear here once they book your trip
            </p>
        </div>
    );
}

export function NoEarnings() {
    return (
        <div className="text-center py-12">
            <TrendingUp className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h4 className="font-medium text-gray-900 mb-2">No earnings yet</h4>
            <p className="text-gray-500 text-sm">
                Complete trips to start earning money
            </p>
        </div>
    );
}
