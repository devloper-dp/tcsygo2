import React, { useEffect, useRef, useState } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { RideService } from '@/services/RideService';
import { RideRequestCard } from '@/components/driver/RideRequestCard';
import { useToast } from '@/components/ui/toast'; // Ensure this exists or use Alert/Toast
import { useAudioPlayer } from 'expo-audio'; // For sound notification
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/contexts/ThemeContext';
import { useResponsive } from '@/hooks/useResponsive';
 
export function RideRequestsList() {
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const { t } = useTranslation();
    const { theme } = useTheme();
    const isDark = theme === 'dark';
    const { hScale, vScale, spacing } = useResponsive();
    const { toast } = useToast();
    const previousRequestCount = useRef(0);
    const player = useAudioPlayer('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');

    // Fetch driver profile
    const { data: driverProfile } = useQuery({
        queryKey: ['my-driver-profile', user?.id],
        queryFn: async () => {
            if (!user) return null;
            const { data, error } = await supabase.from('drivers').select('id, verification_status').eq('user_id', user.id).single();
            if (error) return null;
            return data;
        },
        enabled: !!user
    });

    const { data: requests, isLoading } = useQuery({
        queryKey: ['pending-requests'],
        queryFn: async () => {
            if (!driverProfile) return [];

            // 1. Get pending requests
            const { data: requestData, error: requestError } = await supabase
                .from('ride_requests')
                .select('*')
                .in('status', ['pending', 'searching'])
                .order('created_at', { ascending: false });

            if (requestError) throw requestError;

            // 2. Get my ongoing trips and their passengers (to hide requests from current passengers)
            const { data: tripData, error: tripError } = await supabase
                .from('trips')
                .select('booking_id, bookings!inner(passenger_id)')
                .eq('driver_id', driverProfile.id)
                .eq('status', 'ongoing');

            if (tripError && tripError.code !== 'PGRST116') {
                console.error("Failed to fetch active trips for filtering", tripError);
            }

            const activePassengerIds = new Set((tripData || []).map((t: any) => t.bookings?.passenger_id));

            const mappedRequests = (requestData || []).map((item: any) => ({
                id: item.id,
                passengerId: item.passenger_id,
                pickupLocation: item.pickup_location,
                pickupLat: item.pickup_lat,
                pickupLng: item.pickup_lng,
                dropLocation: item.drop_location,
                dropLat: item.drop_lat,
                dropLng: item.drop_lng,
                vehicleType: item.vehicle_type,
                fare: item.fare,
                distance: item.distance,
                duration: item.duration,
                status: item.status,
                seats: item.seats,
                createdAt: item.created_at,
            }));

            // Filter and Deduplicate
            const uniqueRequests: typeof mappedRequests = [];
            const seenPassengers = new Set();

            for (const req of mappedRequests) {
                if (activePassengerIds.has(req.passengerId)) continue;
                if (!seenPassengers.has(req.passengerId)) {
                    seenPassengers.add(req.passengerId);
                    uniqueRequests.push(req);
                }
            }

            return uniqueRequests;
        },
        refetchInterval: 5000,
        enabled: !!driverProfile && driverProfile.verification_status === 'verified'
    });

    // Play sound on new request
    useEffect(() => {
        if (requests && requests.length > previousRequestCount.current) {
            try {
                player.play();
            } catch (error) {
                console.warn("Failed to play notification sound", error);
            }

            toast({
                title: "New Ride Request! 🔔",
                description: t('driver.showing_pending_requests'),
            });
        }
        previousRequestCount.current = requests?.length || 0;
    }, [requests]);


    // Realtime subscription
    useEffect(() => {
        const channel = supabase
            .channel('public:ride_requests')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'ride_requests'
                },
                () => {
                    queryClient.invalidateQueries({ queryKey: ['pending-requests'] });
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [queryClient]);

    const acceptMutation = useMutation({
        mutationFn: async (request: any) => {
            if (!driverProfile) throw new Error("Driver profile missing");
            return await RideService.acceptRequest(request, driverProfile.id);
        },
        onSuccess: (trip) => {
            toast({
                title: t('driver.accept_success'),
                description: t('driver.accept_subtitle'),
            });
            // Navigate to track trip page (requires router)
            // router.push(`/track/${trip.id}`);
            // Passing navigation responsibility might be better or use router here
        },
        onError: (error: any) => {
            toast({
                title: t('driver.accept_failed'),
                description: error.message,
                variant: "destructive"
            });
        }
    });

    if (isLoading) {
        return <ActivityIndicator size="small" color={isDark ? "#f8fafc" : "#000"} />;
    }

    if (!requests || requests.length === 0) {
        return (
            <View style={{ padding: spacing.xl, alignItems: 'center', justifyContent: 'center', marginTop: vScale(40) }}>
                <View style={{ width: hScale(96), height: hScale(96), borderRadius: hScale(48), marginBottom: vScale(24) }} className="bg-blue-50 dark:bg-blue-900/20 items-center justify-center animate-pulse">
                    <View style={{ position: 'absolute', width: '100%', height: '100%', borderRadius: hScale(48), opacity: 0.3 }} className="bg-blue-100 dark:bg-blue-900/10 animate-ping" />
                    <ActivityIndicator size="large" color="#3b82f6" />
                </View>
                <Text style={{ fontSize: hScale(20), marginBottom: vScale(8) }} className="font-black text-slate-900 dark:text-white text-center uppercase tracking-tighter">{t('driver.searching_title')}</Text>
                <Text style={{ fontSize: hScale(14), lineHeight: vScale(24), maxWidth: hScale(200) }} className="text-slate-500 dark:text-slate-400 text-center font-medium">
                    {t('driver.searching_subtitle')}
                </Text>
            </View>
        );
    }

    return (
        <View>
            {requests.map((req: any) => (
                <RideRequestCard
                    key={req.id}
                    request={req}
                    onAccept={() => acceptMutation.mutate(req)}
                    isAccepting={acceptMutation.isPending}
                />
            ))}
        </View>
    );
}
