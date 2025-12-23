import React from 'react';
import { TouchableOpacity, TouchableOpacityProps, View, ActivityIndicator } from 'react-native';
import { Text } from './text';
import { cn } from '../../lib/utils';

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
    ...props
}, ref) => {
    const baseStyles = "flex-row items-center justify-center rounded-md ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50";

    const variants = {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
    };

    const sizes = {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
    };

    const textColors = {
        default: "text-white",
        destructive: "text-white",
        outline: "text-gray-900 dark:text-gray-100",
        secondary: "text-gray-900 dark:text-gray-100",
        ghost: "text-gray-900 dark:text-gray-100",
        link: "text-primary",
    };

    return (
        <TouchableOpacity
            ref={ref}
            className={cn(baseStyles, variants[variant], sizes[size], className)}
            disabled={disabled || isLoading}
            {...props}
        >
            {isLoading ? (
                <ActivityIndicator size="small" color={variant === 'outline' || variant === 'ghost' ? '#000' : '#fff'} />
            ) : (
                typeof children === 'string' ? (
                    // @ts-ignore
                    <Text className={`font-medium ${textColors[variant]}`}>{children}</Text>
                ) : (
                    children
                )
            )}
        </TouchableOpacity>
    );
});
Button.displayName = "Button";
