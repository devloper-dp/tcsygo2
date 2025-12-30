import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import i18n from '@/lib/i18n';

const LANGUAGES = [
    { code: 'en', name: 'English', nativeName: 'English' },
    { code: 'hi', name: 'Hindi', nativeName: 'हिंदी' },
    { code: 'mr', name: 'Marathi', nativeName: 'मराठी' },
];

export function LanguageSelector({ style }: { style?: any }) {
    const [visible, setVisible] = useState(false);
    const [currentLang, setCurrentLang] = useState(i18n.language || 'en');

    const changeLanguage = (langCode: string) => {
        i18n.changeLanguage(langCode);
        setCurrentLang(langCode);
        setVisible(false);
    };

    const selectedLanguage = LANGUAGES.find(l => l.code === currentLang);

    return (
        <>
            <TouchableOpacity style={[styles.trigger, style]} onPress={() => setVisible(true)}>
                <Ionicons name="globe-outline" size={20} color="#6b7280" />
                <Text style={styles.triggerText}>{selectedLanguage?.nativeName || 'English'}</Text>
                <Ionicons name="chevron-down" size={16} color="#6b7280" />
            </TouchableOpacity>

            <Modal visible={visible} transparent animationType="fade">
                <TouchableOpacity style={styles.overlay} onPress={() => setVisible(false)}>
                    <View style={styles.modalContent}>
                        <Text style={styles.title}>Select Language</Text>
                        <View style={styles.divider} />

                        {LANGUAGES.map((lang) => (
                            <TouchableOpacity
                                key={lang.code}
                                style={[styles.langOption, currentLang === lang.code && styles.langOptionActive]}
                                onPress={() => changeLanguage(lang.code)}
                            >
                                <View>
                                    <Text style={[styles.langName, currentLang === lang.code && styles.langNameActive]}>
                                        {lang.nativeName}
                                    </Text>
                                    <Text style={styles.langEnglish}>{lang.name}</Text>
                                </View>
                                {currentLang === lang.code && (
                                    <Ionicons name="checkmark-circle" size={20} color="#3b82f6" />
                                )}
                            </TouchableOpacity>
                        ))}
                    </View>
                </TouchableOpacity>
            </Modal>
        </>
    );
}

const styles = StyleSheet.create({
    trigger: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f3f4f6',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        gap: 6,
    },
    triggerText: {
        fontSize: 14,
        color: '#374151',
        fontWeight: '500',
    },
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        padding: 24,
    },
    modalContent: {
        backgroundColor: 'white',
        borderRadius: 16,
        padding: 20,
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1f2937',
        marginBottom: 16,
        textAlign: 'center',
    },
    divider: {
        height: 1,
        backgroundColor: '#e5e7eb',
        marginBottom: 8,
    },
    langOption: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 12,
        paddingHorizontal: 8,
        borderRadius: 8,
    },
    langOptionActive: {
        backgroundColor: '#eff6ff',
    },
    langName: {
        fontSize: 16,
        color: '#374151',
        fontWeight: '500',
    },
    langNameActive: {
        color: '#3b82f6',
        fontWeight: '600',
    },
    langEnglish: {
        fontSize: 12,
        color: '#9ca3af',
    },
});
