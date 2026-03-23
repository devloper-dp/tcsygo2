import React, { useState } from 'react';
import { View, StyleSheet, Modal, TouchableOpacity, TextInput, ActivityIndicator, Alert } from 'react-native';
import { Text } from '@/components/ui/text';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useResponsive } from '@/hooks/useResponsive';
 
interface RatePassengerModalProps {
    visible: boolean;
    onClose: () => void;
    tripId: string;
    passengerId: string;
    passengerName: string;
}
 
export function RatePassengerModal({ visible, onClose, tripId, passengerId, passengerName }: RatePassengerModalProps) {
    const { user } = useAuth();
    const { theme, isDark } = useTheme();
    const { hScale, vScale, spacing } = useResponsive();
 
    const [rating, setRating] = useState(0);
    const [review, setReview] = useState('');
    const [submitting, setSubmitting] = useState(false);
 
    const handleSubmit = async () => {
        if (rating === 0) return;
        if (!user) return;
 
        try {
            setSubmitting(true);
            const { error } = await supabase.from('ratings').insert({
                trip_id: tripId,
                from_user_id: user.id,
                to_user_id: passengerId, // Rating the passenger
                rating,
                review
            });
 
            if (error) throw error;
 
            Alert.alert("Success", "Rating submitted successfully");
            onClose();
        } catch (error: any) {
            Alert.alert("Error", error.message || "Failed to submit rating");
        } finally {
            setSubmitting(false);
        }
    };
 
    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
            <View style={{ flex: 1, justifyContent: 'center', padding: hScale(24) }} className="bg-black/60">
                <View style={{ borderRadius: hScale(32), padding: hScale(32), alignItems: 'center' }} className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-xl">
                    <Text style={{ fontSize: hScale(24), marginBottom: vScale(8) }} className="font-black text-slate-900 dark:text-white">Rate Passenger</Text>
                    <Text style={{ fontSize: hScale(14), marginBottom: vScale(32), paddingHorizontal: hScale(16) }} className="font-medium text-slate-500 dark:text-slate-400 text-center">How was the ride with {passengerName}?</Text>
 
                    <View style={{ flexDirection: 'row', gap: hScale(12), marginBottom: vScale(16) }}>
                        {[1, 2, 3, 4, 5].map((star) => (
                            <TouchableOpacity key={star} onPress={() => setRating(star)} activeOpacity={0.7}>
                                <Ionicons
                                    name={star <= rating ? "star" : "star-outline"}
                                    size={hScale(40)}
                                    color={star <= rating ? "#f59e0b" : (isDark ? "#334155" : "#e2e8f0")}
                                />
                            </TouchableOpacity>
                        ))}
                    </View>
 
                    <Text style={{ fontSize: hScale(14), height: vScale(24), marginBottom: vScale(32) }} className="font-black text-amber-500 uppercase tracking-widest">
                        {rating === 5 ? 'Excellent!' : rating >= 4 ? 'Good' : rating >= 3 ? 'Average' : rating > 0 ? 'Poor' : 'Select a rating'}
                    </Text>
 
                    <TextInput
                        style={{ width: '100%', borderRadius: hScale(16), padding: hScale(16), height: vScale(112), marginBottom: vScale(32), fontSize: hScale(14) }}
                        className="bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-800 font-medium text-slate-900 dark:text-white"
                        placeholder="Write a review (optional)"
                        placeholderTextColor={isDark ? "#475569" : "#94a3b8"}
                        multiline
                        numberOfLines={4}
                        value={review}
                        onChangeText={setReview}
                        textAlignVertical="top"
                    />
 
                    <View style={{ flexDirection: 'row', gap: hScale(16), width: '100%' }}>
                        <TouchableOpacity 
                            style={{ flex: 1, height: vScale(56), borderRadius: hScale(16) }}
                            className="bg-slate-100 dark:bg-slate-800 items-center justify-center" 
                            onPress={onClose}
                        >
                            <Text style={{ fontSize: hScale(14) }} className="text-slate-500 dark:text-slate-400 font-bold">Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={{ flex: 1, height: vScale(56), borderRadius: hScale(16) }}
                            className={`items-center justify-center shadow-lg ${
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
                                <Text style={{ fontSize: hScale(16) }} className={`font-bold ${rating === 0 || submitting ? 'text-slate-400 dark:text-slate-600' : 'text-white'}`}>
                                    Submit
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
