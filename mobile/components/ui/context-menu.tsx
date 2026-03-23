import React from 'react';
import { View, TouchableOpacity, Modal, Pressable, Platform } from 'react-native';
import { Text } from './text';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/contexts/ThemeContext';
 
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
    const { isDark } = useTheme();
    const [visible, setVisible] = React.useState(false);
 
    const handleLongPress = () => {
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
                <Pressable 
                    className="flex-1 justify-center items-center bg-black/40 dark:bg-black/60" 
                    onPress={() => setVisible(false)}
                >
                    <View className="bg-white dark:bg-slate-900 rounded-[32px] min-w-[240px] max-w-[320px] shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden">
                        {items.map((item, index) => (
                            <TouchableOpacity
                                key={index}
                                onPress={() => handleItemPress(item)}
                                disabled={item.disabled}
                                className={`flex-row items-center px-6 py-5 active:bg-slate-50 dark:active:bg-slate-800/50 ${index !== items.length - 1 ? 'border-b border-slate-50 dark:border-slate-800' : ''} ${item.disabled ? 'opacity-30' : ''}`}
                            >
                                {item.icon && <View className="mr-4">{item.icon}</View>}
                                <Text
                                    className={`text-sm font-black uppercase tracking-tight ${item.destructive ? 'text-red-500' : 'text-slate-900 dark:text-white'} ${item.disabled ? 'text-slate-400' : ''}`}
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
