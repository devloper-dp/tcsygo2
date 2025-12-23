import * as React from "react";
import { Modal, Text, TouchableOpacity, View } from "react-native";
import { cn } from "../../lib/utils";
import { Button } from "./button";

interface DialogContextType {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}
const DialogContext = React.createContext<DialogContextType>({ open: false, onOpenChange: () => { } });

const AlertDialog = ({ children, open, onOpenChange }: any) => {
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

const AlertDialogTrigger = ({ asChild, children, onPress, ...props }: any) => {
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

const AlertDialogContent = React.forwardRef<
    React.ElementRef<typeof View>,
    React.ComponentPropsWithoutRef<typeof View> & { open?: boolean, onOpenChange?: (open: boolean) => void }
>(({ className, open: openProp, onOpenChange: onOpenChangeProp, ...props }, ref) => {
    const context = React.useContext(DialogContext);
    const open = openProp !== undefined ? openProp : context.open;
    const onOpenChange = onOpenChangeProp || context.onOpenChange;

    if (!open) return null;

    return (
        <Modal
            transparent
            visible={open}
            animationType="fade"
            onRequestClose={() => onOpenChange && onOpenChange(false)}
        >
            <View className="flex-1 justify-center items-center bg-black/50">
                <View
                    ref={ref}
                    className={cn(
                        "w-[90%] max-w-lg rounded-lg bg-background p-6 shadow-lg",
                        className
                    )}
                    {...props}
                />
            </View>
        </Modal>
    );
});
AlertDialogContent.displayName = "AlertDialogContent";

const AlertDialogHeader = ({
    className,
    ...props
}: React.ComponentPropsWithoutRef<typeof View>) => (
    <View
        className={cn(
            "flex flex-col space-y-2 text-center sm:text-left",
            className
        )}
        {...props}
    />
)
AlertDialogHeader.displayName = "AlertDialogHeader"

const AlertDialogFooter = ({
    className,
    ...props
}: React.ComponentPropsWithoutRef<typeof View>) => (
    <View
        className={cn(
            "flex flex-row justify-end space-x-2",
            className
        )}
        {...props}
    />
)
AlertDialogFooter.displayName = "AlertDialogFooter"

const AlertDialogTitle = React.forwardRef<
    React.ElementRef<typeof Text>,
    React.ComponentPropsWithoutRef<typeof Text>
>(({ className, ...props }, ref) => (
    <Text
        ref={ref}
        className={cn("text-lg font-semibold", className)}
        {...props}
    />
))
AlertDialogTitle.displayName = "AlertDialogTitle"

const AlertDialogDescription = React.forwardRef<
    React.ElementRef<typeof Text>,
    React.ComponentPropsWithoutRef<typeof Text>
>(({ className, ...props }, ref) => (
    <Text
        ref={ref}
        className={cn("text-sm text-muted-foreground", className)}
        {...props}
    />
))
AlertDialogDescription.displayName = "AlertDialogDescription"

const AlertDialogAction = React.forwardRef<
    React.ElementRef<typeof Button>,
    React.ComponentPropsWithoutRef<typeof Button>
>(({ className, ...props }, ref) => (
    <Button
        ref={ref}
        className={cn(className)}
        {...props}
    />
))
AlertDialogAction.displayName = "AlertDialogAction"

const AlertDialogCancel = React.forwardRef<
    React.ElementRef<typeof Button>,
    React.ComponentPropsWithoutRef<typeof Button>
>(({ className, ...props }, ref) => (
    <Button
        ref={ref}
        variant="outline"
        className={cn("mt-2 sm:mt-0", className)}
        {...props}
    />
))
AlertDialogCancel.displayName = "AlertDialogCancel"

export {
    AlertDialog,
    AlertDialogTrigger,
    AlertDialogContent,
    AlertDialogHeader,
    AlertDialogFooter,
    AlertDialogTitle,
    AlertDialogDescription,
    AlertDialogAction,
    AlertDialogCancel,
}
