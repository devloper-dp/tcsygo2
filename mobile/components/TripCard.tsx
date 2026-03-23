import { View, TouchableOpacity } from 'react-native';
import { Card } from './ui/card';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Badge } from './ui/badge';
import { Text } from './ui/text';
import { Users, Star, MapPin, Navigation } from 'lucide-react-native';
import { format } from 'date-fns';
import { useTheme } from '@/contexts/ThemeContext';
import { useResponsive } from '@/hooks/useResponsive';
 
import { TripWithDriver } from '../types/schema';
 
interface TripCardProps {
    trip: TripWithDriver;
    onBook?: () => void;
    showActions?: boolean;
}
 
export function TripCard({ trip, onBook, showActions = true }: TripCardProps) {
    const dateObj = new Date(trip.departureTime);
    const isValidDate = !isNaN(dateObj.getTime());
    const departureTime = isValidDate ? format(dateObj, 'HH:mm') : '--:--';
 
    const { theme, isDark } = useTheme();
    const { spacing, fontSize, hScale, vScale } = useResponsive();
 
    const driver = trip.driver;
 
    return (
        <TouchableOpacity
            onPress={onBook}
            activeOpacity={0.9}
            style={{ marginBottom: vScale(20) }}
        >
            <Card className="p-0 overflow-hidden border border-slate-100 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900" style={{ borderRadius: hScale(32) }}>
                <View style={{ padding: spacing.xl }}>
                    {/* Header: Driver Info & Price */}
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: vScale(32) }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.base }}>
                            <Avatar style={{ width: hScale(56), height: hScale(56), borderRadius: hScale(16) }} className="border-2 border-slate-50 dark:border-slate-800 shadow-sm">
                                <AvatarImage src={driver.user.profilePhoto || undefined} />
                                <AvatarFallback className="bg-slate-100 dark:bg-slate-800 rounded-2xl">
                                    <Text style={{ fontSize: fontSize.lg }} className="text-slate-900 dark:text-slate-100 font-black uppercase">
                                        {driver.user.fullName.charAt(0)}
                                    </Text>
                                </AvatarFallback>
                            </Avatar>
                            <View>
                                <Text style={{ fontSize: fontSize.lg }} className="font-black text-slate-900 dark:text-white leading-tight uppercase tracking-tighter">
                                    {driver.user.fullName}
                                </Text>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: 4 }}>
                                    <Star size={hScale(12)} color="#f59e0b" fill="#f59e0b" />
                                    <Text style={{ fontSize: hScale(10) }} className="text-slate-500 dark:text-slate-500 font-black uppercase tracking-widest">
                                        {driver.rating} • PROFESSIONAL
                                    </Text>
                                </View>
                            </View>
                        </View>
 
                        <View style={{ backgroundColor: isDark ? 'rgba(30, 41, 59, 0.5)' : '#f8fafc', paddingHorizontal: hScale(16), paddingVertical: vScale(8), borderRadius: hScale(16) }} className="items-end border border-slate-100 dark:border-slate-800">
                            <Text style={{ fontSize: fontSize.xl }} className="font-black text-blue-600 dark:text-blue-500 tracking-tighter">₹{trip.pricePerSeat}</Text>
                        </View>
                    </View>
 
                    {/* Route Timeline */}
                    <View style={{ paddingLeft: hScale(12), position: 'relative', marginBottom: vScale(8) }}>
                        {/* Connecting Line */}
                        <View style={{ position: 'absolute', left: hScale(10), top: vScale(24), bottom: vScale(24), width: 2 }} className="bg-slate-100 dark:bg-slate-800/50 border-dashed" />
 
                        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing.xl, marginBottom: vScale(32) }}>
                            <View style={{ marginTop: 6, width: hScale(14), height: hScale(14), borderRadius: hScale(7), borderWidth: 2 }} className="bg-slate-900 dark:bg-white border-white dark:border-slate-900 shadow-sm z-10" />
                            <View className="flex-1">
                                <Text style={{ fontSize: fontSize.base }} className="font-bold text-slate-900 dark:text-slate-100 leading-tight mb-1 uppercase tracking-tight" numberOfLines={1}>
                                    {trip.pickupLocation}
                                </Text>
                                <Text style={{ fontSize: hScale(10) }} className="font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                                    {departureTime} • DEPARTURE
                                </Text>
                            </View>
                        </View>
 
                        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing.xl }}>
                            <View style={{ marginTop: 6, width: hScale(14), height: hScale(14), borderRadius: hScale(7), borderWidth: 2 }} className="bg-blue-500 border-white dark:border-slate-900 shadow-sm z-10" />
                            <View className="flex-1">
                                <Text style={{ fontSize: fontSize.base }} className="font-bold text-slate-900 dark:text-slate-100 leading-tight mb-1 uppercase tracking-tight" numberOfLines={1}>
                                    {trip.dropLocation}
                                </Text>
                                <Text style={{ fontSize: hScale(10) }} className="font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                                    TERMINAL ARRIVAL
                                </Text>
                            </View>
                        </View>
                    </View>
                </View>
 
                {/* Footer */}
                <View style={{ paddingHorizontal: spacing.xl, paddingVertical: vScale(16) }} className="bg-slate-50 dark:bg-slate-800/30 border-t border-slate-50 dark:border-slate-800/50 flex-row justify-between items-center">
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
                        <View style={{ width: hScale(32), height: hScale(32), borderRadius: hScale(12) }} className="bg-slate-200/50 dark:bg-slate-800 items-center justify-center">
                            <Users size={hScale(14)} color={isDark ? "#94a3b8" : "#475569"} strokeWidth={2.5} />
                        </View>
                        <Text style={{ fontSize: hScale(11) }} className="text-slate-500 dark:text-slate-400 font-black uppercase tracking-widest">
                            {trip.availableSeats} AVAILABLE
                        </Text>
                    </View>
                    {showActions && (
                        <TouchableOpacity 
                            style={{ paddingHorizontal: hScale(24), paddingVertical: vScale(12), borderRadius: hScale(18) }}
                            className="bg-slate-900 dark:bg-white shadow-lg shadow-slate-900/10 active:opacity-80"
                            onPress={onBook}
                        >
                            <Text style={{ fontSize: fontSize.xs }} className="font-black text-white dark:text-slate-900 uppercase tracking-widest">
                                Book Now
                            </Text>
                        </TouchableOpacity>
                    )}
                </View>
            </Card>
        </TouchableOpacity>
    );
}
