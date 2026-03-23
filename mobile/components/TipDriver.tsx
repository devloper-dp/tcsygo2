import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import { Text } from '@/components/ui/text';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '@/components/ui/card';
import { useTheme } from '@/contexts/ThemeContext';
 
interface TipDriverProps {
    driverName: string;
    onTipSelected?: (amount: number) => void;
    style?: any;
}
 
const PRESET_TIPS = [10, 20, 30, 50];
 
export function TipDriver({ driverName, onTipSelected, style }: TipDriverProps) {
    const { theme } = useTheme();
    const isDark = theme === 'dark';
 
    const [selectedTip, setSelectedTip] = useState<number | null>(null);
    const [customTip, setCustomTip] = useState('');
    const [showCustom, setShowCustom] = useState(false);
 
    const handlePresetTip = (amount: number) => {
        setSelectedTip(amount);
        setShowCustom(false);
        setCustomTip('');
        onTipSelected?.(amount);
    };
 
    const handleCustomSubmit = () => {
        const amount = parseFloat(customTip);
        if (!isNaN(amount) && amount > 0) {
            setSelectedTip(amount);
            onTipSelected?.(amount);
        }
    };
 
    return (
        <Card className="p-6 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[32px] shadow-sm" style={style}>
            <View className="items-center mb-6">
                <View className="w-14 h-14 rounded-full bg-amber-50 dark:bg-amber-900/20 items-center justify-center mb-4">
                    <Ionicons name="heart" size={28} color={isDark ? "#fbbf24" : "#f59e0b"} />
                </View>
                <Text className="text-xl font-bold text-slate-900 dark:text-white">Tip Your Driver</Text>
                <Text className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">Show appreciation for {driverName}</Text>
            </View>
 
            <View className="flex-row justify-between mb-6 gap-3">
                {PRESET_TIPS.map(amount => (
                    <TouchableOpacity
                        key={amount}
                        className={`flex-1 py-4 rounded-2xl border items-center shadow-sm ${
                            selectedTip === amount 
                                ? 'bg-blue-600 dark:bg-blue-500 border-blue-600 dark:border-blue-500' 
                                : 'bg-slate-50 dark:bg-slate-800/10 border-slate-100 dark:border-slate-800'
                        }`}
                        onPress={() => handlePresetTip(amount)}
                        activeOpacity={0.7}
                    >
                        <Text className={`text-base font-black ${
                            selectedTip === amount ? 'text-white' : 'text-slate-700 dark:text-slate-300'
                        }`}>₹{amount}</Text>
                    </TouchableOpacity>
                ))}
            </View>
 
            {showCustom ? (
                <View className="flex-row gap-3 mb-4">
                    <TextInput
                        className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-800 rounded-2xl px-4 py-3 h-14 text-slate-900 dark:text-white font-bold"
                        placeholder="Enter amount"
                        placeholderTextColor={isDark ? "#475569" : "#94a3b8"}
                        keyboardType="numeric"
                        value={customTip}
                        onChangeText={setCustomTip}
                    />
                    <TouchableOpacity 
                        className="bg-blue-600 active:bg-blue-700 h-14 rounded-2xl px-6 items-center justify-center shadow-lg shadow-blue-500/20" 
                        onPress={handleCustomSubmit}
                    >
                        <Text className="text-white font-bold">Add</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <TouchableOpacity
                    className="items-center py-3 mb-2"
                    onPress={() => setShowCustom(true)}
                >
                    <Text className="text-sm font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest">Enter Custom Amount</Text>
                </TouchableOpacity>
            )}
 
            {selectedTip !== null && selectedTip > 0 && (
                <View className="flex-row items-center justify-center bg-emerald-50 dark:bg-emerald-900/10 py-4 px-6 rounded-2xl gap-2.5 border border-emerald-100 dark:border-emerald-900/20">
                    <Ionicons name="star" size={18} color="#10b981" />
                    <Text className="text-emerald-700 dark:text-emerald-400 font-bold text-sm">₹{selectedTip} tip added to bill</Text>
                </View>
            )}
        </Card>
    );
}
 
const styles = StyleSheet.create({});
