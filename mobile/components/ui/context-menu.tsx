import React from 'react';
import { View, TouchableOpacity, Modal, Pressable, StyleSheet, Platform } from 'react-native';
import { Text } from './text';
import * as Haptics from 'expo-haptics';
import { cn } from '@/lib/utils';

export interface ContextMenuItem {
    label: string;
    onPress: () => void;
    icon?: React.ReactNode;
    destructive?: boolean;
    disabled?: boolean;
}

interface ContextMenuProps {
    children: React.ReactNode;
    items: ContextMenuItem[];
    className?: string;
}

export function ContextMenu({ children, items, className }: ContextMenuProps) {
    const [visible, setVisible] = React.useState(false);
    const [position, setPosition] = React.useState({ x: 0, y: 0 });

    const handleLongPress = (event: any) => {
        if (Platform.OS === 'ios') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        }
        setVisible(true);
    };

    const handleItemPress = (item: ContextMenuItem) => {
        if (!item.disabled) {
            setVisible(false);
            item.onPress();
        }
    };

    return (
        <View className={className}>
            <TouchableOpacity
                onLongPress={handleLongPress}
                delayLongPress={400}
                activeOpacity={0.7}
            >
                {children}
            </TouchableOpacity>

            <Modal
                transparent
                visible={visible}
                animationType="fade"
                onRequestClose={() => setVisible(false)}
            >
                <Pressable style={styles.overlay} onPress={() => setVisible(false)}>
                    <View style={styles.menu}>
                        {items.map((item, index) => (
                            <TouchableOpacity
                                key={index}
                                onPress={() => handleItemPress(item)}
                                disabled={item.disabled}
                                style={[
                                    styles.menuItem,
                                    index !== items.length - 1 && styles.menuItemBorder,
                                    item.disabled && styles.menuItemDisabled,
                                ]}
                            >
                                {item.icon && <View style={styles.icon}>{item.icon}</View>}
                                <Text
                                    style={[
                                        styles.menuItemText,
                                        item.destructive && styles.destructiveText,
                                        item.disabled && styles.disabledText,
                                    ]}
                                >
                                    {item.label}
                                </Text>
                            </TouchableOpacity>
                        ))}
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
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    menu: {
        backgroundColor: '#ffffff',
        borderRadius: 12,
        minWidth: 200,
        maxWidth: 300,
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 8,
            },
            android: {
                elevation: 8,
            },
        }),
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 16,
    },
    menuItemBorder: {
        borderBottomWidth: 1,
        borderBottomColor: '#f3f4f6',
    },
    menuItemDisabled: {
        opacity: 0.5,
    },
    icon: {
        marginRight: 12,
    },
    menuItemText: {
        fontSize: 16,
        color: '#1f2937',
    },
    destructiveText: {
        color: '#ef4444',
    },
    disabledText: {
        color: '#9ca3af',
    },
});
