import * as React from "react";
import { View } from "react-native";
import { VariantProps } from "class-variance-authority";
import { cn } from "../../lib/utils";
import { Toggle, toggleVariants } from "./toggle";

interface ToggleGroupContextType {
    value: string | string[];
    onValueChange: (value: string | string[]) => void;
    type: "single" | "multiple";
}
const ToggleGroupContext = React.createContext<ToggleGroupContextType>({ value: "", onValueChange: () => { }, type: "single" }); // Default single

const ToggleGroup = React.forwardRef<
    React.ElementRef<typeof View>,
    React.ComponentPropsWithoutRef<typeof View> &
    VariantProps<typeof toggleVariants> & {
        type: "single" | "multiple";
        value?: string | string[];
        onValueChange?: (value: any) => void;
    }
>(({ className, variant, size, children, type, value, onValueChange, ...props }, ref) => {
    // Simplified: assuming controlled usage or basic uncontrolled.
    // For full impl we need internal state.

    return (
        <ToggleGroupContext.Provider value={{ value: value || (type === "single" ? "" : []), onValueChange: onValueChange || (() => { }), type }}>
            <View
                ref={ref}
                className={cn("flex-row items-center justify-center gap-1", className)}
                {...props}
            >
                {/* We can pass variant/size via context usually, or mapped children.
                    For simplicity, we assume ToggleGroupItem uses own or default.
                    Ideally we should clone children to pass variant/size.
                 */}
                {React.Children.map(children, child => {
                    if (React.isValidElement(child)) {
                        return React.cloneElement(child, {
                            // @ts-ignore
                            variant,
                            // @ts-ignore
                            size
                        })
                    }
                    return child;
                })}
            </View>
        </ToggleGroupContext.Provider>
    );
});
ToggleGroup.displayName = "ToggleGroup";

const ToggleGroupItem = React.forwardRef<
    React.ElementRef<typeof Toggle>,
    React.ComponentPropsWithoutRef<typeof Toggle> & { value: string }
>(({ className, value: itemValue, ...props }, ref) => {
    const context = React.useContext(ToggleGroupContext);

    // Determine pressed state based on context value
    let pressed = false;
    if (context.type === "single") {
        pressed = context.value === itemValue;
    } else if (Array.isArray(context.value)) {
        pressed = context.value.includes(itemValue);
    }

    return (
        <Toggle
            ref={ref}
            className={cn(className)}
            pressed={pressed}
            onPressedChange={(newPressed) => {
                if (context.type === "single") {
                    context.onValueChange(newPressed ? itemValue : ""); // Or keep selected if enforced? Check Radix behavior. Usually allows uncheck in single.
                } else {
                    const currentArray = Array.isArray(context.value) ? context.value : [];
                    if (newPressed) {
                        context.onValueChange([...currentArray, itemValue]);
                    } else {
                        context.onValueChange(currentArray.filter(v => v !== itemValue));
                    }
                }
            }}
            {...props}
        />
    );
});
ToggleGroupItem.displayName = "ToggleGroupItem";

export { ToggleGroup, ToggleGroupItem };
