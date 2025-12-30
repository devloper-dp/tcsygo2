import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import { LanguageSelector } from '@/components/LanguageSelector';

export default function SettingsScreen() {
    const router = useRouter();
    const { signOut } = useAuth();
    const [darkMode, setDarkMode] = useState(false);

    const handleSignOut = () => {
        Alert.alert(
            'Logout',
            'Are you sure you want to logout?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Logout',
                    style: 'destructive',
                    onPress: async () => {
                        await signOut();
                        router.replace('/login');
                    }
                },
            ]
        );
    };

    const handleDeleteAccount = () => {
        Alert.alert(
            'Delete Account',
            'This action is permanent and cannot be undone. Are you sure you want to delete your account?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: () => Alert.alert('Request Sent', 'Your account deletion request has been submitted.')
                },
            ]
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#1f2937" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Settings</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>App Settings</Text>
                    <View style={styles.card}>
                        <View style={styles.settingItem}>
                            <View style={styles.settingLeft}>
                                <Ionicons name="globe-outline" size={22} color="#4b5563" />
                                <Text style={styles.settingLabel}>Language</Text>
                            </View>
                            <View style={styles.settingRight}>
                                <LanguageSelector />
                            </View>
                        </View>
                        <View style={styles.separator} />
                        <TouchableOpacity
                            style={styles.settingItem}
                            onPress={() => {
                                setDarkMode(!darkMode);
                                Alert.alert('Theme Changed', `Dark Mode is now ${!darkMode ? 'On' : 'Off'}`);
                            }}
                        >
                            <View style={styles.settingLeft}>
                                <Ionicons name="moon-outline" size={22} color="#4b5563" />
                                <Text style={styles.settingLabel}>Dark Mode</Text>
                            </View>
                            <View style={styles.settingRight}>
                                <Text style={styles.settingValue}>{darkMode ? 'On' : 'Off'}</Text>
                                <Ionicons
                                    name={darkMode ? "toggle" : "toggle-outline"}
                                    size={24}
                                    color={darkMode ? "#3b82f6" : "#9ca3af"}
                                />
                            </View>
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Legal</Text>
                    <View style={styles.card}>
                        <TouchableOpacity style={styles.settingItem}>
                            <Text style={styles.settingLabel}>Terms of Service</Text>
                            <Ionicons name="chevron-forward" size={18} color="#9ca3af" />
                        </TouchableOpacity>
                        <View style={styles.separator} />
                        <TouchableOpacity style={styles.settingItem}>
                            <Text style={styles.settingLabel}>Privacy Policy</Text>
                            <Ionicons name="chevron-forward" size={18} color="#9ca3af" />
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Account Actions</Text>
                    <View style={styles.card}>
                        <TouchableOpacity style={styles.settingItem} onPress={handleSignOut}>
                            <Text style={[styles.settingLabel, { color: '#ef4444' }]}>Logout</Text>
                            <Ionicons name="log-out-outline" size={22} color="#ef4444" />
                        </TouchableOpacity>
                        <View style={styles.separator} />
                        <TouchableOpacity style={styles.settingItem} onPress={handleDeleteAccount}>
                            <Text style={[styles.settingLabel, { color: '#ef4444' }]}>Delete Account</Text>
                            <Ionicons name="trash-outline" size={22} color="#ef4444" />
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={styles.footer}>
                    <Text style={styles.versionText}>Version 1.0.0 (Build 101)</Text>
                    <Text style={styles.copyrightText}>© 2024 TCSYGO. All rights reserved.</Text>
                </View>
            </ScrollView>
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
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#f3f4f6',
    },
    backButton: {
        padding: 4,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1f2937',
    },
    scrollContent: {
        padding: 20,
    },
    section: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#6b7280',
        textTransform: 'uppercase',
        marginBottom: 8,
        marginLeft: 4,
    },
    card: {
        backgroundColor: '#fff',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#e5e7eb',
        overflow: 'hidden',
    },
    settingItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
    },
    settingLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    settingRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    settingLabel: {
        fontSize: 16,
        color: '#1f2937',
    },
    settingValue: {
        fontSize: 16,
        color: '#6b7280',
    },
    separator: {
        height: 1,
        backgroundColor: '#f3f4f6',
        marginHorizontal: 16,
    },
    footer: {
        alignItems: 'center',
        marginTop: 20,
        marginBottom: 40,
    },
    versionText: {
        fontSize: 12,
        color: '#9ca3af',
    },
    copyrightText: {
        fontSize: 12,
        color: '#d1d5db',
        marginTop: 4,
    },
});
