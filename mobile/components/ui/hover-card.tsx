import React from 'react';
import { View, TouchableOpacity, Modal, Pressable, StyleSheet } from 'react-native';
import { Text } from './text';
import { cn } from '@/lib/utils';

interface HoverCardProps {
    children: React.ReactNode;
    content: React.ReactNode;
    className?: string;
}

export function HoverCard({ children, content, className }: HoverCardProps) {
    const [visible, setVisible] = React.useState(false);

    const showCard = () => setVisible(true);
    const hideCard = () => setVisible(false);

    return (
        <View className={className}>
            <TouchableOpacity
                onLongPress={showCard}
                onPress={hideCard}
                delayLongPress={500}
                activeOpacity={0.7}
            >
                {children}
            </TouchableOpacity>

            <Modal
                transparent
                visible={visible}
                animationType="fade"
                onRequestClose={hideCard}
            >
                <Pressable style={styles.overlay} onPress={hideCard}>
                    <View style={styles.card}>
                        {content}
                    </View>
                </Pressable>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.3)',
    },
    card: {
        backgroundColor: '#ffffff',
        borderRadius: 12,
        padding: 16,
        maxWidth: 300,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 8,
    },
});
