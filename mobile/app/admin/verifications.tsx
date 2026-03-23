import { useState, useCallback } from 'react';
import { View, ScrollView, RefreshControl, Image, Modal, TouchableOpacity, Alert, StatusBar, LayoutAnimation, Platform, UIManager } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Check, X, FileText, User, ChevronRight, Calendar, CreditCard, Shield, Filter, Clock, AlertTriangle, CheckCircle2 } from 'lucide-react-native';
import { format } from 'date-fns';
import { useResponsive } from '@/hooks/useResponsive';


export default function DriverVerificationsScreen() {
    const router = useRouter();
    const queryClient = useQueryClient();
    const { hScale, vScale, spacing, fontSize: fontSizes } = useResponsive();
    const [refreshing, setRefreshing] = useState(false);
    const [selectedDriver, setSelectedDriver] = useState<any>(null);
    const [filter, setFilter] = useState<'pending' | 'verified' | 'rejected'>('pending');

    const { data: drivers, isLoading, refetch } = useQuery({
        queryKey: ['admin-verifications', filter],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('drivers')
                .select('*, user:users(*)')
                .eq('verification_status', filter)
                .order('created_at', { ascending: false });

            if (error) throw error;
            return data || [];
        }
    });

    const verifyMutation = useMutation({
        mutationFn: async ({ id, status }: { id: string; status: 'verified' | 'rejected' }) => {
            const { error } = await supabase
                .from('drivers')
                .update({ verification_status: status })
                .eq('id', id);

            if (error) throw error;
        },
        onSuccess: () => {
            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
            Alert.alert("Success", "Driver status updated");
            setSelectedDriver(null);
            queryClient.invalidateQueries({ queryKey: ['admin-verifications'] });
        },
        onError: (e) => Alert.alert("Error", e.message)
    });

    const onRefresh = async () => {
        setRefreshing(true);
        await refetch();
        setRefreshing(false);
    };

    const handleFilterChange = (newFilter: 'pending' | 'verified' | 'rejected') => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setFilter(newFilter);
    };

    const FilterChip = ({ status, label, icon: Icon, activeColor, activeBg }: any) => (
        <TouchableOpacity
            onPress={() => handleFilterChange(status)}
            style={{ paddingHorizontal: hScale(16), paddingVertical: vScale(10), borderRadius: hScale(24), borderWidth: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}
            className={`${filter === status ? `${activeBg} ${activeColor} border-transparent` : 'bg-white border-slate-200'}`}
        >
            <Icon size={hScale(14)} color={filter === status ? 'currentColor' : '#64748b'} />
            <Text style={{ fontSize: hScale(12) }} className={`font-bold ${filter === status ? 'text-current' : 'text-slate-500'}`}>{label}</Text>
        </TouchableOpacity>
    );

    return (
        <View className="flex-1 bg-slate-50">
            <StatusBar barStyle="light-content" />

            {/* Premium Gradient Header */}
            <View style={{ paddingBottom: vScale(24), paddingTop: vScale(8) }} className="bg-slate-900 overflow-hidden relative">
                <LinearGradient
                    colors={['#0f172a', '#1e293b']}
                    style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }}
                />

                {/* Abstract Shapes */}
                <View style={{ position: 'absolute', top: -vScale(40), right: -hScale(40), width: hScale(256), height: hScale(256), borderRadius: hScale(128), opacity: 0.3 }} className="bg-slate-800 blur-3xl" />
                <View style={{ position: 'absolute', top: vScale(80), left: -hScale(40), width: hScale(128), height: hScale(128), borderRadius: hScale(64), opacity: 0.2 }} className="bg-blue-900 blur-2xl" />

                <SafeAreaView edges={['top']} style={{ paddingHorizontal: spacing.xl }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.lg, marginBottom: vScale(24) }}>
                        <TouchableOpacity
                            onPress={() => router.back()}
                            style={{ width: hScale(40), height: hScale(40), borderRadius: hScale(20) }}
                            className="bg-white/10 items-center justify-center backdrop-blur-md active:bg-white/20"
                        >
                            <ArrowLeft size={hScale(20)} color="white" />
                        </TouchableOpacity>
                        <View>
                            <Text style={{ fontSize: hScale(12) }} className="text-blue-200 font-bold uppercase tracking-widest">Admin Portal</Text>
                            <Text style={{ fontSize: hScale(24) }} className="font-black text-white">Verifications</Text>
                        </View>
                    </View>

                    {/* Filter ScrollView */}
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={{ gap: 8 }}
                        className="py-1"
                    >
                        <FilterChip
                            status="pending"
                            label="Pending Review"
                            icon={Clock}
                            activeColor="text-amber-700"
                            activeBg="bg-amber-100"
                        />
                        <FilterChip
                            status="verified"
                            label="Verified"
                            icon={CheckCircle2}
                            activeColor="text-green-700"
                            activeBg="bg-green-100"
                        />
                        <FilterChip
                            status="rejected"
                            label="Rejected"
                            icon={AlertTriangle}
                            activeColor="text-red-700"
                            activeBg="bg-red-100"
                        />
                    </ScrollView>
                </SafeAreaView>
            </View>

            <ScrollView
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#1e293b" />}
                style={{ flex: 1, paddingHorizontal: spacing.xl, paddingTop: vScale(24) }}
                contentContainerStyle={{ paddingBottom: vScale(100) }}
                showsVerticalScrollIndicator={false}
            >
                {isLoading ? (
                    <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: vScale(80) }} className="items-center justify-center">
                        <User size={hScale(40)} color="#cbd5e1" className="animate-pulse mb-4" />
                        <Text style={{ fontSize: hScale(14) }} className="text-slate-400 font-medium">Loading requests...</Text>
                    </View>
                ) : drivers?.length === 0 ? (
                    <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: vScale(80), opacity: 0.7 }}>
                        <View style={{ width: hScale(96), height: hScale(96), borderRadius: hScale(48), marginBottom: vScale(24), borderWidth: 1 }} className="bg-slate-100 items-center justify-center border-slate-200">
                            {filter === 'pending' ? <CheckCircle2 size={hScale(48)} color="#94a3b8" /> : <Filter size={hScale(48)} color="#94a3b8" />}
                        </View>
                        <Text style={{ fontSize: hScale(20), marginBottom: vScale(8) }} className="font-bold text-slate-900">No {filter} drivers</Text>
                        <Text style={{ fontSize: hScale(14), textAlign: 'center', maxWidth: hScale(250) }} className="text-slate-500">
                            There are no drivers with {filter} status at the moment.
                        </Text>
                    </View>
                ) : (
                    <View style={{ gap: spacing.lg }}>
                        {drivers?.map((driver) => (
                            <TouchableOpacity
                                key={driver.id}
                                activeOpacity={0.9}
                                onPress={() => setSelectedDriver(driver)}
                                style={{ padding: spacing.xl, borderRadius: hScale(24), borderWidth: 1 }}
                                className="bg-white shadow-sm border-slate-100 relative overflow-hidden group"
                            >
                                <View style={{ flexDirection: 'row', gap: spacing.lg, position: 'relative', zIndex: 10 }}>
                                    <View style={{ width: hScale(64), height: hScale(64), borderRadius: hScale(16), borderWidth: 1 }} className="bg-slate-100 items-center justify-center overflow-hidden border-slate-200 shadow-inner">
                                        {driver.user.profile_photo ? (
                                            <Image source={{ uri: driver.user.profile_photo }} style={{ width: '100%', height: '100%' }} />
                                        ) : (
                                            <User size={hScale(28)} color="#94a3b8" />
                                        )}
                                    </View>
                                    <View style={{ flex: 1, justifyContent: 'center' }}>
                                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                            <Text style={{ fontSize: hScale(18), lineHeight: vScale(24), marginBottom: vScale(4), paddingRight: hScale(8) }} className="font-bold text-slate-900">
                                                {driver.user.full_name}
                                            </Text>
                                            {driver.created_at && (
                                                <Text style={{ fontSize: hScale(10), paddingHorizontal: hScale(8), paddingVertical: vScale(4), borderRadius: hScale(12), borderWidth: 1 }} className="text-slate-400 font-medium bg-slate-50 border-slate-100">
                                                    {format(new Date(driver.created_at), 'MMM d')}
                                                </Text>
                                            )}
                                        </View>
                                        <Text style={{ fontSize: hScale(12), marginBottom: vScale(12) }} className="text-slate-500 font-medium">{driver.user.email}</Text>

                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                                            <View style={{ paddingHorizontal: hScale(8), paddingVertical: vScale(4), borderRadius: hScale(8), borderWidth: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.xs }} className="bg-slate-50 border-slate-100">
                                                <Shield size={hScale(10)} color="#64748b" />
                                                <Text style={{ fontSize: hScale(10) }} className="text-slate-600 font-bold">{driver.vehicle_model}</Text>
                                            </View>
                                            <View style={{ paddingHorizontal: hScale(8), paddingVertical: vScale(4), borderRadius: hScale(8), borderWidth: 1 }} className="bg-slate-50 border-slate-100">
                                                <Text style={{ fontSize: hScale(10) }} className="text-slate-500 font-mono">{driver.vehicle_plate}</Text>
                                            </View>
                                        </View>
                                    </View>
                                    <View className="justify-center">
                                        <ChevronRight size={hScale(20)} color="#cbd5e1" />
                                    </View>
                                </View>
                            </TouchableOpacity>
                        ))}
                    </View>
                )}
            </ScrollView>

            {/* Enhanced Detail Modal */}
            <Modal
                visible={!!selectedDriver}
                animationType="slide"
                presentationStyle="pageSheet"
                onRequestClose={() => setSelectedDriver(null)}
            >
                <View className="flex-1 bg-slate-50">
                    <StatusBar barStyle="dark-content" />

                    {/* Modal Header */}
                    <View style={{ paddingHorizontal: spacing.xl, paddingVertical: vScale(20), borderBottomWidth: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }} className="bg-white border-gray-100 shadow-sm z-10">
                        <View>
                            <Text style={{ fontSize: hScale(12), marginBottom: vScale(2) }} className="font-bold text-blue-600 uppercase tracking-widest">Application Review</Text>
                            <Text style={{ fontSize: hScale(21) }} className="font-black text-slate-900">Driver Details</Text>
                        </View>
                        <TouchableOpacity
                            onPress={() => setSelectedDriver(null)}
                            style={{ width: hScale(36), height: hScale(36), borderRadius: hScale(18) }}
                            className="bg-slate-100 items-center justify-center"
                        >
                            <X size={hScale(20)} color="#64748b" />
                        </TouchableOpacity>
                    </View>

                    {selectedDriver && (
                        <View className="flex-1 relative">
                            <ScrollView
                                className="flex-1"
                                contentContainerStyle={{ padding: spacing.xl, paddingBottom: vScale(120) }}
                                showsVerticalScrollIndicator={false}
                            >
                                {/* Driver Profile Header */}
                                <View style={{ alignItems: 'center', marginBottom: vScale(32) }}>
                                    <View style={{ padding: hScale(6), borderRadius: hScale(32), borderWidth: 1 }} className="bg-white shadow-sm border-slate-100 mb-4">
                                        <View style={{ width: hScale(112), height: hScale(112), borderRadius: hScale(28) }} className="bg-slate-100 overflow-hidden items-center justify-center">
                                            {selectedDriver.user.profile_photo ? (
                                                <Image source={{ uri: selectedDriver.user.profile_photo }} style={{ width: '100%', height: '100%' }} />
                                            ) : (
                                                <User size={hScale(48)} color="#94a3b8" />
                                            )}
                                        </View>
                                    </View>
                                    <Text style={{ fontSize: hScale(24), marginBottom: vScale(4), textAlign: 'center' }} className="font-black text-slate-900">{selectedDriver.user.full_name}</Text>
                                    <Text style={{ fontSize: hScale(16), marginBottom: vScale(4), textAlign: 'center' }} className="text-slate-500 font-medium">{selectedDriver.user.email}</Text>
                                    <Text style={{ fontSize: hScale(12), paddingHorizontal: hScale(12), paddingVertical: vScale(4), borderRadius: hScale(16), marginTop: vScale(8) }} className="text-slate-400 font-medium bg-slate-100">
                                        Applying since {format(new Date(selectedDriver.created_at), 'MMMM d, yyyy')}
                                    </Text>
                                </View>

                                <View style={{ gap: spacing.lg }}>
                                    {/* Vehicle Info Card */}
                                    <View style={{ padding: spacing.xl, borderRadius: hScale(24), borderWidth: 1 }} className="bg-white shadow-sm border-slate-100">
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: vScale(20) }}>
                                            <View style={{ width: hScale(40), height: hScale(40), borderRadius: hScale(12), borderWidth: 1 }} className="bg-blue-50 items-center justify-center border-blue-100">
                                                <Shield size={hScale(20)} color="#2563eb" />
                                            </View>
                                            <Text style={{ fontSize: hScale(18) }} className="font-bold text-slate-900">Vehicle Information</Text>
                                        </View>

                                        <View style={{ gap: spacing.md }}>
                                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: vScale(8), borderBottomWidth: 1 }} className="border-slate-50">
                                                <Text style={{ fontSize: hScale(14) }} className="text-slate-500 font-medium">Model</Text>
                                                <Text style={{ fontSize: hScale(14), textAlign: 'right' }} className="text-slate-900 font-bold">{selectedDriver.vehicle_year} {selectedDriver.vehicle_make} {selectedDriver.vehicle_model}</Text>
                                            </View>
                                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: vScale(8), borderBottomWidth: 1 }} className="border-slate-50">
                                                <Text style={{ fontSize: hScale(14) }} className="text-slate-500 font-medium">Color</Text>
                                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                                                    <View className="w-3 h-3 rounded-full border border-slate-200 bg-gray-200" style={{ width: hScale(12), height: hScale(12), borderRadius: hScale(6), backgroundColor: selectedDriver.vehicle_color?.toLowerCase() ?? 'transparent' }} />
                                                    <Text style={{ fontSize: hScale(14) }} className="text-slate-900 font-bold capitalize">{selectedDriver.vehicle_color ?? '—'}</Text>
                                                </View>
                                            </View>
                                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: vScale(8) }}>
                                                <Text style={{ fontSize: hScale(14) }} className="text-slate-500 font-medium">Plate Number</Text>
                                                <View style={{ paddingHorizontal: hScale(12), paddingVertical: vScale(6), borderRadius: hScale(8), borderWidth: 1 }} className="bg-slate-100 border-slate-200">
                                                    <Text style={{ fontSize: hScale(14) }} className="text-slate-800 font-mono font-bold tracking-wider">{selectedDriver.vehicle_plate}</Text>
                                                </View>
                                            </View>
                                        </View>

                                        {selectedDriver.vehicle_photos && selectedDriver.vehicle_photos.length > 0 && (
                                            <View style={{ marginTop: vScale(20) }}>
                                                <Text style={{ fontSize: hScale(12), marginBottom: vScale(12) }} className="font-bold text-slate-400 uppercase tracking-wider">Vehicle Photos</Text>
                                                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -spacing.xl, paddingHorizontal: spacing.xl }}>
                                                    <View style={{ flexDirection: 'row', gap: spacing.md }}>
                                                      {selectedDriver.vehicle_photos.map((photo: string, i: number) => (
                                                          <Image key={i} source={{ uri: photo }} style={{ width: hScale(224), height: vScale(144), borderRadius: hScale(16), borderWidth: 1 }} className="bg-slate-100 border-slate-200" />
                                                      ))}
                                                    </View>
                                                </ScrollView>
                                            </View>
                                        )}
                                    </View>

                                    {/* Documents Card */}
                                    <View style={{ padding: spacing.xl, borderRadius: hScale(24), borderWidth: 1 }} className="bg-white shadow-sm border-slate-100">
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: vScale(20) }}>
                                            <View style={{ width: hScale(40), height: hScale(40), borderRadius: hScale(12), borderWidth: 1 }} className="bg-violet-50 items-center justify-center border-violet-100">
                                                <FileText size={hScale(20)} color="#7c3aed" />
                                            </View>
                                            <Text style={{ fontSize: hScale(18) }} className="font-bold text-slate-900">Documents</Text>
                                        </View>

                                        <View style={{ marginBottom: vScale(24) }}>
                                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: vScale(12) }}>
                                                <Text style={{ fontSize: hScale(12) }} className="font-bold text-slate-400 uppercase tracking-wider">License Number</Text>
                                                <Text style={{ fontSize: hScale(14) }} className="font-bold text-slate-900">{selectedDriver.license_number}</Text>
                                            </View>

                                            {selectedDriver.license_photo && (
                                                <Image source={{ uri: selectedDriver.license_photo }} style={{ width: '100%', height: vScale(224), borderRadius: hScale(16), borderWidth: 1 }} className="bg-slate-100 border-slate-200" resizeMode="cover" />
                                            )}
                                        </View>
                                    </View>
                                </View>
                            </ScrollView>

                            {/* Sticky Action Footer */}
                            <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: spacing.xl, borderTopWidth: 1 }} className="bg-white border-slate-100 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
                                {filter === 'pending' ? (
                                    <View style={{ flexDirection: 'row', gap: spacing.lg }}>
                                        <Button
                                            style={{ flex: 1, height: vScale(56), borderRadius: hScale(16), borderWidth: 2 }}
                                            className="bg-red-50 border-red-50 active:bg-red-100"
                                            variant="outline"
                                            onPress={() => verifyMutation.mutate({ id: selectedDriver.id, status: 'rejected' })}
                                            disabled={verifyMutation.isPending}
                                        >
                                            <Text style={{ fontSize: hScale(16) }} className="text-red-600 font-bold">Reject</Text>
                                        </Button>
                                        <Button
                                            style={{ flex: 2, height: vScale(56), borderRadius: hScale(16) }}
                                            className="bg-slate-900 shadow-lg shadow-slate-300 active:bg-slate-800"
                                            onPress={() => verifyMutation.mutate({ id: selectedDriver.id, status: 'verified' })}
                                            disabled={verifyMutation.isPending}
                                        >
                                            <Text style={{ fontSize: hScale(18) }} className="text-white font-bold">Approve Driver</Text>
                                        </Button>
                                    </View>
                                ) : (
                                    <Button
                                        style={{ width: '100%', height: vScale(56), borderRadius: hScale(16), borderWidth: 1 }}
                                        className="bg-slate-100 border-slate-200"
                                        onPress={() => setSelectedDriver(null)}
                                    >
                                        <Text style={{ fontSize: hScale(18) }} className="text-slate-600 font-bold">Close Details</Text>
                                    </Button>
                                )}
                            </View>
                        </View>
                    )}
                </View>
            </Modal>
        </View>
    );
}
