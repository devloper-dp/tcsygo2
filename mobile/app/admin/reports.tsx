import React from 'react';
import { View, ScrollView, StatusBar, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card, CardContent } from '@/components/ui/card';
import { Text } from '@/components/ui/text';
import { ArrowLeft, TrendingUp, Users, Activity, BarChart3, PieChart } from 'lucide-react-native';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useResponsive } from '@/hooks/useResponsive';

export default function AdminReportsScreen() {
    const router = useRouter();
    const { hScale, vScale, spacing, fontSize: fontSizes } = useResponsive();

    const { data: stats } = useQuery({
        queryKey: ['admin-reports-stats'],
        queryFn: async () => {
            const { count: totalBookings } = await supabase.from('bookings').select('*', { count: 'exact', head: true });
            const { count: completedTrips } = await supabase.from('trips').select('*', { count: 'exact', head: true }).eq('status', 'completed');

            // Fetch revenue (payments)
            const { data: payments } = await supabase
                .from('payments')
                .select('amount, created_at')
                .eq('status', 'success')
                .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()); // Last 7 days

            // Process Chart Data
            const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
            const chartDataMap = new Map();
            const today = new Date();

            // Initialize last 7 days
            for (let i = 6; i >= 0; i--) {
                const d = new Date(today);
                d.setDate(d.getDate() - i);
                const dayName = days[d.getDay()];
                const dateKey = d.toISOString().split('T')[0];
                chartDataMap.set(dateKey, { day: dayName.charAt(0), amount: 0, fullDate: dateKey });
            }

            // Fill with payment data
            payments?.forEach(p => {
                const dateKey = new Date(p.created_at).toISOString().split('T')[0];
                if (chartDataMap.has(dateKey)) {
                    const current = chartDataMap.get(dateKey);
                    current.amount += parseFloat(p.amount);
                }
            });

            const chartData = Array.from(chartDataMap.values());
            const maxAmount = Math.max(...chartData.map(d => d.amount), 100); // Avoid division by zero

            return {
                totalBookings: totalBookings || 0,
                completedTrips: completedTrips || 0,
                growth: '+12.5%', // Placeholder for complex growth calculation
                chartData,
                maxAmount
            };
        }
    });

    const StatCard = ({ title, value, icon: Icon, color, trend }: any) => {
        const { hScale, vScale, spacing, fontSize: fontSizes } = useResponsive();
        return (
        <View style={{ padding: spacing.xl, borderRadius: hScale(24), minWidth: '45%', borderWidth: 1 }} className="flex-1 bg-white shadow-sm border-slate-100">
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: vScale(12) }}>
                <View style={{ padding: hScale(10), borderRadius: hScale(16) }} className={`${color} bg-opacity-10`}>
                    <Icon size={hScale(20)} color={color.replace('bg-', 'text-').replace('text-', '')} />
                </View>
                {trend && (
                    <View style={{ paddingHorizontal: hScale(8), paddingVertical: vScale(4), borderRadius: hScale(12), borderWidth: 1 }} className="bg-green-50 border-green-100">
                        <Text style={{ fontSize: hScale(10) }} className="font-bold text-green-700">{trend}</Text>
                    </View>
                )}
            </View>
            <Text style={{ fontSize: hScale(24), marginBottom: vScale(4) }} className="font-bold text-slate-900">{value}</Text>
            <Text style={{ fontSize: hScale(10) }} className="font-medium text-slate-500 uppercase tracking-wide">{title}</Text>
        </View>
        );
    };

    return (
        <View className="flex-1 bg-slate-50">
            <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
            <SafeAreaView className="flex-1" edges={['top']}>
                {/* Header */}
                <View style={{ paddingHorizontal: spacing.xl, paddingVertical: vScale(16), gap: spacing.lg, borderBottomWidth: 1 }} className="bg-white border-gray-50 flex-row items-center shadow-sm z-10">
                    <TouchableOpacity
                        onPress={() => router.back()}
                        style={{ width: hScale(40), height: hScale(40), borderRadius: hScale(20) }}
                        className="bg-slate-50 items-center justify-center active:bg-slate-100"
                    >
                        <ArrowLeft size={hScale(20)} color="#1e293b" />
                    </TouchableOpacity>
                    <View>
                        <Text style={{ fontSize: hScale(10) }} className="text-slate-500 font-bold uppercase tracking-wider">Analytics</Text>
                        <Text style={{ fontSize: hScale(21) }} className="font-bold text-slate-900">Financial Reports</Text>
                    </View>
                </View>

                <ScrollView className="flex-1" contentContainerStyle={{ padding: spacing.xl }} showsVerticalScrollIndicator={false}>
                    <Text style={{ fontSize: hScale(18), marginBottom: vScale(16) }} className="font-bold text-slate-900">Overview</Text>
 
                    <View style={{ marginBottom: vScale(16) }} className="flex-row">
                        <View style={{ padding: spacing.xl, borderRadius: hScale(24) }} className="flex-1 bg-violet-600 shadow-lg shadow-violet-200">
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: vScale(24) }}>
                                <View style={{ padding: hScale(8), borderRadius: hScale(12) }} className="bg-white/20">
                                    <BarChart3 size={hScale(24)} color="white" />
                                </View>
                                <View style={{ paddingHorizontal: hScale(10), paddingVertical: vScale(4), borderRadius: hScale(8) }} className="bg-white/20">
                                    <Text style={{ fontSize: hScale(12) }} className="text-white font-bold">+18%</Text>
                                </View>
                            </View>
                            <Text style={{ fontSize: hScale(14), marginBottom: vScale(4) }} className="text-violet-100 font-medium">Total Revenue</Text>
                            <Text style={{ fontSize: hScale(32) }} className="font-extrabold text-white">₹45,231</Text>
                        </View>
                    </View>

                    <View style={{ flexDirection: 'row', gap: spacing.lg, marginBottom: vScale(24) }}>
                        <StatCard
                            title="Total Bookings"
                            value={stats?.totalBookings || '0'}
                            icon={TrendingUp}
                            color="#8b5cf6" // Violet
                            trend="+5.2%"
                        />
                        <StatCard
                            title="Completed Trips"
                            value={stats?.completedTrips || '0'}
                            icon={Activity}
                            color="#f97316" // Orange
                            trend="+2.1%"
                        />
                    </View>

                    <Text style={{ fontSize: hScale(18), marginBottom: vScale(16) }} className="font-bold text-slate-900">Revenue Analysis</Text>
                    <View style={{ padding: spacing.xl, borderRadius: hScale(24), marginBottom: vScale(24), borderWidth: 1 }} className="bg-white shadow-sm border-slate-100">
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: vScale(24) }}>
                            <View>
                                <Text style={{ fontSize: hScale(18) }} className="text-slate-900 font-bold">Weekly Growth</Text>
                                <Text style={{ fontSize: hScale(12) }} className="text-slate-400 font-medium">Last 7 Days</Text>
                            </View>
                            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
                                    <View style={{ width: hScale(8), height: hScale(8), borderRadius: hScale(4) }} className="bg-violet-500" />
                                    <Text style={{ fontSize: hScale(10) }} className="text-slate-500 font-bold">Revenue</Text>
                                </View>
                            </View>
                        </View>

                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', height: vScale(160), paddingBottom: vScale(8), borderBottomWidth: 1 }} className="border-slate-50">
                            {stats?.chartData?.map((item: any, i: number) => (
                                <View key={i} style={{ gap: spacing.sm }} className="items-center flex-1 relative">
                                    {/* Tooltip-like value on top if needed, or just visual */}
                                    {/* Bar */}
                                    <View style={{ width: hScale(8) }} className="bg-slate-100 h-full rounded-full absolute bottom-0" />
                                    <View
                                        style={{ height: `${(item.amount / (stats.maxAmount || 1)) * 100}%`, width: hScale(8) }}
                                        className="bg-violet-500 rounded-full absolute bottom-0 shadow-sm shadow-violet-200"
                                    />
                                </View>
                            ))}
                        </View>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: vScale(12), paddingHorizontal: hScale(4) }}>
                            {stats?.chartData?.map((item: any, i: number) => (
                                <Text key={i} style={{ fontSize: hScale(11), width: hScale(16) }} className="text-slate-400 font-bold text-center">{item.day}</Text>
                            ))}
                        </View>
                    </View>
                </ScrollView>
            </SafeAreaView>
        </View>
    );
}
