import * as React from "react";
import { View, TextInput, Text, TouchableOpacity } from "react-native";
import { cn } from "../../lib/utils";

// Simplified OTP Input
const InputOTP = React.forwardRef<
    React.ElementRef<typeof View>,
    React.ComponentPropsWithoutRef<typeof View> & { value?: string, onChange?: (val: string) => void, maxLength?: number }
>(({ className, value = "", onChange, maxLength = 6, ...props }, ref) => {
    const inputRef = React.useRef<TextInput>(null);

    // Create slots
    const slots = Array.from({ length: maxLength });

    return (
        <TouchableOpacity
            className={cn("flex-row gap-2 justify-center", className)}
            activeOpacity={1}
            onPress={() => inputRef.current?.focus()}
            {...props}
        >
            {slots.map((_, i) => (
                <View
                    key={i}
                    className={cn(
                        "h-10 w-10 border rounded-md items-center justify-center",
                        value.length === i ? "border-primary ring-2 ring-primary ring-offset-1" : "border-border",
                        "bg-background"
                    )}
                >
                    <Text className="text-lg font-medium">
                        {value[i] || ""}
                    </Text>
                </View>
            ))}
            <TextInput
                ref={inputRef}
                className="absolute opacity-0 w-full h-full"
                value={value}
                onChangeText={(text) => {
                    if (text.length <= maxLength) {
                        onChange?.(text);
                    }
                }}
                keyboardType="number-pad"
                maxLength={maxLength}
                caretHidden
            />
        </TouchableOpacity>
    );
});
InputOTP.displayName = "InputOTP";

// Slot and Group sub-components for compatibility with client stricture if needed
// For now, implementing the group logic inside InputOTP itself is simpler for mobile as a single unit.
// If client uses <InputOTPGroup><InputOTPSlot /></InputOTPGroup>, we need to mock those.

const InputOTPGroup = View;
const InputOTPSlot = View; // Mock

export { InputOTP, InputOTPGroup, InputOTPSlot };
