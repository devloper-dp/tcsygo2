import React from 'react';
import { View, StyleSheet, Modal, TouchableOpacity, ScrollView, Image } from 'react-native';
import { Text } from '@/components/ui/text';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import { useResponsive } from '@/hooks/useResponsive';
 
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
    const { theme, isDark } = useTheme();
    const { hScale, vScale, spacing } = useResponsive();
 
    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={true}
            onRequestClose={onClose}
        >
            <View style={{ flex: 1, justifyContent: 'flex-end' }} className="bg-black/60">
                <View style={{ height: '80%', borderTopLeftRadius: hScale(32), borderTopRightRadius: hScale(32), padding: hScale(24), borderTopWidth: 1 }} className="bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800">
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: vScale(24) }}>
                        <Text style={{ fontSize: hScale(20) }} className="font-bold text-slate-900 dark:text-white">Safety Tips</Text>
                        <TouchableOpacity 
                            onPress={onClose} 
                            style={{ width: hScale(40), height: hScale(40), borderRadius: hScale(20) }}
                            className="bg-slate-50 dark:bg-slate-800 items-center justify-center"
                        >
                            <Ionicons name="close" size={hScale(24)} color={isDark ? "#cbd5e1" : "#1e293b"} />
                        </TouchableOpacity>
                    </View>
 
                    <ScrollView showsVerticalScrollIndicator={false}>
                        <View style={{ alignItems: 'center', marginBottom: vScale(32), padding: hScale(32), borderRadius: hScale(24), borderWidth: 1 }} className="bg-blue-50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-900/20">
                            <View style={{ width: hScale(64), height: hScale(64), borderRadius: hScale(32), marginBottom: vScale(16) }} className="bg-blue-100 dark:bg-blue-900/30 items-center justify-center">
                                <Ionicons name="shield-checkmark" size={hScale(40)} color={isDark ? "#60a5fa" : "#3b82f6"} />
                            </View>
                            <Text style={{ fontSize: hScale(18) }} className="font-bold text-slate-900 dark:text-white text-center">Your Safety is Our Priority</Text>
                            <Text style={{ fontSize: hScale(14), marginTop: vScale(8), lineHeight: vScale(20) }} className="text-slate-500 dark:text-slate-400 text-center font-medium">Follow these tips for a safe and comfortable journey</Text>
                        </View>
 
                        {TIPS.map((tip, index) => (
                            <View key={index} style={{ flexDirection: 'row', marginBottom: vScale(32), gap: hScale(16), paddingHorizontal: hScale(4) }}>
                                <View style={{ width: hScale(48), height: hScale(48), borderRadius: hScale(16), borderWidth: 1 }} className="bg-slate-50 dark:bg-slate-800/80 items-center justify-center border-slate-100 dark:border-slate-800">
                                    <Ionicons name={tip.icon as any} size={hScale(22)} color={isDark ? "#60a5fa" : "#3b82f6"} />
                                </View>
                                <View className="flex-1">
                                    <Text style={{ fontSize: hScale(16), marginBottom: vScale(6) }} className="font-bold text-slate-900 dark:text-white">{tip.title}</Text>
                                    <Text style={{ fontSize: hScale(14), lineHeight: vScale(24) }} className="text-slate-500 dark:text-slate-400 font-medium">{tip.description}</Text>
                                </View>
                            </View>
                        ))}
                    </ScrollView>
 
                    <TouchableOpacity 
                        style={{ height: vScale(56), borderRadius: hScale(16), marginTop: vScale(16) }}
                        className="bg-blue-600 active:bg-blue-700 items-center justify-center shadow-lg shadow-blue-500/20" 
                        onPress={onClose}
                    >
                        <Text style={{ fontSize: hScale(16) }} className="text-white font-bold">Got it, thanks!</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
}
 
const styles = StyleSheet.create({});
