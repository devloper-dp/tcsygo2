import React from 'react';
import { View, TouchableOpacity, Modal, Pressable } from 'react-native';
import { Text } from './text';
import { useTheme } from '@/contexts/ThemeContext';
 
interface TooltipProps {
    children: React.ReactNode;
    content: string;
    className?: string;
}
 
export function Tooltip({ children, content, className }: TooltipProps) {
    const { isDark } = useTheme();
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
                <Pressable 
                    className="flex-1 justify-center items-center bg-black/40 dark:bg-black/60" 
                    onPress={hideTooltip}
                >
                    <View className="bg-slate-900 dark:bg-white px-5 py-3 rounded-2xl max-w-[280px] shadow-2xl items-center border border-slate-800 dark:border-slate-100">
                        <Text className="text-white dark:text-slate-900 text-[11px] font-black uppercase tracking-widest text-center leading-4">
                            {content}
                        </Text>
                    </View>
                </Pressable>
            </Modal>
        </View>
    );
}
