import React, { useState, useEffect } from 'react';
import { View, ScrollView, TouchableOpacity, Share, ActivityIndicator, Alert, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/contexts/ThemeContext';
import { useResponsive } from '@/hooks/useResponsive';
 
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
    const { theme, isDark } = useTheme();
    const { hScale, vScale, spacing, fontSize } = useResponsive();
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
 
            const { data: referralData } = await supabase
                .from('referrals')
                .select('*')
                .eq('referrer_id', user.id)
                .order('created_at', { ascending: false });
 
            setReferrals(referralData || []);
 
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
            <SafeAreaView style={{ gap: spacing.lg }} className="flex-1 bg-white dark:bg-slate-950 justify-center items-center">
                <ActivityIndicator size="large" color={isDark ? "#ffffff" : "#3b82f6"} />
                <Text style={{ fontSize: hScale(10) }} className="text-slate-500 dark:text-slate-500 font-black uppercase tracking-widest">Generating Your Link...</Text>
            </SafeAreaView>
        );
    }
 
    const Step = ({ index, title, description, last = false }: { index: number, title: string, description: string, last?: boolean }) => (
        <View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xl }}>
                <View style={{ width: hScale(40), height: hScale(40), borderRadius: hScale(16) }} className="bg-slate-900 dark:bg-white items-center justify-center shadow-lg shadow-slate-900/10">
                    <Text style={{ fontSize: fontSize.sm }} className="text-white dark:text-slate-900 font-black">{index}</Text>
                </View>
                <View className="flex-1">
                    <Text style={{ fontSize: fontSize.sm }} className="font-bold text-slate-900 dark:text-white uppercase tracking-tight">{title}</Text>
                    <Text style={{ fontSize: hScale(11), marginTop: vScale(2), lineHeight: vScale(16) }} className="font-medium text-slate-500 dark:text-slate-500">{description}</Text>
                </View>
            </View>
            {!last && <View style={{ width: 2, height: vScale(24), marginLeft: hScale(19), marginVertical: vScale(4) }} className="bg-slate-100 dark:bg-slate-800" />}
        </View>
    );
 
    return (
        <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-950" edges={['top']}>
            <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
            
            {/* Header */}
            <View style={{ paddingHorizontal: spacing.xl, paddingVertical: vScale(16), borderBottomWidth: 1 }} className="flex-row items-center justify-between border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-sm z-10">
                <TouchableOpacity 
                    onPress={() => router.back()} 
                    style={{ width: hScale(40), height: hScale(40) }}
                    className="rounded-full bg-slate-50 dark:bg-slate-900 items-center justify-center active:bg-slate-100 dark:active:bg-slate-800"
                >
                    <Ionicons name="arrow-back" size={hScale(24)} color={isDark ? "#f8fafc" : "#1e293b"} />
                </TouchableOpacity>
                <Text style={{ fontSize: fontSize.xl }} className="font-black text-slate-900 dark:text-white uppercase tracking-tighter">Refer & Earn</Text>
                <View style={{ width: hScale(40) }} />
            </View>
 
            <ScrollView 
                style={{ flex: 1, paddingHorizontal: spacing.xl, paddingTop: vScale(24) }}
                contentContainerStyle={{ paddingBottom: vScale(100) }}
                showsVerticalScrollIndicator={false}
            >
                 <Card style={{ padding: spacing.xxl, borderRadius: hScale(40), marginBottom: vScale(32), borderWidth: 1 }} className="items-center bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 shadow-sm relative overflow-hidden">
                    <View style={{ width: hScale(128), height: hScale(128), marginRight: hScale(-64), marginTop: vScale(-64) }} className="absolute top-0 right-0 bg-blue-500/5 rounded-full" />
                    
                    <View style={{ width: hScale(80), height: hScale(80), borderRadius: hScale(28), marginBottom: vScale(24) }} className="bg-blue-50 dark:bg-blue-900/20 justify-center items-center">
                        <Ionicons name="gift" size={hScale(40)} color={isDark ? "#60a5fa" : "#3b82f6"} strokeWidth={3} />
                    </View>
                    
                    <Text style={{ fontSize: fontSize.xxl, marginBottom: vScale(8) }} className="font-black text-slate-900 dark:text-white text-center uppercase tracking-tighter">Invite Friends, Get ₹50</Text>
                    <Text style={{ fontSize: fontSize.xs, marginBottom: vScale(32), lineHeight: vScale(20), maxWidth: hScale(240) }} className="font-medium text-slate-500 dark:text-slate-500 text-center uppercase tracking-widest">
                        Earn ₹50 for every friend who signs up and rides. They get ₹100 off!
                    </Text>
 
                    <View style={{ width: '100%', marginBottom: vScale(32) }}>
                        <Text style={{ fontSize: hScale(10), marginBottom: vScale(12) }} className="font-black text-slate-400 dark:text-slate-500 text-center uppercase tracking-[2px]">Your Secure Code</Text>
                        <View style={{ padding: spacing.xl, borderRadius: hScale(24), borderWidth: 2 }} className="bg-slate-50 dark:bg-slate-950 border-slate-100 dark:border-slate-800 border-dashed items-center">
                            <Text style={{ fontSize: hScale(30) }} className="font-black text-blue-600 dark:text-blue-500 uppercase tracking-[6px]">{referralCode}</Text>
                        </View>
                    </View>
 
                    <Button 
                        onPress={shareReferralLink} 
                        style={{ width: '100%', height: vScale(64), borderRadius: hScale(24), gap: spacing.md }}
                        className="bg-slate-900 dark:bg-white flex-row justify-center items-center shadow-lg shadow-slate-900/10"
                    >
                        <Ionicons name="share-social" size={hScale(20)} color={isDark ? "#0f172a" : "#ffffff"} />
                        <Text style={{ fontSize: fontSize.base }} className="text-white dark:text-slate-900 font-black uppercase tracking-widest">Broadcast Code</Text>
                    </Button>
                </Card>
 
                <View style={{ flexDirection: 'row', gap: spacing.lg, marginBottom: vScale(40) }}>
                    <Card style={{ padding: spacing.xl, borderRadius: hScale(32), borderWidth: 1 }} className="flex-1 bg-white dark:bg-slate-900 items-center shadow-sm border-slate-100 dark:border-slate-800">
                        <Text style={{ fontSize: fontSize.xl }} className="font-black text-slate-900 dark:text-white uppercase tracking-tighter">₹{totalEarnings}</Text>
                        <Text style={{ fontSize: hScale(9), marginTop: vScale(4) }} className="font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Rewards</Text>
                    </Card>
                    <Card style={{ padding: spacing.xl, borderRadius: hScale(32), borderWidth: 1 }} className="flex-1 bg-white dark:bg-slate-900 items-center shadow-sm border-slate-100 dark:border-slate-800">
                        <Text style={{ fontSize: fontSize.xl }} className="font-black text-slate-900 dark:text-white uppercase tracking-tighter">{referrals.length}</Text>
                        <Text style={{ fontSize: hScale(9), marginTop: vScale(4) }} className="font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Referrals</Text>
                    </Card>
                </View>
 
                <View style={{ padding: spacing.xxl, borderRadius: hScale(40), marginBottom: vScale(40), borderWidth: 1 }} className="bg-white dark:bg-slate-900 shadow-sm border-slate-100 dark:border-slate-800">
                    <Text style={{ fontSize: hScale(10), marginBottom: vScale(32), paddingHorizontal: spacing.xs }} className="font-black text-slate-400 dark:text-slate-500 uppercase tracking-[2px]">How It Works</Text>
                    <Step 
                        index={1} 
                        title="Distribute Protocol" 
                        description="Share your unique code with your personal network." 
                    />
                    <Step 
                        index={2} 
                        title="Friend Activation" 
                        description="They get ₹100 instant discount on their first ride." 
                    />
                    <Step 
                        index={3} 
                        title="Reward Unlocked" 
                        description="₹50 is credited to your secure vault immediately." 
                        last
                    />
                </View>
 
                {referrals.length > 0 && (
                    <View style={{ marginBottom: vScale(40) }}>
                        <Text style={{ fontSize: hScale(10), marginBottom: vScale(24), paddingHorizontal: spacing.xs }} className="font-black text-slate-400 dark:text-slate-500 uppercase tracking-[2px]">Network Activity</Text>
                        {referrals.map((item) => (
                            <View key={item.id} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.xl, borderRadius: hScale(28), marginBottom: vScale(16), borderWidth: 1 }} className="bg-white dark:bg-slate-900 shadow-sm border-slate-100 dark:border-slate-800">
                                <View>
                                    <Text style={{ fontSize: fontSize.sm }} className="font-bold text-slate-900 dark:text-white uppercase tracking-tight">
                                        {item.status === 'completed' ? 'SUCCESSFUL SYNC' : 'PENDING ACTIVATION'}
                                    </Text>
                                    <Text style={{ fontSize: hScale(10), marginTop: vScale(4) }} className="font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                                        {new Date(item.created_at).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                                    </Text>
                                </View>
                                <View style={{ paddingHorizontal: spacing.md, paddingVertical: vScale(4), borderRadius: hScale(12) }} className={item.status === 'completed' ? 'bg-green-50 dark:bg-green-900/20' : 'bg-slate-50 dark:bg-slate-800'}>
                                    <Text style={{ fontSize: hScale(10) }} className={`font-black uppercase tracking-widest ${item.status === 'completed' ? 'text-green-600' : 'text-slate-500'}`}>
                                        {item.status === 'completed' ? `+₹${item.reward_amount}` : 'PENDING'}
                                    </Text>
                                </View>
                            </View>
                        ))}
                    </View>
                )}
 
                <View style={{ paddingHorizontal: spacing.xxl, marginBottom: vScale(80) }} className="opacity-30">
                    <Text style={{ fontSize: hScale(9), lineHeight: vScale(16) }} className="font-extrabold text-slate-500 text-center uppercase tracking-widest">
                        Rewards are subject to verified account activity. TCSYGO reserves the right to audit referrals.
                    </Text>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}
