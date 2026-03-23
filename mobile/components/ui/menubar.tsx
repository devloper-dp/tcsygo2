import React from 'react';
import { View, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { Text } from './text';
import { Ionicons } from '@expo/vector-icons';
import { cn } from '@/lib/utils';
import { useTheme } from '@/contexts/ThemeContext';
 
export interface MenuItem {
    label: string;
    onPress?: () => void;
    icon?: keyof typeof Ionicons.glyphMap;
    children?: MenuItem[];
}
 
interface MenubarProps {
    items: MenuItem[];
    className?: string;
}
 
export function Menubar({ items, className }: MenubarProps) {
    const { isDark } = useTheme();
    const [expandedIndex, setExpandedIndex] = React.useState<number | null>(null);
 
    const handleItemPress = (item: MenuItem, index: number) => {
        if (item.children) {
            setExpandedIndex(expandedIndex === index ? null : index);
        } else if (item.onPress) {
            item.onPress();
        }
    };
 
    return (
        <View className={cn('bg-white dark:bg-slate-900 border-b border-slate-50 dark:border-slate-800 z-50', className)}>
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 12 }}
            >
                {items.map((item, index) => (
                    <View key={index} className="relative">
                        <TouchableOpacity
                            onPress={() => handleItemPress(item, index)}
                            className={cn(
                                "flex-row items-center px-5 py-4 gap-2.5 active:bg-slate-50 dark:active:bg-slate-800/50",
                                expandedIndex === index && "bg-slate-50 dark:bg-slate-800/80"
                            )}
                        >
                            {item.icon && (
                                <Ionicons
                                    name={item.icon}
                                    size={18}
                                    color={isDark ? "#94a3b8" : "#475569"}
                                />
                            )}
                            <Text className={cn(
                                "text-sm font-black uppercase tracking-tight",
                                isDark ? "text-white" : "text-slate-900"
                            )}>{item.label}</Text>
                            {item.children && (
                                <Ionicons
                                    name={expandedIndex === index ? 'chevron-up' : 'chevron-down'}
                                    size={14}
                                    color={isDark ? "#475569" : "#cbd5e1"}
                                />
                            )}
                        </TouchableOpacity>
 
                        {expandedIndex === index && item.children && (
                            <View className="absolute top-full left-0 bg-white dark:bg-slate-900 rounded-2xl min-w-[200px] shadow-2xl border border-slate-50 dark:border-slate-800 z-[1000] mt-1 overflow-hidden">
                                {item.children.map((child, childIndex) => (
                                    <TouchableOpacity
                                        key={childIndex}
                                        onPress={() => {
                                            child.onPress?.();
                                            setExpandedIndex(null);
                                        }}
                                        className={cn(
                                            "flex-row items-center px-5 py-4 active:bg-slate-50 dark:active:bg-slate-800/50",
                                            childIndex !== item.children!.length - 1 && "border-b border-slate-50 dark:border-slate-800/50"
                                        )}
                                    >
                                        {child.icon && (
                                            <Ionicons
                                                name={child.icon}
                                                size={16}
                                                color={isDark ? "#64748b" : "#94a3b8"}
                                                className="mr-3"
                                            />
                                        )}
                                        <Text className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-tight">{child.label}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        )}
                    </View>
                ))}
            </ScrollView>
        </View>
    );
}
