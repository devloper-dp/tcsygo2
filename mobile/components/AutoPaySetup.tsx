import React, { useState, useEffect } from 'react';
import { View, Switch, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import { Text } from '@/components/ui/text';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { Card } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
 
export function AutoPaySetup({ style }: { style?: any }) {
    const { theme } = useTheme();
    const isDark = theme === 'dark';
 
    const [enabled, setEnabled] = useState(false);
    const [limit, setLimit] = useState('500'); // Default limit
    const [loading, setLoading] = useState(false);
    const [userId, setUserId] = useState<string | null>(null);
 
    useEffect(() => {
        // Get user session
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session?.user) {
                setUserId(session.user.id);
                loadSettings(session.user.id);
            }
        });
    }, []);
 
    const loadSettings = async (uid: string) => {
        try {
            const { data, error } = await supabase
                .from('auto_pay_settings')
                .select('*')
                .eq('user_id', uid)
                .single();
 
            if (data && !error) {
                setEnabled(data.is_enabled);
                setLimit(data.daily_limit?.toString() || '500');
            }
        } catch (error) {
            console.error('Error loading auto-pay settings:', error);
        }
    };
 
    const toggleAutoPay = async (value: boolean) => {
        if (!userId) return;
 
        setEnabled(value);
        try {
            const { error } = await supabase
                .from('auto_pay_settings')
                .upsert({
                    user_id: userId,
                    is_enabled: value,
                    daily_limit: parseFloat(limit),
                    updated_at: new Date().toISOString()
                });
 
            if (error) throw error;
        } catch (error: any) {
            Alert.alert('Error', 'Failed to update auto-pay settings');
            setEnabled(!value); // Revert on error
        }
    };
 
    return (
        <Card className="p-5 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl shadow-sm" style={style}>
            <View className="flex-row justify-between items-center">
                <View className="flex-row items-center gap-3.5">
                    <View className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-900/20 justify-center items-center shadow-sm shadow-amber-500/10">
                        <Ionicons name="flash" size={24} color={isDark ? "#fbbf24" : "#f59e0b"} />
                    </View>
                    <View>
                        <Text className="text-base font-bold text-slate-900 dark:text-white">Auto Pay</Text>
                        <Text className="text-xs font-medium text-slate-500 dark:text-slate-400">Pay automatically after ride ends</Text>
                    </View>
                </View>
                <Switch
                    value={enabled}
                    onValueChange={toggleAutoPay}
                    trackColor={{ false: isDark ? '#1e293b' : '#e2e8f0', true: isDark ? '#fbbf24' : '#fcd34d' }}
                    thumbColor={enabled ? (isDark ? '#d97706' : '#f59e0b') : (isDark ? '#475569' : '#f4f3f4')}
                    ios_backgroundColor={isDark ? '#1e293b' : '#e2e8f0'}
                />
            </View>
 
            {enabled && (
                <View className="mt-5 pt-5 border-t border-slate-50 dark:border-slate-800">
                    <View className="flex-row items-center gap-2.5 mb-2.5">
                        <View className="w-5 h-5 rounded-full bg-emerald-50 dark:bg-emerald-900/20 justify-center items-center">
                            <Ionicons name="shield-checkmark" size={12} color="#10b981" />
                        </View>
                        <Text className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Secure & Encrypted</Text>
                    </View>
                    <Text className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                        Daily limit: <Text className="text-blue-600 dark:text-blue-400">₹{limit}</Text>
                    </Text>
                    <Text className="text-xs text-slate-500 dark:text-slate-500 leading-5 font-medium">
                        Payments below ₹{limit} will be deducted automatically from your wallet or default card.
                    </Text>
                </View>
            )}
        </Card>
    );
}
 
const styles = StyleSheet.create({});
