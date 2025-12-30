import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Navbar } from '@/components/Navbar';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { queryClient } from '@/lib/queryClient';
import { Wallet as WalletIcon, Plus, ArrowUpRight, ArrowDownLeft, CreditCard, TrendingUp } from 'lucide-react';
import { AutoPaySetup } from '@/components/AutoPaySetup';
import { format } from 'date-fns';

declare global {
    interface Window {
        Razorpay: any;
    }
}

interface WalletData {
    id: string;
    userId: string;
    balance: number;
    currency: string;
    createdAt: string;
    updatedAt: string;
}

interface Transaction {
    id: string;
    walletId: string;
    type: 'credit' | 'debit';
    amount: number;
    description: string;
    referenceId?: string;
    status: string;
    createdAt: string;
}

import { useTranslation } from 'react-i18next';

export default function Wallet() {
    const { t } = useTranslation();
    const [, navigate] = useLocation();
    const { user } = useAuth();
    const { toast } = useToast();
    const [showAddMoney, setShowAddMoney] = useState(false);
    const [amount, setAmount] = useState('');

    // Fetch wallet data
    const { data: wallet, isLoading: loadingWallet } = useQuery<WalletData>({
        queryKey: ['wallet', user?.id],
        queryFn: async () => {
            if (!user) throw new Error('User not authenticated');

            const { data, error } = await supabase
                .from('wallets')
                .select('*')
                .eq('user_id', user.id)
                .single();

            if (error) {
                // Create wallet if doesn't exist
                if (error.code === 'PGRST116') {
                    const { data: newWallet, error: createError } = await supabase
                        .from('wallets')
                        .insert({ user_id: user.id, balance: 0, currency: 'INR' })
                        .select()
                        .single();

                    if (createError) throw createError;
                    return {
                        id: newWallet.id,
                        userId: newWallet.user_id,
                        balance: parseFloat(newWallet.balance),
                        currency: newWallet.currency,
                        createdAt: newWallet.created_at,
                        updatedAt: newWallet.updated_at
                    };
                }
                throw error;
            }

            return {
                id: data.id,
                userId: data.user_id,
                balance: parseFloat(data.balance),
                currency: data.currency,
                createdAt: data.created_at,
                updatedAt: data.updated_at
            };
        },
        enabled: !!user,
    });

    // Fetch transactions
    const { data: transactions, isLoading: loadingTransactions } = useQuery<Transaction[]>({
        queryKey: ['wallet-transactions', wallet?.id],
        queryFn: async () => {
            if (!wallet) return [];

            const { data, error } = await supabase
                .from('wallet_transactions')
                .select('*')
                .eq('wallet_id', wallet.id)
                .order('created_at', { ascending: false })
                .limit(50);

            if (error) throw error;

            return data.map(t => ({
                id: t.id,
                walletId: t.wallet_id,
                type: t.type,
                amount: parseFloat(t.amount),
                description: t.description,
                referenceId: t.reference_id,
                status: t.status,
                createdAt: t.created_at
            }));
        },
        enabled: !!wallet,
    });

    // Add money mutation
    const addMoneyMutation = useMutation({
        mutationFn: async (amountToAdd: number) => {
            const { data, error } = await supabase.functions.invoke('add-money-to-wallet', {
                body: { amount: amountToAdd }
            });

            if (error) {
                let errorMessage = error.message;
                try {
                    // Start: Attempt to read the actual error body from the function
                    if (error && typeof (error as any).context?.json === 'function') {
                        const body = await (error as any).context.json();
                        if (body && body.error) {
                            errorMessage = body.error;
                        }
                    }
                } catch (e) {
                    console.error('Failed to parse error body:', e);
                }
                throw new Error(errorMessage);
            }
            return data;
        },
        onSuccess: (data) => {
            handleRazorpayPayment(data);
        },
        onError: (error: any) => {
            toast({
                title: 'Failed to add money',
                description: error.message || 'Please try again',
                variant: 'destructive',
            });
        },
    });

    const handleRazorpayPayment = (orderData: any) => {
        const options = {
            key: import.meta.env.VITE_RAZORPAY_KEY_ID,
            amount: orderData.amount,
            currency: orderData.currency,
            name: 'TCSYGO Wallet',
            description: 'Add money to wallet',
            order_id: orderData.razorpayOrderId,
            handler: async function (response: any) {
                try {
                    const { error } = await supabase.functions.invoke('verify-wallet-payment', {
                        body: {
                            razorpayOrderId: orderData.razorpayOrderId,
                            razorpayPaymentId: response.razorpay_payment_id,
                            razorpaySignature: response.razorpay_signature,
                        }
                    });

                    if (error) throw error;

                    toast({
                        title: 'Money added successfully',
                        description: `₹${(orderData.amount / 100).toFixed(2)} added to your wallet`,
                    });

                    queryClient.invalidateQueries({ queryKey: ['wallet'] });
                    queryClient.invalidateQueries({ queryKey: ['wallet-transactions'] });
                    setShowAddMoney(false);
                    setAmount('');
                } catch (error: any) {
                    toast({
                        title: 'Payment verification failed',
                        description: error.message,
                        variant: 'destructive',
                    });
                }
            },
            prefill: {
                name: user?.fullName,
                email: user?.email,
                contact: user?.phone,
            },
            theme: {
                color: '#3b82f6',
            },
            modal: {
                ondismiss: function () {
                    toast({
                        title: 'Payment cancelled',
                        description: 'You can try again whenever you\'re ready',
                    });
                },
            },
        };

        const razorpay = new window.Razorpay(options);
        razorpay.open();
    };

    const handleAddMoney = () => {
        const amountNum = parseFloat(amount);
        if (isNaN(amountNum) || amountNum < 10) {
            toast({
                title: 'Invalid amount',
                description: 'Minimum amount is ₹10',
                variant: 'destructive',
            });
            return;
        }

        if (amountNum > 10000) {
            toast({
                title: 'Amount too large',
                description: 'Maximum amount is ₹10,000',
                variant: 'destructive',
            });
            return;
        }

        addMoneyMutation.mutate(amountNum);
    };

    const quickAmounts = [100, 200, 500, 1000, 2000];

    if (loadingWallet) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                    <p className="text-muted-foreground">{t('common.loading')}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background">
            <Navbar />

            <div className="container mx-auto px-6 py-8 max-w-4xl">
                {/* Wallet Balance Card */}
                <Card className="p-8 mb-6 bg-gradient-to-br from-primary to-primary/80 text-primary-foreground">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                                <WalletIcon className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-sm opacity-90">{t('wallet.balance')}</p>
                                <h2 className="text-4xl font-bold">₹{wallet?.balance.toFixed(2) || '0.00'}</h2>
                            </div>
                        </div>
                        <Button
                            size="lg"
                            variant="secondary"
                            className="gap-2"
                            onClick={() => setShowAddMoney(true)}
                        >
                            <Plus className="w-5 h-5" />
                            {t('wallet.addMoney')}
                        </Button>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mt-6">
                        <div className="bg-white/10 rounded-lg p-4">
                            <div className="flex items-center gap-2 mb-1">
                                <TrendingUp className="w-4 h-4" />
                                <span className="text-sm opacity-90">{t('wallet.thisMonth')}</span>
                            </div>
                            <p className="text-2xl font-semibold">
                                ₹{transactions?.filter(t =>
                                    t.type === 'debit' &&
                                    new Date(t.createdAt).getMonth() === new Date().getMonth()
                                ).reduce((sum, t) => sum + t.amount, 0).toFixed(2) || '0.00'}
                            </p>
                        </div>
                        <div className="bg-white/10 rounded-lg p-4">
                            <div className="flex items-center gap-2 mb-1">
                                <CreditCard className="w-4 h-4" />
                                <span className="text-sm opacity-90">{t('wallet.transactions')}</span>
                            </div>
                            <p className="text-2xl font-semibold">{transactions?.length || 0}</p>
                        </div>
                    </div>
                </Card>

                {/* Auto Pay Settings */}
                <div className="mb-6">
                    <AutoPaySetup />
                </div>

                {/* Quick Add Amounts */}
                <Card className="p-6 mb-6">
                    <h3 className="font-semibold mb-4">{t('wallet.quickAdd')}</h3>
                    <div className="grid grid-cols-5 gap-3">
                        {quickAmounts.map(amt => (
                            <Button
                                key={amt}
                                variant="outline"
                                onClick={() => {
                                    setAmount(amt.toString());
                                    setShowAddMoney(true);
                                }}
                            >
                                ₹{amt}
                            </Button>
                        ))}
                    </div>
                </Card>

                {/* Transaction History */}
                <Card className="p-6">
                    <h3 className="font-semibold mb-4">{t('wallet.history')}</h3>

                    {loadingTransactions ? (
                        <div className="text-center py-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                            <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
                        </div>
                    ) : transactions && transactions.length > 0 ? (
                        <div className="space-y-3">
                            {transactions.map(transaction => (
                                <div key={transaction.id} className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${transaction.type === 'credit' ? 'bg-success/10' : 'bg-destructive/10'
                                            }`}>
                                            {transaction.type === 'credit' ? (
                                                <ArrowDownLeft className={`w-5 h-5 text-success`} />
                                            ) : (
                                                <ArrowUpRight className={`w-5 h-5 text-destructive`} />
                                            )}
                                        </div>
                                        <div>
                                            <p className="font-medium">{transaction.description}</p>
                                            <p className="text-sm text-muted-foreground">
                                                {format(new Date(transaction.createdAt), 'MMM dd, yyyy • hh:mm a')}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className={`text-lg font-semibold ${transaction.type === 'credit' ? 'text-success' : 'text-destructive'
                                            }`}>
                                            {transaction.type === 'credit' ? '+' : '-'}₹{transaction.amount.toFixed(2)}
                                        </p>
                                        <Badge variant={transaction.status === 'completed' ? 'default' : 'secondary'} className="text-xs">
                                            {transaction.status}
                                        </Badge>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-12">
                            <WalletIcon className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                            <h3 className="text-lg font-semibold mb-2">No transactions yet</h3>
                            <p className="text-muted-foreground mb-4">Add money to your wallet to get started</p>
                            <Button onClick={() => setShowAddMoney(true)}>
                                <Plus className="w-4 h-4 mr-2" />
                                {t('wallet.addMoney')}
                            </Button>
                        </div>
                    )}
                </Card>
            </div>

            {/* Add Money Dialog */}
            <Dialog open={showAddMoney} onOpenChange={setShowAddMoney}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t('wallet.addMoney')}</DialogTitle>
                        <DialogDescription>
                            Enter the amount you want to add (₹10 - ₹10,000)
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        <div>
                            <Label htmlFor="amount">Amount</Label>
                            <div className="relative mt-2">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">₹</span>
                                <Input
                                    id="amount"
                                    type="number"
                                    placeholder="0.00"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    className="pl-8"
                                    min="10"
                                    max="10000"
                                />
                            </div>
                        </div>

                        <Separator />

                        <div className="grid grid-cols-3 gap-2">
                            {[100, 500, 1000].map(amt => (
                                <Button
                                    key={amt}
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setAmount(amt.toString())}
                                >
                                    ₹{amt}
                                </Button>
                            ))}
                        </div>

                        <Button
                            className="w-full"
                            size="lg"
                            onClick={handleAddMoney}
                            disabled={addMoneyMutation.isPending}
                        >
                            {addMoneyMutation.isPending ? 'Processing...' : `Add ₹${amount || '0'}`}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
