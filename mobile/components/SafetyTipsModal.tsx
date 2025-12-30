import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface SafetyTipsModalProps {
    visible: boolean;
    onClose: () => void;
}

const TIPS = [
    {
        title: 'Verify Your Ride',
        description: 'Check the car license plate, make, and model. Ensure the driver matches the photo in the app.',
        icon: 'scan-outline'
    },
    {
        title: 'Share Trip Details',
        description: 'Use the "Share" feature to send your live location and trip details to a friend or family member.',
        icon: 'share-social-outline'
    },
    {
        title: 'Buckle Up',
        description: 'Always wear your seatbelt, even on short trips. It is your best defense in case of an accident.',
        icon: 'accessibility-outline'
    },
    {
        title: 'Trust Your Instincts',
        description: 'If you feel uncomfortable, ask the driver to stop in a busy area. Use the SOS button in emergencies.',
        icon: 'shield-checkmark-outline'
    }
];

export function SafetyTipsModal({ visible, onClose }: SafetyTipsModalProps) {
    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={true}
            onRequestClose={onClose}
        >
            <View style={styles.centeredView}>
                <View style={styles.modalView}>
                    <View style={styles.header}>
                        <Text style={styles.headerTitle}>Safety Tips</Text>
                        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                            <Ionicons name="close" size={24} color="#1f2937" />
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.content}>
                        <View style={styles.banner}>
                            <Ionicons name="shield-checkmark" size={48} color="#3b82f6" />
                            <Text style={styles.bannerText}>Your Safety is Our Priority</Text>
                        </View>

                        {TIPS.map((tip, index) => (
                            <View key={index} style={styles.tipItem}>
                                <View style={styles.iconContainer}>
                                    <Ionicons name={tip.icon as any} size={24} color="#3b82f6" />
                                </View>
                                <View style={styles.textContainer}>
                                    <Text style={styles.tipTitle}>{tip.title}</Text>
                                    <Text style={styles.tipDesc}>{tip.description}</Text>
                                </View>
                            </View>
                        ))}
                    </ScrollView>

                    <TouchableOpacity style={styles.okBtn} onPress={onClose}>
                        <Text style={styles.okBtnText}>Got it</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    centeredView: {
        flex: 1,
        justifyContent: 'flex-end',
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    modalView: {
        backgroundColor: 'white',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 20,
        height: '80%',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#1f2937',
    },
    closeBtn: {
        padding: 4,
    },
    content: {
        flex: 1,
    },
    banner: {
        alignItems: 'center',
        marginBottom: 30,
        backgroundColor: '#eff6ff',
        padding: 24,
        borderRadius: 16,
    },
    bannerText: {
        marginTop: 12,
        fontSize: 18,
        fontWeight: '600',
        color: '#1f2937',
    },
    tipItem: {
        flexDirection: 'row',
        marginBottom: 24,
        gap: 16,
    },
    iconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#f3f4f6',
        justifyContent: 'center',
        alignItems: 'center',
    },
    textContainer: {
        flex: 1,
    },
    tipTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#1f2937',
        marginBottom: 4,
    },
    tipDesc: {
        fontSize: 14,
        color: '#6b7280',
        lineHeight: 20,
    },
    okBtn: {
        backgroundColor: '#3b82f6',
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
        marginTop: 10,
    },
    okBtnText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
});
