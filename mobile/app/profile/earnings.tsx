import { View, ScrollView, TouchableOpacity, StatusBar, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { LineChart } from 'react-native-chart-kit';
import { Dimensions } from 'react-native';
import { format, subDays } from 'date-fns';
import { Text } from '@/components/ui/text';
import { useTheme } from '@/contexts/ThemeContext';
import { Card } from '@/components/ui/card';
import { useResponsive } from '@/hooks/useResponsive';
 
const screenWidth = Dimensions.get('window').width;
 
export default function EarningsScreen() {
    const router = useRouter();
    const { user } = useAuth();
    const { theme, isDark, colors } = useTheme();
    const { hScale, vScale, spacing, fontSize, width } = useResponsive();
 
    const { data: driverProfile } = useQuery({
        queryKey: ['driver-profile', user?.id],
        queryFn: async () => {
            if (!user) return null;
            const { data } = await supabase
                .from('drivers')
                .select('*')
                .eq('user_id', user.id)
                .single();
            return data;
        },
        enabled: !!user,
    });
 
    const { data: earnings, isLoading } = useQuery({
        queryKey: ['earnings', driverProfile?.id],
        queryFn: async () => {
            if (!driverProfile) return null;
 
            const startDate = subDays(new Date(), 30);
 
            const { data: trips } = await supabase
                .from('trips')
                .select('*, bookings:bookings(*, payment:payments(*))')
                .eq('driver_id', driverProfile.id)
                .gte('departure_time', startDate.toISOString())
                .order('departure_time', { ascending: false });
 
            if (!trips) return { total: 0, pending: 0, paid: 0, transactions: [], chartData: { labels: [], data: [] } };
 
            let total = 0;
            let pending = 0;
            let paid = 0;
            const transactions: any[] = [];
            const dailyEarnings: Record<string, number> = {};
 
            trips.forEach((trip: any) => {
                trip.bookings?.forEach((booking: any) => {
                    const payment = booking.payment?.[0];
                    if (payment && payment.status === 'completed') {
                        const amount = parseFloat(payment.driver_earnings || 0);
                        total += amount;
 
                        if (payment.payout_status === 'paid') {
                            paid += amount;
                        } else {
                            pending += amount;
                        }
 
                        const date = format(new Date(trip.departure_time), 'MMM dd');
                        dailyEarnings[date] = (dailyEarnings[date] || 0) + amount;
 
                        transactions.push({
                            id: payment.id,
                            date: trip.departure_time,
                            amount: amount,
                            status: payment.payout_status || 'pending',
                            route: `${trip.pickup_location} → ${trip.drop_location}`,
                        });
                    }
                });
            });
 
            const labels = Object.keys(dailyEarnings).slice(-7);
            const data = labels.map(label => dailyEarnings[label] || 0);
 
            return { total, pending, paid, transactions, chartData: { labels, data } };
        },
        enabled: !!driverProfile,
    });
 
    if (!user || user.role === 'passenger') {
        return (
            <SafeAreaView className="flex-1 bg-white dark:bg-slate-950 flex items-center justify-center p-8">
                <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
                <View style={{ padding: spacing.xxl }} className="items-center opacity-40">
                    <View style={{ width: hScale(96), height: hScale(96), marginBottom: vScale(32) }} className="bg-slate-100 dark:bg-slate-900 rounded-full items-center justify-center">
                        <Ionicons name="lock-closed" size={hScale(48)} color={isDark ? "#94a3b8" : "#64748b"} />
                    </View>
                    <Text style={{ fontSize: fontSize.xxl }} className="font-black text-slate-900 dark:text-white uppercase tracking-tighter text-center">Driver Access Only</Text>
                    <Text style={{ fontSize: fontSize.xs, marginTop: vScale(12), lineHeight: vScale(20), maxWidth: hScale(240) }} className="font-medium text-slate-500 dark:text-slate-500 text-center uppercase tracking-widest">
                        This vault is restricted to verified TCSYGO drivers.
                    </Text>
                    <TouchableOpacity 
                        style={{ height: vScale(56), borderRadius: hScale(16), marginTop: vScale(40), paddingHorizontal: spacing.xxl }}
                        className="bg-slate-900 dark:bg-white items-center justify-center" 
                        onPress={() => router.back()}
                    >
                        <Text style={{ fontSize: fontSize.base }} className="text-white dark:text-slate-900 font-black uppercase tracking-widest">Return Safely</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }
 
    if (isLoading) {
        return (
            <SafeAreaView style={{ gap: spacing.lg }} className="flex-1 bg-white dark:bg-slate-950 justify-center items-center">
                <ActivityIndicator size="large" color={isDark ? "#ffffff" : "#3b82f6"} />
                <Text style={{ fontSize: hScale(10) }} className="text-slate-500 dark:text-slate-500 font-black uppercase tracking-widest">Calculating Earnings...</Text>
            </SafeAreaView>
        );
    }
 
    return (
        <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-950" edges={['top']}>
            <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
            
            {/* Header */}
            <View style={{ paddingHorizontal: spacing.xl, paddingVertical: vScale(16), borderBottomWidth: 1 }} className="flex-row items-center justify-between border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-sm z-10">
                <TouchableOpacity 
                    onPress={() => router.back()} 
                    style={{ width: hScale(40), height: hScale(40) }}
                    className="rounded-full bg-slate-50 dark:bg-slate-900 items-center justify-center active:bg-slate-100 dark:active:bg-slate-800"
                >
                    <Ionicons name="arrow-back" size={hScale(24)} color={isDark ? "#f8fafc" : "#1e293b"} />
                </TouchableOpacity>
                <Text style={{ fontSize: fontSize.xl }} className="font-black text-slate-900 dark:text-white uppercase tracking-tighter">Earnings</Text>
                <View style={{ width: hScale(40) }} />
            </View>
 
            <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
                {/* Summary Cards */}
                <View style={{ flexDirection: 'row', paddingHorizontal: spacing.lg, paddingVertical: vScale(24), gap: spacing.md }}>
                    <Card style={{ padding: spacing.xl, borderRadius: hScale(28), borderWidth: 1 }} className="flex-1 bg-white dark:bg-slate-900 items-center shadow-sm border-slate-100/60 dark:border-slate-800">
                        <View style={{ width: hScale(40), height: hScale(40), borderRadius: hScale(16) }} className="bg-green-50 dark:bg-green-900/20 items-center justify-center">
                            <Ionicons name="cash" size={hScale(20)} color="#22c55e" />
                        </View>
                        <Text style={{ fontSize: fontSize.lg, marginTop: vScale(12) }} className="font-black text-slate-900 dark:text-white uppercase tracking-tighter">₹{earnings?.total.toFixed(0)}</Text>
                        <Text style={{ fontSize: hScale(9), marginTop: vScale(4) }} className="text-slate-400 dark:text-slate-500 font-black uppercase tracking-widest">Total</Text>
                    </Card>
                    <Card style={{ padding: spacing.xl, borderRadius: hScale(28), borderWidth: 1 }} className="flex-1 bg-white dark:bg-slate-900 items-center shadow-sm border-slate-100/60 dark:border-slate-800">
                        <View style={{ width: hScale(40), height: hScale(40), borderRadius: hScale(16) }} className="bg-amber-50 dark:bg-amber-900/20 items-center justify-center">
                            <Ionicons name="time" size={hScale(20)} color="#f59e0b" />
                        </View>
                        <Text style={{ fontSize: fontSize.lg, marginTop: vScale(12) }} className="font-black text-slate-900 dark:text-white uppercase tracking-tighter">₹{earnings?.pending.toFixed(0)}</Text>
                        <Text style={{ fontSize: hScale(9), marginTop: vScale(4) }} className="text-slate-400 dark:text-slate-500 font-black uppercase tracking-widest">Pending</Text>
                    </Card>
                    <Card style={{ padding: spacing.xl, borderRadius: hScale(28), borderWidth: 1 }} className="flex-1 bg-white dark:bg-slate-900 items-center shadow-sm border-slate-100/60 dark:border-slate-800">
                        <View style={{ width: hScale(40), height: hScale(40), borderRadius: hScale(16) }} className="bg-blue-50 dark:bg-blue-900/20 items-center justify-center">
                            <Ionicons name="checkmark-circle" size={hScale(20)} color="#3b82f6" />
                        </View>
                        <Text style={{ fontSize: fontSize.lg, marginTop: vScale(12) }} className="font-black text-slate-900 dark:text-white uppercase tracking-tighter">₹{earnings?.paid.toFixed(0)}</Text>
                        <Text style={{ fontSize: hScale(9), marginTop: vScale(4) }} className="text-slate-400 dark:text-slate-500 font-black uppercase tracking-widest">Paid</Text>
                    </Card>
                </View>
 
                {/* Chart */}
                {earnings?.chartData && earnings.chartData.data.length > 0 && (
                    <Card style={{ marginHorizontal: spacing.xl, borderRadius: hScale(32), padding: spacing.xl, marginBottom: vScale(32), borderWidth: 1 }} className="bg-white dark:bg-slate-900 shadow-sm border-slate-100/60 dark:border-slate-800">
                        <Text style={{ fontSize: hScale(10), marginBottom: vScale(24), paddingHorizontal: spacing.xs }} className="font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Performance (7 Days)</Text>
                        <LineChart
                            data={{
                                labels: earnings.chartData.labels,
                                datasets: [{ data: earnings.chartData.data }],
                            }}
                            width={width - (spacing.xl * 2) - (spacing.xl * 2)}
                            height={vScale(220)}
                            chartConfig={{
                                backgroundColor: isDark ? '#0f172a' : '#fff',
                                backgroundGradientFrom: isDark ? '#0f172a' : '#fff',
                                backgroundGradientTo: isDark ? '#0f172a' : '#fff',
                                decimalPlaces: 0,
                                color: (opacity = 1) => isDark ? `rgba(255, 255, 255, ${opacity})` : `rgba(59, 130, 246, ${opacity})`,
                                labelColor: (opacity = 1) => isDark ? `rgba(148, 163, 184, ${opacity})` : `rgba(107, 114, 128, ${opacity})`,
                                style: { borderRadius: hScale(16) },
                                propsForDots: {
                                    r: hScale(6).toString(),
                                    strokeWidth: hScale(4).toString(),
                                    stroke: isDark ? '#0f172a' : '#fff',
                                },
                            }}
                            bezier
                            style={{ marginVertical: vScale(8), borderRadius: hScale(16) }}
                        />
                    </Card>
                )}
 
                {/* Transactions */}
                <View style={{ paddingHorizontal: spacing.xl, paddingBottom: vScale(100) }}>
                    <Text style={{ fontSize: hScale(10), marginBottom: vScale(24), paddingHorizontal: spacing.xs }} className="font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Recent Activity</Text>
                    {earnings?.transactions && earnings.transactions.length > 0 ? (
                        earnings.transactions.map((transaction: any) => (
                            <View key={transaction.id} style={{ padding: spacing.xl, borderRadius: hScale(28), marginBottom: vScale(16), borderWidth: 1 }} className="flex-row justify-between bg-white dark:bg-slate-900 shadow-sm border-slate-100/60 dark:border-slate-800">
                                <View style={{ flex: 1, paddingRight: spacing.lg }}>
                                    <Text style={{ fontSize: fontSize.sm, marginBottom: vScale(4), lineHeight: vScale(20) }} className="font-bold text-slate-800 dark:text-slate-200 tracking-tight" numberOfLines={1}>{transaction.route}</Text>
                                    <Text style={{ fontSize: hScale(10) }} className="font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                                        {format(new Date(transaction.date), 'MMM dd, yyyy')}
                                    </Text>
                                </View>
                                <View className="items-end">
                                    <Text style={{ fontSize: fontSize.lg }} className="font-black text-green-600 dark:text-green-500 uppercase tracking-tighter">+₹{transaction.amount.toFixed(0)}</Text>
                                    <View style={{ paddingHorizontal: spacing.sm, paddingVertical: vScale(2), borderRadius: hScale(6), marginTop: vScale(4) }} className={`${transaction.status === 'paid' ? 'bg-green-100 dark:bg-green-900/30' : 'bg-amber-100 dark:bg-amber-900/30'}`}>
                                        <Text style={{ fontSize: hScale(8) }} className={`font-black uppercase tracking-widest ${transaction.status === 'paid' ? 'text-green-700 dark:text-green-400' : 'text-amber-700 dark:text-amber-400'}`}>
                                            {transaction.status}
                                        </Text>
                                    </View>
                                </View>
                            </View>
                        ))
                    ) : (
                        <View style={{ paddingVertical: vScale(64) }} className="items-center opacity-30">
                            <Ionicons name="receipt-outline" size={hScale(64)} color={isDark ? "#94a3b8" : "#cbd5e1"} />
                            <Text style={{ fontSize: fontSize.xs, marginTop: vScale(16) }} className="text-slate-400 dark:text-slate-600 font-black uppercase tracking-widest">No transaction data</Text>
                        </View>
                    )}
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}
