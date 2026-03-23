import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useColorScheme as useRNColorScheme } from 'react-native';
import { useColorScheme as useNWColorScheme } from 'nativewind';
import AsyncStorage from '@react-native-async-storage/async-storage';

type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeContextType {
    theme: 'light' | 'dark';
    isDark: boolean;
    themeMode: ThemeMode;
    setThemeMode: (mode: ThemeMode) => void;
    colors: typeof lightColors;
}

const lightColors = {
    background: '#ffffff',
    surface: '#f9fafb',
    primary: '#6366f1',
    secondary: '#8b5cf6',
    text: '#1f2937',
    textSecondary: '#6b7280',
    border: '#e5e7eb',
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
    info: '#3b82f6',
};

const darkColors = {
    background: '#111827',
    surface: '#1f2937',
    primary: '#818cf8',
    secondary: '#a78bfa',
    text: '#f9fafb',
    textSecondary: '#d1d5db',
    border: '#374151',
    success: '#34d399',
    warning: '#fbbf24',
    error: '#f87171',
    info: '#60a5fa',
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = '@tcsygo_theme_mode';

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const systemColorScheme = useRNColorScheme();
    const { colorScheme, setColorScheme } = useNWColorScheme();
    const [themeMode, setThemeModeState] = useState<ThemeMode>('system');
    const [theme, setTheme] = useState<'light' | 'dark'>('light');

    useEffect(() => {
        loadThemePreference();
    }, []);

    useEffect(() => {
        // Update theme based on mode
        let newTheme: 'light' | 'dark';
        if (themeMode === 'system') {
            newTheme = systemColorScheme === 'dark' ? 'dark' : 'light';
        } else {
            newTheme = themeMode;
        }
        setTheme(newTheme);
        setColorScheme(newTheme);
    }, [themeMode, systemColorScheme]);

    const loadThemePreference = async () => {
        try {
            const savedMode = await AsyncStorage.getItem(THEME_STORAGE_KEY);
            if (savedMode && (savedMode === 'light' || savedMode === 'dark' || savedMode === 'system')) {
                setThemeModeState(savedMode as ThemeMode);
            }
        } catch (error) {
            console.error('Error loading theme preference:', error);
        }
    };

    const setThemeMode = async (mode: ThemeMode) => {
        try {
            await AsyncStorage.setItem(THEME_STORAGE_KEY, mode);
            setThemeModeState(mode);
        } catch (error) {
            console.error('Error saving theme preference:', error);
        }
    };

    const isDark = theme === 'dark';
    const colors = isDark ? darkColors : lightColors;

    return (
        <ThemeContext.Provider value={{ theme, isDark, themeMode, setThemeMode, colors }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = (): ThemeContextType => {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme must be used within ThemeProvider');
    }
    return context;
};
