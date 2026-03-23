import * as React from "react";
import { Modal, TouchableOpacity, View, Text } from "react-native";
import { cn } from "../../lib/utils";

// Simplified Dropdown using Modal for now
// A real Dropdown needs absolute positioning calculation which is complex in RN without 'measure'
// We will use a centered or bottom sheet style for mobile as it's more native-friendly.

interface DropdownMenuContextType {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}
const DropdownMenuContext = React.createContext<DropdownMenuContextType>({ open: false, onOpenChange: () => { } });

const DropdownMenu = ({ children }: any) => {
    const [open, setOpen] = React.useState(false);
    return (
        <DropdownMenuContext.Provider value={{ open, onOpenChange: setOpen }}>
            <View>{children}</View>
        </DropdownMenuContext.Provider>
    )
};

const DropdownMenuTrigger = ({ children, asChild, ...props }: any) => {
    const { onOpenChange } = React.useContext(DropdownMenuContext);
    const Child = asChild ? React.Children.only(children) : TouchableOpacity;

    // If asChild is true, we need to clone the child and add onPress
    if (asChild) {
        return React.cloneElement(children, {
            onPress: (e: any) => {
                onOpenChange(true);
                children.props.onPress?.(e);
            }
        });
    }

    return (
        <TouchableOpacity onPress={() => onOpenChange(true)} {...props}>
            {children}
        </TouchableOpacity>
    )
}

const DropdownMenuContent = ({ className, children, ...props }: any) => {
    const { open, onOpenChange } = React.useContext(DropdownMenuContext);

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
                className="flex-1 justify-center items-center bg-black/40"
            >
                <View className={cn("min-w-[8rem] overflow-hidden rounded-[20px] border border-slate-200 dark:border-slate-800 p-2 shadow-2xl bg-white dark:bg-slate-900", className)} {...props}>
                    {children}
                </View>
            </TouchableOpacity>
        </Modal>
    )
}

const DropdownMenuItem = ({ className, children, onSelect, ...props }: any) => {
    const { onOpenChange } = React.useContext(DropdownMenuContext);
    return (
        <TouchableOpacity
            className={cn("relative flex flex-row cursor-default select-none items-center rounded-xl px-4 py-3 text-sm outline-none active:bg-slate-100 dark:active:bg-slate-800", className)}
            onPress={(e) => {
                onSelect?.(e);
                onOpenChange(false);
            }}
            {...props}
        >
            <Text className="text-sm font-bold text-slate-900 dark:text-slate-100">{children}</Text>
        </TouchableOpacity>
    )
}

const DropdownMenuLabel = ({ className, children, ...props }: any) => (
    <View className={cn("px-2 py-1.5 text-sm font-semibold", className)} {...props}>
        <Text className="font-semibold">{children}</Text>
    </View>
)

const DropdownMenuSeparator = ({ className, ...props }: any) => (
    <View className={cn("-mx-1 my-1 h-px bg-slate-100 dark:bg-slate-800", className)} {...props} />
)

const DropdownMenuGroup = View;

export {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuGroup
}
