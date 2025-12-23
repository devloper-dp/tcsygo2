import * as React from "react";
import { Modal, TouchableOpacity, View } from "react-native";
import { cn } from "../../lib/utils";

// Popover on mobile is best implemented as a Modal or BottomSheet.
// We will use a centered Modal for simplicity as a direct port.

const Popover = ({ children, open, onOpenChange }: any) => {
    const [isOpen, setIsOpen] = React.useState(false);
    const isControlled = open !== undefined;
    const currentOpen = isControlled ? open : isOpen;
    const handleOpenChange = isControlled ? onOpenChange : setIsOpen;

    return (
        <View>
            {React.Children.map(children, child => {
                if (React.isValidElement(child)) {
                    return React.cloneElement(child, {
                        // @ts-ignore
                        open: currentOpen,
                        // @ts-ignore
                        onOpenChange: handleOpenChange
                    });
                }
                return child;
            })}
        </View>
    )
};

const PopoverTrigger = ({ asChild, children, onPress, open, onOpenChange, ...props }: any) => {
    // If asChild is true, we clone.
    if (asChild && React.isValidElement(children)) {
        return React.cloneElement(children, {
            // @ts-ignore
            onPress: (e) => {
                onOpenChange(true);
                children.props?.onPress?.(e);
            }
        });
    }

    return (
        <TouchableOpacity onPress={() => onOpenChange(true)} {...props}>
            {children}
        </TouchableOpacity>
    )
}

const PopoverContent = ({ className, children, align = "center", sideOffset = 4, open, onOpenChange, ...props }: any) => {
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
                className="flex-1 justify-center items-center bg-black/20"
            >
                <TouchableOpacity
                    activeOpacity={1}
                    className={cn(
                        "z-50 w-72 rounded-md border bg-popover p-4 text-popover-foreground shadow-md outline-none bg-white",
                        className
                    )}
                    {...props}
                >
                    {children}
                </TouchableOpacity>
            </TouchableOpacity>
        </Modal>
    );
};

export { Popover, PopoverTrigger, PopoverContent };
