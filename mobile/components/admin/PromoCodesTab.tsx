import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, ActivityIndicator, Alert, TouchableOpacity } from 'react-native';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { Ticket, Plus, Trash2 } from 'lucide-react-native';

interface PromoCode {
    id: string;
    code: string;
    discount_amount: number;
    discount_type: 'percent' | 'fixed';
    expires_at: string;
    is_active: boolean;
}

export function PromoCodesTab() {
    const [promos, setPromos] = useState<PromoCode[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchPromos();
    }, []);

    const fetchPromos = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('promo_codes')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setPromos(data || []);
        } catch (error) {
            console.error('Error fetching promo codes:', error);
            // Fallback to empty if table doesn't exist yet
            setPromos([]);
        } finally {
            setLoading(false);
        }
    };

    const renderPromoItem = ({ item }: { item: PromoCode }) => (
        <Card className="mb-4">
            <CardContent className="flex-row items-center justify-between p-4">
                <View>
                    <View className="flex-row items-center">
                        <Ticket size={20} className="text-primary mr-2" />
                        <Text className="text-lg font-bold text-foreground">{item.code}</Text>
                    </View>
                    <Text className="text-muted-foreground mt-1">
                        {item.discount_type === 'percent' ? `${item.discount_amount}% OFF` : `$${item.discount_amount} OFF`}
                    </Text>
                    <Text className="text-xs text-muted-foreground mt-1">
                        Expires: {item.expires_at ? new Date(item.expires_at).toLocaleDateString() : 'Never'}
                    </Text>
                </View>
                <View className="flex-row gap-2">
                    <Button variant="outline" size="icon">
                        <Trash2 size={20} className="text-destructive" />
                    </Button>
                </View>
            </CardContent>
        </Card>
    );

    return (
        <View className="flex-1">
            <View className="flex-row justify-between items-center mb-4">
                <Text className="text-xl font-bold text-foreground">Active Codes</Text>
                <Button size="sm" className="flex-row items-center">
                    <Plus size={16} className="text-primary-foreground mr-1" />
                    <Text className="text-primary-foreground font-semibold">Create New</Text>
                </Button>
            </View>

            {loading ? (
                <ActivityIndicator size="large" className="mt-8" />
            ) : (
                <FlatList
                    data={promos}
                    keyExtractor={(item) => item.id}
                    renderItem={renderPromoItem}
                    ListEmptyComponent={
                        <View className="items-center mt-8">
                            <Text className="text-muted-foreground">No active promo codes</Text>
                        </View>
                    }
                    contentContainerStyle={{ paddingBottom: 20 }}
                />
            )}
        </View>
    );
}
