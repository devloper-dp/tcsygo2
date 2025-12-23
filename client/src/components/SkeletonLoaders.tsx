import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export function TripCardSkeleton() {
    return (
        <Card className="p-6">
            <div className="flex gap-4">
                {/* Driver Avatar */}
                <Skeleton className="w-16 h-16 rounded-full flex-shrink-0" />

                <div className="flex-1 space-y-3">
                    {/* Driver Name and Rating */}
                    <div className="flex items-center justify-between">
                        <Skeleton className="h-5 w-32" />
                        <Skeleton className="h-5 w-20" />
                    </div>

                    {/* Route */}
                    <div className="space-y-2">
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-3/4" />
                    </div>

                    {/* Time and Seats */}
                    <div className="flex gap-4">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-4 w-24" />
                    </div>
                </div>

                {/* Price */}
                <div className="flex flex-col items-end justify-between">
                    <Skeleton className="h-8 w-20" />
                    <Skeleton className="h-10 w-24 rounded-md" />
                </div>
            </div>
        </Card>
    );
}

export function TripListSkeleton({ count = 3 }: { count?: number }) {
    return (
        <div className="space-y-4">
            {Array.from({ length: count }).map((_, i) => (
                <TripCardSkeleton key={i} />
            ))}
        </div>
    );
}

export function SearchPageSkeleton() {
    return (
        <div className="container mx-auto px-4 py-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Filters Sidebar */}
                <div className="lg:col-span-1">
                    <Card className="p-6 space-y-6">
                        <Skeleton className="h-6 w-32" />
                        <div className="space-y-4">
                            <Skeleton className="h-10 w-full" />
                            <Skeleton className="h-10 w-full" />
                            <Skeleton className="h-10 w-full" />
                            <Skeleton className="h-10 w-full" />
                        </div>
                    </Card>
                </div>

                {/* Trip List */}
                <div className="lg:col-span-2">
                    <div className="mb-4 flex justify-between items-center">
                        <Skeleton className="h-6 w-48" />
                        <Skeleton className="h-10 w-32" />
                    </div>
                    <TripListSkeleton count={5} />
                </div>
            </div>
        </div>
    );
}

export function ProfileSkeleton() {
    return (
        <div className="container mx-auto px-4 py-8 max-w-4xl">
            <Card className="p-8">
                <div className="flex items-start gap-6 mb-8">
                    <Skeleton className="w-24 h-24 rounded-full" />
                    <div className="flex-1 space-y-3">
                        <Skeleton className="h-8 w-48" />
                        <Skeleton className="h-4 w-64" />
                        <div className="flex gap-2">
                            <Skeleton className="h-6 w-20" />
                            <Skeleton className="h-6 w-20" />
                        </div>
                    </div>
                </div>

                <div className="space-y-6">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-32 w-full" />
                </div>
            </Card>
        </div>
    );
}

export function TripDetailsSkeleton() {
    return (
        <div className="container mx-auto px-4 py-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Content */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Map */}
                    <Skeleton className="h-96 w-full rounded-lg" />

                    {/* Trip Details */}
                    <Card className="p-6 space-y-4">
                        <Skeleton className="h-8 w-64" />
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-3/4" />
                        <div className="flex gap-4 pt-4">
                            <Skeleton className="h-6 w-32" />
                            <Skeleton className="h-6 w-32" />
                            <Skeleton className="h-6 w-32" />
                        </div>
                    </Card>

                    {/* Driver Info */}
                    <Card className="p-6">
                        <div className="flex gap-4">
                            <Skeleton className="w-16 h-16 rounded-full" />
                            <div className="flex-1 space-y-2">
                                <Skeleton className="h-6 w-32" />
                                <Skeleton className="h-4 w-48" />
                                <Skeleton className="h-4 w-40" />
                            </div>
                        </div>
                    </Card>
                </div>

                {/* Booking Sidebar */}
                <div className="lg:col-span-1">
                    <Card className="p-6 sticky top-4 space-y-4">
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-12 w-full" />
                        <div className="border-t pt-4 space-y-2">
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="h-6 w-full" />
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
}

export function DashboardSkeleton() {
    return (
        <div className="space-y-6">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                    <Card key={i} className="p-6">
                        <Skeleton className="h-4 w-24 mb-2" />
                        <Skeleton className="h-8 w-32" />
                    </Card>
                ))}
            </div>

            {/* Chart */}
            <Card className="p-6">
                <Skeleton className="h-6 w-48 mb-4" />
                <Skeleton className="h-64 w-full" />
            </Card>

            {/* Table */}
            <Card className="p-6">
                <Skeleton className="h-6 w-48 mb-4" />
                <div className="space-y-3">
                    {Array.from({ length: 5 }).map((_, i) => (
                        <Skeleton key={i} className="h-12 w-full" />
                    ))}
                </div>
            </Card>
        </div>
    );
}
