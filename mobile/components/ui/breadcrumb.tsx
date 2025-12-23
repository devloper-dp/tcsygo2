import React from 'react';
import { View, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { Text } from './text';
import { Ionicons } from '@expo/vector-icons';
import { cn } from '@/lib/utils';

interface BreadcrumbItem {
    label: string;
    onPress?: () => void;
}

interface BreadcrumbProps {
    items: BreadcrumbItem[];
    className?: string;
    separator?: React.ReactNode;
}

export function Breadcrumb({ items, className, separator }: BreadcrumbProps) {
    const defaultSeparator = (
        <Ionicons name="chevron-forward" size={16} color="#9ca3af" />
    );

    return (
        <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            className={cn('flex-row items-center', className)}
            contentContainerStyle={styles.container}
        >
            {items.map((item, index) => {
                const isLast = index === items.length - 1;

                return (
                    <View key={index} style={styles.itemContainer}>
                        {item.onPress && !isLast ? (
                            <TouchableOpacity onPress={item.onPress}>
                                <Text style={styles.linkText}>{item.label}</Text>
                            </TouchableOpacity>
                        ) : (
                            <Text style={isLast ? styles.activeText : styles.text}>
                                {item.label}
                            </Text>
                        )}

                        {!isLast && (
                            <View style={styles.separator}>
                                {separator || defaultSeparator}
                            </View>
                        )}
                    </View>
                );
            })}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    itemContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    text: {
        fontSize: 14,
        color: '#6b7280',
    },
    linkText: {
        fontSize: 14,
        color: '#3b82f6',
        textDecorationLine: 'underline',
    },
    activeText: {
        fontSize: 14,
        color: '#1f2937',
        fontWeight: '600',
    },
    separator: {
        marginLeft: 8,
    },
});
