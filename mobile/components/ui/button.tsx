import React from 'react';
import { TouchableOpacity, TouchableOpacityProps, View, ActivityIndicator, StyleSheet } from 'react-native';
import { Text } from './text';
import { cn } from '../../lib/utils';
import { useTheme } from '@/contexts/ThemeContext';
import { useResponsive } from '@/hooks/useResponsive';

interface ButtonProps extends TouchableOpacityProps {
    className?: string;
    variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
    size?: 'default' | 'sm' | 'lg' | 'icon';
    isLoading?: boolean;
}

export const Button = React.forwardRef<
    React.ElementRef<typeof TouchableOpacity>,
    ButtonProps
>(({
    className,
    variant = 'default',
    size = 'default',
    children,
    isLoading,
    disabled,
    style,
    ...props
}, ref) => {
    const { theme } = useTheme();
    const isDark = theme === 'dark';
    const { hScale, vScale, fontSize: responsiveFontSize } = useResponsive();

    const baseStyles = "flex-row items-center justify-center rounded-xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50";

    const variants = {
        default: "bg-primary shadow-button dark:shadow-none active:opacity-90 active:scale-[0.98]",
        destructive: "bg-destructive shadow-button dark:shadow-none active:opacity-90",
        outline: "border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm active:bg-slate-50 dark:active:bg-slate-800",
        secondary: "bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 active:opacity-90",
        ghost: "active:bg-slate-50 dark:active:bg-slate-800",
        link: "text-primary underline-offset-4",
    };

    const sizeStyles = {
        default: { height: vScale(56), paddingHorizontal: hScale(32), borderRadius: hScale(20) },
        sm: { height: vScale(44), paddingHorizontal: hScale(20), borderRadius: hScale(16) },
        lg: { height: vScale(80), paddingHorizontal: hScale(40), borderRadius: hScale(32) },
        icon: { height: hScale(56), width: hScale(56), borderRadius: hScale(16) },
    };

    const textColors = {
        default: "text-white",
        destructive: "text-white",
        outline: "text-text-primary dark:text-slate-100",
        secondary: "text-primary dark:text-slate-100",
        ghost: "text-text-primary dark:text-slate-100",
        link: "text-primary dark:text-blue-400",
    };

    return (
        <TouchableOpacity
            ref={ref}
            className={cn(baseStyles, variants[variant], className)}
            style={[sizeStyles[size], style]}
            disabled={disabled || isLoading}
            {...props}
        >
            {isLoading ? (
                <ActivityIndicator size="small" color={variant === 'outline' || variant === 'secondary' || variant === 'ghost' ? (isDark ? '#93c5fd' : '#2563EB') : '#fff'} />
            ) : (
                typeof children === 'string' ? (
                    <Text 
                        style={{ fontSize: size === 'lg' ? responsiveFontSize.lg : responsiveFontSize.base }}
                        className={cn("font-semibold", textColors[variant])}
                    >
                        {children}
                    </Text>
                ) : (
                    children
                )
            )}
        </TouchableOpacity>
    );
});
Button.displayName = "Button";
