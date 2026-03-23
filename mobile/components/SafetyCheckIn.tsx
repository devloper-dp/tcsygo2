import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Alert, Modal } from 'react-native';
import { Text } from '@/components/ui/text';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '@/components/ui/card';
import { supabase } from '@/lib/supabase';
import { SafetyService } from '@/services/SafetyService';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useResponsive } from '@/hooks/useResponsive';
 
export function SafetyCheckIn({ tripId, style }: { tripId: string, style?: any }) {
    const { user } = useAuth();
    const { theme, isDark } = useTheme();
    const { hScale, vScale, spacing } = useResponsive();
 
    const [visible, setVisible] = useState(false);
    const [timeLeft, setTimeLeft] = useState(600); // 10 minutes
    const [missedChecks, setMissedChecks] = useState(0);
 
    // Timer logic
    useEffect(() => {
        if (!visible) {
            const timer = setInterval(() => {
                setTimeLeft((prev) => {
                    if (prev <= 0) {
                        setVisible(true);
                        return 600; // Reset
                    }
                    return prev - 1;
                });
            }, 1000);
            return () => clearInterval(timer);
        }
    }, [visible]);
 
    const handleCheckIn = async (safe: boolean) => {
        if (!user) return;
        setVisible(false);
        if (safe) {
            setTimeLeft(600); // Reset timer
            await SafetyService.createSafetyCheckIn(tripId, user.id, 'safe');
            Alert.alert('Thank You', 'We are glad you are safe. We will check in again in 10 minutes.');
        } else {
            await SafetyService.createSafetyCheckIn(tripId, user.id, 'need_help');
            Alert.alert('Emergency Alert', 'Notifying trusted contacts and support team immediately.');
        }
    };
 
    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        return `${mins}m`;
    };
 
    return (
        <>
            <TouchableOpacity 
                activeOpacity={0.9}
                style={[{ padding: hScale(10), borderRadius: hScale(16), borderWidth: 1 }, style]}
                className="flex-row items-center bg-white/95 dark:bg-slate-900/95 border-slate-100 dark:border-slate-800 shadow-sm"
                onPress={() => setVisible(true)}
            >
                <View style={{ width: hScale(24), height: hScale(24), borderRadius: hScale(12), marginRight: hScale(10) }} className="bg-emerald-500 justify-center items-center shadow-sm shadow-emerald-500/20">
                    <Ionicons name="shield-checkmark" size={hScale(14)} color="white" />
                </View>
                <Text style={{ fontSize: hScale(12) }} className="font-bold text-slate-800 dark:text-slate-200">Safety Check</Text>
            </TouchableOpacity>
 
            <Modal visible={visible} transparent animationType="fade">
                <View style={{ flex: 1, padding: hScale(24) }} className="bg-black/60 justify-center">
                    <Card style={{ padding: hScale(32), borderRadius: hScale(32), borderWidth: 1 }} className="bg-white dark:bg-slate-900 items-center border-slate-100 dark:border-slate-800">
                        <View style={{ alignItems: 'center', marginBottom: vScale(32) }} className="items-center">
                            <View style={{ width: hScale(80), height: hScale(80), borderRadius: hScale(40), marginBottom: vScale(24) }} className="bg-blue-50 dark:bg-blue-900/20 justify-center items-center">
                                <Ionicons name="shield-outline" size={hScale(40)} color={isDark ? "#60a5fa" : "#3b82f6"} />
                            </View>
                            <Text style={{ fontSize: hScale(20), marginBottom: vScale(12) }} className="font-bold text-slate-900 dark:text-white">Safety Check-in</Text>
                            <Text style={{ fontSize: hScale(16), lineHeight: vScale(24) }} className="text-slate-500 dark:text-slate-400 text-center">Are you feeling safe in your ride?</Text>
                        </View>
 
                        <View style={{ width: '100%', gap: vScale(16), marginBottom: vScale(24) }}>
                            <TouchableOpacity
                                style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: hScale(16), borderRadius: hScale(16), gap: hScale(12) }}
                                className="bg-emerald-500 active:bg-emerald-600 shadow-lg shadow-emerald-500/10"
                                onPress={() => handleCheckIn(true)}
                            >
                                <Ionicons name="checkmark-circle-outline" size={hScale(24)} color="white" />
                                <Text style={{ fontSize: hScale(16) }} className="text-white font-bold">Yes, I'm Safe</Text>
                            </TouchableOpacity>
 
                            <TouchableOpacity
                                style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: hScale(16), borderRadius: hScale(16), gap: hScale(12) }}
                                className="bg-red-500 active:bg-red-600 shadow-lg shadow-red-500/10"
                                onPress={() => handleCheckIn(false)}
                            >
                                <Ionicons name="alert-circle-outline" size={hScale(24)} color="white" />
                                <Text style={{ fontSize: hScale(16) }} className="text-white font-bold">No, Need Help</Text>
                            </TouchableOpacity>
                        </View>
 
                        <Text style={{ fontSize: hScale(10) }} className="font-bold text-slate-400 dark:text-slate-600 uppercase tracking-widest text-center">
                            Automated check-in every 10 minutes
                        </Text>
                    </Card>
                </View>
            </Modal>
        </>
    );
}
 
const styles = StyleSheet.create({});
