import { Text as RNText, TextProps, StyleSheet } from 'react-native';

interface CustomTextProps extends TextProps {
    className?: string; // For NativeWind
    variant?: 'default' | 'h1' | 'h2' | 'h3' | 'subtitle' | 'body' | 'caption' | 'small';
}

export function Text({ className, variant = 'default', style, ...props }: CustomTextProps) {
    const baseStyle = "text-gray-900 font-sans dark:text-gray-100";

    const variants = {
        default: "text-base",
        h1: "text-4xl font-extrabold tracking-tight lg:text-5xl",
        h2: "text-3xl font-bold tracking-tight first:mt-0",
        h3: "text-2xl font-semibold tracking-tight",
        subtitle: "text-lg font-medium text-gray-500 dark:text-gray-400",
        body: "text-base leading-7",
        caption: "text-sm text-gray-500 dark:text-gray-400",
        small: "text-xs font-medium leading-none"
    };

    const variantStyle = variants[variant] || variants.default;

    return (
        <RNText
            className={`${baseStyle} ${variantStyle} ${className || ''}`}
            style={style}
            {...props}
        />
    );
}
