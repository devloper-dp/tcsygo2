import * as React from "react";
import { TouchableOpacity, View } from "react-native";
import { cn } from "../../lib/utils";
import { Feather } from "@expo/vector-icons";

const Checkbox = React.forwardRef<
    React.ElementRef<typeof TouchableOpacity>,
    React.ComponentPropsWithoutRef<typeof TouchableOpacity> & { checked?: boolean; onCheckedChange?: (checked: boolean) => void }
>(({ className, checked, onCheckedChange, ...props }, ref) => (
    <TouchableOpacity
        ref={ref}
        onPress={() => onCheckedChange && onCheckedChange(!checked)}
        className={cn(
            "peer h-4 w-4 shrink-0 rounded-sm border border-primary ring-offset-background disabled:cursor-not-allowed disabled:opacity-50",
            checked && "bg-primary text-primary-foreground",
            className
        )}
        {...props}
    >
        {checked && (
            <View className="flex items-center justify-center h-full w-full">
                <Feather name="check" size={12} color="white" />
            </View>
        )}
    </TouchableOpacity>
));
Checkbox.displayName = "Checkbox";

export { Checkbox };
