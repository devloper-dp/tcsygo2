import * as React from "react";
import { TextInput } from "react-native";
import { cn } from "../../lib/utils";

const Textarea = React.forwardRef<
    React.ElementRef<typeof TextInput>,
    React.ComponentPropsWithoutRef<typeof TextInput>
>(({ className, ...props }, ref) => {
    return (
        <TextInput
            className={cn(
                "flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
                className
            )}
            multiline={true}
            numberOfLines={4}
            textAlignVertical="top" // Important for Android
            ref={ref}
            {...props}
        />
    )
})
Textarea.displayName = "Textarea"

export { Textarea };
