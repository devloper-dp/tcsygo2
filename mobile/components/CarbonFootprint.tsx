import { View } from 'react-native';
import { Text } from '@/components/ui/text';
import { Card } from '@/components/ui/card';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
 
interface CarbonFootprintProps {
    totalDistance: number;
    totalRides: number;
}
 
export function CarbonFootprint({ totalDistance, totalRides }: CarbonFootprintProps) {
    const { isDark } = useTheme();
 
    // Calculate CO2 saved (average car emits 0.12 kg CO2 per km, carpooling saves ~50%)
    const co2Saved = (totalDistance * 0.12 * 0.5).toFixed(1);
    const treesEquivalent = (parseFloat(co2Saved) / 21).toFixed(1); // One tree absorbs ~21kg CO2/year
 
    return (
        <Card className="p-10 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[40px] shadow-2xl shadow-slate-200/50 dark:shadow-none overflow-hidden">
            <View className="items-center">
                <View className="w-24 h-24 rounded-[32px] bg-emerald-50 dark:bg-emerald-900/20 items-center justify-center mb-8 border-4 border-white dark:border-slate-800 shadow-2xl shadow-emerald-200/50 dark:shadow-emerald-950/20">
                    <Ionicons name="leaf" size={48} color={isDark ? "#34d399" : "#10b981"} />
                </View>
                
                <Text className="text-3xl font-black text-slate-900 dark:text-white mb-3 tracking-tighter uppercase">Tactical Impact</Text>
                <Text className="text-sm font-black text-slate-400 dark:text-slate-500 text-center mb-10 uppercase tracking-widest">Environmental Status: Green</Text>
 
                <View className="w-full bg-emerald-500 dark:bg-emerald-600 rounded-[32px] p-8 items-center mb-10 shadow-2xl shadow-emerald-500/30">
                    <Text className="text-5xl font-black text-white tracking-tighter">{co2Saved} KG</Text>
                    <Text className="text-[10px] font-black text-emerald-100 uppercase tracking-[3px] mt-2">CO₂ REMOVED FROM SECTOR</Text>
                </View>
 
                <View className="flex-row w-full justify-between px-4">
                    <ImpactStat label="SORTIES" value={totalRides.toString()} />
                    <View className="w-px h-12 bg-slate-100 dark:bg-slate-800 self-center" />
                    <ImpactStat label="LOGGED KM" value={`${totalDistance.toFixed(0)}`} />
                    <View className="w-px h-12 bg-slate-100 dark:bg-slate-800 self-center" />
                    <ImpactStat label="TREE SAV" value={treesEquivalent} />
                </View>
 
                <View className="mt-10 flex-row items-center gap-2.5 bg-slate-50 dark:bg-slate-800/80 px-6 py-3 rounded-full border border-slate-100 dark:border-slate-700">
                    <Ionicons name="information-circle" size={16} color={isDark ? "#b45309" : "#f59e0b"} />
                    <Text className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                        EQUIVALENT TO {treesEquivalent} TREES DEPLOYED
                    </Text>
                </View>
            </View>
        </Card>
    );
}
 
function ImpactStat({ label, value }: { label: string, value: string }) {
    return (
        <View className="items-center">
            <Text className="text-xl font-black text-slate-900 dark:text-white tracking-tighter">{value}</Text>
            <Text className="text-[9px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-widest mt-1.5">{label}</Text>
        </View>
    );
}
