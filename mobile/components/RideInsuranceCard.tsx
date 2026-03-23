import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text } from '@/components/ui/text';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '@/components/ui/card';
import { useTheme } from '@/contexts/ThemeContext';
import { useResponsive } from '@/hooks/useResponsive';
 
export function RideInsuranceCard({ style }: { style?: any }) {
    const { theme } = useTheme();
    const isDark = theme === 'dark';
    const { hScale, vScale, spacing } = useResponsive();
 
    return (
        <Card 
            style={[{ padding: hScale(24), borderRadius: hScale(32), borderWidth: 1 }, style]}
            className="bg-emerald-50 dark:bg-emerald-950/20 border-emerald-100 dark:border-emerald-900/20 shadow-sm"
        >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: hScale(12), marginBottom: vScale(16) }}>
                <View style={{ width: hScale(40), height: hScale(40), borderRadius: hScale(16) }} className="bg-emerald-500/10 items-center justify-center">
                    <Ionicons name="shield-checkmark" size={hScale(24)} color="#10b981" />
                </View>
                <Text style={{ fontSize: hScale(18) }} className="font-black text-emerald-700 dark:text-emerald-400 tracking-tight">Ride Insured</Text>
            </View>
 
            <Text style={{ fontSize: hScale(14), marginBottom: vScale(24), lineHeight: vScale(20) }} className="font-medium text-emerald-600 dark:text-emerald-500/80">
                This ride is insured by Acko General Insurance. Covers medical expenses, hospitalization, and accidental protection.
            </Text>
 
            <TouchableOpacity 
                style={{ paddingHorizontal: hScale(20), paddingVertical: vScale(10), borderRadius: hScale(20), gap: hScale(8), borderWidth: 1 }}
                className="flex-row items-center bg-white/50 dark:bg-emerald-900/20 self-start border-emerald-100 dark:border-emerald-900/30"
            >
                <Text style={{ fontSize: hScale(10) }} className="font-black text-emerald-700 dark:text-emerald-400 uppercase tracking-widest">View Policy Details</Text>
                <Ionicons name="chevron-forward" size={hScale(14)} color="#10b981" />
            </TouchableOpacity>
        </Card>
    );
}
 
const styles = StyleSheet.create({});
