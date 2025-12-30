import { Navbar } from '@/components/Navbar';
import { RideStatistics } from '@/components/RideStatistics';
import { CarbonFootprint } from '@/components/CarbonFootprint';
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

export default function Statistics() {
    const { user } = useAuth();
    const [totalDistance, setTotalDistance] = useState(0);
    const [totalRides, setTotalRides] = useState(0);

    useEffect(() => {
        if (user) {
            fetchTripData();
        }
    }, [user]);

    const fetchTripData = async () => {
        if (!user) return;

        try {
            const { data: bookings, error } = await supabase
                .from('bookings')
                .select(`
          *,
          trips (
            distance
          )
        `)
                .eq('passenger_id', user.id)
                .eq('status', 'completed');

            if (error) throw error;

            if (bookings && bookings.length > 0) {
                const totalDist = bookings.reduce((sum, b: any) => sum + (b.trips?.distance || 0), 0);
                setTotalDistance(totalDist);
                setTotalRides(bookings.length);
            }
        } catch (error) {
            console.error('Error fetching trip data:', error);
        }
    };

    return (
        <div className="min-h-screen bg-background">
            <Navbar />
            <div className="container mx-auto px-6 py-8">
                <div className="space-y-8">
                    <div>
                        <h1 className="text-3xl font-bold mb-2">Your Statistics</h1>
                        <p className="text-muted-foreground">Track your journey and environmental impact</p>
                    </div>

                    <CarbonFootprint totalDistance={totalDistance} totalRides={totalRides} />
                    <RideStatistics />
                </div>
            </div>
        </div>
    );
}
