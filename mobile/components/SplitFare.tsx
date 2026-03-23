import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, TextInput, Alert } from 'react-native';
import { Text } from '@/components/ui/text';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '@/components/ui/card';
import { supabase } from '@/lib/supabase';
import * as Contacts from 'expo-contacts';
import { useTheme } from '@/contexts/ThemeContext';
 
interface Contact {
    id: string;
    name: string;
    phone: string;
    selected?: boolean;
}
 
export function SplitFare({ tripId, totalAmount, style }: { tripId: string, totalAmount: number, style?: any }) {
    const { theme } = useTheme();
    const isDark = theme === 'dark';
 
    const [contacts, setContacts] = useState<Contact[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(false);
    const [permissionGranted, setPermissionGranted] = useState(false);
 
    React.useEffect(() => {
        (async () => {
            const { status } = await Contacts.requestPermissionsAsync();
            if (status === 'granted') {
                setPermissionGranted(true);
                const { data } = await Contacts.getContactsAsync({
                    fields: [Contacts.Fields.Name, Contacts.Fields.PhoneNumbers],
                });
 
                if (data.length > 0) {
                    const formattedContacts = data
                        .filter((c: any) => c.phoneNumbers && c.phoneNumbers.length > 0)
                        .map((c: any) => ({
                            id: c.id,
                            name: c.name,
                            phone: c.phoneNumbers![0].number || '',
                            selected: false
                        }));
                    setContacts(formattedContacts);
                }
            }
        })();
    }, []);
 
    const toggleContact = (id: string) => {
        setContacts(contacts.map(c =>
            c.id === id ? { ...c, selected: !c.selected } : c
        ));
    };
 
    const selectedContacts = contacts.filter(c => c.selected);
    const splitAmount = totalAmount / (selectedContacts.length + 1);
 
    const sendSplitRequests = async () => {
        if (selectedContacts.length === 0) return;
 
        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('User not found');
 
            // Create split requests in database
            const { error } = await supabase
                .from('split_fare_requests')
                .insert(
                    selectedContacts.map(contact => ({
                        booking_id: tripId, // Assuming tripId passed here is actually bookingId
                        requester_id: user.id,
                        participant_phone: contact.phone,
                        participant_name: contact.name,
                        amount: splitAmount,
                        status: 'pending'
                    }))
                );
 
            if (error) throw error;
 
            Alert.alert('Success', `Split requests sent to ${selectedContacts.length} friends!`);
            setContacts(contacts.map(c => ({ ...c, selected: false })));
        } catch (error: any) {
            console.error('Split fare error:', error);
            Alert.alert('Error', 'Failed to send split requests: ' + error.message);
        } finally {
            setLoading(false);
        }
    };
 
    return (
        <Card className="p-5 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl shadow-sm" style={style}>
            <View className="flex-row items-center gap-3 mb-4">
                <View className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-900/20 justify-center items-center">
                    <Ionicons name="people" size={22} color={isDark ? "#60a5fa" : "#3b82f6"} />
                </View>
                <Text className="text-xl font-bold text-slate-900 dark:text-white">Split Fare</Text>
            </View>
 
            <Text className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-6">
                Total: <Text className="text-slate-800 dark:text-slate-200">₹{totalAmount}</Text> • You pay: <Text className="text-emerald-500">₹{Math.round(splitAmount)}</Text>
            </Text>
 
            <View className="flex-row items-center bg-slate-100 dark:bg-slate-800 rounded-2xl px-4 h-12 mb-6 border border-transparent dark:border-slate-700/50">
                <Ionicons name="search" size={20} color={isDark ? "#475569" : "#94a3b8"} />
                <TextInput
                    className="flex-1 ml-3 text-sm font-medium text-slate-900 dark:text-white"
                    placeholder="Search contacts..."
                    placeholderTextColor={isDark ? "#475569" : "#94a3b8"}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                />
            </View>
 
            <ScrollView className="flex-row mb-6" horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 16 }}>
                {contacts
                    .filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()))
                    .map(contact => (
                        <TouchableOpacity
                            key={contact.id}
                            className={`items-center p-3 rounded-2xl w-[80px] border ${
                                contact.selected 
                                    ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-100 dark:border-blue-900/30' 
                                    : 'bg-white dark:bg-slate-800/10 border-slate-50 dark:border-slate-800/50'
                            }`}
                            onPress={() => toggleContact(contact.id)}
                            activeOpacity={0.7}
                        >
                            <View className={`w-12 h-12 rounded-full justify-center items-center mb-2.5 ${
                                contact.selected ? 'bg-blue-500' : 'bg-slate-100 dark:bg-slate-800'
                            }`}>
                                <Text className={`text-base font-bold ${contact.selected ? 'text-white' : 'text-slate-600 dark:text-slate-300'}`}>
                                    {contact.name[0]}
                                </Text>
                            </View>
                            <Text className={`text-[11px] font-bold text-center ${
                                contact.selected ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500 dark:text-slate-400'
                            }`} numberOfLines={1}>
                                {contact.name.split(' ')[0]}
                            </Text>
                            {contact.selected && (
                                <View className="absolute top-1 right-1 bg-white dark:bg-slate-900 rounded-full border border-blue-500">
                                    <Ionicons name="checkmark-circle" size={16} color="#3b82f6" />
                                </View>
                            )}
                        </TouchableOpacity>
                    ))}
            </ScrollView>
 
            {selectedContacts.length > 0 && (
                <TouchableOpacity
                    className="bg-blue-600 active:bg-blue-700 h-14 rounded-2xl items-center justify-center shadow-lg shadow-blue-500/20"
                    onPress={sendSplitRequests}
                    disabled={loading}
                >
                    <Text className="text-white font-bold text-base">
                        {loading ? 'Sending...' : `Split ₹${Math.round(splitAmount)} each`}
                    </Text>
                </TouchableOpacity>
            )}
        </Card>
    );
}
 
const styles = StyleSheet.create({});
