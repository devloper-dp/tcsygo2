import React, { useState, useEffect } from 'react';
import { View, ScrollView, TouchableOpacity, ActivityIndicator, Alert, TextInput, Modal, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { SafetyService, EmergencyContact } from '@/services/SafetyService';
import * as Contacts from 'expo-contacts';
import { useTheme } from '@/contexts/ThemeContext';
import { useResponsive } from '@/hooks/useResponsive';
 
export default function EmergencyContactsScreen() {
    const router = useRouter();
    const { user } = useAuth();
    const { theme, isDark } = useTheme();
    const { hScale, vScale, spacing, fontSize } = useResponsive();
    const [contacts, setContacts] = useState<EmergencyContact[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAddForm, setShowAddForm] = useState(false);
    const [newName, setNewName] = useState('');
    const [newPhone, setNewPhone] = useState('');
 
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
 
    if (loading && contacts.length === 0) {
        return (
            <SafeAreaView style={{ gap: spacing.lg }} className="flex-1 bg-white dark:bg-slate-950 justify-center items-center">
                <ActivityIndicator size="large" color={isDark ? "#ffffff" : "#3b82f6"} />
                <Text style={{ fontSize: hScale(10) }} className="text-slate-500 dark:text-slate-500 font-black uppercase tracking-widest">Accessing SOS Registry...</Text>
            </SafeAreaView>
        );
    }
 
    return (
        <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-950" edges={['top']}>
            <StatusBar barStyle={theme === 'dark' ? "light-content" : "dark-content"} />
            
            <View style={{ paddingHorizontal: spacing.xl, paddingVertical: vScale(16), borderBottomWidth: 1 }} className="flex-row items-center justify-between border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-sm z-10">
                <TouchableOpacity onPress={() => router.back()} style={{ width: hScale(40), height: hScale(40) }} className="rounded-full bg-slate-50 dark:bg-slate-900 items-center justify-center">
                    <Ionicons name="arrow-back" size={hScale(24)} color={isDark ? "#f8fafc" : "#1e293b"} />
                </TouchableOpacity>
                <Text style={{ fontSize: fontSize.xl }} className="font-black text-slate-900 dark:text-white uppercase tracking-tighter">Emergency</Text>
                <View style={{ width: hScale(40) }} />
            </View>
 
            <ScrollView 
                style={{ flex: 1, paddingHorizontal: spacing.xl, paddingTop: vScale(24) }}
                contentContainerStyle={{ paddingBottom: vScale(100) }}
                showsVerticalScrollIndicator={false}
            >
                <View style={{ borderRadius: hScale(28), padding: spacing.xl, marginBottom: vScale(32), gap: spacing.md, borderWidth: 1 }} className="flex-row bg-blue-50/50 dark:bg-blue-900/10 border-blue-100/50 dark:border-blue-900/20">
                    <View style={{ width: hScale(48), height: hScale(48), borderRadius: hScale(16) }} className="bg-blue-500 items-center justify-center shadow-lg shadow-blue-500/20">
                        <Ionicons name="shield-checkmark" size={hScale(24)} color="#ffffff" strokeWidth={3} />
                    </View>
                    <View className="flex-1">
                        <Text style={{ fontSize: hScale(10), marginBottom: vScale(4) }} className="font-black text-blue-800 dark:text-blue-400 uppercase tracking-widest">SOS Protocol Active</Text>
                        <Text style={{ fontSize: hScale(10), lineHeight: vScale(16) }} className="font-bold text-blue-600 dark:text-blue-500/80 uppercase tracking-tighter">
                            These trusted individuals will be contacted immediately if you trigger the SOS response.
                        </Text>
                    </View>
                </View>
 
                {contacts.length === 0 && !showAddForm ? (
                    <View style={{ paddingVertical: vScale(80) }} className="items-center opacity-30">
                        <Ionicons name="people-outline" size={hScale(80)} color={isDark ? "#94a3b8" : "#cbd5e1"} />
                        <Text style={{ fontSize: fontSize.xl, marginTop: vScale(24) }} className="font-black text-slate-900 dark:text-white uppercase tracking-widest">Registry Empty</Text>
                        <Text style={{ fontSize: fontSize.xs, marginTop: vScale(8), maxWidth: hScale(200) }} className="font-medium text-slate-500 dark:text-slate-500 text-center">Add trusted contacts for your safety during transit.</Text>
                    </View>
                ) : (
                    <View style={{ gap: spacing.md }}>
                        {contacts.map((contact) => (
                            <Card key={contact.id} style={{ padding: spacing.xl, borderRadius: hScale(32), borderWidth: 1 }} className="flex-row items-center justify-between bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 shadow-sm">
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.lg }}>
                                    <View style={{ width: hScale(56), height: hScale(56), borderRadius: hScale(16), borderWidth: 1 }} className="bg-slate-50 dark:bg-slate-800 justify-center items-center border-slate-100 dark:border-slate-700">
                                        <Text style={{ fontSize: fontSize.xl }} className="font-black text-slate-900 dark:text-white uppercase">{contact.name.charAt(0)}</Text>
                                    </View>
                                    <View style={{ gap: spacing.xs }}>
                                        <Text style={{ fontSize: fontSize.base }} className="font-black text-slate-900 dark:text-white uppercase tracking-tight">{contact.name}</Text>
                                        <Text style={{ fontSize: hScale(10) }} className="font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">{contact.phone}</Text>
                                    </View>
                                </View>
                                <TouchableOpacity 
                                    onPress={() => handleDeleteContact(contact.id)} 
                                    style={{ width: hScale(40), height: hScale(40), borderRadius: hScale(12), borderWidth: 1 }}
                                    className="bg-red-50 dark:bg-red-900/20 items-center justify-center border-red-100 dark:border-red-900/20"
                                >
                                    <Ionicons name="trash-outline" size={hScale(20)} color="#ef4444" />
                                </TouchableOpacity>
                            </Card>
                        ))}
                    </View>
                )}
 
                {showAddForm ? (
                    <Card style={{ padding: spacing.xxl, borderRadius: hScale(40), marginTop: vScale(32), gap: spacing.lg, borderWidth: 1 }} className="bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 shadow-lg">
                        <Text style={{ fontSize: hScale(10), paddingHorizontal: spacing.xs }} className="font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Manually Add Contact</Text>
                        
                        <View style={{ gap: spacing.xs }}>
                            <TextInput
                                style={{ height: vScale(56), borderRadius: hScale(20), paddingHorizontal: spacing.xl, borderWidth: 1 }}
                                className="bg-slate-50 dark:bg-slate-950 border-slate-100 dark:border-slate-800 text-base font-bold text-slate-900 dark:text-white"
                                placeholder="NAME"
                                placeholderTextColor={isDark ? "#475569" : "#94a3b8"}
                                value={newName}
                                onChangeText={setNewName}
                                autoCapitalize="characters"
                            />
                        </View>
  
                        <View style={{ gap: spacing.xs }}>
                            <TextInput
                                style={{ height: vScale(56), borderRadius: hScale(20), paddingHorizontal: spacing.xl, borderWidth: 1 }}
                                className="bg-slate-50 dark:bg-slate-950 border-slate-100 dark:border-slate-800 text-base font-bold text-slate-900 dark:text-white"
                                placeholder="PHONE NUMBER"
                                placeholderTextColor={isDark ? "#475569" : "#94a3b8"}
                                value={newPhone}
                                onChangeText={setNewPhone}
                                keyboardType="phone-pad"
                            />
                        </View>
 
                        <View style={{ flexDirection: 'row', gap: spacing.lg, marginTop: vScale(8) }}>
                            <TouchableOpacity
                                onPress={() => setShowAddForm(false)}
                                style={{ height: vScale(56), borderRadius: hScale(20), borderWidth: 1 }}
                                className="flex-1 border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 items-center justify-center"
                            >
                                <Text style={{ fontSize: fontSize.xs }} className="font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={handleAddContact}
                                disabled={loading}
                                style={{ height: vScale(56), borderRadius: hScale(20) }}
                                className="flex-1 bg-slate-900 dark:bg-white items-center justify-center shadow-lg shadow-slate-900/10"
                            >
                                {loading ? <ActivityIndicator color={isDark ? "#64748b" : "#ffffff"} /> : <Text style={{ fontSize: fontSize.xs }} className="text-white dark:text-slate-900 font-black uppercase tracking-widest">Authorize</Text>}
                            </TouchableOpacity>
                        </View>
                    </Card>
                ) : (
                    <View style={{ gap: spacing.lg, marginTop: vScale(40) }}>
                        <TouchableOpacity
                            onPress={() => setShowAddForm(true)}
                            style={{ height: vScale(64), borderRadius: hScale(24), gap: spacing.md }}
                            className="bg-slate-900 dark:bg-white flex-row items-center justify-center shadow-lg shadow-slate-900/10"
                        >
                            <Ionicons name="add" size={hScale(24)} color={isDark ? "#0f172a" : "#ffffff"} strokeWidth={3} />
                            <Text style={{ fontSize: fontSize.base }} className="text-white dark:text-slate-900 font-black uppercase tracking-widest">Add Manually</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={handleImportFromContacts}
                            style={{ height: vScale(64), borderRadius: hScale(24), gap: spacing.md, borderWidth: 1 }}
                            className="bg-white dark:bg-slate-900 border-blue-500/50 flex-row items-center justify-center shadow-sm"
                        >
                            <Ionicons name="people" size={hScale(24)} color="#3b82f6" strokeWidth={3} />
                            <Text style={{ fontSize: fontSize.base }} className="text-blue-600 dark:text-blue-400 font-black uppercase tracking-widest">Sync Contacts</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </ScrollView>
 
            <Modal
                animationType="fade"
                transparent={true}
                visible={showPhoneSelectionModal}
                onRequestClose={() => setShowPhoneSelectionModal(false)}
            >
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(2, 6, 23, 0.8)', padding: spacing.xl }}>
                    <Card style={{ width: '100%', borderRadius: hScale(40), padding: spacing.xxl, borderWidth: 1 }} className="bg-white dark:bg-slate-900 shadow-2xl border-slate-100 dark:border-slate-800">
                        <Text style={{ fontSize: fontSize.lg, marginBottom: vScale(24) }} className="font-black text-slate-900 dark:text-white uppercase tracking-tighter text-center">Select Secure Number</Text>
                        <ScrollView style={{ maxHeight: vScale(300), marginBottom: vScale(24) }} showsVerticalScrollIndicator={false}>
                            {selectedContactNumbers.map((item, index) => (
                                <TouchableOpacity
                                    key={index}
                                    style={{ padding: spacing.xl, borderRadius: hScale(24), marginBottom: vScale(12), borderWidth: 1, flexDirection: 'row', alignItems: 'center' }}
                                    className="bg-slate-50 dark:bg-slate-950 border-slate-100 dark:border-slate-800"
                                    onPress={() => handleSelectPhoneNumber(item.number)}
                                >
                                    <View style={{ width: hScale(40), height: hScale(40), borderRadius: hScale(12), marginRight: spacing.lg }} className="bg-blue-50 dark:bg-blue-900/20 justify-center items-center">
                                        <Ionicons name="call" size={hScale(20)} color="#3b82f6" />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={{ fontSize: hScale(10) }} className="font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">{item.label || 'DIRECT'}</Text>
                                        <Text style={{ fontSize: fontSize.base }} className="font-black text-slate-900 dark:text-white tracking-widest">{item.number}</Text>
                                    </View>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                        <TouchableOpacity
                            onPress={() => setShowPhoneSelectionModal(false)}
                            style={{ height: vScale(56), borderRadius: hScale(20) }}
                            className="bg-slate-100 dark:bg-slate-800 items-center justify-center"
                        >
                            <Text style={{ fontSize: fontSize.xs }} className="font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Abort Selection</Text>
                        </TouchableOpacity>
                    </Card>
                </View>
            </Modal>
        </SafeAreaView>
    );
}
