import { useEffect } from 'react';
import { useLocation, useRoute } from 'wouter';
import { Card } from '@/components/ui/card';
import { RideRequestStatus } from '@/components/RideRequestStatus';
import { Navbar } from '@/components/Navbar';
import { getActiveRideRequest } from '@/lib/ride-matching-service';
import { useQuery } from '@tanstack/react-query';

export default function RideRequestPage() {
    const [, navigate] = useLocation();
    const [match, params] = useRoute('/ride-request/:id');
    const requestId = params?.id;

    // If no ID in URL, try to get active request
    const { data: activeRequest } = useQuery({
        queryKey: ['active-ride-request'],
        queryFn: getActiveRideRequest,
        enabled: !requestId,
    });

    useEffect(() => {
        if (!requestId && activeRequest) {
            navigate(`/ride-request/${activeRequest.id}`, { replace: true });
        } else if (!requestId && !activeRequest) {
            // No active request, redirect to home
            navigate('/', { replace: true });
        }
    }, [requestId, activeRequest, navigate]);

    const handleComplete = () => {
        navigate('/my-trips');
    };

    const handleCancel = () => {
        navigate('/');
    };

    const finalRequestId = requestId || activeRequest?.id;

    if (!finalRequestId) {
        return (
            <div className="min-h-screen bg-background">
                <Navbar />
                <div className="container mx-auto px-4 py-8">
                    <Card className="p-8 text-center">
                        <p className="text-muted-foreground">Loading...</p>
                    </Card>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background">
            <Navbar />
            <div className="container mx-auto px-4 py-8 max-w-2xl">
                <h1 className="text-2xl font-bold mb-6">Ride Request</h1>
                <RideRequestStatus
                    requestId={finalRequestId}
                    onComplete={handleComplete}
                    onCancel={handleCancel}
                />
            </div>
        </div>
    );
}
