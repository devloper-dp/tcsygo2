import { useState } from 'react';
import {
    View,
    ScrollView,
    RefreshControl,
    TouchableOpacity,
    StatusBar,
    Text as RNText,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Text } from '@/components/ui/text';
import { useResponsive } from '@/hooks/useResponsive';
import {
    Users,
    Car,
    MapPin,
    DollarSign,
    Shield,
    ChevronRight,
    BarChart3,
    AlertTriangle,
    Ticket,
    Headphones,
    LogOut,
    FileText,
} from 'lucide-react-native';
import { NotificationDropdown } from '@/components/NotificationDropdown';
import { useAuth } from '@/contexts/AuthContext';

// ─── Stat Card ────────────────────────────────────────────────────────────────

type StatCardProps = {
    title: string;
    value: string | number;
    icon: any;
    color: string;
    bgColor: string;
    emptyLabel?: string;
};

const StatCard = ({ title, value, icon: Icon, color, bgColor, emptyLabel }: StatCardProps) => {
    const { hScale, vScale, spacing, fontSize: fontSizes } = useResponsive();
    const isEmpty = value === 0 || value === '₹0' || value === '0';
    return (
        <View
            style={{
                width: '48%',
                borderRadius: hScale(20),
                marginBottom: vScale(14),
                padding: spacing.xl,
                overflow: 'hidden',
                borderWidth: 1,
                borderColor: 'rgba(0,0,0,0.05)'
            }}
            className={bgColor}
        >
            {/* Icon Row */}
            <View
                style={{
                    width: hScale(46),
                    height: hScale(46),
                    borderRadius: hScale(14),
                    backgroundColor: 'rgba(255,255,255,0.75)',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: vScale(12),
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: vScale(2) },
                    shadowOpacity: 0.06,
                    shadowRadius: hScale(4),
                    elevation: 2,
                }}
            >
                <Icon size={hScale(24)} color={color} strokeWidth={2.2} />
            </View>

            {/* Value */}
            <RNText
                style={{
                    fontSize: hScale(26),
                    fontWeight: '800',
                    color: '#0f172a',
                    marginBottom: vScale(2),
                    letterSpacing: -0.5,
                }}
                numberOfLines={1}
                adjustsFontSizeToFit
            >
                {value}
            </RNText>

            {/* Title */}
            <RNText
                style={{
                    fontSize: hScale(11),
                    fontWeight: '700',
                    color: '#64748b',
                    textTransform: 'uppercase',
                    letterSpacing: 0.6,
                }}
            >
                {title}
            </RNText>

            {/* Empty state hint */}
            {isEmpty && emptyLabel ? (
                <RNText
                    style={{
                        fontSize: hScale(10),
                        color: '#94a3b8',
                        marginTop: vScale(4),
                        fontStyle: 'italic',
                    }}
                >
                    {emptyLabel}
                </RNText>
            ) : null}
        </View>
    );
};

// ─── Quick Action Chip ────────────────────────────────────────────────────────

type QuickActionProps = {
    label: string;
    icon: any;
    color: string;
    bgColor: string;
    onPress: () => void;
};

const QuickAction = ({ label, icon: Icon, color, bgColor, onPress }: QuickActionProps) => {
    const { hScale, vScale, spacing, fontSize: fontSizes } = useResponsive();
    return (
    <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.75}
        style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: spacing.xl,
            paddingVertical: vScale(10),
            borderRadius: hScale(50),
            marginRight: spacing.md,
            backgroundColor: bgColor,
            shadowColor: color,
            shadowOffset: { width: 0, height: vScale(2) },
            shadowOpacity: 0.15,
            shadowRadius: hScale(4),
            elevation: 3,
        }}
    >
        <Icon size={hScale(15)} color={color} strokeWidth={2.5} style={{ marginRight: spacing.xs }} />
        <RNText style={{ color, fontSize: hScale(13), fontWeight: '700', letterSpacing: 0.1 }}>{label}</RNText>
    </TouchableOpacity>
    );
};

// ─── Menu Item ────────────────────────────────────────────────────────────────

const MenuItem = ({
    title,
    description,
    icon: Icon,
    color,
    onPress,
    isLast,
}: {
    title: string;
    description: string;
    icon: any;
    color: string;
    onPress: () => void;
    isLast?: boolean;
}) => {
    const { hScale, vScale, spacing, fontSize: fontSizes } = useResponsive();
    return (
    <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.7}
        style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: spacing.xl,
            paddingVertical: vScale(14),
            backgroundColor: 'white',
            borderBottomWidth: isLast ? 0 : 1,
            borderBottomColor: '#f1f5f9',
        }}
    >
        {/* Icon bubble */}
        <View
            style={{
                width: hScale(46),
                height: hScale(46),
                borderRadius: hScale(14),
                backgroundColor: `${color}18`,
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: spacing.xl,
            }}
        >
            <Icon size={hScale(22)} color={color} strokeWidth={2} />
        </View>

        {/* Text */}
        <View style={{ flex: 1 }}>
            <RNText style={{ fontSize: hScale(15), fontWeight: '700', color: '#0f172a', marginBottom: vScale(2) }}>
                {title}
            </RNText>
            <RNText style={{ fontSize: hScale(12), color: '#64748b', fontWeight: '500' }}>{description}</RNText>
        </View>

        {/* Arrow */}
        <View
            style={{
                width: hScale(32),
                height: hScale(32),
                borderRadius: hScale(10),
                backgroundColor: '#f1f5f9',
                alignItems: 'center',
                justifyContent: 'center',
            }}
        >
            <ChevronRight size={hScale(18)} color="#475569" strokeWidth={2.5} />
        </View>
    </TouchableOpacity>
    );
};

