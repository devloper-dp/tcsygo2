import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text } from '@/components/ui/text';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
 
interface FareItem {
    label: string;
    amount: number;
    isDeduction?: boolean;
}
 
interface FareBreakdownProps {
    baseFare: number;
    distanceFare: number;
    timeFare: number;
    surgeMultiplier?: number;
    discount?: number;
    taxes: number;
    total: number;
    style?: any;
}
 
export function FareBreakdown(props: FareBreakdownProps) {
    const { theme } = useTheme();
    const isDark = theme === 'dark';
    const [expanded, setExpanded] = useState(false);
 
    return (
        <View className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm" style={props.style}>
            <TouchableOpacity
                className="flex-row justify-between items-center p-5 bg-slate-50 dark:bg-slate-800/40"
                activeOpacity={0.7}
                onPress={() => setExpanded(!expanded)}
            >
                <View className="flex-row items-center gap-3">
                    <View className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 items-center justify-center">
                        <Ionicons name="receipt-outline" size={18} color={isDark ? "#94a3b8" : "#64748b"} />
                    </View>
                    <Text className="text-base font-bold text-slate-700 dark:text-slate-300">Fare Breakdown</Text>
                </View>
                <View className="flex-row items-center gap-2">
                    <Text className="text-base font-black text-slate-900 dark:text-white">₹{props.total.toFixed(2)}</Text>
                    <Ionicons name={expanded ? "chevron-up" : "chevron-down"} size={18} color={isDark ? "#475569" : "#94a3b8"} />
                </View>
            </TouchableOpacity>
 
            {expanded && (
                <View className="p-6">
                    <Row label="Base Fare" amount={props.baseFare} />
                    <Row label="Distance Fare" amount={props.distanceFare} />
                    <Row label="Time Fare" amount={props.timeFare} />
 
                    {props.surgeMultiplier && props.surgeMultiplier > 1 && (
                        <Row label={`Surge (x${props.surgeMultiplier})`} amount={0} isInfo isDark={isDark} />
                    )}
 
                    {props.discount && props.discount > 0 && (
                        <Row label="Discount" amount={props.discount} isDeduction />
                    )}
 
                    <Row label="Taxes & Fees" amount={props.taxes} />
 
                    <View className="h-px bg-slate-100 dark:bg-slate-800 my-4" />
                    
                    <Row label="Total Amount" amount={props.total} isBold isDark={isDark} />
                    <Text className="text-[10px] font-bold text-slate-400 dark:text-slate-500 text-center mt-4 uppercase tracking-tighter">Includes GST and platform fees</Text>
                </View>
            )}
        </View>
    );
}
 
function Row({ label, amount, isDeduction, isBold, isInfo, isDark }: { label: string, amount: number, isDeduction?: boolean, isBold?: boolean, isInfo?: boolean, isDark?: boolean }) {
    return (
        <View className="flex-row justify-between mb-3.5">
            <Text className={`text-sm font-medium ${isBold ? 'text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400'}`}>{label}</Text>
            {!isInfo && (
                <Text className={`text-sm font-bold ${
                    isDeduction ? 'text-emerald-500' : (isBold ? 'text-slate-900 dark:text-white' : 'text-slate-700 dark:text-slate-200')
                }`}>
                    {isDeduction ? '-' : ''}₹{amount.toFixed(2)}
                </Text>
            )}
            {isInfo && (
                <View className="bg-amber-50 dark:bg-amber-900/10 px-2 py-0.5 rounded-md border border-amber-100 dark:border-amber-900/20">
                    <Text className="text-[10px] font-black text-amber-500 uppercase tracking-tighter">Dynamic</Text>
                </View>
            )}
        </View>
    );
}
 
const styles = StyleSheet.create({});
