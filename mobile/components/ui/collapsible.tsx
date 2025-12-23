import * as React from "react";
import { View, TouchableOpacity, LayoutAnimation, Platform, UIManager } from "react-native";
import { cn } from "../../lib/utils";
import { Feather } from "@expo/vector-icons";

if (
    Platform.OS === "android" &&
    UIManager.setLayoutAnimationEnabledExperimental
) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

const Collapsible = React.forwardRef<
    React.ElementRef<typeof View>,
    React.ComponentPropsWithoutRef<typeof View> & {
        open?: boolean;
        onOpenChange?: (open: boolean) => void;
        defaultOpen?: boolean;
        disabled?: boolean;
    }
>(({ className, open, onOpenChange, defaultOpen, disabled, children, ...props }, ref) => {
    const [isOpen, setIsOpen] = React.useState(defaultOpen || false);

    const isControlled = open !== undefined;
    const currentOpen = isControlled ? open : isOpen;

    const handleOpenChange = (newOpen: boolean) => {
        // Animate the change
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        if (!isControlled) {
            setIsOpen(newOpen);
        }
        onOpenChange?.(newOpen);
    }

    return (
        <View ref={ref} className={cn("", className)} {...props}>
            {React.Children.map(children, (child) => {
                if (React.isValidElement(child)) {
                    return React.cloneElement(child, {
                        // @ts-ignore
                        open: currentOpen,
                        // @ts-ignore
                        onOpenChange: handleOpenChange,
                        // @ts-ignore
                        disabled
                    })
                }
                return child;
            })}
        </View>
    );
});
Collapsible.displayName = "Collapsible";

const CollapsibleTrigger = React.forwardRef<
    React.ElementRef<typeof TouchableOpacity>,
    React.ComponentPropsWithoutRef<typeof TouchableOpacity>
>(({ className, children, ...props }, ref) => {
    // @ts-ignore
    const { open, onOpenChange, disabled } = props;

    return (
        <TouchableOpacity
            ref={ref}
            onPress={() => !disabled && onOpenChange(!open)}
            disabled={disabled}
            className={cn("flex-row items-center justify-between", className)}
            {...props}
        >
            {children}
        </TouchableOpacity>
    );
});
CollapsibleTrigger.displayName = "CollapsibleTrigger";

const CollapsibleContent = React.forwardRef<
    React.ElementRef<typeof View>,
    React.ComponentPropsWithoutRef<typeof View>
>(({ className, children, ...props }, ref) => {
    // @ts-ignore
    const { open } = props;

    if (!open) return null;

    return (
        <View
            ref={ref}
            className={cn("overflow-hidden", className)}
            {...props}
        >
            {children}
        </View>
    );
});
CollapsibleContent.displayName = "CollapsibleContent";

export { Collapsible, CollapsibleTrigger, CollapsibleContent };
