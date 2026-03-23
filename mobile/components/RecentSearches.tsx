import { View, TouchableOpacity } from 'react-native';
import { Text } from '@/components/ui/text';
import { Card } from '@/components/ui/card';
import { Ionicons } from '@expo/vector-icons';
import { useSearchStore } from '@/lib/search-store';
import { useTheme } from '@/contexts/ThemeContext';
 
interface RecentSearchesProps {
    onSearchSelect?: (search: any) => void;
}
 
export function RecentSearches({ onSearchSelect }: RecentSearchesProps) {
    const { history } = useSearchStore();
    const { theme } = useTheme();
    const isDark = theme === 'dark';
    
    const displaySearches = history.slice(0, 3);
 
    if (displaySearches.length === 0) {
        return null;
    }
 
    return (
        <Card className="p-5 mb-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm">
            <View className="flex-row items-center justify-between mb-5">
                <Text className="font-bold text-lg text-slate-900 dark:text-white">Recent Searches</Text>
                <Ionicons name="time" size={20} color={isDark ? "#475569" : "#94a3b8"} />
            </View>
            <View className="gap-4">
                {displaySearches.map((search, index) => (
                    <TouchableOpacity
                        key={search.id}
                        onPress={() => onSearchSelect?.(search)}
                        activeOpacity={0.7}
                    >
                        <View className="flex-row items-start gap-4 p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-50 dark:border-slate-800/50">
                            <View className="items-center gap-1 mt-1">
                                <View className="w-2 h-2 rounded-full bg-emerald-500" />
                                <View className="w-[1.5px] h-6 bg-slate-200 dark:bg-slate-700 border-dashed" />
                                <View className="w-2 h-2 rounded-full bg-rose-500" />
                            </View>
                            <View className="flex-1">
                                <Text className="font-bold text-sm text-slate-800 dark:text-slate-200 mb-1" numberOfLines={1}>
                                    {search.pickup}
                                </Text>
                                <Text className="text-sm text-slate-500 dark:text-slate-400 font-medium" numberOfLines={1}>
                                    {search.drop}
                                </Text>
                                <Text className="text-[10px] font-bold text-slate-400 dark:text-slate-600 mt-2 uppercase tracking-wider">
                                    {new Date(search.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                </Text>
                            </View>
                            <View className="self-center">
                                <Ionicons name="chevron-forward" size={18} color={isDark ? "#334155" : "#cbd5e1"} />
                            </View>
                        </View>
                    </TouchableOpacity>
                ))}
            </View>
        </Card>
    );
}
