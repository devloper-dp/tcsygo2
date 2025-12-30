import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Zap, CreditCard, Wallet, DollarSign, Shield, Check } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

interface AutoPaySettings {
    enabled: boolean;
    defaultPaymentMethod: 'wallet' | 'upi' | 'card' | 'cash';
    spendingLimit: number | null;
}

interface AutoPaySetupProps {
    className?: string;
}

export function AutoPaySetup({ className = '' }: AutoPaySetupProps) {
    const { t } = useTranslation();
    const { user } = useAuth();
    const { toast } = useToast();
    const [settings, setSettings] = useState<AutoPaySettings>({
        enabled: false,
        defaultPaymentMethod: 'wallet',
        spendingLimit: null,
    });
    const [loading, setLoading] = useState(false);
    const [saved, setSaved] = useState(false);

    useEffect(() => {
        if (user) {
            loadSettings();
        }
    }, [user]);

    const loadSettings = async () => {
        try {
            const { data, error } = await supabase
                .from('auto_pay_settings')
                .select('*')
                .eq('user_id', user?.id)
                .single();

            if (data && !error) {
                setSettings({
                    enabled: data.enabled,
                    defaultPaymentMethod: data.default_payment_method,
                    spendingLimit: data.spending_limit ? parseFloat(data.spending_limit) : null,
                });
            }
        } catch (error) {
            console.error('Error loading auto-pay settings:', error);
        }
    };

    const saveSettings = async () => {
        if (!user) return;

        setLoading(true);
        try {
            const { error } = await supabase
                .from('auto_pay_settings')
                .upsert({
                    user_id: user.id,
                    enabled: settings.enabled,
                    default_payment_method: settings.defaultPaymentMethod,
                    spending_limit: settings.spendingLimit,
                    updated_at: new Date().toISOString(),
                });

            if (error) throw error;

            setSaved(true);
            toast({
                title: 'Auto-Pay settings saved',
                description: settings.enabled
                    ? 'Rides will be automatically paid after completion'
                    : 'Auto-Pay has been disabled',
            });

            setTimeout(() => setSaved(false), 3000);
        } catch (error: any) {
            toast({
                title: 'Failed to save settings',
                description: error.message,
                variant: 'destructive',
            });
        } finally {
            setLoading(false);
        }
    };

    const getPaymentMethodIcon = (method: string) => {
        switch (method) {
            case 'wallet':
                return Wallet;
            case 'card':
                return CreditCard;
            case 'upi':
                return Zap;
            default:
                return DollarSign;
        }
    };

    const PaymentIcon = getPaymentMethodIcon(settings.defaultPaymentMethod);

    return (
        <Card className={`p-6 ${className}`}>
            <div className="space-y-6">
                {/* Header */}
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <Zap className="w-5 h-5 text-primary" />
                        <h3 className="text-lg font-semibold">{t('wallet.autoPay')}</h3>
                    </div>
                    <p className="text-sm text-muted-foreground">
                        Automatically pay for rides after completion
                    </p>
                </div>

                {/* Enable/Disable Toggle */}
                <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                    <div>
                        <Label htmlFor="auto-pay-toggle" className="text-base font-medium">
                            {t('wallet.enableAutoPay')}
                        </Label>
                        <p className="text-sm text-muted-foreground">
                            Skip manual payment confirmation
                        </p>
                    </div>
                    <Switch
                        id="auto-pay-toggle"
                        checked={settings.enabled}
                        onCheckedChange={(checked) => {
                            setSettings({ ...settings, enabled: checked });
                            setSaved(false);
                        }}
                    />
                </div>

                {settings.enabled && (
                    <>
                        {/* Default Payment Method */}
                        <div className="space-y-3">
                            <Label className="text-base font-medium">
                                {t('wallet.defaultMethod')}
                            </Label>
                            <Select
                                value={settings.defaultPaymentMethod}
                                onValueChange={(value: any) => {
                                    setSettings({ ...settings, defaultPaymentMethod: value });
                                    setSaved(false);
                                }}
                            >
                                <SelectTrigger className="w-full">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="wallet">
                                        <div className="flex items-center gap-2">
                                            <Wallet className="w-4 h-4" />
                                            <span>{t('wallet.paymentMethods.wallet')}</span>
                                        </div>
                                    </SelectItem>
                                    <SelectItem value="upi">
                                        <div className="flex items-center gap-2">
                                            <Zap className="w-4 h-4" />
                                            <span>{t('wallet.paymentMethods.upi')}</span>
                                        </div>
                                    </SelectItem>
                                    <SelectItem value="card">
                                        <div className="flex items-center gap-2">
                                            <CreditCard className="w-4 h-4" />
                                            <span>{t('wallet.paymentMethods.card')}</span>
                                        </div>
                                    </SelectItem>
                                    <SelectItem value="cash">
                                        <div className="flex items-center gap-2">
                                            <DollarSign className="w-4 h-4" />
                                            <span>{t('wallet.paymentMethods.cash')}</span>
                                        </div>
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Spending Limit */}
                        <div className="space-y-3">
                            <Label htmlFor="spending-limit" className="text-base font-medium">
                                {t('wallet.spendingLimit')} (Optional)
                            </Label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                                    ₹
                                </span>
                                <Input
                                    id="spending-limit"
                                    type="number"
                                    placeholder="No limit"
                                    value={settings.spendingLimit || ''}
                                    onChange={(e) => {
                                        setSettings({
                                            ...settings,
                                            spendingLimit: e.target.value
                                                ? parseFloat(e.target.value)
                                                : null,
                                        });
                                        setSaved(false);
                                    }}
                                    className="pl-8"
                                    min="0"
                                />
                            </div>
                            <p className="text-xs text-muted-foreground">
                                Set a maximum daily spending limit for auto-payments
                            </p>
                        </div>

                        {/* Security Notice */}
                        <div className="flex items-start gap-3 p-4 bg-primary/5 border border-primary/20 rounded-lg">
                            <Shield className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                            <div className="text-sm">
                                <p className="font-medium mb-1">Secure & Safe</p>
                                <p className="text-muted-foreground">
                                    All transactions are encrypted and secure. You can disable
                                    auto-pay anytime from settings.
                                </p>
                            </div>
                        </div>

                        {/* Current Settings Summary */}
                        <div className="p-4 bg-muted/50 rounded-lg space-y-2">
                            <p className="text-sm font-medium">Current Settings:</p>
                            <div className="flex items-center gap-2 text-sm">
                                <PaymentIcon className="w-4 h-4 text-primary" />
                                <span className="text-muted-foreground">
                                    Default: {settings.defaultPaymentMethod.toUpperCase()}
                                </span>
                            </div>
                            {settings.spendingLimit && (
                                <div className="flex items-center gap-2 text-sm">
                                    <DollarSign className="w-4 h-4 text-primary" />
                                    <span className="text-muted-foreground">
                                        Daily Limit: ₹{settings.spendingLimit}
                                    </span>
                                </div>
                            )}
                        </div>
                    </>
                )}

                {/* Save Button */}
                <Button
                    onClick={saveSettings}
                    disabled={loading || saved}
                    className="w-full"
                    size="lg"
                >
                    {saved ? (
                        <>
                            <Check className="w-4 h-4 mr-2" />
                            Saved
                        </>
                    ) : (
                        <>{loading ? t('common.loading') : t('common.save')}</>
                    )}
                </Button>
            </div>
        </Card>
    );
}
