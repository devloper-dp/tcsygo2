import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { Wallet, Plus, TrendingUp, ArrowRight } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Skeleton } from '@/components/ui/skeleton';

interface WalletData {
    id: string;
    userId: string;
    balance: number;
    currency: string;
}

interface Transaction {
    id: string;
    type: 'credit' | 'debit';
    amount: number;
    description: string;
    createdAt: string;
}

export function WalletBalanceWidget() {
    const { user } = useAuth();
    const [, setLocation] = useLocation();
    const [isOpen, setIsOpen] = useState(false);

    // Fetch wallet balance
    const { data: wallet, isLoading } = useQuery<WalletData>({
        queryKey: ['wallet-balance', user?.id],
        queryFn: async () => {
            if (!user?.id) throw new Error('User not authenticated');

            const { data, error } = await supabase
                .from('wallets')
                .select('*')
                .eq('user_id', user.id)
                .single();

            if (error) {
                // If wallet doesn't exist, create one
                if (error.code === 'PGRST116') {
                    const { data: newWallet, error: createError } = await supabase
                        .from('wallets')
                        .insert({
                            user_id: user.id,
                            balance: 0,
                            currency: 'INR',
                        })
                        .select()
                        .single();

                    if (createError) throw createError;
                    return newWallet;
                }
                throw error;
            }

            return data;
        },
        enabled: !!user?.id,
        refetchInterval: 30000, // Refetch every 30 seconds
    });

    // Fetch recent transactions
    const { data: recentTransactions } = useQuery<Transaction[]>({
        queryKey: ['recent-transactions', wallet?.id],
        queryFn: async () => {
            if (!wallet?.id) return [];

            const { data, error } = await supabase
                .from('wallet_transactions')
                .select('*')
                .eq('wallet_id', wallet.id)
                .order('created_at', { ascending: false })
                .limit(3);

            if (error) throw error;
            return data || [];
        },
        enabled: !!wallet?.id,
    });

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: wallet?.currency || 'INR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(amount);
    };

    const handleViewWallet = () => {
        setIsOpen(false);
        setLocation('/wallet');
    };

    if (!user) return null;

    return (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="ghost"
                    size="sm"
                    className="gap-2 hover:bg-accent"
                >
                    <Wallet className="h-4 w-4" />
                    {isLoading ? (
                        <Skeleton className="h-4 w-16" />
                    ) : (
                        <span className="font-semibold">
                            {formatCurrency(wallet?.balance || 0)}
                        </span>
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80" align="end">
                <div className="space-y-4">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="font-semibold text-lg">Wallet Balance</h3>
                            <p className="text-sm text-muted-foreground">
                                Available funds
                            </p>
                        </div>
                        <Wallet className="h-5 w-5 text-primary" />
                    </div>

                    {/* Balance Display */}
                    <Card className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground">
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm opacity-90">Total Balance</p>
                                    {isLoading ? (
                                        <Skeleton className="h-8 w-32 mt-1 bg-primary-foreground/20" />
                                    ) : (
                                        <p className="text-3xl font-bold mt-1">
                                            {formatCurrency(wallet?.balance || 0)}
                                        </p>
                                    )}
                                </div>
                                <TrendingUp className="h-8 w-8 opacity-75" />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Recent Transactions */}
                    {recentTransactions && recentTransactions.length > 0 && (
                        <div className="space-y-2">
                            <h4 className="text-sm font-medium text-muted-foreground">
                                Recent Transactions
                            </h4>
                            <div className="space-y-2">
                                {recentTransactions.map((transaction) => (
                                    <div
                                        key={transaction.id}
                                        className="flex items-center justify-between text-sm p-2 rounded-lg hover:bg-accent/50 transition-colors"
                                    >
                                        <div className="flex-1">
                                            <p className="font-medium truncate">
                                                {transaction.description}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                {new Date(transaction.createdAt).toLocaleDateString()}
                                            </p>
                                        </div>
                                        <span
                                            className={`font-semibold ${transaction.type === 'credit'
                                                    ? 'text-green-600'
                                                    : 'text-red-600'
                                                }`}
                                        >
                                            {transaction.type === 'credit' ? '+' : '-'}
                                            {formatCurrency(transaction.amount)}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex gap-2">
                        <Button
                            onClick={handleViewWallet}
                            variant="outline"
                            className="flex-1 gap-2"
                        >
                            View Details
                            <ArrowRight className="h-4 w-4" />
                        </Button>
                        <Button
                            onClick={() => {
                                setIsOpen(false);
                                setLocation('/wallet');
                            }}
                            className="flex-1 gap-2"
                        >
                            <Plus className="h-4 w-4" />
                            Add Money
                        </Button>
                    </div>
                </div>
            </PopoverContent>
        </Popover>
    );
}
