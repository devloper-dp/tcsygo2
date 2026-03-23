import React, { useState, useEffect } from 'react';
import {
    View,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    ActivityIndicator,
    FlatList,
} from 'react-native';
import { Text } from '@/components/ui/text';
import { Tag, X, Check, Gift } from 'lucide-react-native';
import { PromoCodeService, PromoCode } from '@/services/PromoCodeService';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
 
interface PromoCodeInputProps {
    orderAmount: number;
    vehicleType?: string;
    onPromoApplied: (discount: number, promoCode: PromoCode) => void;
    onPromoRemoved: () => void;
}
 
export const PromoCodeInput: React.FC<PromoCodeInputProps> = ({
    orderAmount,
    vehicleType,
    onPromoApplied,
    onPromoRemoved,
}) => {
    const { user } = useAuth();
    const { theme } = useTheme();
    const isDark = theme === 'dark';
 
    const [promoCode, setPromoCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [appliedPromo, setAppliedPromo] = useState<PromoCode | null>(null);
    const [discount, setDiscount] = useState(0);
    const [error, setError] = useState('');
    const [showAvailable, setShowAvailable] = useState(false);
    const [availablePromos, setAvailablePromos] = useState<PromoCode[]>([]);
 
    useEffect(() => {
        if (showAvailable && user) {
            loadAvailablePromos();
        }
    }, [showAvailable, user]);
 
    const loadAvailablePromos = async () => {
        if (!user) return;
        setLoading(true);
        try {
            const promos = await PromoCodeService.getAvailablePromoCodes(user.id);
            setAvailablePromos(promos);
        } catch (error) {
            console.error('Error loading available promos:', error);
        } finally {
            setLoading(false);
        }
    };
 
    const handleApplyPromo = async (code?: string) => {
        if (!user) return;
 
        const codeToApply = code || promoCode;
        if (!codeToApply.trim()) {
            setError('Please enter a promo code');
            return;
        }
 
        setLoading(true);
        setError('');
 
        try {
            const result = await PromoCodeService.validatePromoCode(
                codeToApply,
                user.id,
                orderAmount,
                vehicleType
            );
 
            if (result.valid && result.promoCode) {
                setAppliedPromo(result.promoCode);
                setDiscount(result.discount);
                setError('');
                onPromoApplied(result.discount, result.promoCode);
                setShowAvailable(false);
            } else {
                setError(result.message);
                setAppliedPromo(null);
                setDiscount(0);
            }
        } catch (error: any) {
            setError('Failed to apply promo code');
            console.error('Error applying promo:', error);
        } finally {
            setLoading(false);
        }
    };
 
    const handleRemovePromo = () => {
        setPromoCode('');
        setAppliedPromo(null);
        setDiscount(0);
        setError('');
        onPromoRemoved();
    };
 
    const renderPromoItem = ({ item }: { item: PromoCode }) => {
        const discountText =
            item.discount_type === 'percentage'
                ? `${item.discount_value}% OFF`
                : `₹${item.discount_value} OFF`;
 
        return (
            <TouchableOpacity
                className="flex-row items-center p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl mb-3 border border-slate-100 dark:border-slate-800/50 active:bg-slate-100 dark:active:bg-slate-800"
                onPress={() => handleApplyPromo(item.code)}
                disabled={loading}
            >
                <View className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900/30 items-center justify-center mr-4">
                    <Gift size={24} color="#10b981" />
                </View>
                <View className="flex-1">
                    <Text className="text-base font-black text-slate-900 dark:text-white mb-0.5">{item.code}</Text>
                    <Text className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">{item.description}</Text>
                    {item.min_order_value > 0 && (
                        <Text className="text-[10px] font-bold text-slate-400/80 dark:text-slate-500 uppercase">
                            Min. order: ₹{item.min_order_value}
                        </Text>
                    )}
                </View>
                <View className="items-end gap-1">
                    <Text className="text-lg font-black text-emerald-500">{discountText}</Text>
                    <Text className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest">APPLY</Text>
                </View>
            </TouchableOpacity>
        );
    };
 
    if (appliedPromo) {
        return (
            <View className="flex-row items-center justify-between p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl border border-emerald-100 dark:border-emerald-900/30 my-3 shadow-sm">
                <View className="flex-row items-center gap-4">
                    <View className="w-10 h-10 rounded-full bg-emerald-500/10 items-center justify-center">
                        <Check size={20} color="#10b981" />
                    </View>
                    <View>
                        <Text className="text-sm font-black text-emerald-700 dark:text-emerald-400">{appliedPromo.code} Applied</Text>
                        <Text className="text-xs font-bold text-emerald-600 dark:text-emerald-500/80">You saved ₹{discount}!</Text>
                    </View>
                </View>
                <TouchableOpacity onPress={handleRemovePromo} className="w-10 h-10 rounded-full bg-slate-100/50 dark:bg-slate-800 items-center justify-center">
                    <X size={20} color="#ef4444" />
                </TouchableOpacity>
            </View>
        );
    }
 
    return (
        <View className="my-3">
            <View className="flex-row items-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 h-16 gap-3 shadow-sm focus-within:border-blue-500">
                <Tag size={20} color={isDark ? "#475569" : "#94a3b8"} />
                <TextInput
                    className="flex-1 text-base font-bold text-slate-900 dark:text-white"
                    placeholder="Enter promo code"
                    placeholderTextColor={isDark ? "#475569" : "#94a3b8"}
                    value={promoCode}
                    onChangeText={(text) => {
                        setPromoCode(text.toUpperCase());
                        setError('');
                    }}
                    autoCapitalize="characters"
                    editable={!loading}
                />
                {loading ? (
                    <ActivityIndicator size="small" color="#3b82f6" />
                ) : (
                    <TouchableOpacity
                        onPress={() => handleApplyPromo()}
                        className={`px-5 py-2.5 rounded-xl ${promoCode.trim() ? 'bg-blue-600 shadow-lg shadow-blue-500/20' : 'bg-slate-100 dark:bg-slate-800'}`}
                        disabled={!promoCode.trim()}
                    >
                        <Text className={`text-sm font-black ${promoCode.trim() ? 'text-white' : 'text-slate-400 dark:text-slate-600'}`}>
                            Apply
                        </Text>
                    </TouchableOpacity>
                )}
            </View>
 
            {error ? <Text className="text-xs font-bold text-rose-500 mt-2 ml-4">{error}</Text> : null}
 
            <TouchableOpacity
                className="flex-row items-center justify-center mt-4 gap-2 active:opacity-70"
                onPress={() => setShowAvailable(!showAvailable)}
            >
                <View className="w-6 h-6 rounded-full bg-blue-50 dark:bg-blue-900/10 items-center justify-center">
                    <Gift size={12} color="#3b82f6" />
                </View>
                <Text className="text-sm font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest">
                    {showAvailable ? 'Hide' : 'View'} Available Offers
                </Text>
            </TouchableOpacity>
 
            {showAvailable && (
                <View className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                    {loading ? (
                        <View className="flex-row items-center justify-center p-8 gap-3">
                            <ActivityIndicator size="small" color="#3b82f6" />
                            <Text className="text-sm font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Loading offers...</Text>
                        </View>
                    ) : availablePromos.length > 0 ? (
                        <FlatList
                            data={availablePromos}
                            renderItem={renderPromoItem}
                            keyExtractor={(item) => item.id}
                            scrollEnabled={false}
                        />
                    ) : (
                        <Text className="text-sm font-bold text-slate-400 dark:text-slate-500 text-center p-8 uppercase tracking-widest">No offers available</Text>
                    )}
                </View>
            )}
        </View>
    );
};
 
const styles = StyleSheet.create({});
