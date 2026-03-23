import React from 'react';
import { View } from 'react-native';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { Clock, MapPin, Navigation, IndianRupee } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/contexts/ThemeContext';
import { useResponsive } from '@/hooks/useResponsive';
 
interface RideRequestCardProps {
    request: {
        id: string;
        pickupLocation: string;
        dropLocation: string;
        fare: number;
        distance: number;
        duration: number;
        vehicleType: string;
        createdAt: string;
    };
    onAccept: () => void;
    isAccepting: boolean;
}
 
export function RideRequestCard({ request, onAccept, isAccepting }: RideRequestCardProps) {
    const { t } = useTranslation();
    const { theme } = useTheme();
    const isDark = theme === 'dark';
    const { hScale, vScale, spacing } = useResponsive();
  
    return (
        <View style={{ padding: spacing.xl, borderRadius: hScale(32), marginBottom: vScale(20) }} className="bg-white dark:bg-slate-900 shadow-sm border border-slate-100 dark:border-slate-800 relative overflow-hidden">
            {/* Background Decoration */}
            <View style={{ position: 'absolute', top: 0, right: 0, width: hScale(128), height: hScale(128), borderBottomLeftRadius: hScale(100), zIndex: -10 }} className="bg-slate-50 dark:bg-slate-800/50" />
 
            {/* Header: Type & Time | Fare */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: vScale(24) }}>
                <View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginBottom: vScale(6) }}>
                        <View style={{ paddingHorizontal: hScale(12), paddingVertical: vScale(6), borderRadius: hScale(99), borderWidth: 1 }} className="bg-blue-50 dark:bg-blue-900/30 border-blue-100/50 dark:border-blue-900/30">
                            <Text style={{ fontSize: hScale(11) }} className="font-bold text-blue-700 dark:text-blue-400 uppercase tracking-widest">
                                {request.vehicleType}
                            </Text>
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingHorizontal: hScale(8), paddingVertical: vScale(4) }} className="bg-slate-100 dark:bg-slate-800/80 rounded-full">
                            <Clock size={hScale(10)} color={isDark ? "#94a3b8" : "#64748b"} />
                            <Text style={{ fontSize: hScale(10) }} className="text-slate-500 dark:text-slate-400 font-bold">
                                {new Date(request.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </Text>
                        </View>
                    </View>
                </View>
                <View className="items-end">
                    <Text style={{ fontSize: hScale(30) }} className="font-black text-slate-900 dark:text-white tracking-tight">₹{request.fare}</Text>
                </View>
            </View>
 
            {/* Route Visualizer */}
            <View style={{ flexDirection: 'row', alignItems: 'stretch', gap: spacing.lg, marginBottom: vScale(32) }}>
                {/* Timeline */}
                <View style={{ alignItems: 'center', paddingVertical: vScale(8) }}>
                    <View style={{ width: hScale(16), height: hScale(16), borderRadius: hScale(8), borderWidth: 3, zIndex: 10 }} className="bg-slate-900 dark:bg-white border-blue-100 dark:border-blue-900/50 shadow-sm" />
                    {/* Dashed Line */}
                    <View style={{ flex: 1, width: 2, marginVertical: vScale(4), borderLeftWidth: 2, borderStyle: 'dashed' }} className="border-slate-100 dark:border-slate-800" />
                    <View style={{ width: hScale(16), height: hScale(16), borderRadius: hScale(8), borderWidth: 3, zIndex: 10 }} className="bg-white dark:bg-slate-900 border-slate-900 dark:border-white shadow-sm" />
                </View>
 
                <View style={{ flex: 1, justifyContent: 'space-between', gap: spacing.xl }}>
                    <View>
                        <Text style={{ fontSize: hScale(10), marginBottom: vScale(4) }} className="font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">{t('driver.pickup')}</Text>
                        <Text style={{ fontSize: hScale(15), lineHeight: vScale(20) }} className="font-bold text-slate-800 dark:text-slate-200" numberOfLines={2}>
                            {request.pickupLocation}
                        </Text>
                    </View>
                    <View>
                        <Text style={{ fontSize: hScale(10), marginBottom: vScale(4) }} className="font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">{t('driver.dropoff')}</Text>
                        <Text style={{ fontSize: hScale(15), lineHeight: vScale(20) }} className="font-bold text-slate-800 dark:text-slate-200" numberOfLines={2}>
                            {request.dropLocation}
                        </Text>
                    </View>
                </View>
            </View>
 
            {/* Trip Details Stats */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: vScale(24) }}>
                <View style={{ padding: spacing.lg, borderRadius: hScale(16), borderWidth: 1, gap: spacing.md }} className="flex-1 bg-slate-50/80 dark:bg-slate-800/40 border-slate-100 dark:border-slate-800/50 items-center flex-row">
                    <View style={{ width: hScale(36), height: hScale(36), borderRadius: hScale(18) }} className="bg-white dark:bg-slate-800 items-center justify-center shadow-sm">
                        <Navigation size={hScale(15)} color={isDark ? "#60a5fa" : "#3b82f6"} />
                    </View>
                    <View>
                        <Text style={{ fontSize: hScale(9) }} className="text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wide">{t('driver.distance')}</Text>
                        <Text style={{ fontSize: hScale(14) }} className="font-black text-slate-800 dark:text-slate-200">{request.distance} km</Text>
                    </View>
                </View>
                <View style={{ padding: spacing.lg, borderRadius: hScale(16), borderWidth: 1, gap: spacing.md }} className="flex-1 bg-slate-50/80 dark:bg-slate-800/40 border-slate-100 dark:border-slate-800/50 items-center flex-row">
                    <View style={{ width: hScale(36), height: hScale(36), borderRadius: hScale(18) }} className="bg-white dark:bg-slate-800 items-center justify-center shadow-sm">
                        <Clock size={hScale(15)} color={isDark ? "#f59e0b" : "#d97706"} />
                    </View>
                    <View>
                        <Text style={{ fontSize: hScale(9) }} className="text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wide">{t('driver.est_time')}</Text>
                        <Text style={{ fontSize: hScale(14) }} className="font-black text-slate-800 dark:text-slate-200">{request.duration} min</Text>
                    </View>
                </View>
            </View>
 
            {/* Action Button */}
            <Button
                onPress={onAccept}
                disabled={isAccepting}
                style={{ width: '100%', height: vScale(56), borderRadius: hScale(16) }}
                className={`shadow-lg active:scale-95 transition-all ${isAccepting ? 'bg-slate-100 dark:bg-slate-800' : 'bg-slate-900 dark:bg-blue-600 shadow-blue-500/20'}`}
            >
                {isAccepting ? (
                    <Text style={{ fontSize: hScale(16) }} className="text-slate-400 dark:text-slate-500 font-bold">{t('driver.accepting')}</Text>
                ) : (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
                        <Text style={{ fontSize: hScale(16) }} className="text-white font-bold tracking-wide">{t('driver.accept_ride')}</Text>
                        <IndianRupee size={hScale(16)} color="white" />
                    </View>
                )}
            </Button>
        </View >
    );
}
