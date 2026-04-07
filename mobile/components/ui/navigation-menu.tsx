import React from 'react';
import { View, ScrollView, TouchableOpacity } from 'react-native';
import { Text } from './text';
import { Ionicons } from '@expo/vector-icons';
import { Collapsible } from './collapsible';
import { cn } from '@/lib/utils';
import { useTheme } from '@/contexts/ThemeContext';
 
interface NavigationItem {
    label: string;
    onPress?: () => void;
    icon?: keyof typeof Ionicons.glyphMap;
    children?: NavigationItem[];
}
 
interface NavigationMenuProps {
    items: NavigationItem[];
    className?: string;
}
 
export function NavigationMenu({ items, className }: NavigationMenuProps) {
    const { isDark } = useTheme();
    const [expandedItems, setExpandedItems] = React.useState<Set<number>>(new Set());
 
    const toggleItem = (index: number) => {
        const newExpanded = new Set(expandedItems);
        if (newExpanded.has(index)) {
            newExpanded.delete(index);
        } else {
            newExpanded.add(index);
        }
        setExpandedItems(newExpanded);
    };
 
    const renderItem = (item: NavigationItem, index: number, depth: number = 0) => {
        const hasChildren = item.children && item.children.length > 0;
        const isExpanded = expandedItems.has(index);
 
        return (
            <View key={index} style={{ marginLeft: depth * 12 }}>
                <TouchableOpacity
                    onPress={() => {
                        if (hasChildren) {
                            toggleItem(index);
                        } else if (item.onPress) {
                            item.onPress();
                        }
                    }}
                    className={`flex-row items-center px-5 py-4 border-b border-slate-50 dark:border-slate-800/50 active:bg-slate-50 dark:active:bg-slate-800/50`}
                >
                    {item.icon && (
                        <View className="mr-4 w-6 items-center">
                            <Ionicons
                                name={item.icon}
                                size={18}
                                color={isDark ? "#64748b" : "#94a3b8"}
                            />
                        </View>
                    )}
                    <Text className={`flex-1 text-sm font-black uppercase tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>{item.label}</Text>
                    {hasChildren && (
                        <Ionicons
                            name={isExpanded ? 'chevron-down' : 'chevron-forward'}
                            size={14}
                            color={isDark ? "#475569" : "#cbd5e1"}
                        />
                    )}
                </TouchableOpacity>
 
                {hasChildren && (
                    <Collapsible open={isExpanded}>
                        <View className="bg-slate-50/50 dark:bg-slate-900/50">
                            {item.children!.map((child, childIndex) =>
                                renderItem(child, index * 1000 + childIndex, depth + 1)
                            )}
                        </View>
                    </Collapsible>
                )}
            </View>
        );
    };
 
    return (
        <ScrollView className={cn('flex-1 bg-white dark:bg-slate-950', className)}>
            {items.map((item, index) => renderItem(item, index))}
        </ScrollView>
    );
}
