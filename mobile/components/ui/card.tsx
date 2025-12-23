import React from 'react';
import { View, ViewProps, TextProps } from 'react-native';
import { Text } from './text';

function Card({ className, ...props }: ViewProps) {
    return (
        <View
            className={`rounded-lg border border-gray-200 bg-white text-gray-950 shadow-sm dark:border-gray-800 dark:bg-gray-950 dark:text-gray-50 ${className || ''}`}
            {...props}
        />
    );
}

function CardHeader({ className, ...props }: ViewProps) {
    return (
        <View
            className={`flex flex-col space-y-1.5 p-6 ${className || ''}`}
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
    return (
        <Text
            variant="body"
            className={`text-sm text-gray-500 dark:text-gray-400 ${className || ''}`}
            {...props}
        >
            {children}
        </Text>
    );
}

function CardContent({ className, ...props }: ViewProps) {
    return <View className={`p-6 pt-0 ${className || ''}`} {...props} />;
}

function CardFooter({ className, ...props }: ViewProps) {
    return (
        <View
            className={`flex flex-row items-center p-6 pt-0 ${className || ''}`}
            {...props}
        />
    );
}

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent };
