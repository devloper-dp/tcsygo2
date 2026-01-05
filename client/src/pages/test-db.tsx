
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function TestDB() {
    const [status, setStatus] = useState('Idle');
    const [data, setData] = useState<any>(null);
    const [error, setError] = useState<any>(null);

    const runTest = async () => {
        setStatus('Loading...');
        setError(null);
        setData(null);
        try {
            // 0. Get User
            const { data: { user } } = await supabase.auth.getUser();

            // 1. Fetch upcoming trips with driver and user
            const { data: trips, error: tripsError } = await supabase
                .from('trips')
                .select('*, driver:drivers(*, user:users(*))')
                .eq('status', 'upcoming');


            // 2. Fetch My Bookings (to debug visibility)
            let bookings: any[] = [];
            let bookingsError = null;
            if (user) {
                const res = await supabase
                    .from('bookings')
                    .select('*, trip:trips(*, driver:drivers(*, user:users(*)))')
                    .eq('passenger_id', user.id);
                bookings = res.data || [];
                bookingsError = res.error;
            }

            // 3. Fetch Bookings for MY Trips (Driver View)
            let driverBookings: any[] = [];
            if (trips && trips.length > 0) {
                const tripIds = trips.map((t: any) => t.id);
                const res = await supabase
                    .from('bookings')
                    .select('*, passenger:users(*)') // Check if we can see passenger details
                    .in('trip_id', tripIds);
                driverBookings = res.data || [];
            }

            // 4. Seat Count Verification
            let seatAnalysis = null;
            if (trips && trips.length > 0) {
                const trip = trips[0]; // Analyze first trip

                // Get all bookings for this trip, counting ONLY confirmed/pending ones that take seats
                const { data: tripBookings } = await supabase
                    .from('bookings')
                    .select('seats_booked, status')
                    .eq('trip_id', trip.id)
                    .in('status', ['confirmed', 'pending']); // Assuming pending also reserves seats? Trigger said 'confirmed' only.

                // The trigger ONLY updates on 'confirmed'. Let's check 'confirmed' specifically.
                const confirmedBookings = tripBookings?.filter(b => b.status === 'confirmed') || [];
                const seatsTaken = confirmedBookings.reduce((sum, b) => sum + b.seats_booked, 0);

                seatAnalysis = {
                    tripId: trip.id,
                    totalSeats: trip.total_seats,
                    availableSeatsInDB: trip.available_seats,
                    seatsTakenSum: seatsTaken,
                    calculatedAvailable: trip.total_seats - seatsTaken,
                    isSync: trip.available_seats === (trip.total_seats - seatsTaken)
                };
            }

            if (tripsError) throw tripsError;
            if (bookingsError) throw bookingsError;

            setData({
                userId: user?.id || 'Not logged in',
                tripsCount: trips?.length,
                bookingsCount: bookings?.length,
                driverBookingsCount: driverBookings?.length,
                trips: trips,
                bookings: bookings,
                driverBookings: driverBookings,
                seatAnalysis: seatAnalysis
            });
            setStatus(`Success: Found ${trips?.length} trips. Seat Sync: ${seatAnalysis ? (seatAnalysis.isSync ? 'OK' : 'MISMATCH') : 'N/A'}`);
        } catch (e: any) {
            console.error(e);
            setError(e.message || JSON.stringify(e));
            setStatus('Error');
        }
    };

    useEffect(() => {
        runTest();
    }, []);

    const simulateBooking = async () => {
        if (!data?.trips?.[0]) {
            alert("No upcoming trips found to book!");
            return;
        }
        const trip = data.trips[0];
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            alert("Not logged in!");
            return;
        }

        setStatus('Simulating Booking...');
        try {
            console.log("Simulating booking for trip:", trip.id, "User:", user.id);

            const payload = {
                trip_id: trip.id,
                passenger_id: user.id,
                seats_booked: 1,
                total_amount: 10,
                status: 'confirmed',
                payment_status: 'pending',
                payment_method: 'cash',
                pickup_location: trip.pickup_location || 'Test Pickup',
                drop_location: trip.drop_location || 'Test Drop',
                // Ensure lat/lng are present as per recent schema requirements
                pickup_lat: trip.pickup_lat || 0,
                pickup_lng: trip.pickup_lng || 0,
                drop_lat: trip.drop_lat || 0,
                drop_lng: trip.drop_lng || 0
            };

            const { data: booking, error } = await supabase
                .from('bookings')
                .insert(payload)
                .select()
                .single();

            if (error) {
                console.error("Simulation failed:", error);
                alert(`Simulation Failed: ${error.message} (${error.code})`);
                setStatus(`Simulation Failed: ${error.message}`);
                return;
            }

            console.log("Simulation Success:", booking);
            alert("Simulation Success! Booking created with ID: " + booking.id);
            setStatus("Booking Created! Refreshing data...");
            runTest(); // Refresh list

        } catch (e: any) {
            console.error("Simulation Crash:", e);
            alert("Simulation Crash: " + e.message);
        }
    };

    return (
        <div className="p-8 max-w-4xl mx-auto">
            <h1 className="text-2xl font-bold mb-4">Database Diagnostics</h1>

            <div className="flex gap-4 mb-6">
                <Button onClick={runTest}>Refresh Data</Button>
                <Button onClick={simulateBooking} variant="destructive">Test Create Booking</Button>
            </div>

            <Card className={`p-4 mb-4 border-l-4 ${status.startsWith('Success') ? 'border-l-green-500' : 'border-l-red-500'}`}>
                <h2 className="font-semibold text-lg">Status: {status}</h2>
                {error && <div className="text-red-500 mt-2 font-mono bg-red-50 p-2 rounded">{JSON.stringify(error)}</div>}
            </Card>

            {data && (
                <div className="space-y-4">
                    <div className="font-medium">User ID: {data.userId}</div>

                    <div>
                        <h3 className="font-semibold mt-4">All Trips ({data.tripsCount})</h3>
                        <div className="bg-slate-900 text-slate-50 p-4 rounded overflow-auto max-h-[400px] text-xs font-mono">
                            {JSON.stringify(data.trips, null, 2)}
                        </div>
                    </div>

                    {data.seatAnalysis && (
                        <div className="mt-4">
                            <h3 className="font-semibold">Seat Analysis for first trip (ID: {data.seatAnalysis.tripId})</h3>
                            <p className="text-sm">
                                Total Seats: {data.seatAnalysis.totalSeats}, Available Seats (DB): {data.seatAnalysis.availableSeatsInDB},
                                Confirmed Booked Seats: {data.seatAnalysis.seatsTakenSum}, Calculated Available: {data.seatAnalysis.calculatedAvailable}
                            </p>
                            {!data.seatAnalysis?.isSync && (
                                <p className="text-sm text-red-600 font-semibold mt-2">
                                    Mismatch detected! The 'available_seats' in DB ({data.seatAnalysis?.availableSeatsInDB})
                                    does not match Total ({data.seatAnalysis?.totalSeats}) - Booked ({data.seatAnalysis?.seatsTakenSum}) = {data.seatAnalysis?.calculatedAvailable}.
                                    <br />
                                    <strong>Possible Causes:</strong>
                                    <ul className="list-disc ml-4 mt-1">
                                        <li>RLS blocking bookings fetch? (User: {data.userId}, Driver: {data.trips?.[0]?.driver?.user_id})</li>
                                        <li>Bookings have different status than confirmed/pending?</li>
                                    </ul>
                                </p>
                            )}
                        </div>
                    )}

                    <div>
                        <h3 className="font-semibold mt-4">My Bookings ({data.bookingsCount})</h3>
                        <div className="bg-slate-900 text-slate-50 p-4 rounded overflow-auto max-h-[400px] text-xs font-mono">
                            {JSON.stringify(data.bookings, null, 2)}
                        </div>
                    </div>

                    <div>
                        <h3 className="font-semibold mt-4">Bookings for My Trips (Driver View) ({data.driverBookingsCount})</h3>
                        <div className="bg-slate-900 text-slate-50 p-4 rounded overflow-auto max-h-[400px] text-xs font-mono">
                            {JSON.stringify(data.driverBookings, null, 2)}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
