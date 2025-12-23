import * as React from "react";
import { Modal, TouchableOpacity, View, Text } from "react-native";
import { cn } from "../../lib/utils";
import { Feather } from "@expo/vector-icons";

// Basic Sheet implementation using Modal with slide animation
// In RN, true Sheet behavior requires libraries like 'react-native-bottom-sheet' or 'react-native-modal'
// We stick to standard Modal for zero-dep approach.

interface SheetContextType {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}
const SheetContext = React.createContext<SheetContextType>({ open: false, onOpenChange: () => { } });

const Sheet = ({ children, open, onOpenChange }: any) => {
    const [isOpen, setIsOpen] = React.useState(false);
    const isControlled = open !== undefined;
    const currentOpen = isControlled ? open : isOpen;
    const handleOpenChange = isControlled ? onOpenChange : setIsOpen;

    return (
        <SheetContext.Provider value={{ open: currentOpen, onOpenChange: handleOpenChange }}>
            <View>{children}</View>
        </SheetContext.Provider>
    )
};

const SheetTrigger = ({ asChild, children, onPress, ...props }: any) => {
    const { onOpenChange } = React.useContext(SheetContext);
    return (
        <TouchableOpacity onPress={(e) => {
            onOpenChange(true);
            onPress?.(e);
        }} {...props}>
            {children}
        </TouchableOpacity>
    )
}

const SheetContent = React.forwardRef<
    React.ElementRef<typeof View>,
    React.ComponentPropsWithoutRef<typeof View> & { side?: "top" | "bottom" | "left" | "right" }
>(({ className, children, side = "right", ...props }, ref) => {
    const { open, onOpenChange } = React.useContext(SheetContext);

    if (!open) return null;

    // Mapping 'right' to standard modal slide (usually comes from bottom on iOS/Android standard Modal)
    // To support "Side" sheets properly we'd need custom animations. 
    // For now we just use standard "slide" which comes from bottom.
    // Ideally we would wrap this in a customized view for side-drawer effect.

    return (
        <Modal
            transparent
            visible={open}
            animationType="slide"
            onRequestClose={() => onOpenChange(false)}
        >
            <TouchableOpacity
                activeOpacity={1}
                onPress={() => onOpenChange(false)}
                className="flex-1 bg-black/50 justify-end" // Default to bottom sheet style
            >
                <TouchableOpacity
                    activeOpacity={1}
                    className={cn(
                        "bg-background p-6 shadow-lg h-[50%] w-full rounded-t-xl", // Make it a half-screen sheet by default
                        className
                    )}
                    {...props}
                >
                    <View ref={ref}>
                        {children}
                        <TouchableOpacity
                            onPress={() => onOpenChange(false)}
                            className="absolute right-0 top-0 opacity-70 p-2"
                        >
                            <Feather name="x" size={20} color="gray" />
                        </TouchableOpacity>
                    </View>
                </TouchableOpacity>
            </TouchableOpacity>
        </Modal>
    );
});
SheetContent.displayName = "SheetContent";

const SheetHeader = ({
    className,
    ...props
}: React.ComponentPropsWithoutRef<typeof View>) => (
    <View
        className={cn(
            "flex flex-col space-y-2 text-center sm:text-left mb-4",
            className
        )}
        {...props}
    />
)
SheetHeader.displayName = "SheetHeader"

const SheetFooter = ({
    className,
    ...props
}: React.ComponentPropsWithoutRef<typeof View>) => (
    <View
        className={cn(
            "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 mt-4",
            className
        )}
        {...props}
    />
)
SheetFooter.displayName = "SheetFooter"

const SheetTitle = React.forwardRef<
    React.ElementRef<typeof Text>,
    React.ComponentPropsWithoutRef<typeof Text>
>(({ className, ...props }, ref) => (
    <Text
        ref={ref}
        className={cn("text-lg font-semibold text-foreground", className)}
        {...props}
    />
))
SheetTitle.displayName = "SheetTitle"

const SheetDescription = React.forwardRef<
    React.ElementRef<typeof Text>,
    React.ComponentPropsWithoutRef<typeof Text>
>(({ className, ...props }, ref) => (
    <Text
        ref={ref}
        className={cn("text-sm text-muted-foreground", className)}
        {...props}
    />
))
SheetDescription.displayName = "SheetDescription"

export {
    Sheet,
    SheetTrigger,
    SheetContent,
    SheetHeader,
    SheetFooter,
    SheetTitle,
    SheetDescription,
}
