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
        default: "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
        secondary: "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive: "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
        outline: "text-foreground",
    }

    const textVariants = {
        default: "text-white",
        secondary: "text-gray-900",
        destructive: "text-white",
        outline: "text-gray-900 dark:text-gray-100",
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
