import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { BarChart, TrendingUp, MapPin, Clock, IndianRupee, Award } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

interface RideStats {
    totalRides: number;
    totalDistance: number;
    totalSpent: number;
    totalSaved: number;
    averageRating: number;
    favoriteRoute: string;
}

export function RideStatistics() {
    const { user } = useAuth();
    const [stats, setStats] = useState<RideStats>({
        totalRides: 0,
        totalDistance: 0,
        totalSpent: 0,
        totalSaved: 0,
        averageRating: 0,
        favoriteRoute: '',
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user) {
            fetchStatistics();
        }
    }, [user]);

    const fetchStatistics = async () => {
        if (!user) return;

        try {
            setLoading(true);

            // Fetch all completed bookings
            const { data: bookings, error } = await supabase
                .from('bookings')
                .select(`
          *,
          trips (
            distance,
            price_per_seat
          ),
          payments (
            amount
          )
        `)
                .eq('passenger_id', user.id)
                .eq('status', 'completed');

            if (error) throw error;

            // Fetch ratings received by the user
            const { data: ratings, error: ratingsError } = await supabase
                .from('ratings')
                .select('rating')
                .eq('to_user_id', user.id);

            if (ratingsError) throw ratingsError;

            let averageRating = 0;
            if (ratings && ratings.length > 0) {
                const totalRating = ratings.reduce((sum, r) => sum + r.rating, 0);
                averageRating = totalRating / ratings.length;
            }

            if (bookings && bookings.length > 0) {
                const totalRides = bookings.length;
                const totalDistance = bookings.reduce((sum, b: any) => sum + (b.trips?.[0]?.distance || b.trips?.distance || 0), 0);
                // Fix payment access which is an array
                const totalSpent = bookings.reduce((sum, b: any) => sum + (b.payments?.[0]?.amount || 0), 0);

                // Estimate savings (comparing with solo cab ride)
                const estimatedSoloCost = totalDistance * 15; // ₹15 per km for solo ride
                const totalSaved = estimatedSoloCost - totalSpent;

                // Calculate favorite route (most frequent)
                const routeCounts: Record<string, number> = {};
                bookings.forEach((b: any) => {
                    const route = `${b.pickup_location} → ${b.drop_location}`;
                    routeCounts[route] = (routeCounts[route] || 0) + 1;
                });
                const favoriteRoute = Object.entries(routeCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || '';

                setStats({
                    totalRides,
                    totalDistance,
                    totalSpent,
                    totalSaved: Math.max(0, totalSaved),
                    averageRating,
                    favoriteRoute,
                });
            } else {
                setStats(prev => ({ ...prev, averageRating }));
            }
        } catch (error) {
            console.error('Error fetching statistics:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <Card className="p-6">
                <div className="animate-pulse space-y-4">
                    <div className="h-8 bg-muted rounded w-1/3"></div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="h-24 bg-muted rounded"></div>
                        <div className="h-24 bg-muted rounded"></div>
                    </div>
                </div>
            </Card>
        );
    }

    const getMilestone = () => {
        if (stats.totalRides >= 100) return { text: 'Century Rider', icon: '🏆', color: 'text-warning' };
        if (stats.totalRides >= 50) return { text: 'Frequent Rider', icon: '⭐', color: 'text-primary' };
        if (stats.totalRides >= 10) return { text: 'Regular Rider', icon: '🎯', color: 'text-success' };
        return { text: 'New Rider', icon: '🚀', color: 'text-muted-foreground' };
    };

    const milestone = getMilestone();

    return (
        <div className="space-y-6">
            {/* Header */}
            <Card className="p-6 bg-gradient-to-br from-primary/10 to-primary/5">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                            <BarChart className="w-6 h-6 text-primary" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold">Ride Statistics</h2>
                            <p className="text-sm text-muted-foreground">Your journey so far</p>
                        </div>
                    </div>
                    <Badge className={`gap-2 ${milestone.color}`}>
                        <span className="text-lg">{milestone.icon}</span>
                        {milestone.text}
                    </Badge>
                </div>

                {/* Progress to next milestone */}
                {stats.totalRides < 100 && (
                    <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Progress to next milestone</span>
                            <span className="font-semibold">
                                {stats.totalRides}/{stats.totalRides < 10 ? 10 : stats.totalRides < 50 ? 50 : 100} rides
                            </span>
                        </div>
                        <Progress
                            value={(stats.totalRides / (stats.totalRides < 10 ? 10 : stats.totalRides < 50 ? 50 : 100)) * 100}
                            className="h-2"
                        />
                    </div>
                )}
            </Card>

            {/* Key Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="p-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <TrendingUp className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold">{stats.totalRides}</p>
                            <p className="text-xs text-muted-foreground">Total Rides</p>
                        </div>
                    </div>
                </Card>

                <Card className="p-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-success/10 flex items-center justify-center">
                            <MapPin className="w-5 h-5 text-success" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold">{stats.totalDistance.toFixed(0)}</p>
                            <p className="text-xs text-muted-foreground">Kilometers Traveled</p>
                        </div>
                    </div>
                </Card>

                <Card className="p-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-warning/10 flex items-center justify-center">
                            <IndianRupee className="w-5 h-5 text-warning" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold">₹{stats.totalSaved.toFixed(0)}</p>
                            <p className="text-xs text-muted-foreground">Money Saved</p>
                        </div>
                    </div>
                </Card>

                <Card className="p-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <Award className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold">{stats.averageRating.toFixed(1)}</p>
                            <p className="text-xs text-muted-foreground">Average Rating</p>
                        </div>
                    </div>
                </Card>
            </div>

            {/* Additional Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="p-6">
                    <h3 className="font-semibold mb-4 flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        Ride Breakdown
                    </h3>
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">Total Spent</span>
                            <span className="font-semibold">₹{stats.totalSpent.toFixed(2)}</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">Average per Ride</span>
                            <span className="font-semibold">
                                ₹{stats.totalRides > 0 ? (stats.totalSpent / stats.totalRides).toFixed(2) : '0.00'}
                            </span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">Average Distance</span>
                            <span className="font-semibold">
                                {stats.totalRides > 0 ? (stats.totalDistance / stats.totalRides).toFixed(1) : '0'} km
                            </span>
                        </div>
                    </div>
                </Card>

                <Card className="p-6">
                    <h3 className="font-semibold mb-4 flex items-center gap-2">
                        <MapPin className="w-4 h-4" />
                        Favorite Route
                    </h3>
                    {stats.favoriteRoute ? (
                        <div className="p-3 bg-primary/5 rounded-lg">
                            <p className="text-sm font-medium">{stats.favoriteRoute}</p>
                            <p className="text-xs text-muted-foreground mt-1">Most frequently traveled</p>
                        </div>
                    ) : (
                        <p className="text-sm text-muted-foreground">No favorite route yet</p>
                    )}
                </Card>
            </div>
        </div>
    );
}
