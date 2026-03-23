import React, { useState } from 'react';
import { View, StyleSheet, Modal, TouchableOpacity, TextInput, ActivityIndicator, Alert } from 'react-native';
import { Text } from '@/components/ui/text';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
 
interface RateDriverModalProps {
    visible: boolean;
    onClose: () => void;
    tripId: string;
    driverId: string;
    driverName: string;
}
 
export function RateDriverModal({ visible, onClose, tripId, driverId, driverName }: RateDriverModalProps) {
    const { user } = useAuth();
    const { theme } = useTheme();
    const isDark = theme === 'dark';
 
    const [rating, setRating] = useState(0);
    const [review, setReview] = useState('');
    const [tip, setTip] = useState(0);
    const [submitting, setSubmitting] = useState(false);
 
    const handleSubmit = async () => {
        if (rating === 0) return;
        if (!user) return;
 
        try {
            setSubmitting(true);
 
            // 1. Submit Rating
            const { error } = await supabase.from('ratings').insert({
                trip_id: tripId,
                from_user_id: user.id,
                to_user_id: driverId,
                rating,
                review
            });
 
            if (error) throw error;
 
            // 2. Process Tip (Simulated for now, would likely hit an edge function)
            if (tip > 0) {
                // Example: await supabase.rpc('send_tip', { booking_id: ..., amount: tip })
                console.log(`Tip of ₹${tip} sent to driver ${driverId}`);
            }
 
            Alert.alert("Success", tip > 0
                ? `Rating submitted and ₹${tip} tip sent!`
                : "Rating submitted successfully");
            onClose();
        } catch (error: any) {
            Alert.alert("Error", error.message || "Failed to submit rating");
        } finally {
            setSubmitting(false);
        }
    };
 
    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
            <View className="flex-1 bg-black/60 justify-center p-6">
                <View className="bg-white dark:bg-slate-900 rounded-[32px] p-8 items-center border border-slate-100 dark:border-slate-800 shadow-xl">
                    <Text className="text-2xl font-black text-slate-900 dark:text-white mb-2">Rate Driver</Text>
                    <Text className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-8 text-center px-4">How was your ride with {driverName}?</Text>
 
                    <View className="flex-row gap-3 mb-4">
                        {[1, 2, 3, 4, 5].map((star) => (
                            <TouchableOpacity key={star} onPress={() => setRating(star)} activeOpacity={0.7}>
                                <Ionicons
                                    name={star <= rating ? "star" : "star-outline"}
                                    size={40}
                                    color={star <= rating ? "#f59e0b" : (isDark ? "#334155" : "#e2e8f0")}
                                />
                            </TouchableOpacity>
                        ))}
                    </View>
 
                    <Text className="text-sm font-black text-amber-500 h-6 mb-8 uppercase tracking-widest">
                        {rating === 5 ? 'Excellent!' : rating >= 4 ? 'Good' : rating >= 3 ? 'Average' : rating > 0 ? 'Poor' : 'Select a rating'}
                    </Text>
 
                    {/* Tipping Section */}
                    <View className="w-full mb-8">
                        <Text className="text-xs font-bold text-slate-400 dark:text-slate-600 uppercase tracking-widest mb-4">Add a Tip</Text>
                        <View className="flex-row gap-3">
                            {[0, 10, 20, 50].map((amount) => (
                                <TouchableOpacity
                                    key={amount}
                                    className={`flex-1 py-3.5 rounded-2xl border items-center ${
                                        tip === amount 
                                            ? 'bg-blue-600 dark:bg-blue-500 border-blue-600 dark:border-blue-500 shadow-sm shadow-blue-500/20' 
                                            : 'bg-slate-50 dark:bg-slate-800/20 border-slate-100 dark:border-slate-800'
                                    }`}
                                    onPress={() => setTip(amount)}
                                >
                                    <Text className={`text-xs font-bold ${
                                        tip === amount ? 'text-white' : 'text-slate-500 dark:text-slate-400'
                                    }`}>
                                        {amount === 0 ? 'No Tip' : `₹${amount}`}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
 
                    <TextInput
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-800 rounded-2xl p-4 h-28 mb-8 text-sm font-medium text-slate-900 dark:text-white"
                        placeholder="Write a review (optional)"
                        placeholderTextColor={isDark ? "#475569" : "#94a3b8"}
                        multiline
                        numberOfLines={4}
                        value={review}
                        onChangeText={setReview}
                        textAlignVertical="top"
                    />
 
                    <View className="flex-row gap-4 w-full">
                        <TouchableOpacity 
                            className="flex-1 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 items-center justify-center" 
                            onPress={onClose}
                        >
                            <Text className="text-slate-500 dark:text-slate-400 font-bold">Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            className={`flex-1 h-14 rounded-2xl items-center justify-center shadow-lg ${
                                rating === 0 || submitting 
                                    ? 'bg-slate-200 dark:bg-slate-800 shadow-none' 
                                    : 'bg-blue-600 shadow-blue-500/20'
                            }`}
                            onPress={handleSubmit}
                            disabled={rating === 0 || submitting}
                        >
                            {submitting ? (
                                <ActivityIndicator color="white" size="small" />
                            ) : (
                                <Text className={`text-base font-bold ${rating === 0 || submitting ? 'text-slate-400 dark:text-slate-600' : 'text-white'}`}>
                                    {tip > 0 ? `Pay ₹${tip}` : 'Submit'}
                                </Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}
 
const styles = StyleSheet.create({});
