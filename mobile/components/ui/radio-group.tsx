import * as React from "react";
import { TouchableOpacity, View } from "react-native";
import { cn } from "../../lib/utils";
import { Feather } from "@expo/vector-icons";

// Simple context for RadioGroup
interface RadioGroupContextType {
    value: string;
    onValueChange: (value: string) => void;
}
const RadioGroupContext = React.createContext<RadioGroupContextType | null>(null);

const RadioGroup = React.forwardRef<
    React.ElementRef<typeof View>,
    React.ComponentPropsWithoutRef<typeof View> & { value: string, onValueChange: (value: string) => void }
>(({ className, value, onValueChange, ...props }, ref) => {
    return (
        <RadioGroupContext.Provider value={{ value, onValueChange }}>
            <View className={cn("gap-2", className)} ref={ref} {...props} />
        </RadioGroupContext.Provider>
    );
});
RadioGroup.displayName = "RadioGroup";

const RadioGroupItem = React.forwardRef<
    React.ElementRef<typeof TouchableOpacity>,
    React.ComponentPropsWithoutRef<typeof TouchableOpacity> & { value: string }
>(({ className, value, ...props }, ref) => {
    const context = React.useContext(RadioGroupContext);
    const checked = context?.value === value;

    return (
        <TouchableOpacity
            ref={ref}
            onPress={() => context?.onValueChange(value)}
            className={cn(
                "aspect-square h-4 w-4 rounded-full border border-primary text-primary ring-offset-background focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
                className
            )}
            {...props}
        >
            {checked && (
                <View className="flex items-center justify-center h-full w-full">
                    <View className="h-2.5 w-2.5 rounded-full bg-primary" />
                </View>
            )}
        </TouchableOpacity>
    );
});
RadioGroupItem.displayName = "RadioGroupItem";

export { RadioGroup, RadioGroupItem };
