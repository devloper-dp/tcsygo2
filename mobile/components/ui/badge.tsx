import * as React from "react"
import { View, ViewProps } from "react-native"
import { Text } from "./text";

export interface BadgeProps extends ViewProps {
    variant?: "default" | "secondary" | "destructive" | "outline"
    className?: string;
    children: React.ReactNode;
}

function Badge({ className, variant = "default", children, ...props }: BadgeProps) {
    const variants = {
        default: "border-transparent bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-sm",
        secondary: "border-transparent bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100",
        destructive: "border-transparent bg-red-100 dark:bg-red-900/10 text-red-600 dark:text-red-400",
        outline: "border-slate-200 dark:border-slate-800 bg-transparent",
    }

    const textVariants = {
        default: "text-white dark:text-slate-900",
        secondary: "text-slate-900 dark:text-slate-100",
        destructive: "text-red-600 dark:text-red-400",
        outline: "text-slate-600 dark:text-slate-400",
    }

    return (
        <View className={`inline-flex items-center rounded-full border px-2.5 py-0.5 transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${variants[variant]} ${className || ''}`} {...props}>
            {typeof children === 'string' ? (
                <Text className={`text-xs font-semibold ${textVariants[variant]}`}>{children}</Text>
            ) : (
                children
            )}
        </View>
    )
}

export { Badge }
