import { useState } from 'react';
import { useLocation } from 'wouter';
import { useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { queryClient } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { CreditCard, Plus, Trash2, Shield, Smartphone, Wallet, DollarSign } from 'lucide-react';
import { AutoPaySetup } from '@/components/AutoPaySetup';

interface PaymentMethod {
    id: string;
    type: 'card' | 'upi' | 'wallet' | 'cash';
    lastFour?: string;
    cardBrand?: string;
    upiId?: string;
    walletType?: string;
    isDefault: boolean;
    provider?: string;
}

export default function PaymentMethodsPage() {
    const [, navigate] = useLocation();
    const { user } = useAuth();
    const { toast } = useToast();
    const [addDialogOpen, setAddDialogOpen] = useState(false);
    const [paymentType, setPaymentType] = useState<'card' | 'upi' | 'wallet'>('card');
    // Card fields
    const [cardNumber, setCardNumber] = useState('');
    const [cardholderName, setCardholderName] = useState('');
    const [expiryMonth, setExpiryMonth] = useState('');
    const [expiryYear, setExpiryYear] = useState('');
    const [cvv, setCvv] = useState('');
    // UPI fields
    const [upiId, setUpiId] = useState('');
    // Wallet fields
    const [walletType, setWalletType] = useState('');
    const [walletNumber, setWalletNumber] = useState('');
    const [isDefault, setIsDefault] = useState(false);

    const { data: paymentMethods, isLoading } = useQuery<PaymentMethod[]>({
        queryKey: ['payment-methods', user?.id],
        queryFn: async () => {
            if (!user) return [];
            const { data, error } = await supabase
                .from('payment_methods')
                .select('*')
                .eq('user_id', user.id)
                .order('is_default', { ascending: false });

            if (error) throw error;
            return data.map((pm: any) => ({
                id: pm.id,
                type: pm.type,
                lastFour: pm.last_four,
                cardBrand: pm.card_brand,
                upiId: pm.upi_id,
                walletType: pm.wallet_type,
                provider: pm.provider,
                isDefault: pm.is_default,
            }));
        },
        enabled: !!user,
    });

    const addPaymentMutation = useMutation({
        mutationFn: async () => {
            if (paymentType === 'card') {
                if (!cardNumber || !cardholderName || !expiryMonth || !expiryYear || !cvv) {
                    throw new Error('All card fields are required');
                }

                const cleanCardNumber = cardNumber.replace(/\s/g, '');
                if (cleanCardNumber.length < 13 || cleanCardNumber.length > 19) {
                    throw new Error('Invalid card number');
                }

                const month = parseInt(expiryMonth);
                const year = parseInt(expiryYear);
                if (month < 1 || month > 12) {
                    throw new Error('Invalid expiry month');
                }
                const currentYear = new Date().getFullYear() % 100;
                if (year < currentYear) {
                    throw new Error('Card has expired');
                }

                if (cvv.length < 3 || cvv.length > 4) {
                    throw new Error('Invalid CVV');
                }

                const cardBrand = detectCardBrand(cleanCardNumber);
                const lastFour = cleanCardNumber.slice(-4);

                if (isDefault) {
                    await supabase
                        .from('payment_methods')
                        .update({ is_default: false })
                        .eq('user_id', user?.id);
                }

                const { error } = await supabase
                    .from('payment_methods')
                    .insert({
                        user_id: user?.id,
                        type: 'card',
                        last_four: lastFour,
                        card_brand: cardBrand,
                        is_default: isDefault,
                    });

                if (error) throw error;
            } else if (paymentType === 'upi') {
                if (!upiId) {
                    throw new Error('UPI ID is required');
                }

                // Basic UPI ID validation
                const upiRegex = /^[\w.-]+@[\w.-]+$/;
                if (!upiRegex.test(upiId)) {
                    throw new Error('Invalid UPI ID format');
                }

                if (isDefault) {
                    await supabase
                        .from('payment_methods')
                        .update({ is_default: false })
                        .eq('user_id', user?.id);
                }

                const { error } = await supabase
                    .from('payment_methods')
                    .insert({
                        user_id: user?.id,
                        type: 'upi',
                        upi_id: upiId,
                        is_default: isDefault,
                    });

                if (error) throw error;
            } else if (paymentType === 'wallet') {
                if (!walletType || !walletNumber) {
                    throw new Error('Wallet type and number are required');
                }

                if (isDefault) {
                    await supabase
                        .from('payment_methods')
                        .update({ is_default: false })
                        .eq('user_id', user?.id);
                }

                const { error } = await supabase
                    .from('payment_methods')
                    .insert({
                        user_id: user?.id,
                        type: 'wallet',
                        wallet_type: walletType,
                        provider: walletNumber,
                        is_default: isDefault,
                    });

                if (error) throw error;
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['payment-methods'] });
            toast({
                title: 'Success',
                description: 'Payment method added successfully',
            });
            setAddDialogOpen(false);
            resetForm();
        },
        onError: (error: any) => {
            toast({
                title: 'Error',
                description: error.message || 'Failed to add payment method',
                variant: 'destructive',
            });
        },
    });

    const setDefaultMutation = useMutation({
        mutationFn: async (methodId: string) => {
            await supabase
                .from('payment_methods')
                .update({ is_default: false })
                .eq('user_id', user?.id);

            const { error } = await supabase
                .from('payment_methods')
                .update({ is_default: true })
                .eq('id', methodId);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['payment-methods'] });
            toast({
                title: 'Success',
                description: 'Default payment method updated',
            });
        },
    });

    const deleteMutation = useMutation({
        mutationFn: async (methodId: string) => {
            const { error } = await supabase
                .from('payment_methods')
                .delete()
                .eq('id', methodId);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['payment-methods'] });
            toast({
                title: 'Success',
                description: 'Payment method removed',
            });
        },
    });

    const detectCardBrand = (cardNumber: string): string => {
        if (cardNumber.startsWith('4')) return 'visa';
        if (cardNumber.startsWith('5')) return 'mastercard';
        if (cardNumber.startsWith('3')) return 'amex';
        if (cardNumber.startsWith('6')) return 'discover';
        return 'unknown';
    };

    const formatCardNumber = (text: string) => {
        const cleaned = text.replace(/\D/g, '');
        const formatted = cleaned.match(/.{1,4}/g)?.join(' ') || cleaned;
        setCardNumber(formatted);
    };

    const resetForm = () => {
        setCardNumber('');
        setCardholderName('');
        setExpiryMonth('');
        setExpiryYear('');
        setCvv('');
        setUpiId('');
        setWalletType('');
        setWalletNumber('');
        setIsDefault(false);
        setPaymentType('card');
    };

    const getPaymentIcon = (method: PaymentMethod) => {
        switch (method.type) {
            case 'card':
                return <CreditCard className="h-8 w-8 text-blue-600" />;
            case 'upi':
                return <Smartphone className="h-8 w-8 text-purple-600" />;
            case 'wallet':
                return <Wallet className="h-8 w-8 text-green-600" />;
            case 'cash':
                return <DollarSign className="h-8 w-8 text-orange-600" />;
            default:
                return <CreditCard className="h-8 w-8 text-gray-600" />;
        }
    };

    const getPaymentDisplayText = (method: PaymentMethod) => {
        switch (method.type) {
            case 'card':
                return `${method.cardBrand?.toUpperCase() || 'CARD'} •••• ${method.lastFour || '****'}`;
            case 'upi':
                return `UPI: ${method.upiId || 'Unknown'}`;
            case 'wallet':
                return `${method.walletType?.toUpperCase() || 'WALLET'}: ${method.provider || 'Unknown'}`;
            case 'cash':
                return 'Cash Payment';
            default:
                return 'Unknown Payment Method';
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 py-8">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="mb-6">
                    <Button
                        variant="ghost"
                        onClick={() => navigate('/profile')}
                        className="mb-4"
                    >
                        ← Back to Profile
                    </Button>
                    <div className="flex items-center justify-between">
                        <h1 className="text-3xl font-bold text-gray-900">Payment Methods</h1>
                        <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
                            <DialogTrigger asChild>
                                <Button>
                                    <Plus className="h-4 w-4 mr-2" />
                                    Add Payment Method
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-[600px]">
                                <DialogHeader>
                                    <DialogTitle>Add Payment Method</DialogTitle>
                                    <DialogDescription>
                                        Add a new payment method to your account. Your information is encrypted and secure.
                                    </DialogDescription>
                                </DialogHeader>
                                <div className="grid gap-4 py-4">
                                    <Tabs value={paymentType} onValueChange={(v) => setPaymentType(v as 'card' | 'upi' | 'wallet')}>
                                        <TabsList className="grid w-full grid-cols-3">
                                            <TabsTrigger value="card">Card</TabsTrigger>
                                            <TabsTrigger value="upi">UPI</TabsTrigger>
                                            <TabsTrigger value="wallet">Wallet</TabsTrigger>
                                        </TabsList>
                                        
                                        <TabsContent value="card" className="space-y-4">
                                            <div className="grid gap-2">
                                                <Label htmlFor="cardNumber">Card Number</Label>
                                                <Input
                                                    id="cardNumber"
                                                    placeholder="1234 5678 9012 3456"
                                                    value={cardNumber}
                                                    onChange={(e) => formatCardNumber(e.target.value)}
                                                    maxLength={19}
                                                />
                                            </div>
                                            <div className="grid gap-2">
                                                <Label htmlFor="cardholderName">Cardholder Name</Label>
                                                <Input
                                                    id="cardholderName"
                                                    placeholder="John Doe"
                                                    value={cardholderName}
                                                    onChange={(e) => setCardholderName(e.target.value)}
                                                />
                                            </div>
                                            <div className="grid grid-cols-3 gap-4">
                                                <div className="grid gap-2">
                                                    <Label htmlFor="expiryMonth">Month</Label>
                                                    <Input
                                                        id="expiryMonth"
                                                        placeholder="MM"
                                                        value={expiryMonth}
                                                        onChange={(e) => setExpiryMonth(e.target.value)}
                                                        maxLength={2}
                                                    />
                                                </div>
                                                <div className="grid gap-2">
                                                    <Label htmlFor="expiryYear">Year</Label>
                                                    <Input
                                                        id="expiryYear"
                                                        placeholder="YY"
                                                        value={expiryYear}
                                                        onChange={(e) => setExpiryYear(e.target.value)}
                                                        maxLength={2}
                                                    />
                                                </div>
                                                <div className="grid gap-2">
                                                    <Label htmlFor="cvv">CVV</Label>
                                                    <Input
                                                        id="cvv"
                                                        type="password"
                                                        placeholder="123"
                                                        value={cvv}
                                                        onChange={(e) => setCvv(e.target.value)}
                                                        maxLength={4}
                                                    />
                                                </div>
                                            </div>
                                        </TabsContent>
                                        
                                        <TabsContent value="upi" className="space-y-4">
                                            <div className="grid gap-2">
                                                <Label htmlFor="upiId">UPI ID</Label>
                                                <Input
                                                    id="upiId"
                                                    placeholder="yourname@paytm"
                                                    value={upiId}
                                                    onChange={(e) => setUpiId(e.target.value)}
                                                />
                                                <p className="text-xs text-muted-foreground">
                                                    Enter your UPI ID (e.g., yourname@paytm, yourname@ybl)
                                                </p>
                                            </div>
                                        </TabsContent>
                                        
                                        <TabsContent value="wallet" className="space-y-4">
                                            <div className="grid gap-2">
                                                <Label htmlFor="walletType">Wallet Type</Label>
                                                <Select value={walletType} onValueChange={setWalletType}>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Select wallet" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="paytm">PayTM</SelectItem>
                                                        <SelectItem value="phonepe">PhonePe</SelectItem>
                                                        <SelectItem value="googlepay">Google Pay</SelectItem>
                                                        <SelectItem value="amazonpay">Amazon Pay</SelectItem>
                                                        <SelectItem value="mobikwik">MobiKwik</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="grid gap-2">
                                                <Label htmlFor="walletNumber">Mobile Number</Label>
                                                <Input
                                                    id="walletNumber"
                                                    placeholder="9876543210"
                                                    value={walletNumber}
                                                    onChange={(e) => setWalletNumber(e.target.value)}
                                                    maxLength={10}
                                                />
                                                <p className="text-xs text-muted-foreground">
                                                    Enter the mobile number linked to your wallet
                                                </p>
                                            </div>
                                        </TabsContent>
                                    </Tabs>
                                    
                                    <div className="flex items-center space-x-2">
                                        <Checkbox
                                            id="isDefault"
                                            checked={isDefault}
                                            onCheckedChange={(checked) => setIsDefault(checked as boolean)}
                                        />
                                        <label
                                            htmlFor="isDefault"
                                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                        >
                                            Set as default payment method
                                        </label>
                                    </div>
                                </div>
                                <DialogFooter>
                                    <Button
                                        type="submit"
                                        onClick={() => addPaymentMutation.mutate()}
                                        disabled={addPaymentMutation.isPending}
                                    >
                                        {addPaymentMutation.isPending ? 'Adding...' : 'Add Payment Method'}
                                    </Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    </div>
                </div>

                <Card className="mb-6 bg-green-50 border-green-200">
                    <CardContent className="flex items-start gap-4 pt-6">
                        <Shield className="h-6 w-6 text-green-600 mt-1" />
                        <div>
                            <h3 className="font-semibold text-green-900 mb-1">Secure Payments</h3>
                            <p className="text-sm text-green-800">
                                Your payment information is encrypted and securely stored. We never store your full card number or CVV.
                            </p>
                        </div>
                    </CardContent>
                </Card>

                <div className="mb-6">
                    <AutoPaySetup />
                </div>

                {isLoading ? (
                    <div className="text-center py-12">
                        <p className="text-gray-500">Loading payment methods...</p>
                    </div>
                ) : paymentMethods && paymentMethods.length > 0 ? (
                    <div className="grid gap-4">
                        {paymentMethods.map((method) => (
                            <Card key={method.id}>
                                <CardContent className="flex items-center justify-between p-6">
                                    <div className="flex items-center gap-4">
                                        {getPaymentIcon(method)}
                                        <div>
                                            <p className="font-semibold text-gray-900">
                                                {getPaymentDisplayText(method)}
                                            </p>
                                            {method.isDefault && (
                                                <span className="inline-block mt-1 px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded">
                                                    Default
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {!method.isDefault && (
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => setDefaultMutation.mutate(method.id)}
                                                disabled={setDefaultMutation.isPending}
                                            >
                                                Set Default
                                            </Button>
                                        )}
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => {
                                                if (method.isDefault) {
                                                    toast({
                                                        title: 'Cannot Delete',
                                                        description: 'Please set another card as default before deleting this one.',
                                                        variant: 'destructive',
                                                    });
                                                } else {
                                                    deleteMutation.mutate(method.id);
                                                }
                                            }}
                                            disabled={deleteMutation.isPending}
                                        >
                                            <Trash2 className="h-4 w-4 text-red-600" />
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                ) : (
                    <Card>
                        <CardContent className="text-center py-12">
                            <CreditCard className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Payment Methods</h3>
                            <p className="text-gray-500 mb-6">Add a payment method to book trips faster</p>
                            <Button onClick={() => setAddDialogOpen(true)}>
                                <Plus className="h-4 w-4 mr-2" />
                                Add Payment Method
                            </Button>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    );
}
