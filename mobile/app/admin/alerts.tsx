import { useState } from 'react';
import { View, ScrollView, RefreshControl, TouchableOpacity, Alert, Linking, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { ArrowLeft, AlertTriangle, CheckCircle, MapPin, Phone, ShieldAlert } from 'lucide-react-native';
import { format } from 'date-fns';
import { useResponsive } from '@/hooks/useResponsive';

export default function SOSAlertsScreen() {
    const router = useRouter();
    const queryClient = useQueryClient();
    const { hScale, vScale, spacing, fontSize } = useResponsive();
    const [refreshing, setRefreshing] = useState(false);

    const { data: alerts, isLoading, refetch } = useQuery({
        queryKey: ['admin-sos-alerts'],
        queryFn: async () => {
            // Assuming an 'emergency_alerts' table exists as per schema
            const { data, error } = await supabase
                .from('emergency_alerts')
                .select('*, user:users(*)')
                .order('created_at', { ascending: false });

            // Mock data if table doesn't exist for demo purposes (or empty)
            if (error) {
                console.log("Error fetching alerts (might be missing table):", error);
                return [];
            }
            return data || [];
        }
    });

    const resolveMutation = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase
                .from('emergency_alerts')
                .update({ status: 'resolved', resolved_at: new Date().toISOString() })
                .eq('id', id);

            if (error) throw error;
        },
        onSuccess: () => {
            Alert.alert("Success", "Alert marked as resolved");
            queryClient.invalidateQueries({ queryKey: ['admin-sos-alerts'] });
        },
        onError: (e) => Alert.alert("Error", e.message)
    });

    const onRefresh = async () => {
        setRefreshing(true);
        await refetch();
        setRefreshing(false);
    };

    const openMap = (lat: string | number, lng: string | number) => {
        const url = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
        Linking.openURL(url);
    };

    const callUser = (phone?: string) => {
        if (phone) Linking.openURL(`tel:${phone}`);
        else Alert.alert("No Phone", "User phone number not available");
    };

    return (
        <View className="flex-1 bg-red-50/30">
            <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
            <SafeAreaView className="flex-1" edges={['top']}>
                {/* Header */}
                <View style={{ paddingHorizontal: spacing.xl, paddingVertical: vScale(16), gap: spacing.lg, borderBottomWidth: 1 }} className="bg-white border-red-50 flex-row items-center shadow-sm z-10">
                    <TouchableOpacity
                        onPress={() => router.back()}
                        style={{ width: hScale(40), height: hScale(40), borderRadius: hScale(20) }}
                        className="bg-red-50 items-center justify-center active:bg-red-100"
                    >
                        <ArrowLeft size={hScale(20)} color="#dc2626" />
                    </TouchableOpacity>
                    <View>
                        <Text style={{ fontSize: hScale(10) }} className="text-red-500 font-bold uppercase tracking-wider">Emergency</Text>
                        <Text style={{ fontSize: fontSize.xl }} className="font-bold text-slate-900">SOS Alerts</Text>
                    </View>
                </View>

                <ScrollView
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#ef4444" />}
                    className="flex-1"
                    contentContainerStyle={{ padding: spacing.xl }}
                    showsVerticalScrollIndicator={false}
                >
                    {isLoading ? (
                        <Text className="text-center mt-10 text-slate-400">Checking alerts...</Text>
                    ) : alerts?.length === 0 ? (
                        <View style={{ paddingVertical: vScale(80) }} className="items-center justify-center">
                            <View style={{ width: hScale(80), height: hScale(80), borderRadius: hScale(40), marginBottom: vScale(24), borderWidth: 4 }} className="bg-green-100 items-center justify-center border-green-50">
                                <CheckCircle size={hScale(40)} color="#16a34a" />
                            </View>
                            <Text style={{ fontSize: fontSize.xl, marginBottom: vScale(8) }} className="font-bold text-slate-900 text-center">No Active Alerts</Text>
                            <Text style={{ fontSize: fontSize.base, lineHeight: vScale(24) }} className="text-slate-500 text-center max-w-[200px]">System is currently safe. No emergency requests found.</Text>
                        </View>
                    ) : (
                        <View style={{ gap: spacing.xl, paddingBottom: vScale(40) }}>
                            {alerts?.map((alert) => (
                                <View
                                    key={alert.id}
                                    style={{ padding: spacing.xl, borderRadius: hScale(24), borderWidth: 1 }}
                                    className={`bg-white shadow-sm ${alert.status === 'resolved' ? 'border-slate-100 opacity-60' : 'border-red-100 shadow-red-100'}`}
                                >
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: vScale(16) }}>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
                                            <View style={{ width: hScale(40), height: hScale(40), borderRadius: hScale(20) }} className={`items-center justify-center ${alert.status === 'resolved' ? 'bg-green-100' : 'bg-red-100 animate-pulse'}`}>
                                                {alert.status === 'resolved' ? <CheckCircle size={hScale(20)} color="#16a34a" /> : <AlertTriangle size={hScale(20)} color="#dc2626" />}
                                            </View>
                                            <View>
                                                <Text style={{ fontSize: fontSize.lg }} className="font-bold text-slate-900">{alert.status === 'resolved' ? 'RESOLVED' : 'EMERGENCY'}</Text>
                                                <Text style={{ fontSize: hScale(10) }} className="text-slate-400 font-medium">{format(new Date(alert.created_at), 'MMM dd, HH:mm a')}</Text>
                                            </View>
                                        </View>
                                    </View>

                                    <View style={{ padding: spacing.lg, borderRadius: hScale(16), marginBottom: vScale(16) }} className="bg-slate-50">
                                        <Text style={{ fontSize: hScale(10), marginBottom: vScale(4) }} className="font-bold text-slate-400 uppercase tracking-wider">User Details</Text>
                                        <Text style={{ fontSize: fontSize.base, marginBottom: vScale(4) }} className="font-bold text-slate-900">{alert.user?.full_name || 'Unknown User'}</Text>
                                        <Text style={{ fontSize: hScale(10) }} className="text-slate-500">Booking ID: <Text className="font-mono text-slate-700">{alert.booking_id || 'N/A'}</Text></Text>
                                    </View>

                                    <View style={{ flexDirection: 'row', gap: spacing.md }}>
                                        <Button
                                            style={{ height: vScale(48), borderRadius: hScale(12) }}
                                            className="flex-1 bg-white border border-slate-200 shadow-sm"
                                            variant="outline"
                                            onPress={() => openMap(alert.lat, alert.lng)}
                                        >
                                            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm }}>
                                                <MapPin size={hScale(16)} color="#475569" />
                                                <Text style={{ fontSize: fontSize.sm }} className="text-slate-700 font-bold">Location</Text>
                                            </View>
                                        </Button>
                                        <Button
                                            style={{ height: vScale(48), borderRadius: hScale(12) }}
                                            className="flex-1 bg-white border border-slate-200 shadow-sm"
                                            variant="outline"
                                            onPress={() => callUser(alert.user?.phone)}
                                        >
                                            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm }}>
                                                <Phone size={hScale(16)} color="#475569" />
                                                <Text style={{ fontSize: fontSize.sm }} className="text-slate-700 font-bold">Call User</Text>
                                            </View>
                                        </Button>
                                    </View>

                                    {alert.status !== 'resolved' && (
                                        <Button
                                            style={{ marginTop: vScale(16), height: vScale(48), borderRadius: hScale(12) }}
                                            className="bg-green-600 shadow-lg shadow-green-200"
                                            onPress={() => resolveMutation.mutate(alert.id)}
                                        >
                                            <Text style={{ fontSize: fontSize.base }} className="text-white font-bold">Mark as Resolved</Text>
                                        </Button>
                                    )}
                                </View>
                            ))}
                        </View>
                    )}
                </ScrollView>
            </SafeAreaView>
        </View>
    );
}