// ─── Section Header ─────────────────────────────────────────────────────────

const SectionHeader = ({ title }: { title: string }) => {
    const { hScale, vScale, spacing } = useResponsive();
    return (
    <RNText
        style={{
            fontSize: hScale(11),
            fontWeight: '800',
            color: '#94a3b8',
            textTransform: 'uppercase',
            letterSpacing: 1.2,
            marginBottom: vScale(10),
            marginTop: vScale(20),
            marginLeft: spacing.xs,
        }}
    >
        {title}
    </RNText>
    );
};

// ─── Menu Group Container ─────────────────────────────────────────────────────

const MenuSection = ({ children }: { children: React.ReactNode }) => {
    const { hScale, vScale, spacing } = useResponsive();
    return (
    <View
        style={{
            backgroundColor: 'white',
            borderRadius: hScale(20),
            overflow: 'hidden',
            marginBottom: vScale(8),
            shadowColor: '#94a3b8',
            shadowOffset: { width: 0, height: vScale(2) },
            shadowOpacity: 0.08,
            shadowRadius: hScale(8),
            elevation: 2,
            borderWidth: 1,
            borderColor: '#f1f5f9'
        }}
    >
        {children}
    </View>
    );
};

// ─── Dashboard ────────────────────────────────────────────────────────────────

