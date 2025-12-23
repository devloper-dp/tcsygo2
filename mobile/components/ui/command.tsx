import React from 'react';
import { View, TouchableOpacity, StyleSheet, Modal, Pressable } from 'react-native';
import { Text } from './text';
import { Ionicons } from '@expo/vector-icons';
import { cn } from '@/lib/utils';

interface CommandItem {
    label: string;
    onSelect: () => void;
    icon?: keyof typeof Ionicons.glyphMap;
    shortcut?: string;
}

interface CommandGroup {
    heading?: string;
    items: CommandItem[];
}

interface CommandProps {
    groups: CommandGroup[];
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    placeholder?: string;
    className?: string;
}

export function Command({
    groups,
    open: controlledOpen,
    onOpenChange,
    placeholder = 'Type a command...',
    className,
}: CommandProps) {
    const [internalOpen, setInternalOpen] = React.useState(false);
    const [search, setSearch] = React.useState('');

    const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen;

    const setOpen = (value: boolean) => {
        if (onOpenChange) {
            onOpenChange(value);
        } else {
            setInternalOpen(value);
        }
    };

    const handleItemPress = (item: CommandItem) => {
        item.onSelect();
        setOpen(false);
        setSearch('');
    };

    const filteredGroups = groups.map(group => ({
        ...group,
        items: group.items.filter(item =>
            item.label.toLowerCase().includes(search.toLowerCase())
        ),
    })).filter(group => group.items.length > 0);

    return (
        <Modal
            transparent
            visible={isOpen}
            animationType="fade"
            onRequestClose={() => setOpen(false)}
        >
            <Pressable style={styles.overlay} onPress={() => setOpen(false)}>
                <View style={styles.container} className={className}>
                    {filteredGroups.map((group, groupIndex) => (
                        <View key={groupIndex} style={styles.group}>
                            {group.heading && (
                                <Text style={styles.groupHeading}>{group.heading}</Text>
                            )}
                            {group.items.map((item, itemIndex) => (
                                <TouchableOpacity
                                    key={itemIndex}
                                    onPress={() => handleItemPress(item)}
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
                                    {item.shortcut && (
                                        <Text style={styles.shortcut}>{item.shortcut}</Text>
                                    )}
                                </TouchableOpacity>
                            ))}
                        </View>
                    ))}
                </View>
            </Pressable>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'flex-start',
        paddingTop: 100,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    container: {
        marginHorizontal: 20,
        backgroundColor: '#ffffff',
        borderRadius: 12,
        maxHeight: 400,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },
    group: {
        borderBottomWidth: 1,
        borderBottomColor: '#f3f4f6',
    },
    groupHeading: {
        fontSize: 12,
        fontWeight: '600',
        color: '#6b7280',
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: 8,
        textTransform: 'uppercase',
    },
    item: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    icon: {
        marginRight: 12,
    },
    itemLabel: {
        flex: 1,
        fontSize: 14,
        color: '#1f2937',
    },
    shortcut: {
        fontSize: 12,
        color: '#9ca3af',
        backgroundColor: '#f3f4f6',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
    },
});
