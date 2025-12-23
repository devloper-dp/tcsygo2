import React from 'react';
import { View, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { Text } from './text';
import { Ionicons } from '@expo/vector-icons';
import Collapsible from './collapsible';
import { cn } from '@/lib/utils';

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
            <View key={index} style={{ marginLeft: depth * 16 }}>
                <TouchableOpacity
                    onPress={() => {
                        if (hasChildren) {
                            toggleItem(index);
                        } else if (item.onPress) {
                            item.onPress();
                        }
                    }}
                    style={styles.item}
                >
                    {item.icon && (
                        <Ionicons
                            name={item.icon}
                            size={20}
                            color="#6b7280"
                            style={styles.icon}
                        />
                    )}
                    <Text style={styles.itemLabel}>{item.label}</Text>
                    {hasChildren && (
                        <Ionicons
                            name={isExpanded ? 'chevron-down' : 'chevron-forward'}
                            size={16}
                            color="#9ca3af"
                        />
                    )}
                </TouchableOpacity>

                {hasChildren && (
                    <Collapsible open={isExpanded}>
                        <View style={styles.children}>
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
        <ScrollView className={cn('bg-white', className)} style={styles.container}>
            {items.map((item, index) => renderItem(item, index))}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    item: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#f3f4f6',
    },
    icon: {
        marginRight: 12,
    },
    itemLabel: {
        flex: 1,
        fontSize: 14,
        color: '#1f2937',
        fontWeight: '500',
    },
    children: {
        backgroundColor: '#f9fafb',
    },
});
