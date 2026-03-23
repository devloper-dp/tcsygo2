import React from 'react';
import { View, ViewProps, TextProps } from 'react-native';
import { Text } from './text';
import { useResponsive } from '@/hooks/useResponsive';

function Card({ className, style, ...props }: ViewProps) {
    const { hScale } = useResponsive();
    return (
        <View
            className={`rounded-3xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-soft dark:shadow-none ${className || ''}`}
            style={[{ borderRadius: hScale(32) }, style]}
            {...props}
        />
    );
}

function CardHeader({ className, style, ...props }: ViewProps) {
    const { spacing } = useResponsive();
    return (
        <View
            className={`flex flex-col space-y-1.5 ${className || ''}`}
            style={[{ padding: spacing.xl }, style]}
            {...props}
        />
    );
}

function CardTitle({ className, children, ...props }: TextProps & { children: React.ReactNode }) {
    return (
        <Text
            variant="h3"
            className={`font-semibold leading-none tracking-tight ${className || ''}`}
            {...props}
        >
            {children}
        </Text>
    );
}

function CardDescription({ className, children, ...props }: TextProps & { children: React.ReactNode }) {
    const { fontSize } = useResponsive();
    return (
        <Text
            variant="body"
            className={`text-slate-500 dark:text-slate-400 ${className || ''}`}
            style={{ fontSize: fontSize.sm }}
            {...props}
        >
            {children}
        </Text>
    );
}

function CardContent({ className, style, ...props }: ViewProps) {
    const { spacing } = useResponsive();
    return (
        <View 
            className={`${className || ''}`} 
            style={[{ padding: spacing.xl, paddingTop: 0 }, style]} 
            {...props} 
        />
    );
}

function CardFooter({ className, style, ...props }: ViewProps) {
    const { spacing } = useResponsive();
    return (
        <View
            className={`flex flex-row items-center ${className || ''}`}
            style={[{ padding: spacing.xl, paddingTop: 0 }, style]}
            {...props}
        />
    );
}

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent };
