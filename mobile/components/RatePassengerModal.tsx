import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, TextInput, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

interface RatePassengerModalProps {
    visible: boolean;
    onClose: () => void;
    tripId: string;
    passengerId: string;
    passengerName: string;
}

export function RatePassengerModal({ visible, onClose, tripId, passengerId, passengerName }: RatePassengerModalProps) {
    const { user } = useAuth();
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
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <View style={styles.overlay}>
                <View style={styles.content}>
                    <Text style={styles.title}>Rate Passenger</Text>
                    <Text style={styles.subtitle}>How was the ride with {passengerName}?</Text>

                    <View style={styles.stars}>
                        {[1, 2, 3, 4, 5].map((star) => (
                            <TouchableOpacity key={star} onPress={() => setRating(star)}>
                                <Ionicons
                                    name={star <= rating ? "star" : "star-outline"}
                                    size={32}
                                    color={star <= rating ? "#f59e0b" : "#d1d5db"}
                                />
                            </TouchableOpacity>
                        ))}
                    </View>

                    <Text style={styles.ratingLabel}>
                        {rating === 5 ? 'Excellent!' : rating >= 4 ? 'Good' : rating >= 3 ? 'Average' : rating > 0 ? 'Poor' : 'Select a rating'}
                    </Text>

                    <TextInput
                        style={styles.input}
                        placeholder="Write a review (optional)"
                        multiline
                        numberOfLines={4}
                        value={review}
                        onChangeText={setReview}
                        textAlignVertical="top"
                    />

                    <View style={styles.footer}>
                        <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
                            <Text style={styles.cancelText}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.submitButton, (rating === 0 || submitting) && styles.disabledButton]}
                            onPress={handleSubmit}
                            disabled={rating === 0 || submitting}
                        >
                            {submitting ? (
                                <ActivityIndicator color="white" size="small" />
                            ) : (
                                <Text style={styles.submitText}>Submit</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        padding: 20,
    },
    content: {
        backgroundColor: 'white',
        borderRadius: 16,
        padding: 24,
        alignItems: 'center',
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#1f2937',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 14,
        color: '#6b7280',
        marginBottom: 24,
        textAlign: 'center',
    },
    stars: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 16,
    },
    ratingLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#f59e0b',
        marginBottom: 24,
        height: 20,
    },
    input: {
        width: '100%',
        borderWidth: 1,
        borderColor: '#e5e7eb',
        borderRadius: 8,
        padding: 12,
        height: 100,
        marginBottom: 24,
        fontSize: 14,
    },
    footer: {
        flexDirection: 'row',
        gap: 12,
        width: '100%',
    },
    cancelButton: {
        flex: 1,
        padding: 12,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#e5e7eb',
        alignItems: 'center',
    },
    cancelText: {
        color: '#374151',
        fontWeight: '600',
    },
    submitButton: {
        flex: 1,
        padding: 12,
        borderRadius: 8,
        backgroundColor: '#3b82f6',
        alignItems: 'center',
    },
    disabledButton: {
        backgroundColor: '#9ca3af',
    },
    submitText: {
        color: 'white',
        fontWeight: '600',
    },
});
