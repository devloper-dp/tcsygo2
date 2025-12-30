import React, { useState } from 'react';
import { View, StyleSheet, Modal, TouchableOpacity, ScrollView, TextInput, ActivityIndicator, Alert } from 'react-native';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { NotificationService } from '@/services/NotificationService';
import { logger } from '@/services/LoggerService';

interface User {
    id: string;
    full_name: string;
    phone: string;
}

interface SplitFareModalProps {
    visible: boolean;
    onClose: () => void;
    totalAmount: number;
    bookingId: string;
}

export function SplitFareModal({ visible, onClose, totalAmount, bookingId }: SplitFareModalProps) {
    const { user: currentUser } = useAuth();
    const [searchPhone, setSearchPhone] = useState('');
    const [searching, setSearching] = useState(false);
    const [selectedUsers, setSelectedUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(false);

    const handleSearch = async () => {
        if (!searchPhone || searchPhone.length < 10) return;
        setSearching(true);
        try {
            const { data, error } = await supabase
                .from('users')
                .select('id, full_name, phone')
                .eq('phone', searchPhone)
                .single();

            if (error) {
                Alert.alert("User not found", "No user found with this phone number.");
                return;
            }

            if (selectedUsers.some((u: User) => u.id === data.id)) {
                Alert.alert("Already added", "This user is already in the split list.");
                return;
            }

            setSelectedUsers([...selectedUsers, data]);
            setSearchPhone('');
        } catch (error) {
            console.error('Search error:', error);
        } finally {
            setSearching(false);
        }
    };

    const removeUser = (id: string) => {
        setSelectedUsers(selectedUsers.filter(u => u.id !== id));
    };

    const handleSplit = async () => {
        if (selectedUsers.length === 0 || !currentUser) return;
        setLoading(true);
        try {
            const splitCount = selectedUsers.length + 1; // Including current user
            const amountPerPerson = Math.round(totalAmount / splitCount);

            // Create split fare requests
            const requests = selectedUsers.map((u: User) => ({
                booking_id: bookingId,
                requester_id: currentUser.id,
                participant_id: u.id,
                participant_email: '', // Not used but required by schema if not nullable
                amount: amountPerPerson,
                status: 'pending'
            }));

            const { error } = await supabase.from('split_fare_requests').insert(requests);

            if (error) throw error;

            // Notify participants
            for (const user of selectedUsers) {
                await NotificationService.createNotification(user.id, {
                    type: 'ride_sharing_invite',
                    title: '💸 Split Fare Request',
                    message: `${(currentUser as any).full_name || 'A friend'} has requested to split ₹${totalAmount} with you for their ride.`,
                    data: { bookingId, amount: amountPerPerson }
                });
            }

            Alert.alert("Success", `Split requests sent to ${selectedUsers.length} users. Each person pays ₹${amountPerPerson}.`);
            onClose();
        } catch (error: any) {
            logger.error('Split fare error:', error);
            Alert.alert("Error", error.message || "Failed to initiate split fare.");
        } finally {
            setLoading(false);
        }
    };

    const amountPerPerson = Math.round(totalAmount / (selectedUsers.length + 1));

    return (
        <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
            <View style={styles.overlay}>
                <View style={styles.container}>
                    <View style={styles.header}>
                        <Text variant="h3" style={styles.title}>Split Fare</Text>
                        <TouchableOpacity onPress={onClose}>
                            <Ionicons name="close" size={24} color="#6b7280" />
                        </TouchableOpacity>
                    </View>

                    <Text style={styles.subtitle}>Divide ₹{totalAmount} with friends</Text>

                    <View style={styles.searchBox}>
                        <TextInput
                            style={styles.input}
                            placeholder="Enter friend's phone number"
                            value={searchPhone}
                            onChangeText={setSearchPhone}
                            keyboardType="phone-pad"
                        />
                        <TouchableOpacity
                            style={styles.searchBtn}
                            onPress={handleSearch}
                            disabled={searching}
                        >
                            {searching ? <ActivityIndicator size="small" color="#3b82f6" /> : <Ionicons name="search" size={24} color="#3b82f6" />}
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.userList}>
                        <View style={styles.selfRow}>
                            <View style={[styles.avatar, { backgroundColor: '#f3f4f6' }]}>
                                <Text style={styles.avatarText}>You</Text>
                            </View>
                            <Text style={styles.userName}>You</Text>
                            <Text style={styles.userAmount}>₹{amountPerPerson}</Text>
                        </View>

                        {selectedUsers.map((user: User) => (
                            <View key={user.id} style={styles.userRow}>
                                <View style={styles.avatar}>
                                    <Text style={styles.avatarText}>{user.full_name.charAt(0)}</Text>
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.userName}>{user.full_name}</Text>
                                    <Text style={styles.userPhone}>{user.phone}</Text>
                                </View>
                                <Text style={styles.userAmount}>₹{amountPerPerson}</Text>
                                <TouchableOpacity onPress={() => removeUser(user.id)} style={styles.removeBtn}>
                                    <Ionicons name="close-circle" size={20} color="#ef4444" />
                                </TouchableOpacity>
                            </View>
                        ))}
                    </ScrollView>

                    <View style={styles.footer}>
                        <Button
                            onPress={handleSplit}
                            disabled={selectedUsers.length === 0 || loading}
                            size="lg"
                            className="w-full"
                        >
                            {loading ? <ActivityIndicator color="white" /> : `Split with ${selectedUsers.length} friends`}
                        </Button>
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
        justifyContent: 'flex-end',
    },
    container: {
        backgroundColor: 'white',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 24,
        maxHeight: '80%',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    title: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#1f2937',
    },
    subtitle: {
        fontSize: 16,
        color: '#6b7280',
        marginBottom: 24,
    },
    searchBox: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        backgroundColor: '#f3f4f6',
        borderRadius: 12,
        paddingHorizontal: 16,
        marginBottom: 24,
    },
    input: {
        flex: 1,
        height: 50,
        fontSize: 16,
        color: '#1f2937',
    },
    searchBtn: {
        padding: 4,
    },
    userList: {
        maxHeight: 300,
    },
    selfRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#f3f4f6',
    },
    userRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#f3f4f6',
        gap: 12,
    },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#dbeafe',
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarText: {
        fontWeight: 'bold',
        color: '#3b82f6',
    },
    userName: {
        flex: 1,
        fontSize: 16,
        fontWeight: '600',
        color: '#1f2937',
    },
    userPhone: {
        fontSize: 12,
        color: '#6b7280',
    },
    userAmount: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#1f2937',
        marginHorizontal: 12,
    },
    removeBtn: {
        padding: 4,
    },
    footer: {
        marginTop: 24,
    },
});
