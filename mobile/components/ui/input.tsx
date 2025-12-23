import React from 'react';
import { TextInput, TextInputProps, View, StyleSheet } from 'react-native';

interface InputProps extends TextInputProps {
    className?: string; // For NativeWind
    error?: string;
}

export const Input = React.forwardRef<TextInput, InputProps>(
    ({ className, error, ...props }, ref) => {
        return (
            <View className="w-full">
                <TextInput
                    ref={ref}
                    className={`flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 text-gray-900 dark:text-gray-100 ${error ? 'border-destructive' : 'border-gray-200 dark:border-gray-800'
                        } ${className || ''}`}
                    placeholderTextColor="#9ca3af"
                    {...props}
                />
                {/* Error message could be added here if needed, but usually handled externally */}
            </View>
        );
    }
);

Input.displayName = "Input";
