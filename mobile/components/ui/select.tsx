import * as React from "react";
import { Modal, TouchableOpacity, View, Text, ScrollView } from "react-native";
import { cn } from "../../lib/utils";
import { Feather } from "@expo/vector-icons";

// Similar to DropdownMenu but focused on selection
interface SelectContextType {
    value: string;
    onValueChange: (value: string) => void;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}
const SelectContext = React.createContext<SelectContextType>({ value: "", onValueChange: () => { }, open: false, onOpenChange: () => { } });

const Select = ({ children, value, onValueChange, open, onOpenChange, defaultValue }: any) => {
    const [internalOpen, setInternalOpen] = React.useState(false);
    const [internalValue, setInternalValue] = React.useState(defaultValue || "");

    const isControlledOpen = open !== undefined;
    const currentOpen = isControlledOpen ? open : internalOpen;
    const handleOpenChange = isControlledOpen ? onOpenChange : setInternalOpen;

    const isControlledValue = value !== undefined;
    const currentValue = isControlledValue ? value : internalValue;
    const handleValueChange = (val: string) => {
        if (!isControlledValue) setInternalValue(val);
        onValueChange?.(val);
    }

    return (
        <SelectContext.Provider value={{
            value: currentValue,
            onValueChange: handleValueChange,
            open: currentOpen,
            onOpenChange: handleOpenChange
        }}>
            <View>{children}</View>
        </SelectContext.Provider>
    )
};

const SelectTrigger = React.forwardRef<
    React.ElementRef<typeof TouchableOpacity>,
    React.ComponentPropsWithoutRef<typeof TouchableOpacity>
>(({ className, children, ...props }, ref) => {
    const { onOpenChange } = React.useContext(SelectContext);
    return (
        <TouchableOpacity
            ref={ref}
            onPress={() => onOpenChange(true)}
            className={cn(
                "flex-row h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
                className
            )}
            {...props}
        >
            {children}
            <Feather name="chevron-down" size={16} className="opacity-50" />
        </TouchableOpacity>
    )
});
SelectTrigger.displayName = "SelectTrigger";

const SelectValue = React.forwardRef<
    React.ElementRef<typeof Text>,
    React.ComponentPropsWithoutRef<typeof Text> & { placeholder?: string }
>(({ className, placeholder, ...props }, ref) => {
    const { value } = React.useContext(SelectContext);
    // This is hard because we usually map value to label. 
    // For now we display value or placeholder. Ideally we'd need to find the child SelectItem with this value and get its children.
    // That requires traversing children which is hard in this structure.
    // Simplifying: Just show value for now, or assume the user handles label display if they custom control it.
    // Note: client side usually wraps Text.

    return (
        <Text ref={ref} className={cn("text-foreground", className)} {...props}>
            {value || placeholder}
        </Text>
    )
});
SelectValue.displayName = "SelectValue";

const SelectContent = React.forwardRef<
    React.ElementRef<typeof View>,
    React.ComponentPropsWithoutRef<typeof View>
>(({ className, children, position = "popper", ...props }, ref) => {
    const { open, onOpenChange } = React.useContext(SelectContext);

    if (!open) return null;

    return (
        <Modal
            transparent
            visible={open}
            animationType="fade"
            onRequestClose={() => onOpenChange(false)}
        >
            <TouchableOpacity
                activeOpacity={1}
                onPress={() => onOpenChange(false)}
                className="flex-1 justify-center items-center bg-black/50"
            >
                <View
                    ref={ref}
                    className={cn(
                        "relative z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md bg-white w-3/4 max-h-[50%]",
                        className
                    )}
                    {...props}
                >
                    <ScrollView>
                        <View className="p-1">
                            {children}
                        </View>
                    </ScrollView>
                </View>
            </TouchableOpacity>
        </Modal>
    )
});
SelectContent.displayName = "SelectContent";

const SelectItem = React.forwardRef<
    React.ElementRef<typeof TouchableOpacity>,
    React.ComponentPropsWithoutRef<typeof TouchableOpacity> & { value: string }
>(({ className, children, value: itemValue, ...props }, ref) => {
    const { value, onValueChange, onOpenChange } = React.useContext(SelectContext);
    const isSelected = value === itemValue;

    return (
        <TouchableOpacity
            ref={ref}
            onPress={() => {
                onValueChange(itemValue);
                onOpenChange(false);
            }}
            className={cn(
                "relative flex-row w-full cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
                isSelected && "bg-accent",
                className
            )}
            {...props}
        >
            {isSelected && (
                <View className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
                    <Feather name="check" size={12} />
                </View>
            )}
            <Text className="text-foreground">{children}</Text>
        </TouchableOpacity>
    )
});
SelectItem.displayName = "SelectItem";

const SelectLabel = React.forwardRef<
    React.ElementRef<typeof Text>,
    React.ComponentPropsWithoutRef<typeof Text>
>(({ className, ...props }, ref) => (
    <Text
        ref={ref}
        className={cn("py-1.5 pl-8 pr-2 text-sm font-semibold", className)}
        {...props}
    />
))
SelectLabel.displayName = "SelectLabel"

const SelectSeparator = React.forwardRef<
    React.ElementRef<typeof View>,
    React.ComponentPropsWithoutRef<typeof View>
>(({ className, ...props }, ref) => (
    <View
        ref={ref}
        className={cn("-mx-1 my-1 h-px bg-muted", className)}
        {...props}
    />
))
SelectSeparator.displayName = "SelectSeparator"


export {
    Select,
    SelectTrigger,
    SelectValue,
    SelectContent,
    SelectItem,
    SelectLabel,
    SelectSeparator,
}
