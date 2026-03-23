import React from 'react';
import { TextInput, TextInputProps, View, StyleSheet } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useResponsive } from '@/hooks/useResponsive';

interface InputProps extends TextInputProps {
    className?: string; // For NativeWind
    error?: string;
}

export const Input = React.forwardRef<TextInput, InputProps>(
    ({ className, error, style, ...props }, ref) => {
        const { theme } = useTheme();
        const isDark = theme === 'dark';
        const { hScale, vScale, fontSize } = useResponsive();
 
        return (
            <View className="w-full">
                <TextInput
                    ref={ref}
                    className={`flex w-full border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-primary dark:focus:border-blue-500 focus:bg-white dark:focus:bg-slate-800 disabled:opacity-50 text-slate-900 dark:text-slate-100 uppercase tracking-tight font-black ${error ? 'border-destructive' : ''
                        } ${className || ''}`}
                    placeholderTextColor={isDark ? "#475569" : "#94a3af"}
                    style={[
                        { 
                            height: vScale(56), 
                            borderRadius: hScale(20), 
                            paddingHorizontal: hScale(24), 
                            paddingVertical: vScale(16),
                            fontSize: fontSize.base
                        }, 
                        style
                    ]}
                    {...props}
                />
            </View>
        );
    }
);

Input.displayName = "Input";
