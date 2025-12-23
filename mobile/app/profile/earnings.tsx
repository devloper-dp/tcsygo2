import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { LineChart } from 'react-native-chart-kit';
import { Dimensions } from 'react-native';
import { format, subDays } from 'date-fns';

const screenWidth = Dimensions.get('window').width;

export default function EarningsScreen() {
    const router = useRouter();
    const { user } = useAuth();

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

    const { data: earnings } = useQuery({
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

            if (!trips) return { total: 0, pending: 0, paid: 0, transactions: [], chartData: [] };

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
            <SafeAreaView style={styles.container}>
                <View style={styles.errorContainer}>
                    <Ionicons name="lock-closed-outline" size={64} color="#9ca3af" />
                    <Text style={styles.errorTitle}>Driver Access Only</Text>
                    <Text style={styles.errorText}>This page is only available for drivers.</Text>
                    <TouchableOpacity style={styles.button} onPress={() => router.back()}>
                        <Text style={styles.buttonText}>Go Back</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={24} color="#1f2937" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Earnings</Text>
                <View style={{ width: 24 }} />
            </View>

            <ScrollView style={styles.content}>
                {/* Summary Cards */}
                <View style={styles.summaryContainer}>
                    <View style={styles.summaryCard}>
                        <Ionicons name="cash-outline" size={24} color="#22c55e" />
                        <Text style={styles.summaryValue}>₹{earnings?.total.toFixed(2) || '0.00'}</Text>
                        <Text style={styles.summaryLabel}>Total Earnings</Text>
                    </View>
                    <View style={styles.summaryCard}>
                        <Ionicons name="time-outline" size={24} color="#f59e0b" />
                        <Text style={styles.summaryValue}>₹{earnings?.pending.toFixed(2) || '0.00'}</Text>
                        <Text style={styles.summaryLabel}>Pending</Text>
                    </View>
                    <View style={styles.summaryCard}>
                        <Ionicons name="checkmark-circle-outline" size={24} color="#3b82f6" />
                        <Text style={styles.summaryValue}>₹{earnings?.paid.toFixed(2) || '0.00'}</Text>
                        <Text style={styles.summaryLabel}>Paid Out</Text>
                    </View>
                </View>

                {/* Chart */}
                {earnings?.chartData && earnings.chartData.data.length > 0 && (
                    <View style={styles.chartContainer}>
                        <Text style={styles.sectionTitle}>Last 7 Days</Text>
                        <LineChart
                            data={{
                                labels: earnings.chartData.labels,
                                datasets: [{ data: earnings.chartData.data }],
                            }}
                            width={screenWidth - 48}
                            height={220}
                            chartConfig={{
                                backgroundColor: '#fff',
                                backgroundGradientFrom: '#fff',
                                backgroundGradientTo: '#fff',
                                decimalPlaces: 0,
                                color: (opacity = 1) => `rgba(59, 130, 246, ${opacity})`,
                                labelColor: (opacity = 1) => `rgba(107, 114, 128, ${opacity})`,
                                style: { borderRadius: 16 },
                                propsForDots: {
                                    r: '6',
                                    strokeWidth: '2',
                                    stroke: '#3b82f6',
                                },
                            }}
                            bezier
                            style={styles.chart}
                        />
                    </View>
                )}

                {/* Transactions */}
                <View style={styles.transactionsContainer}>
                    <Text style={styles.sectionTitle}>Recent Transactions</Text>
                    {earnings?.transactions && earnings.transactions.length > 0 ? (
                        earnings.transactions.map((transaction: any) => (
                            <View key={transaction.id} style={styles.transactionCard}>
                                <View style={styles.transactionInfo}>
                                    <Text style={styles.transactionRoute}>{transaction.route}</Text>
                                    <Text style={styles.transactionDate}>
                                        {format(new Date(transaction.date), 'MMM dd, yyyy')}
                                    </Text>
                                </View>
                                <View style={styles.transactionAmount}>
                                    <Text style={styles.amountText}>+₹{transaction.amount.toFixed(2)}</Text>
                                    <Text style={[
                                        styles.statusText,
                                        transaction.status === 'paid' ? styles.statusPaid : styles.statusPending
                                    ]}>
                                        {transaction.status}
                                    </Text>
                                </View>
                            </View>
                        ))
                    ) : (
                        <View style={styles.emptyState}>
                            <Ionicons name="receipt-outline" size={48} color="#9ca3af" />
                            <Text style={styles.emptyText}>No transactions yet</Text>
                        </View>
                    )}
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f9fafb',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        backgroundColor: 'white',
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1f2937',
    },
    content: {
        flex: 1,
    },
    summaryContainer: {
        flexDirection: 'row',
        padding: 16,
        gap: 12,
    },
    summaryCard: {
        flex: 1,
        backgroundColor: 'white',
        borderRadius: 12,
        padding: 16,
        alignItems: 'center',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    summaryValue: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1f2937',
        marginTop: 8,
    },
    summaryLabel: {
        fontSize: 11,
        color: '#6b7280',
        marginTop: 4,
        textAlign: 'center',
    },
    chartContainer: {
        backgroundColor: 'white',
        margin: 16,
        marginTop: 8,
        borderRadius: 12,
        padding: 16,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1f2937',
        marginBottom: 12,
    },
    chart: {
        marginVertical: 8,
        borderRadius: 16,
    },
    transactionsContainer: {
        padding: 16,
        paddingTop: 8,
    },
    transactionCard: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        backgroundColor: 'white',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        elevation: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 1,
    },
    transactionInfo: {
        flex: 1,
    },
    transactionRoute: {
        fontSize: 14,
        fontWeight: '600',
        color: '#1f2937',
        marginBottom: 4,
    },
    transactionDate: {
        fontSize: 12,
        color: '#6b7280',
    },
    transactionAmount: {
        alignItems: 'flex-end',
    },
    amountText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#22c55e',
        marginBottom: 4,
    },
    statusText: {
        fontSize: 11,
        fontWeight: '600',
        textTransform: 'capitalize',
    },
    statusPaid: {
        color: '#22c55e',
    },
    statusPending: {
        color: '#f59e0b',
    },
    emptyState: {
        alignItems: 'center',
        paddingVertical: 40,
    },
    emptyText: {
        fontSize: 14,
        color: '#9ca3af',
        marginTop: 12,
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    errorTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#1f2937',
        marginTop: 16,
    },
    errorText: {
        fontSize: 14,
        color: '#6b7280',
        marginTop: 8,
        textAlign: 'center',
    },
    button: {
        backgroundColor: '#3b82f6',
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 8,
        marginTop: 24,
    },
    buttonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600',
    },
});
