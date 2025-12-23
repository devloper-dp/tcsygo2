import React from 'react';
import { View, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Text } from './text';
import { Ionicons } from '@expo/vector-icons';
import { cn } from '@/lib/utils';

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
    const [expandedIndex, setExpandedIndex] = React.useState<number | null>(null);

    const handleItemPress = (item: MenuItem, index: number) => {
        if (item.children) {
            setExpandedIndex(expandedIndex === index ? null : index);
        } else if (item.onPress) {
            item.onPress();
        }
    };

    return (
        <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            className={cn('bg-white border-b border-gray-200', className)}
            contentContainerStyle={styles.container}
        >
            {items.map((item, index) => (
                <View key={index}>
                    <TouchableOpacity
                        onPress={() => handleItemPress(item, index)}
                        style={styles.menuItem}
                    >
                        {item.icon && (
                            <Ionicons
                                name={item.icon}
                                size={20}
                                color="#1f2937"
                                style={styles.icon}
                            />
                        )}
                        <Text style={styles.menuText}>{item.label}</Text>
                        {item.children && (
                            <Ionicons
                                name={expandedIndex === index ? 'chevron-up' : 'chevron-down'}
                                size={16}
                                color="#6b7280"
                            />
                        )}
                    </TouchableOpacity>

                    {expandedIndex === index && item.children && (
                        <View style={styles.submenu}>
                            {item.children.map((child, childIndex) => (
                                <TouchableOpacity
                                    key={childIndex}
                                    onPress={child.onPress}
                                    style={styles.submenuItem}
                                >
                                    {child.icon && (
                                        <Ionicons
                                            name={child.icon}
                                            size={18}
                                            color="#6b7280"
                                            style={styles.icon}
                                        />
                                    )}
                                    <Text style={styles.submenuText}>{child.label}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    )}
                </View>
            ))}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        gap: 8,
    },
    icon: {
        marginRight: 4,
    },
    menuText: {
        fontSize: 14,
        fontWeight: '500',
        color: '#1f2937',
    },
    submenu: {
        position: 'absolute',
        top: '100%',
        left: 0,
        backgroundColor: '#ffffff',
        borderRadius: 8,
        minWidth: 180,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 4,
        zIndex: 1000,
    },
    submenuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#f3f4f6',
    },
    submenuText: {
        fontSize: 14,
        color: '#374151',
    },
});
