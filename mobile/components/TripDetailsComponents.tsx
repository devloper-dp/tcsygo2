import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Text } from '@/components/ui/text';
import { Card } from '@/components/ui/card';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import { useResponsive } from '@/hooks/useResponsive';
 
interface TripTimelineProps {
    pickup: string;
    drop: string;
    departureTime: string;
    arrivalTime?: string;
}
 
export function TripTimelineMobile({ pickup, drop, departureTime, arrivalTime }: TripTimelineProps) {
    const { isDark } = useTheme();
    const { hScale, vScale, spacing } = useResponsive();
 
    return (
        <Card style={{ padding: hScale(24), borderRadius: hScale(32), marginBottom: vScale(20), borderWidth: 1 }} className="bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 shadow-sm">
            <Text style={{ fontSize: hScale(10), marginBottom: vScale(32) }} className="font-black text-slate-400 dark:text-slate-500 uppercase tracking-[2px]">Trip Protocol</Text>
            <View style={{ paddingLeft: hScale(12) }} className="relative">
                <View style={{ position: 'absolute', left: hScale(10), top: vScale(16), bottom: vScale(32), width: hScale(2) }} className="bg-slate-100 dark:bg-slate-800 border-dashed" />
 
                <View style={{ flexDirection: 'row', marginBottom: vScale(40) }}>
                    <View style={{ width: hScale(16), height: hScale(16), borderRadius: hScale(8), marginTop: vScale(4), borderWidth: 2 }} className="bg-slate-900 dark:bg-white z-10 border-white dark:border-slate-900 shadow-sm" />
                    <View style={{ marginLeft: hScale(20) }} className="flex-1">
                        <Text style={{ fontSize: hScale(16) }} className="font-black text-slate-900 dark:text-white uppercase tracking-tighter">
                            {new Date(departureTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </Text>
                        <Text style={{ fontSize: hScale(10), marginTop: vScale(4) }} className="font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Point of Departure</Text>
                        <Text style={{ fontSize: hScale(14), marginTop: vScale(8), lineHeight: vScale(20) }} className="font-bold text-slate-800 dark:text-slate-200 tracking-tight">{pickup}</Text>
                    </View>
                </View>
 
                <View className="flex-row">
                    <View style={{ width: hScale(16), height: hScale(16), borderRadius: hScale(8), marginTop: vScale(4), borderWidth: 2 }} className="bg-blue-500 z-10 border-white dark:border-slate-900 shadow-sm" />
                    <View style={{ marginLeft: hScale(20) }} className="flex-1">
                        <Text style={{ fontSize: hScale(16) }} className="font-black text-slate-900 dark:text-white uppercase tracking-tighter">
                            {arrivalTime
                                ? new Date(arrivalTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                : 'EST. ARRIVAL (+2H)'}
                        </Text>
                        <Text style={{ fontSize: hScale(10), marginTop: vScale(4) }} className="font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Destination Terminal</Text>
                        <Text style={{ fontSize: hScale(14), marginTop: vScale(8), lineHeight: vScale(20) }} className="font-bold text-slate-800 dark:text-slate-200 tracking-tight">{drop}</Text>
                    </View>
                </View>
            </View>
        </Card>
    );
}
 
interface DriverVerificationProps {
    rating: number;
    totalTrips: number;
    isVerified: boolean;
}
 
export function DriverVerificationMobile({ rating, totalTrips, isVerified }: DriverVerificationProps) {
    const { isDark } = useTheme();
    const { hScale, vScale } = useResponsive();
 
    return (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: hScale(10), marginTop: vScale(8) }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: hScale(12), paddingVertical: vScale(6), borderRadius: hScale(12), gap: hScale(6), borderWidth: 1 }} className="bg-amber-50 dark:bg-amber-900/20 border-amber-100/50 dark:border-amber-900/30">
                <Ionicons name="star" size={hScale(12)} color="#f59e0b" />
                <Text style={{ fontSize: hScale(10) }} className="font-black text-amber-700 dark:text-amber-400 uppercase tracking-widest">{rating || 'NEW'}</Text>
            </View>
 
            {isVerified && (
                <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: hScale(12), paddingVertical: vScale(6), borderRadius: hScale(12), gap: hScale(6), borderWidth: 1 }} className="bg-green-50 dark:bg-green-900/20 border-green-100/50 dark:border-green-900/30">
                    <Ionicons name="checkmark-circle" size={hScale(12)} color="#10b981" />
                    <Text style={{ fontSize: hScale(10) }} className="font-black text-green-700 dark:text-green-400 uppercase tracking-widest">Verified</Text>
                </View>
            )}
 
            <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: hScale(12), paddingVertical: vScale(6), borderRadius: hScale(12), gap: hScale(6), borderWidth: 1 }} className="bg-blue-50 dark:bg-blue-900/20 border-blue-100/50 dark:border-blue-900/30">
                <Ionicons name="car" size={hScale(12)} color="#3b82f6" />
                <Text style={{ fontSize: hScale(10) }} className="font-black text-blue-700 dark:text-blue-400 uppercase tracking-widest">{totalTrips} Trips</Text>
            </View>
        </View>
    );
}
 
export function SimilarTripsMobile({ trips, onSelect }: { trips: any[], onSelect: (id: string) => void }) {
    const { isDark } = useTheme();
    const { hScale, vScale } = useResponsive();
 
    if (!trips || trips.length === 0) return null;
 
    return (
        <View style={{ marginTop: vScale(32), marginBottom: vScale(32) }}>
            <Text style={{ fontSize: hScale(10), marginBottom: vScale(24), paddingHorizontal: hScale(4) }} className="font-black text-slate-400 dark:text-slate-500 uppercase tracking-[2px]">Tactical Alternatives</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingRight: hScale(24), gap: hScale(16) }}>
                {trips.map((trip) => (
                    <TouchableOpacity
                        key={trip.id}
                        onPress={() => onSelect(trip.id)}
                        style={{ width: hScale(220), borderRadius: hScale(28), padding: hScale(24), borderWidth: 1 }}
                        className="bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 shadow-sm active:opacity-80"
                        activeOpacity={0.8}
                    >
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: vScale(16) }}>
                            <View style={{ paddingHorizontal: hScale(12), paddingVertical: vScale(6), borderRadius: hScale(12), borderWidth: 1 }} className="bg-slate-50 dark:bg-slate-800 border-slate-100 dark:border-slate-700">
                                <Text style={{ fontSize: hScale(16) }} className="font-black text-blue-600 dark:text-blue-500 tracking-tighter">₹{trip.price_per_seat}</Text>
                            </View>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: hScale(6) }}>
                                <Ionicons name="star" size={hScale(12)} color="#f59e0b" />
                                <Text style={{ fontSize: hScale(10) }} className="font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">{trip.driver_rating || '4.5'}</Text>
                            </View>
                        </View>
                        <Text style={{ fontSize: hScale(14), marginBottom: vScale(8) }} className="font-bold text-slate-900 dark:text-white uppercase tracking-tight" numberOfLines={1}>
                            {trip.pickup_location.split(',')[0]} → {trip.drop_location.split(',')[0]}
                        </Text>
                        <Text style={{ fontSize: hScale(9) }} className="font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                            {new Date(trip.departure_time).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                        </Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>
        </View>
    );
}
 
const styles = StyleSheet.create({});
