import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function HelpSupportScreen() {
    const router = useRouter();

    const faqItems = [
        { q: 'How do I book a trip?', a: 'Go to the Search tab, enter your destination, select a trip, and confirm your booking.' },
        { q: 'How do I become a driver?', a: 'You can apply to become a driver from the My Vehicles section in your profile.' },
        { q: 'How are payments handled?', a: 'We use secure payment gateways like Razorpay to process all transactions safely.' },
    ];

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#1f2937" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Help & Support</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={styles.contactSection}>
                    <Text style={styles.sectionTitle}>Contact Us</Text>
                    <View style={styles.card}>
                        <TouchableOpacity
                            style={styles.contactItem}
                            onPress={() => Linking.openURL('mailto:support@tcsygo.com')}
                        >
                            <View style={styles.contactIcon}>
                                <Ionicons name="mail-outline" size={24} color="#3b82f6" />
                            </View>
                            <View>
                                <Text style={styles.contactLabel}>Email Support</Text>
                                <Text style={styles.contactValue}>support@tcsygo.com</Text>
                            </View>
                        </TouchableOpacity>
                        <View style={styles.separator} />
                        <TouchableOpacity
                            style={styles.contactItem}
                            onPress={() => Linking.openURL('tel:+919876543210')}
                        >
                            <View style={styles.contactIcon}>
                                <Ionicons name="call-outline" size={24} color="#22c55e" />
                            </View>
                            <View>
                                <Text style={styles.contactLabel}>Phone Support</Text>
                                <Text style={styles.contactValue}>+91 98765 43210</Text>
                            </View>
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={styles.faqSection}>
                    <Text style={styles.sectionTitle}>Frequently Asked Questions</Text>
                    {faqItems.map((item, index) => (
                        <View key={index} style={styles.faqCard}>
                            <Text style={styles.faqQuestion}>{item.q}</Text>
                            <Text style={styles.faqAnswer}>{item.a}</Text>
                        </View>
                    ))}
                </View>

                <TouchableOpacity style={styles.feedbackBtn}>
                    <Text style={styles.feedbackBtnText}>Submit Feedback</Text>
                </TouchableOpacity>
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
    contactSection: {
        marginBottom: 30,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#1f2937',
        marginBottom: 12,
    },
    card: {
        backgroundColor: '#fff',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#e5e7eb',
        overflow: 'hidden',
    },
    contactItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
        padding: 16,
    },
    contactIcon: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#f3f4f6',
        justifyContent: 'center',
        alignItems: 'center',
    },
    contactLabel: {
        fontSize: 14,
        color: '#6b7280',
    },
    contactValue: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1f2937',
    },
    separator: {
        height: 1,
        backgroundColor: '#f3f4f6',
        marginHorizontal: 16,
    },
    faqSection: {
        marginBottom: 30,
    },
    faqCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#e5e7eb',
    },
    faqQuestion: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#1f2937',
        marginBottom: 8,
    },
    faqAnswer: {
        fontSize: 14,
        color: '#4b5563',
        lineHeight: 20,
    },
    feedbackBtn: {
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#3b82f6',
        padding: 16,
        borderRadius: 8,
        alignItems: 'center',
        marginTop: 10,
        marginBottom: 40,
    },
    feedbackBtnText: {
        color: '#3b82f6',
        fontSize: 16,
        fontWeight: 'bold',
    },
});
