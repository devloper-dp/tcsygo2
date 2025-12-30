import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, TextInput, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { SafetyService, EmergencyContact } from '@/services/SafetyService';
import * as Contacts from 'expo-contacts';

export default function EmergencyContactsScreen() {
    const router = useRouter();
    const { user } = useAuth();
    const [contacts, setContacts] = useState<EmergencyContact[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAddForm, setShowAddForm] = useState(false);
    const [newName, setNewName] = useState('');
    const [newPhone, setNewPhone] = useState('');

    // Contact Picker State
    const [showPhoneSelectionModal, setShowPhoneSelectionModal] = useState(false);
    const [selectedContactName, setSelectedContactName] = useState('');
    const [selectedContactNumbers, setSelectedContactNumbers] = useState<any[]>([]);

    useEffect(() => {
        if (user) {
            fetchContacts();
        }
    }, [user]);

    const fetchContacts = async () => {
        if (!user) return;
        setLoading(true);
        try {
            const data = await SafetyService.getEmergencyContacts(user.id);
            setContacts(data);
        } catch (error) {
            console.error('Error fetching contacts:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAddContact = async () => {
        if (!newName || !newPhone) {
            Alert.alert("Error", "Please enter both name and phone number");
            return;
        }
        setLoading(true);
        try {
            const success = await SafetyService.addEmergencyContact(user!.id, {
                name: newName,
                phone: newPhone,
                relationship: 'Other',
                is_primary: contacts.length === 0,
            });
            if (success) {
                setNewName('');
                setNewPhone('');
                setShowAddForm(false);
                fetchContacts();
            } else {
                throw new Error("Failed to add contact");
            }
        } catch (error: any) {
            Alert.alert("Error", error.message || "Failed to add contact");
        } finally {
            setLoading(false);
        }
    };

    const handleImportFromContacts = async () => {
        try {
            const { status } = await Contacts.requestPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert("Permission Denied", "Please allow access to contacts to import them.");
                return;
            }

            const { data } = await Contacts.getContactsAsync({
                fields: [Contacts.Fields.Name, Contacts.Fields.PhoneNumbers],
            });

            if (data.length > 0) {
                // In a real app, you'd show a full contact picker.
                // For this demo, we'll just open the first contact with phone numbers
                const contactWithPhone = data.find(c => c.phoneNumbers && c.phoneNumbers.length > 0);
                if (contactWithPhone) {
                    if (contactWithPhone.phoneNumbers!.length > 1) {
                        setSelectedContactName(contactWithPhone.name || 'Unknown');
                        setSelectedContactNumbers(contactWithPhone.phoneNumbers!);
                        setShowPhoneSelectionModal(true);
                    } else {
                        setNewName(contactWithPhone.name || 'Unknown');
                        setNewPhone(contactWithPhone.phoneNumbers![0].number!.replace(/\s/g, ''));
                        setShowAddForm(true);
                    }
                } else {
                    Alert.alert("No Contacts", "No contacts with phone numbers found.");
                }
            }
        } catch (error) {
            console.error('Error importing contact:', error);
            Alert.alert("Error", "Failed to import contact");
        }
    };

    const handleSelectPhoneNumber = (number: string) => {
        setNewName(selectedContactName);
        setNewPhone(number.replace(/\s/g, ''));
        setShowPhoneSelectionModal(false);
        setShowAddForm(true);
    };

    const handleDeleteContact = async (contactId: string) => {
        Alert.alert(
            "Delete Contact",
            "Are you sure you want to remove this emergency contact?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        setLoading(true);
                        try {
                            const success = await SafetyService.deleteEmergencyContact(contactId);
                            if (success) {
                                fetchContacts();
                            } else {
                                throw new Error("Failed to delete contact");
                            }
                        } catch (error: any) {
                            Alert.alert("Error", error.message || "Failed to delete contact");
                        } finally {
                            setLoading(false);
                        }
                    }
                }
            ]
        );
    };

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color="#1f2937" />
                </TouchableOpacity>
                <Text variant="h3" style={styles.title}>Emergency Contacts</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                <View style={styles.infoBox}>
                    <Ionicons name="shield-checkmark" size={24} color="#3b82f6" />
                    <Text style={styles.infoText}>
                        Your emergency contacts will be notified in case you trigger an SOS during a ride.
                    </Text>
                </View>

                {contacts.length === 0 && !showAddForm ? (
                    <View style={styles.emptyState}>
                        <Ionicons name="people-outline" size={64} color="#d1d5db" />
                        <Text style={styles.emptyTitle}>No Emergency Contacts</Text>
                        <Text style={styles.emptySubtitle}>Add someone you trust to be notified in emergencies.</Text>
                    </View>
                ) : (
                    contacts.map((contact) => (
                        <Card key={contact.id} style={styles.contactCard}>
                            <View style={styles.contactInfo}>
                                <View style={styles.avatar}>
                                    <Text style={styles.avatarText}>{contact.name.charAt(0)}</Text>
                                </View>
                                <View style={styles.details}>
                                    <Text style={styles.contactName}>{contact.name}</Text>
                                    <Text style={styles.contactPhone}>{contact.phone}</Text>
                                </View>
                            </View>
                            <TouchableOpacity onPress={() => handleDeleteContact(contact.id)}>
                                <Ionicons name="trash-outline" size={20} color="#ef4444" />
                            </TouchableOpacity>
                        </Card>
                    ))
                )}

                {showAddForm ? (
                    <Card style={styles.formCard}>
                        <Text style={styles.formTitle}>Add New Contact</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Name"
                            value={newName}
                            onChangeText={setNewName}
                        />
                        <TextInput
                            style={styles.input}
                            placeholder="Phone Number"
                            value={newPhone}
                            onChangeText={setNewPhone}
                            keyboardType="phone-pad"
                        />
                        <View style={styles.formActions}>
                            <Button
                                variant="outline"
                                onPress={() => setShowAddForm(false)}
                                style={{ flex: 1 }}
                            >
                                Cancel
                            </Button>
                            <Button
                                onPress={handleAddContact}
                                disabled={loading}
                                style={{ flex: 1 }}
                            >
                                {loading ? <ActivityIndicator color="white" /> : 'Save'}
                            </Button>
                        </View>
                    </Card>
                ) : (
                    <View style={{ gap: 12, marginTop: 16 }}>
                        <Button
                            onPress={() => setShowAddForm(true)}
                            size="lg"
                        >
                            <Ionicons name="add" size={24} color="white" style={{ marginRight: 8 }} />
                            Add Contact Manually
                        </Button>
                        <Button
                            onPress={handleImportFromContacts}
                            variant="outline"
                            size="lg"
                        >
                            <Ionicons name="people" size={24} color="#3b82f6" style={{ marginRight: 8 }} />
                            Import from Contacts
                        </Button>
                    </View>
                )}
            </ScrollView>

            <Modal
                animationType="slide"
                transparent={true}
                visible={showPhoneSelectionModal}
                onRequestClose={() => setShowPhoneSelectionModal(false)}
            >
                <View style={styles.centeredView}>
                    <View style={styles.modalView}>
                        <Text style={styles.modalTitle}>Select Phone Number for {selectedContactName}</Text>
                        <View style={{ width: '100%', marginVertical: 10 }}>
                            {selectedContactNumbers.map((item, index) => (
                                <TouchableOpacity
                                    key={index}
                                    style={styles.phoneOption}
                                    onPress={() => handleSelectPhoneNumber(item.number)}
                                >
                                    <View style={styles.phoneIcon}>
                                        <Ionicons name="call-outline" size={20} color="#3b82f6" />
                                    </View>
                                    <View>
                                        <Text style={styles.phoneLabel}>{item.label || 'Other'}</Text>
                                        <Text style={styles.phoneNumber}>{item.number}</Text>
                                    </View>
                                </TouchableOpacity>
                            ))}
                        </View>
                        <Button
                            variant="outline"
                            onPress={() => setShowPhoneSelectionModal(false)}
                            style={{ width: '100%' }}
                        >
                            Cancel
                        </Button>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f9fafb',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: 'white',
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
    },
    backBtn: {
        padding: 4,
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1f2937',
    },
    content: {
        flex: 1,
        padding: 16,
    },
    infoBox: {
        flexDirection: 'row',
        backgroundColor: '#eff6ff',
        padding: 16,
        borderRadius: 16,
        alignItems: 'center',
        gap: 12,
        marginBottom: 24,
    },
    infoText: {
        flex: 1,
        fontSize: 14,
        color: '#374151',
        lineHeight: 20,
    },
    emptyState: {
        alignItems: 'center',
        marginTop: 60,
        marginBottom: 40,
        paddingHorizontal: 40,
    },
    emptyTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#1f2937',
        marginTop: 16,
    },
    emptySubtitle: {
        fontSize: 14,
        color: '#6b7280',
        textAlign: 'center',
        marginTop: 8,
    },
    contactCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        marginBottom: 12,
    },
    contactInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    avatar: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#dbeafe',
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#3b82f6',
    },
    details: {
        gap: 2,
    },
    contactName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1f2937',
    },
    contactPhone: {
        fontSize: 14,
        color: '#6b7280',
    },
    formCard: {
        padding: 20,
        gap: 16,
        marginTop: 20,
    },
    formTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1f2937',
    },
    input: {
        borderWidth: 1,
        borderColor: '#e5e7eb',
        borderRadius: 12,
        padding: 12,
        fontSize: 16,
    },
    formActions: {
        flexDirection: 'row',
        gap: 12,
    },
    centeredView: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: 'rgba(0,0,0,0.5)'
    },
    modalView: {
        width: '85%',
        backgroundColor: "white",
        borderRadius: 20,
        padding: 24,
        alignItems: "center",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1f2937',
        marginBottom: 16,
        textAlign: 'center'
    },
    phoneOption: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        backgroundColor: '#f9fafb',
        borderRadius: 12,
        marginBottom: 12,
    },
    phoneIcon: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#eff6ff',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    phoneLabel: {
        fontSize: 12,
        color: '#6b7280',
        textTransform: 'capitalize'
    },
    phoneNumber: {
        fontSize: 16,
        fontWeight: '500',
        color: '#1f2937'
    }
});
