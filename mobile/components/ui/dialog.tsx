import * as React from "react";
import { Modal, TouchableOpacity, View, Text } from "react-native";
import { cn } from "../../lib/utils";
import { Feather } from "@expo/vector-icons";

// Basic Context for simple state sharing if needed, but props passing is safer in this simple implementation
// For a robust implementation, we would use a Context.
interface DialogContextType {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}
const DialogContext = React.createContext<DialogContextType>({ open: false, onOpenChange: () => { } });

const Dialog = ({ children, open, onOpenChange }: any) => {
    const [isOpen, setIsOpen] = React.useState(false);
    const isControlled = open !== undefined;
    const currentOpen = isControlled ? open : isOpen;
    const handleOpenChange = isControlled ? onOpenChange : setIsOpen;

    return (
        <DialogContext.Provider value={{ open: currentOpen, onOpenChange: handleOpenChange }}>
            <View>{children}</View>
        </DialogContext.Provider>
    )
};

const DialogTrigger = ({ asChild, children, onPress, ...props }: any) => {
    const { onOpenChange } = React.useContext(DialogContext);
    return (
        <TouchableOpacity onPress={(e) => {
            onOpenChange(true);
            onPress?.(e);
        }} {...props}>
            {children}
        </TouchableOpacity>
    )
}

const DialogContent = React.forwardRef<
    React.ElementRef<typeof View>,
    React.ComponentPropsWithoutRef<typeof View> & { hideCloseButton?: boolean }
>(({ className, children, hideCloseButton, ...props }, ref) => {
    const { open, onOpenChange } = React.useContext(DialogContext);

    // Allow controlled usage directly on content if context is not used (legacy support)
    // But mainly rely on context from Dialog root
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
                <TouchableOpacity
                    activeOpacity={1}
                    className={cn(
                        "w-[90%] max-w-lg rounded-lg bg-background p-6 shadow-lg",
                        className
                    )}
                    {...props}
                >
                    <View ref={ref}>
                        {children}
                        {!hideCloseButton && (
                            <TouchableOpacity
                                onPress={() => onOpenChange(false)}
                                className="absolute right-0 top-0 opacity-70"
                            >
                                <Feather name="x" size={20} color="gray" />
                            </TouchableOpacity>
                        )}
                    </View>
                </TouchableOpacity>
            </TouchableOpacity>
        </Modal>
    );
});
DialogContent.displayName = "DialogContent";

const DialogHeader = ({
    className,
    ...props
}: React.ComponentPropsWithoutRef<typeof View>) => (
    <View
        className={cn(
            "flex flex-col space-y-1.5 text-center sm:text-left",
            className
        )}
        {...props}
    />
)
DialogHeader.displayName = "DialogHeader"

const DialogFooter = ({
    className,
    ...props
}: React.ComponentPropsWithoutRef<typeof View>) => (
    <View
        className={cn(
            "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2",
            className
        )}
        {...props}
    />
)
DialogFooter.displayName = "DialogFooter"

const DialogTitle = React.forwardRef<
    React.ElementRef<typeof Text>,
    React.ComponentPropsWithoutRef<typeof Text>
>(({ className, ...props }, ref) => (
    <Text
        ref={ref}
        className={cn("text-lg font-semibold leading-none tracking-tight text-foreground", className)}
        {...props}
    />
))
DialogTitle.displayName = "DialogTitle"

const DialogDescription = React.forwardRef<
    React.ElementRef<typeof Text>,
    React.ComponentPropsWithoutRef<typeof Text>
>(({ className, ...props }, ref) => (
    <Text
        ref={ref}
        className={cn("text-sm text-muted-foreground", className)}
        {...props}
    />
))
DialogDescription.displayName = "DialogDescription"

export {
    Dialog,
    DialogTrigger,
    DialogContent,
    DialogHeader,
    DialogFooter,
    DialogTitle,
    DialogDescription,
}
