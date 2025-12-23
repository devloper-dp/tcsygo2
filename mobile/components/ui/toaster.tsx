import * as React from "react"
import { useToast, Toast, ToastTitle, ToastDescription, ToastClose, ToastAction } from "./toast"
import { View } from "react-native"

export function Toaster() {
    const { toasts } = useToast()

    return (
        <View className="absolute top-10 left-0 right-0 z-50 px-4 flex-col gap-2 pointer-events-none">
            {toasts.map(function ({ id, title, description, action, ...props }: any) {
                if (!props.open) return null;
                return (
                    <Toast key={id} {...props} className="opacity-95 shadow-lg bg-white dark:bg-black pointer-events-auto mb-2">
                        <View className="grid gap-1 flex-1">
                            {title && <ToastTitle>{title}</ToastTitle>}
                            {description && (
                                <ToastDescription>{description}</ToastDescription>
                            )}
                        </View>
                        {action}
                        <ToastClose onPress={() => props.onOpenChange(false)} />
                    </Toast>
                )
            })}
        </View>
    )
}
