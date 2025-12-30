import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import {
    Wallet,
    CreditCard,
    Smartphone,
    Banknote,
    Check,
    Plus,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';

interface PaymentMethod {
    id: string;
    type: 'upi' | 'card' | 'wallet' | 'cash';
    details: {
        upiId?: string;
        cardLast4?: string;
        cardBrand?: string;
        walletProvider?: string;
    };
    isDefault: boolean;
}

interface MultiPaymentSelectorProps {
    amount: number;
    onPaymentMethodSelect: (method: PaymentMethod | { type: 'cash' }) => void;
    selectedMethod?: PaymentMethod | { type: 'cash' };
    showCashOption?: boolean;
}

const UPI_APPS = [
    { id: 'googlepay', name: 'Google Pay', icon: '🔵' },
    { id: 'phonepe', name: 'PhonePe', icon: '🟣' },
    { id: 'paytm', name: 'Paytm', icon: '🔵' },
    { id: 'bhim', name: 'BHIM UPI', icon: '🟢' },
];

export function MultiPaymentSelector({
    amount,
    onPaymentMethodSelect,
    selectedMethod,
    showCashOption = true,
}: MultiPaymentSelectorProps) {
    const { user } = useAuth();
    const [paymentType, setPaymentType] = useState<'upi' | 'card' | 'wallet' | 'cash'>('wallet');
    const [upiId, setUpiId] = useState('');
    const [selectedUpiApp, setSelectedUpiApp] = useState('');

    // Fetch wallet balance
    const { data: wallet } = useQuery({
        queryKey: ['wallet', user?.id],
        queryFn: async () => {
            if (!user?.id) return null;

            const { data, error } = await supabase
                .from('wallets')
                .select('*')
                .eq('user_id', user.id)
                .single();

            if (error) return null;
            return data;
        },
        enabled: !!user?.id,
    });

    // Fetch saved payment methods
    const { data: savedMethods } = useQuery<PaymentMethod[]>({
        queryKey: ['payment-methods', user?.id],
        queryFn: async () => {
            if (!user?.id) return [];

            const { data, error } = await supabase
                .from('payment_methods')
                .select('*')
                .eq('user_id', user.id)
                .eq('is_active', true);

            if (error) return [];
            return data || [];
        },
        enabled: !!user?.id,
    });

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            minimumFractionDigits: 0,
        }).format(value);
    };

    const handlePaymentTypeChange = (type: 'upi' | 'card' | 'wallet' | 'cash') => {
        setPaymentType(type);
        if (type === 'wallet' && wallet) {
            onPaymentMethodSelect({ type: 'wallet', id: wallet.id, details: {}, isDefault: true });
        } else if (type === 'cash') {
            onPaymentMethodSelect({ type: 'cash' });
        }
    };

    const walletBalance = wallet?.balance || 0;
    const hasEnoughBalance = walletBalance >= amount;

    return (
        <div className="space-y-4">
            <div className="space-y-2">
                <Label className="text-base font-semibold">Select Payment Method</Label>
                <p className="text-sm text-muted-foreground">
                    Amount to pay: <span className="font-semibold">{formatCurrency(amount)}</span>
                </p>
            </div>

            <RadioGroup value={paymentType} onValueChange={handlePaymentTypeChange}>
                {/* Wallet Option */}
                <Card
                    className={cn(
                        'cursor-pointer transition-all',
                        paymentType === 'wallet' && 'ring-2 ring-primary'
                    )}
                    onClick={() => handlePaymentTypeChange('wallet')}
                >
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <RadioGroupItem value="wallet" id="wallet" />
                                <Wallet className="h-5 w-5 text-primary" />
                                <div>
                                    <Label htmlFor="wallet" className="cursor-pointer font-medium">
                                        Wallet
                                    </Label>
                                    <p className="text-sm text-muted-foreground">
                                        Balance: {formatCurrency(walletBalance)}
                                    </p>
                                </div>
                            </div>
                            {hasEnoughBalance ? (
                                <Badge variant="default" className="bg-green-500">
                                    <Check className="h-3 w-3 mr-1" />
                                    Available
                                </Badge>
                            ) : (
                                <Badge variant="destructive">Insufficient</Badge>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* UPI Option */}
                <Card
                    className={cn(
                        'cursor-pointer transition-all',
                        paymentType === 'upi' && 'ring-2 ring-primary'
                    )}
                    onClick={() => handlePaymentTypeChange('upi')}
                >
                    <CardContent className="p-4">
                        <div className="space-y-3">
                            <div className="flex items-center gap-3">
                                <RadioGroupItem value="upi" id="upi" />
                                <Smartphone className="h-5 w-5 text-primary" />
                                <Label htmlFor="upi" className="cursor-pointer font-medium">
                                    UPI
                                </Label>
                            </div>

                            {paymentType === 'upi' && (
                                <div className="ml-9 space-y-3">
                                    <div className="grid grid-cols-2 gap-2">
                                        {UPI_APPS.map((app) => (
                                            <Button
                                                key={app.id}
                                                type="button"
                                                variant={selectedUpiApp === app.id ? 'default' : 'outline'}
                                                size="sm"
                                                onClick={() => setSelectedUpiApp(app.id)}
                                                className="justify-start"
                                            >
                                                <span className="mr-2">{app.icon}</span>
                                                {app.name}
                                            </Button>
                                        ))}
                                    </div>
                                    <Separator />
                                    <div className="space-y-2">
                                        <Label htmlFor="upi-id" className="text-sm">
                                            Or enter UPI ID
                                        </Label>
                                        <Input
                                            id="upi-id"
                                            placeholder="yourname@upi"
                                            value={upiId}
                                            onChange={(e) => setUpiId(e.target.value)}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Card Option */}
                <Card
                    className={cn(
                        'cursor-pointer transition-all',
                        paymentType === 'card' && 'ring-2 ring-primary'
                    )}
                    onClick={() => handlePaymentTypeChange('card')}
                >
                    <CardContent className="p-4">
                        <div className="space-y-3">
                            <div className="flex items-center gap-3">
                                <RadioGroupItem value="card" id="card" />
                                <CreditCard className="h-5 w-5 text-primary" />
                                <Label htmlFor="card" className="cursor-pointer font-medium">
                                    Credit / Debit Card
                                </Label>
                            </div>

                            {paymentType === 'card' && savedMethods && savedMethods.length > 0 && (
                                <div className="ml-9 space-y-2">
                                    {savedMethods
                                        .filter((m) => m.type === 'card')
                                        .map((method) => (
                                            <Button
                                                key={method.id}
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                className="w-full justify-start"
                                                onClick={() => onPaymentMethodSelect(method)}
                                            >
                                                <CreditCard className="h-4 w-4 mr-2" />
                                                {method.details.cardBrand} •••• {method.details.cardLast4}
                                            </Button>
                                        ))}
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        className="w-full justify-start text-primary"
                                    >
                                        <Plus className="h-4 w-4 mr-2" />
                                        Add New Card
                                    </Button>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Cash Option */}
                {showCashOption && (
                    <Card
                        className={cn(
                            'cursor-pointer transition-all',
                            paymentType === 'cash' && 'ring-2 ring-primary'
                        )}
                        onClick={() => handlePaymentTypeChange('cash')}
                    >
                        <CardContent className="p-4">
                            <div className="flex items-center gap-3">
                                <RadioGroupItem value="cash" id="cash" />
                                <Banknote className="h-5 w-5 text-primary" />
                                <div>
                                    <Label htmlFor="cash" className="cursor-pointer font-medium">
                                        Cash
                                    </Label>
                                    <p className="text-sm text-muted-foreground">
                                        Pay driver after ride completion
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}
            </RadioGroup>

            {/* Payment Summary */}
            <Card className="bg-accent">
                <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Total Amount</span>
                        <span className="text-lg font-bold">{formatCurrency(amount)}</span>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
