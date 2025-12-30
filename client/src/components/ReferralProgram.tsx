import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Gift, Copy, Share2, Users, Trophy } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

interface Referral {
    id: string;
    referred_id: string | null;
    status: string;
    reward_amount: number;
    created_at: string;
}

export function ReferralProgram() {
    const { user } = useAuth();
    const { toast } = useToast();
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

        try {
            setLoading(true);

            // Get or create referral code
            const { data: userData, error: userError } = await supabase
                .from('users')
                .select('referral_code')
                .eq('id', user.id)
                .single();

            if (userError) throw userError;

            let code = userData?.referral_code;

            // Generate referral code if doesn't exist
            if (!code) {
                code = generateReferralCode();
                await supabase
                    .from('users')
                    .update({ referral_code: code })
                    .eq('id', user.id);
            }

            setReferralCode(code);

            // Fetch referrals
            const { data: referralData, error: referralError } = await supabase
                .from('referrals')
                .select('*')
                .eq('referrer_id', user.id)
                .order('created_at', { ascending: false });

            if (referralError) throw referralError;

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

    const copyReferralCode = () => {
        navigator.clipboard.writeText(referralCode);
        toast({
            title: 'Copied!',
            description: 'Referral code copied to clipboard',
        });
    };

    const shareReferralLink = async () => {
        const referralLink = `https://tcsygo.com/signup?ref=${referralCode}`;
        const shareText = `Join TCSYGO and get ₹100 off on your first ride! Use my referral code: ${referralCode}\n\n${referralLink}`;

        if (navigator.share) {
            try {
                await navigator.share({
                    title: 'Join TCSYGO',
                    text: shareText,
                });
            } catch (error) {
                console.error('Error sharing:', error);
            }
        } else {
            navigator.clipboard.writeText(shareText);
            toast({
                title: 'Link Copied!',
                description: 'Referral link copied to clipboard',
            });
        }
    };

    if (loading) {
        return (
            <Card className="p-6">
                <div className="animate-pulse space-y-4">
                    <div className="h-8 bg-muted rounded w-1/3"></div>
                    <div className="h-24 bg-muted rounded"></div>
                </div>
            </Card>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <Card className="p-6 bg-gradient-to-br from-primary/10 to-primary/5">
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                        <Gift className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold">Referral Program</h2>
                        <p className="text-sm text-muted-foreground">Earn ₹50 for each friend you refer!</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card className="p-4 bg-background">
                        <p className="text-sm text-muted-foreground mb-2">Your Referral Code</p>
                        <div className="flex items-center gap-2">
                            <Input
                                value={referralCode}
                                readOnly
                                className="font-mono text-lg font-bold"
                            />
                            <Button onClick={copyReferralCode} size="icon">
                                <Copy className="w-4 h-4" />
                            </Button>
                        </div>
                    </Card>

                    <Card className="p-4 bg-background">
                        <p className="text-sm text-muted-foreground mb-2">Total Earnings</p>
                        <p className="text-3xl font-bold text-success">₹{totalEarnings}</p>
                    </Card>
                </div>

                <Button onClick={shareReferralLink} className="w-full mt-4 gap-2">
                    <Share2 className="w-4 h-4" />
                    Share Referral Link
                </Button>
            </Card>

            {/* How it Works */}
            <Card className="p-6">
                <h3 className="font-semibold text-lg mb-4">How it Works</h3>
                <div className="space-y-4">
                    <div className="flex gap-4">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <span className="font-bold text-primary">1</span>
                        </div>
                        <div>
                            <h4 className="font-semibold">Share your code</h4>
                            <p className="text-sm text-muted-foreground">
                                Share your unique referral code with friends and family
                            </p>
                        </div>
                    </div>

                    <div className="flex gap-4">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <span className="font-bold text-primary">2</span>
                        </div>
                        <div>
                            <h4 className="font-semibold">They sign up</h4>
                            <p className="text-sm text-muted-foreground">
                                Your friend signs up using your referral code and gets ₹100 off
                            </p>
                        </div>
                    </div>

                    <div className="flex gap-4">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <span className="font-bold text-primary">3</span>
                        </div>
                        <div>
                            <h4 className="font-semibold">You both earn</h4>
                            <p className="text-sm text-muted-foreground">
                                After their first ride, you get ₹50 credited to your wallet
                            </p>
                        </div>
                    </div>
                </div>
            </Card>

            {/* Referral Stats */}
            <Card className="p-6">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-lg flex items-center gap-2">
                        <Users className="w-5 h-5" />
                        Your Referrals ({referrals.length})
                    </h3>
                    {referrals.length >= 10 && (
                        <Badge className="gap-1">
                            <Trophy className="w-3 h-3" />
                            Super Referrer
                        </Badge>
                    )}
                </div>

                {referrals.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                        <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p>No referrals yet. Start sharing your code!</p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {referrals.slice(0, 5).map((referral) => (
                            <div key={referral.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                                <div>
                                    <p className="text-sm font-medium">
                                        {referral.referred_id ? 'Referral Completed' : 'Pending'}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        {new Date(referral.created_at).toLocaleDateString()}
                                    </p>
                                </div>
                                <Badge variant={referral.status === 'completed' ? 'default' : 'secondary'}>
                                    {referral.status === 'completed' ? `+₹${referral.reward_amount}` : 'Pending'}
                                </Badge>
                            </div>
                        ))}
                    </div>
                )}
            </Card>
        </div>
    );
}
