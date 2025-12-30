import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '@/components/ui/card';
import { supabase } from '@/lib/supabase';

import * as Contacts from 'expo-contacts';

interface Contact {
    id: string;
    name: string;
    phone: string;
    selected?: boolean;
}

export function SplitFare({ tripId, totalAmount, style }: { tripId: string, totalAmount: number, style?: any }) {
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
        <Card style={[styles.container, style]}>
            <View style={styles.header}>
                <Ionicons name="people-outline" size={24} color="#3b82f6" />
                <Text style={styles.title}>Split Fare</Text>
            </View>

            <Text style={styles.amountText}>
                Total: ₹{totalAmount} • You pay: ₹{Math.round(splitAmount)}
            </Text>

            <View style={styles.searchContainer}>
                <Ionicons name="search" size={20} color="#9ca3af" />
                <TextInput
                    style={styles.searchInput}
                    placeholder="Search contacts..."
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                />
            </View>

            <ScrollView style={styles.contactsList} horizontal showsHorizontalScrollIndicator={false}>
                {contacts
                    .filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()))
                    .map(contact => (
                        <TouchableOpacity
                            key={contact.id}
                            style={[styles.contactChip, contact.selected && styles.contactChipSelected]}
                            onPress={() => toggleContact(contact.id)}
                        >
                            <View style={styles.avatar}>
                                <Text style={styles.avatarText}>{contact.name[0]}</Text>
                            </View>
                            <Text style={[styles.contactName, contact.selected && styles.contactNameSelected]}>
                                {contact.name.split(' ')[0]}
                            </Text>
                            {contact.selected && (
                                <View style={styles.checkIcon}>
                                    <Ionicons name="checkmark-circle" size={16} color="#3b82f6" />
                                </View>
                            )}
                        </TouchableOpacity>
                    ))}
            </ScrollView>

            {selectedContacts.length > 0 && (
                <TouchableOpacity
                    style={styles.sendButton}
                    onPress={sendSplitRequests}
                    disabled={loading}
                >
                    <Text style={styles.sendButtonText}>
                        {loading ? 'Sending...' : `Split ₹${Math.round(splitAmount)} each`}
                    </Text>
                </TouchableOpacity>
            )}
        </Card>
    );
}

const styles = StyleSheet.create({
    container: {
        padding: 16,
        backgroundColor: 'white',
        borderRadius: 12,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 8,
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1f2937',
    },
    amountText: {
        fontSize: 14,
        color: '#6b7280',
        marginBottom: 16,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f3f4f6',
        borderRadius: 8,
        paddingHorizontal: 12,
        marginBottom: 16,
    },
    searchInput: {
        flex: 1,
        height: 40,
        marginLeft: 8,
        fontSize: 14,
    },
    contactsList: {
        flexDirection: 'row',
        marginBottom: 16,
    },
    contactChip: {
        alignItems: 'center',
        marginRight: 16,
        padding: 8,
        borderRadius: 8,
        width: 70,
    },
    contactChipSelected: {
        backgroundColor: '#eff6ff',
    },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#e5e7eb',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 4,
    },
    avatarText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#374151',
    },
    contactName: {
        fontSize: 12,
        color: '#374151',
        textAlign: 'center',
    },
    contactNameSelected: {
        color: '#3b82f6',
        fontWeight: '500',
    },
    checkIcon: {
        position: 'absolute',
        top: 0,
        right: 0,
        backgroundColor: 'white',
        borderRadius: 8,
    },
    sendButton: {
        backgroundColor: '#3b82f6',
        padding: 14,
        borderRadius: 8,
        alignItems: 'center',
    },
    sendButtonText: {
        color: 'white',
        fontWeight: '600',
        fontSize: 16,
    },
});
