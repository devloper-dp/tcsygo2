import AsyncStorage from '@react-native-async-storage/async-storage';
import { useColorScheme } from 'react-native';
import React from 'react';

export type ThemeMode = 'light' | 'dark' | 'system';

export interface Theme {
    mode: 'light' | 'dark';
    colors: {
        // Primary
        primary: string;
        primaryLight: string;
        primaryDark: string;

        // Background
        background: string;
        surface: string;
        card: string;

        // Text
        text: string;
        textSecondary: string;
        textTertiary: string;

        // Status
        success: string;
        warning: string;
        error: string;
        info: string;

        // Borders
        border: string;
        divider: string;

        // Interactive
        active: string;
        inactive: string;
        disabled: string;
    };
    spacing: {
        xs: number;
        sm: number;
        md: number;
        lg: number;
        xl: number;
        xxl: number;
    };
    borderRadius: {
        sm: number;
        md: number;
        lg: number;
        xl: number;
        full: number;
    };
    typography: {
        h1: { fontSize: number; fontWeight: string };
        h2: { fontSize: number; fontWeight: string };
        h3: { fontSize: number; fontWeight: string };
        body: { fontSize: number; fontWeight: string };
        caption: { fontSize: number; fontWeight: string };
    };
}

const lightTheme: Theme = {
    mode: 'light',
    colors: {
        primary: '#3b82f6',
        primaryLight: '#dbeafe',
        primaryDark: '#1e40af',

        background: '#ffffff',
        surface: '#f9fafb',
        card: '#ffffff',

        text: '#1f2937',
        textSecondary: '#6b7280',
        textTertiary: '#9ca3af',

        success: '#10b981',
        warning: '#f59e0b',
        error: '#ef4444',
        info: '#3b82f6',

        border: '#e5e7eb',
        divider: '#d1d5db',

        active: '#3b82f6',
        inactive: '#9ca3af',
        disabled: '#d1d5db',
    },
    spacing: {
        xs: 4,
        sm: 8,
        md: 16,
        lg: 24,
        xl: 32,
        xxl: 48,
    },
    borderRadius: {
        sm: 4,
        md: 8,
        lg: 12,
        xl: 16,
        full: 9999,
    },
    typography: {
        h1: { fontSize: 32, fontWeight: '800' },
        h2: { fontSize: 24, fontWeight: '700' },
        h3: { fontSize: 20, fontWeight: '700' },
        body: { fontSize: 16, fontWeight: '400' },
        caption: { fontSize: 12, fontWeight: '400' },
    },
};

const darkTheme: Theme = {
    mode: 'dark',
    colors: {
        primary: '#60a5fa',
        primaryLight: '#1e3a8a',
        primaryDark: '#93c5fd',

        background: '#111827',
        surface: '#1f2937',
        card: '#374151',

        text: '#f9fafb',
        textSecondary: '#d1d5db',
        textTertiary: '#9ca3af',

        success: '#34d399',
        warning: '#fbbf24',
        error: '#f87171',
        info: '#60a5fa',

        border: '#4b5563',
        divider: '#374151',

        active: '#60a5fa',
        inactive: '#6b7280',
        disabled: '#4b5563',
    },
    spacing: lightTheme.spacing,
    borderRadius: lightTheme.borderRadius,
    typography: lightTheme.typography,
};

class ThemeManager {
    private themeMode: ThemeMode = 'system';
    private listeners: Array<() => void> = [];

    async init() {
        try {
            const savedTheme = await AsyncStorage.getItem('theme_mode');
            if (savedTheme && (savedTheme === 'light' || savedTheme === 'dark' || savedTheme === 'system')) {
                this.themeMode = savedTheme as ThemeMode;
            }
        } catch (error) {
            console.error('Error loading theme preference:', error);
        }
    }

    async setThemeMode(mode: ThemeMode) {
        this.themeMode = mode;
        try {
            await AsyncStorage.setItem('theme_mode', mode);
            this.notifyListeners();
        } catch (error) {
            console.error('Error saving theme preference:', error);
        }
    }

    getThemeMode(): ThemeMode {
        return this.themeMode;
    }

    getTheme(systemColorScheme?: 'light' | 'dark' | null): Theme {
        if (this.themeMode === 'system') {
            return systemColorScheme === 'dark' ? darkTheme : lightTheme;
        }
        return this.themeMode === 'dark' ? darkTheme : lightTheme;
    }

    subscribe(listener: () => void) {
        this.listeners.push(listener);
        return () => {
            this.listeners = this.listeners.filter((l) => l !== listener);
        };
    }

    private notifyListeners() {
        this.listeners.forEach((listener) => listener());
    }
}

export const themeManager = new ThemeManager();

// Hook for React components
export function useTheme() {
    const systemColorScheme = useColorScheme();
    const [, setUpdate] = React.useState(0);

    React.useEffect(() => {
        const unsubscribe = themeManager.subscribe(() => {
            setUpdate((prev) => prev + 1);
        });
        return unsubscribe;
    }, []);

    const theme = themeManager.getTheme(systemColorScheme);
    const themeMode = themeManager.getThemeMode();

    return {
        theme,
        themeMode,
        setThemeMode: (mode: ThemeMode) => themeManager.setThemeMode(mode),
        isDark: theme.mode === 'dark',
    };
}

// Helper function to create styles with theme
export function createThemedStyles<T extends Record<string, any>>(
    stylesFn: (theme: Theme) => T
) {
    return (theme: Theme) => stylesFn(theme);
}
