import React from 'react';
import { View, TouchableOpacity, StyleSheet, Modal, Pressable } from 'react-native';
import { Text } from './text';
import { cn } from '@/lib/utils';

interface TooltipProps {
    children: React.ReactNode;
    content: string;
    className?: string;
}

export function Tooltip({ children, content, className }: TooltipProps) {
    const [visible, setVisible] = React.useState(false);

    const showTooltip = () => setVisible(true);
    const hideTooltip = () => setVisible(false);

    return (
        <View className={className}>
            <TouchableOpacity
                onLongPress={showTooltip}
                onPress={hideTooltip}
                delayLongPress={500}
                activeOpacity={0.7}
            >
                {children}
            </TouchableOpacity>

            <Modal
                transparent
                visible={visible}
                animationType="fade"
                onRequestClose={hideTooltip}
            >
                <Pressable style={styles.overlay} onPress={hideTooltip}>
                    <View style={styles.tooltip}>
                        <Text style={styles.tooltipText}>{content}</Text>
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
    tooltip: {
        backgroundColor: '#1f2937',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 6,
        maxWidth: 250,
    },
    tooltipText: {
        color: '#ffffff',
        fontSize: 12,
        textAlign: 'center',
    },
});
