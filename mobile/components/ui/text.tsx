import { Text as RNText, TextProps, StyleSheet } from 'react-native';
import { useResponsive } from '@/hooks/useResponsive';

interface CustomTextProps extends TextProps {
    className?: string; // For NativeWind
    variant?: 'default' | 'h1' | 'h2' | 'h3' | 'subtitle' | 'body' | 'caption' | 'small' | 'helper' | 'muted';
}

export function Text({ className, variant = 'default', style, ...props }: CustomTextProps) {
    const { fontSize: responsiveFontSize, hScale } = useResponsive();
    const baseStyle = "text-gray-900 font-sans dark:text-gray-100";

    const variants = {
        default: "text-slate-900 dark:text-slate-200",
        h1: "font-bold text-slate-900 dark:text-white tracking-tighter uppercase",
        h2: "font-bold text-slate-900 dark:text-white tracking-tight uppercase",
        h3: "font-black text-slate-900 dark:text-white uppercase tracking-tight",
        subtitle: "font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wide",
        body: "font-medium text-slate-600 dark:text-slate-400 leading-relaxed",
        caption: "font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest",
        small: "font-bold text-slate-500 dark:text-slate-500 uppercase tracking-tight",
        helper: "font-medium text-slate-400 dark:text-slate-600 uppercase tracking-tight",
        muted: "font-medium text-slate-300 dark:text-slate-700 uppercase tracking-widest"
    };

    const variantFontSize = {
        default: responsiveFontSize.base,
        h1: responsiveFontSize.xxl,
        h2: responsiveFontSize.lg,
        h3: responsiveFontSize.base,
        subtitle: responsiveFontSize.base,
        body: responsiveFontSize.base,
        caption: hScale(10),
        small: hScale(10),
        helper: hScale(10),
        muted: hScale(10)
    };

    const variantClassName = variants[variant] || variants.default;
    const fontSizeStyle = { fontSize: variantFontSize[variant] || variantFontSize.default };

    return (
        <RNText
            className={`${baseStyle} ${variantClassName} ${className || ''}`}
            style={[fontSizeStyle, style]}
            {...props}
        />
    );
}
