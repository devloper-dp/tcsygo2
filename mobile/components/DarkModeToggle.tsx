import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Sun, Moon, Monitor } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';

export const DarkModeToggle: React.FC = () => {
    const { theme, themeMode, setThemeMode, colors } = useTheme();

    const modes: Array<{ value: 'light' | 'dark' | 'system'; label: string; icon: any }> = [
        { value: 'light', label: 'Light', icon: Sun },
        { value: 'dark', label: 'Dark', icon: Moon },
        { value: 'system', label: 'System', icon: Monitor },
    ];

    return (
        <View style={[styles.container, { backgroundColor: colors.surface }]}>
            <Text style={[styles.title, { color: colors.text }]}>Theme</Text>
            <View style={styles.optionsContainer}>
                {modes.map((mode) => {
                    const Icon = mode.icon;
                    const isSelected = themeMode === mode.value;

                    return (
                        <TouchableOpacity
                            key={mode.value}
                            style={[
                                styles.option,
                                {
                                    backgroundColor: isSelected ? colors.primary : colors.background,
                                    borderColor: isSelected ? colors.primary : colors.border,
                                },
                            ]}
                            onPress={() => setThemeMode(mode.value)}
                        >
                            <Icon
                                size={24}
                                color={isSelected ? '#fff' : colors.text}
                            />
                            <Text
                                style={[
                                    styles.optionText,
                                    { color: isSelected ? '#fff' : colors.text },
                                ]}
                            >
                                {mode.label}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        padding: 16,
        borderRadius: 12,
        marginVertical: 8,
    },
    title: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 12,
    },
    optionsContainer: {
        flexDirection: 'row',
        gap: 12,
    },
    option: {
        flex: 1,
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        borderRadius: 12,
        borderWidth: 2,
        gap: 8,
    },
    optionText: {
        fontSize: 13,
        fontWeight: '600',
    },
});
