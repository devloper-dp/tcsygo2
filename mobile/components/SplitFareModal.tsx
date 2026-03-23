import React, { useState, useEffect } from 'react';
import { View, Modal, TouchableOpacity, ScrollView, TextInput, Alert, ActivityIndicator } from 'react-native';
import { Text } from './ui/text';
import { Button } from './ui/button';
import { Avatar, AvatarFallback } from './ui/avatar';
import { Users, UserPlus, X, Send, DollarSign, Trash2 } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useResponsive } from '@/hooks/useResponsive';
 
interface SplitFareParticipant {
    id: string;
    name?: string;
    email: string;
    amount: number;
    status: 'pending' | 'paid' | 'declined';
}
 
interface SplitFareModalProps {
    isVisible: boolean;
    onClose: () => void;
    bookingId: string;
    totalAmount: number;
}
 
export function SplitFareModal({ isVisible, onClose, bookingId, totalAmount }: SplitFareModalProps) {
    const { user } = useAuth();
    const { theme, isDark } = useTheme();
    const { hScale, vScale, spacing } = useResponsive();
    const [participants, setParticipants] = useState<SplitFareParticipant[]>([]);
    const [newName, setNewName] = useState('');
    const [newEmail, setNewEmail] = useState('');
    const [loading, setLoading] = useState(false);
 
    useEffect(() => {
        if (isVisible) {
            loadParticipants();
        }
    }, [isVisible, bookingId]);
 
    const loadParticipants = async () => {
        try {
            const { data, error } = await supabase
                .from('split_fare_requests')
                .select('*')
                .eq('booking_id', bookingId);
 
            if (error) throw error;
 
            if (data && data.length > 0) {
                setParticipants(
                    data.map((p) => ({
                        id: p.id,
                        name: p.participant_name,
                        email: p.participant_email,
                        amount: parseFloat(p.amount),
                        status: p.status,
                    }))
                );
            }
        } catch (error) {
            console.error('Error loading participants:', error);
        }
    };
 
    const addParticipant = () => {
        if (!newEmail || !newEmail.includes('@')) {
            Alert.alert('Invalid Email', 'Please enter a valid email address');
            return;
        }
 
        const newParticipant: SplitFareParticipant = {
            id: `temp-${Date.now()}`,
            name: newName || newEmail.split('@')[0],
            email: newEmail,
            amount: 0,
            status: 'pending',
        };
 
        const updated = [...participants, newParticipant];
        setParticipants(updated);
        setNewName('');
        setNewEmail('');
        calculateSplit(updated);
    };
 
    const removeParticipant = (id: string) => {
        const updated = participants.filter((p) => p.id !== id);
        setParticipants(updated);
        calculateSplit(updated);
    };
 
    const calculateSplit = (parts: SplitFareParticipant[]) => {
        const amountPerPerson = totalAmount / (parts.length + 1); // +1 for the user
        const updated = parts.map((p) => ({ ...p, amount: amountPerPerson }));
        setParticipants(updated);
    };
 
    const sendSplitRequests = async () => {
        if (!user) return;
 
        setLoading(true);
        try {
            const newRequests = participants.filter(p => p.id.startsWith('temp-')).map((p) => ({
                booking_id: bookingId,
                requester_id: user.id,
                participant_name: p.name,
                participant_email: p.email,
                amount: p.amount,
                status: 'pending',
            }));
 
            if (newRequests.length > 0) {
                const { error } = await supabase
                    .from('split_fare_requests')
                    .insert(newRequests);
 
                if (error) throw error;
            }
 
            Alert.alert('Success', `Sent payment requests to ${newRequests.length} friends.`);
            onClose();
        } catch (error: any) {
            Alert.alert('Error', error.message);
        } finally {
            setLoading(false);
        }
    };
 
    const totalParticipantsAmount = participants.reduce((sum, p) => sum + p.amount, 0);
    const yourAmount = totalAmount - totalParticipantsAmount;
 
    return (
        <Modal
            animationType="slide"
            transparent={true}
            visible={isVisible}
            onRequestClose={onClose}
        >
            <View style={{ flex: 1, justifyContent: 'flex-end' }} className="bg-black/50">
                <View style={{ height: '85%', borderTopLeftRadius: hScale(32), borderTopRightRadius: hScale(32), padding: hScale(32) }} className="bg-white dark:bg-slate-900 shadow-2xl">
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: vScale(32) }}>
                        <View>
                            <Text style={{ fontSize: hScale(24) }} className="font-black text-slate-900 dark:text-white tracking-tight">Split Ride Cost</Text>
                            <Text style={{ fontSize: hScale(10), marginTop: vScale(4) }} className="font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Divide the fare with friends</Text>
                        </View>
                        <TouchableOpacity 
                            onPress={onClose} 
                            style={{ padding: hScale(12), borderRadius: hScale(24) }}
                            className="bg-slate-100 dark:bg-slate-800"
                        >
                            <X size={hScale(20)} color={isDark ? "#94a3b8" : "#4b5563"} />
                        </TouchableOpacity>
                    </View>
 
                    <ScrollView showsVerticalScrollIndicator={false}>
                        {/* Summary Card */}
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: hScale(24), borderRadius: hScale(28), marginBottom: vScale(32) }} className="bg-blue-600 dark:bg-blue-700 shadow-xl shadow-blue-500/20">
                            <View>
                                <Text style={{ fontSize: hScale(10), marginBottom: vScale(4) }} className="uppercase font-black text-blue-100/70 tracking-widest">Total Fare</Text>
                                <Text style={{ fontSize: hScale(30) }} className="font-black text-white tracking-tighter">₹{totalAmount.toFixed(0)}</Text>
                            </View>
                            <View style={{ alignItems: 'flex-end', paddingHorizontal: hScale(16), paddingVertical: vScale(8), borderRadius: hScale(16), borderWidth: 1 }} className="bg-white/10 border-white/20">
                                <Text style={{ fontSize: hScale(10), marginBottom: vScale(4) }} className="uppercase font-black text-blue-100/70 tracking-widest">Your Share</Text>
                                <Text style={{ fontSize: hScale(20) }} className="font-black text-white tracking-tighter">₹{yourAmount.toFixed(0)}</Text>
                            </View>
                        </View>
 
                        {/* Add Friend Form */}
                        <View style={{ marginBottom: vScale(32) }}>
                            <Text style={{ fontSize: hScale(10), marginBottom: vScale(16), marginLeft: hScale(8) }} className="font-black uppercase text-slate-400 dark:text-slate-500 tracking-widest">Add People</Text>
                            <View style={{ gap: vScale(16) }}>
                                <TextInput
                                    placeholder="Friend's Name (Optional)"
                                    value={newName}
                                    onChangeText={setNewName}
                                    placeholderTextColor={isDark ? "#475569" : "#94a3b8"}
                                    style={{ height: vScale(56), paddingHorizontal: hScale(20), borderRadius: hScale(16), borderWidth: 1, fontSize: hScale(14) }}
                                    className="bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-800 font-bold text-slate-900 dark:text-white"
                                />
                                <View style={{ flexDirection: 'row', gap: hScale(12) }}>
                                    <TextInput
                                        placeholder="friend@email.com"
                                        value={newEmail}
                                        onChangeText={setNewEmail}
                                        placeholderTextColor={isDark ? "#475569" : "#94a3b8"}
                                        style={{ flex: 1, height: vScale(56), paddingHorizontal: hScale(20), borderRadius: hScale(16), borderWidth: 1, fontSize: hScale(14) }}
                                        className="bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-800 font-bold text-slate-900 dark:text-white"
                                        keyboardType="email-address"
                                        autoCapitalize="none"
                                    />
                                    <TouchableOpacity 
                                        onPress={addParticipant}
                                        style={{ width: hScale(56), height: vScale(56), borderRadius: hScale(16) }}
                                        className="bg-blue-600 dark:bg-blue-500 items-center justify-center shadow-md shadow-blue-500/20"
                                    >
                                        <UserPlus size={hScale(24)} color="white" />
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </View>
 
                        {/* Participants List */}
                        <View style={{ marginBottom: vScale(40) }}>
                            <Text style={{ fontSize: hScale(10), marginBottom: vScale(16), marginLeft: hScale(8) }} className="font-black uppercase text-slate-400 dark:text-slate-500 tracking-widest">Participants</Text>
                            {participants.length > 0 ? (
                                <View style={{ gap: vScale(16) }}>
                                    {participants.map((p) => (
                                        <View key={p.id} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: hScale(16), borderRadius: hScale(24), borderWidth: 1 }} className="bg-white dark:bg-slate-800/40 border-slate-100 dark:border-slate-800 shadow-sm">
                                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: hScale(16), flex: 1 }}>
                                                <Avatar style={{ width: hScale(48), height: hScale(48), borderRadius: hScale(16) }} className="bg-blue-100 dark:bg-blue-900/30">
                                                    <AvatarFallback className="text-blue-600 dark:text-blue-400 font-black">
                                                        {p.name?.charAt(0) || '?'}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <View className="flex-1">
                                                    <Text style={{ fontSize: hScale(16) }} className="font-black text-slate-900 dark:text-white" numberOfLines={1}>{p.name}</Text>
                                                    <Text style={{ fontSize: hScale(10) }} className="font-bold text-slate-400 dark:text-slate-500 uppercase tracking-tighter" numberOfLines={1}>{p.email}</Text>
                                                </View>
                                            </View>
                                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: hScale(16) }}>
                                                <View style={{ paddingHorizontal: hScale(12), paddingVertical: vScale(6), borderRadius: hScale(12), borderWidth: 1 }} className="bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                                                    <Text style={{ fontSize: hScale(14) }} className="font-black text-slate-900 dark:text-white">₹{p.amount.toFixed(0)}</Text>
                                                </View>
                                                <TouchableOpacity 
                                                    onPress={() => removeParticipant(p.id)}
                                                    style={{ width: hScale(32), height: hScale(32), borderRadius: hScale(16) }}
                                                    className="bg-rose-50 dark:bg-rose-950/20 items-center justify-center"
                                                >
                                                    <Trash2 size={hScale(16)} color="#ef4444" />
                                                </TouchableOpacity>
                                            </View>
                                        </View>
                                    ))}
                                </View>
                            ) : (
                                <View style={{ alignItems: 'center', paddingVertical: vScale(48), borderRadius: hScale(28), borderWidth: 2 }} className="border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/10">
                                    <Users size={hScale(32)} color={isDark ? "#334155" : "#cbd5e1"} />
                                    <Text style={{ fontSize: hScale(14), marginTop: vScale(16) }} className="font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">No friends added yet</Text>
                                </View>
                            )}
                        </View>
                    </ScrollView>
 
                    <TouchableOpacity
                        style={{ height: vScale(64), borderRadius: hScale(24), flexDirection: 'row', gap: hScale(12) }}
                        className={`items-center justify-center shadow-lg shadow-blue-500/20 ${loading || participants.length === 0 ? 'bg-slate-200 dark:bg-slate-800 opacity-50 shadow-none' : 'bg-blue-600 active:bg-blue-700'}`}
                        onPress={sendSplitRequests}
                        disabled={loading || participants.length === 0}
                    >
                        {loading ? (
                            <ActivityIndicator color="white" />
                        ) : (
                            <>
                                <Send size={hScale(20)} color="white" strokeWidth={3} />
                                <Text style={{ fontSize: hScale(18) }} className="text-white font-black">Send Requests</Text>
                            </>
                        )}
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
}