export default function AdminDashboard() {
    const router = useRouter();
    const { signOut, user } = useAuth();
    const { hScale, vScale, spacing, fontSize: fontSizes } = useResponsive();
    const [refreshing, setRefreshing] = useState(false);

    const { data: stats, refetch: refetchStats } = useQuery({
        queryKey: ['admin-dashboard-stats'],
        queryFn: async () => {
            const { count: totalUsers } = await supabase
                .from('users')
                .select('*', { count: 'exact', head: true });
            const { count: totalDrivers } = await supabase
                .from('drivers')
                .select('*', { count: 'exact', head: true });
            const { count: totalTrips } = await supabase
                .from('trips')
                .select('*', { count: 'exact', head: true });
            const { count: pendingVerifications } = await supabase
                .from('drivers')
                .select('*', { count: 'exact', head: true })
                .eq('verification_status', 'pending');

            const { data: payments } = await supabase
                .from('payments')
                .select('amount')
                .eq('status', 'success');
            const totalRevenue = payments?.reduce((sum, p) => sum + parseFloat(p.amount), 0) || 0;

            return {
                totalUsers: totalUsers || 0,
                totalDrivers: totalDrivers || 0,
                totalTrips: totalTrips || 0,
                totalRevenue,
                pendingVerifications: pendingVerifications || 0,
            };
        },
    });

    const onRefresh = async () => {
        setRefreshing(true);
        await refetchStats();
        setRefreshing(false);
    };

    const firstName = user?.fullName?.split(' ')[0] ?? 'Admin';

    return (
        <View style={{ flex: 1, backgroundColor: '#f8fafc' }}>
            <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
            <SafeAreaView style={{ flex: 1 }} edges={['top']}>

                {/* ── Header ───────────────────────────────── */}
                <View
                    style={{
                        paddingHorizontal: spacing.xl,
                        paddingTop: vScale(16),
                        paddingBottom: vScale(14),
                        backgroundColor: 'white',
                        borderBottomWidth: 1,
                        borderBottomColor: '#f1f5f9',
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        shadowColor: '#94a3b8',
                        shadowOffset: { width: 0, height: vScale(2) },
                        shadowOpacity: 0.06,
                        shadowRadius: hScale(6),
                        elevation: 3,
                        zIndex: 10,
                    }}
                >
                    <View>
                        {/* Primary heading */}
                        <RNText
                            style={{
                                fontSize: hScale(24),
                                fontWeight: '900',
                                color: '#0f172a',
                                letterSpacing: -0.5,
                                lineHeight: vScale(28),
                            }}
                        >
                            Admin Portal
                        </RNText>
                        {/* Subtitle */}
                        <RNText
                            style={{
                                fontSize: hScale(13),
                                color: '#64748b',
                                fontWeight: '500',
                                marginTop: vScale(2),
                            }}
                        >
                            Dashboard Overview · Hi, {firstName} 👋
                        </RNText>
                    </View>

                    {/* Actions */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                        <NotificationDropdown />
                        <TouchableOpacity
                            onPress={signOut}
                            accessibilityLabel="Sign out"
                            accessibilityRole="button"
                            style={{
                                width: hScale(40),
                                height: hScale(40),
                                borderRadius: hScale(20),
                                backgroundColor: '#f8fafc',
                                borderWidth: 1,
                                borderColor: '#e2e8f0',
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}
                        >
                            <LogOut size={hScale(18)} color="#64748b" strokeWidth={2} />
                        </TouchableOpacity>
                    </View>
                </View>

                <ScrollView
                    style={{ flex: 1, paddingHorizontal: spacing.xl }}
                    contentContainerStyle={{ paddingBottom: vScale(100), paddingTop: vScale(20) }}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#64748b" />
                    }
                    showsVerticalScrollIndicator={false}
                >

                    {/* ── Stats Grid ───────────────────────────── */}
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
                        <StatCard
                            title="Total Revenue"
                            value={`₹${stats?.totalRevenue.toLocaleString() || '0'}`}
                            icon={DollarSign}
                            color="#7c3aed"
                            bgColor="bg-violet-50"
                            emptyLabel="No payments yet"
                        />
                        <StatCard
                            title="Drivers"
                            value={stats?.totalDrivers || 0}
                            icon={Car}
                            color="#16a34a"
                            bgColor="bg-green-50"
                            emptyLabel="No drivers yet"
                        />
                        <StatCard
                            title="Users"
                            value={stats?.totalUsers || 0}
                            icon={Users}
                            color="#2563eb"
                            bgColor="bg-blue-50"
                            emptyLabel="No users yet"
                        />
                        <StatCard
                            title="Pending Approvals"
                            value={stats?.pendingVerifications || 0}
                            icon={AlertTriangle}
                            color="#ea580c"
                            bgColor="bg-orange-50"
                            emptyLabel="All clear!"
                        />
                    </View>

                    {/* ── Quick Actions ─────────────────────────── */}
                    <SectionHeader title="Quick Actions" />
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={{ paddingBottom: vScale(4), paddingTop: vScale(2) }}
                        style={{ marginBottom: vScale(4) }}
                    >
                        <QuickAction
                            label="Approve Drivers"
                            icon={Shield}
                            color="#f97316"
                            bgColor="#fff7ed"
                            onPress={() => router.push('/admin/verifications')}
                        />
                        <QuickAction
                            label="View Reports"
                            icon={FileText}
                            color="#8b5cf6"
                            bgColor="#f5f3ff"
                            onPress={() => router.push('/admin/reports')}
                        />
                        <QuickAction
                            label="Manage Users"
                            icon={Users}
                            color="#3b82f6"
                            bgColor="#eff6ff"
                            onPress={() => router.push('/admin/users' as any)}
                        />
                        <QuickAction
                            label="Track Trips"
                            icon={MapPin}
                            color="#0ea5e9"
                            bgColor="#f0f9ff"
                            onPress={() => router.push('/admin/trips')}
                        />
                    </ScrollView>

                    {/* ── Operations ───────────────────────────── */}
                    <SectionHeader title="Operations" />
                    <MenuSection>
                        <MenuItem
                            title="Driver Verifications"
                            description="Approve or reject applications"
                            icon={Shield}
                            color="#f97316"
                            onPress={() => router.push('/admin/verifications')}
                        />
                        <MenuItem
                            title="Manage Users"
                            description="View and manage all users"
                            icon={Users}
                            color="#3b82f6"
                            onPress={() => router.push('/admin/users' as any)}
                        />
                        <MenuItem
                            title="Trip Management"
                            description="Track active and past trips"
                            icon={MapPin}
                            color="#0ea5e9"
                            onPress={() => router.push('/admin/trips')}
                            isLast
                        />
                    </MenuSection>

                    {/* ── Business & Analytics ─────────────────── */}
                    <SectionHeader title="Business & Analytics" />
                    <MenuSection>
                        <MenuItem
                            title="Financial Reports"
                            description="Revenue and activity analytics"
                            icon={BarChart3}
                            color="#8b5cf6"
                            onPress={() => router.push('/admin/reports')}
                        />
                        <MenuItem
                            title="Promo Codes"
                            description="Manage discounts and offers"
                            icon={Ticket}
                            color="#10b981"
                            onPress={() => router.push('/admin/promocodes')}
                            isLast
                        />
                    </MenuSection>

                    {/* ── Support ──────────────────────────────── */}
                    <SectionHeader title="Support" />
                    <MenuSection>
                        <MenuItem
                            title="SOS Alerts"
                            description="Emergency handling"
                            icon={AlertTriangle}
                            color="#ef4444"
                            onPress={() => router.push('/admin/alerts')}
                        />
                        <MenuItem
                            title="User Support"
                            description="Inquiries and tickets"
                            icon={Headphones}
                            color="#ec4899"
                            onPress={() => router.push('/admin/support')}
                            isLast
                        />
                    </MenuSection>

                </ScrollView>
            </SafeAreaView>
        </View>
    );
}
