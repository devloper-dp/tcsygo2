import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Switch, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { Card } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext'; // Assuming context exists or similar
// import { useToast } from '@/hooks/use-toast'; // Mobile toast hook todo

export function AutoPaySetup({ style }: { style?: any }) {
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
        <Card style={[styles.container, style]}>
            <View style={styles.header}>
                <View style={styles.titleRow}>
                    <View style={styles.iconBox}>
                        <Ionicons name="flash-outline" size={24} color="#f59e0b" />
                    </View>
                    <View>
                        <Text style={styles.title}>Auto Pay</Text>
                        <Text style={styles.subtitle}>Pay automatically after ride ends</Text>
                    </View>
                </View>
                <Switch
                    value={enabled}
                    onValueChange={toggleAutoPay}
                    trackColor={{ false: '#d1d5db', true: '#fcd34d' }}
                    thumbColor={enabled ? '#f59e0b' : '#f4f3f4'}
                />
            </View>

            {enabled && (
                <View style={styles.settings}>
                    <View style={styles.infoRow}>
                        <Ionicons name="shield-checkmark-outline" size={18} color="#10b981" />
                        <Text style={styles.infoText}>Secure & Encrypted</Text>
                    </View>
                    <Text style={styles.limitText}>
                        Daily limit: ₹{limit}
                    </Text>
                    <Text style={styles.description}>
                        Payments below ₹{limit} will be deducted automatically from your wallet or default card.
                    </Text>
                </View>
            )}
        </Card>
    );
}

const styles = StyleSheet.create({
    container: {
        padding: 16,
        backgroundColor: 'white',
        borderRadius: 12,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    titleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    iconBox: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#fef3c7',
        justifyContent: 'center',
        alignItems: 'center',
    },
    title: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#1f2937',
    },
    subtitle: {
        fontSize: 12,
        color: '#6b7280',
    },
    settings: {
        marginTop: 16,
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: '#f3f4f6',
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 8,
    },
    infoText: {
        fontSize: 14,
        color: '#10b981',
        fontWeight: '500',
    },
    limitText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#374151',
        marginBottom: 4,
    },
    description: {
        fontSize: 12,
        color: '#9ca3af',
        lineHeight: 18,
    },
});
