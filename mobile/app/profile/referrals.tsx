import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Share, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

interface Referral {
    id: string;
    referred_id: string | null;
    status: string;
    reward_amount: number;
    created_at: string;
}

export default function ReferralsScreen() {
    const router = useRouter();
    const { user } = useAuth();
    const [referralCode, setReferralCode] = useState('');
    const [referrals, setReferrals] = useState<Referral[]>([]);
    const [totalEarnings, setTotalEarnings] = useState(0);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user) {
            fetchReferralData();
        }
    }, [user]);

    const fetchReferralData = async () => {
        if (!user) return;
        setLoading(true);
        try {
            // Get or create referral code
            const { data: userData } = await supabase
                .from('users')
                .select('referral_code')
                .eq('id', user.id)
                .single();

            let code = userData?.referral_code;

            if (!code) {
                code = generateReferralCode();
                await supabase
                    .from('users')
                    .update({ referral_code: code })
                    .eq('id', user.id);
            }

            setReferralCode(code);

            // Fetch referrals
            const { data: referralData } = await supabase
                .from('referrals')
                .select('*')
                .eq('referrer_id', user.id)
                .order('created_at', { ascending: false });

            setReferrals(referralData || []);

            // Calculate total earnings
            const earnings = (referralData || [])
                .filter(r => r.status === 'completed')
                .reduce((sum, r) => sum + r.reward_amount, 0);
            setTotalEarnings(earnings);

        } catch (error) {
            console.error('Error fetching referral data:', error);
        } finally {
            setLoading(false);
        }
    };

    const generateReferralCode = (): string => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let code = '';
        for (let i = 0; i < 8; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return code;
    };

    const shareReferralLink = async () => {
        const referralLink = `https://tcsygo.com/signup?ref=${referralCode}`;
        const shareText = `Join TCSYGO and get ₹100 off on your first ride! Use my referral code: ${referralCode}\n\n${referralLink}`;

        try {
            await Share.share({
                message: shareText,
                title: 'Join TCSYGO',
            });
        } catch (error) {
            console.error('Error sharing:', error);
        }
    };

    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color="#3b82f6" />
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color="#1f2937" />
                </TouchableOpacity>
                <Text variant="h3" style={styles.title}>Refer & Earn</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                <Card style={styles.heroCard}>
                    <View style={styles.giftIcon}>
                        <Ionicons name="gift" size={32} color="#3b82f6" />
                    </View>
                    <Text style={styles.heroTitle}>Invite Friends, Get ₹50</Text>
                    <Text style={styles.heroSubtitle}>
                        Earn ₹50 for every friend who signs up and takes their first ride. They get ₹100 off!
                    </Text>

                    <View style={styles.codeContainer}>
                        <Text style={styles.codeLabel}>Your Referral Code</Text>
                        <View style={styles.codeBox}>
                            <Text style={styles.codeText}>{referralCode}</Text>
                        </View>
                    </View>

                    <Button onPress={shareReferralLink} style={styles.shareBtn}>
                        <Ionicons name="share-social" size={20} color="white" style={{ marginRight: 8 }} />
                        <Text style={styles.shareBtnText}>Share Code</Text>
                    </Button>
                </Card>

                <View style={styles.earningsGrid}>
                    <Card style={styles.statCard}>
                        <Text style={styles.statLabel}>Total Earnings</Text>
                        <Text style={styles.statValue}>₹{totalEarnings}</Text>
                    </Card>
                    <Card style={styles.statCard}>
                        <Text style={styles.statLabel}>Referrals</Text>
                        <Text style={styles.statValue}>{referrals.length}</Text>
                    </Card>
                </View>

                <View style={styles.stepsSection}>
                    <Text style={styles.sectionTitle}>How it works</Text>
                    <View style={styles.step}>
                        <View style={styles.stepNum}><Text style={styles.stepNumText}>1</Text></View>
                        <View>
                            <Text style={styles.stepTitle}>Share your code</Text>
                            <Text style={styles.stepDesc}>Share with friends and family.</Text>
                        </View>
                    </View>
                    <View style={styles.line} />
                    <View style={styles.step}>
                        <View style={styles.stepNum}><Text style={styles.stepNumText}>2</Text></View>
                        <View>
                            <Text style={styles.stepTitle}>They sign up & ride</Text>
                            <Text style={styles.stepDesc}>They get ₹100 off their first ride.</Text>
                        </View>
                    </View>
                    <View style={styles.line} />
                    <View style={styles.step}>
                        <View style={styles.stepNum}><Text style={styles.stepNumText}>3</Text></View>
                        <View>
                            <Text style={styles.stepTitle}>You earn ₹50</Text>
                            <Text style={styles.stepDesc}>Amount is credited to your wallet.</Text>
                        </View>
                    </View>
                </View>

                {referrals.length > 0 && (
                    <View style={styles.listSection}>
                        <Text style={styles.sectionTitle}>Your Referrals</Text>
                        {referrals.map((item) => (
                            <Card key={item.id} style={styles.referralItem}>
                                <View>
                                    <Text style={styles.referralStatus}>
                                        {item.status === 'completed' ? 'Completed' : 'Pending'}
                                    </Text>
                                    <Text style={styles.referralDate}>
                                        {new Date(item.created_at).toLocaleDateString()}
                                    </Text>
                                </View>
                                <View style={[
                                    styles.badge,
                                    item.status === 'completed' ? styles.badgeSuccess : styles.badgePending
                                ]}>
                                    <Text style={[
                                        styles.badgeText,
                                        item.status === 'completed' ? styles.textSuccess : styles.textPending
                                    ]}>
                                        {item.status === 'completed' ? `+₹${item.reward_amount}` : 'Pending'}
                                    </Text>
                                </View>
                            </Card>
                        ))}
                    </View>
                )}

                <View style={{ height: 40 }} />
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f9fafb',
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: 'white',
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
    },
    backBtn: {
        padding: 4,
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1f2937',
    },
    content: {
        flex: 1,
        padding: 16,
    },
    heroCard: {
        padding: 24,
        alignItems: 'center',
        backgroundColor: 'white',
        borderRadius: 20,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: '#e5e7eb',
    },
    giftIcon: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: '#eff6ff',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    heroTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#1f2937',
        marginBottom: 8,
        textAlign: 'center',
    },
    heroSubtitle: {
        fontSize: 14,
        color: '#6b7280',
        textAlign: 'center',
        marginBottom: 24,
        lineHeight: 20,
    },
    codeContainer: {
        width: '100%',
        marginBottom: 20,
    },
    codeLabel: {
        fontSize: 12,
        color: '#6b7280',
        marginBottom: 8,
        textAlign: 'center',
    },
    codeBox: {
        backgroundColor: '#f0f9ff',
        borderWidth: 1,
        borderColor: '#bfdbfe',
        borderStyle: 'dashed',
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
    },
    codeText: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#3b82f6',
        letterSpacing: 2,
    },
    shareBtn: {
        width: '100%',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    shareBtnText: {
        color: 'white',
        fontWeight: '600',
        fontSize: 16,
    },
    earningsGrid: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 24,
    },
    statCard: {
        flex: 1,
        padding: 16,
        backgroundColor: 'white',
        borderRadius: 12,
        alignItems: 'center',
        elevation: 1,
    },
    statLabel: {
        fontSize: 12,
        color: '#6b7280',
        marginBottom: 4,
    },
    statValue: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#1f2937',
    },
    stepsSection: {
        padding: 16,
        borderRadius: 16,
        backgroundColor: 'white',
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#1f2937',
        marginBottom: 16,
    },
    step: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    stepNum: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: '#eff6ff',
        justifyContent: 'center',
        alignItems: 'center',
    },
    stepNumText: {
        color: '#3b82f6',
        fontWeight: 'bold',
    },
    stepTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#1f2937',
    },
    stepDesc: {
        fontSize: 12,
        color: '#6b7280',
    },
    line: {
        width: 2,
        height: 16,
        backgroundColor: '#f3f4f6',
        marginLeft: 13, // Center with circle
        marginVertical: 4,
    },
    listSection: {
        marginBottom: 20,
    },
    referralItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        backgroundColor: 'white',
        borderRadius: 12,
        marginBottom: 10,
    },
    referralStatus: {
        fontSize: 14,
        fontWeight: '600',
        color: '#1f2937',
    },
    referralDate: {
        fontSize: 12,
        color: '#9ca3af',
        marginTop: 2,
    },
    badge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    badgeSuccess: {
        backgroundColor: '#dcfce7',
    },
    badgePending: {
        backgroundColor: '#f3f4f6',
    },
    badgeText: {
        fontSize: 12,
        fontWeight: '600',
    },
    textSuccess: {
        color: '#16a34a',
    },
    textPending: {
        color: '#6b7280',
    },
});
