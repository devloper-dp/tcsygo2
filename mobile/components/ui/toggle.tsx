import * as React from "react";
import { TouchableOpacity, Text } from "react-native";
import { VariantProps, cva } from "class-variance-authority";
import { cn } from "../../lib/utils";

const toggleVariants = cva(
    "hover:bg-muted hover:text-muted-foreground inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
    {
        variants: {
            variant: {
                default: "bg-transparent",
                outline:
                    "border border-input bg-transparent hover:bg-accent hover:text-accent-foreground",
            },
            size: {
                default: "h-10 px-3",
                sm: "h-9 px-2.5",
                lg: "h-11 px-5",
            },
        },
        defaultVariants: {
            variant: "default",
            size: "default",
        },
    }
);

const Toggle = React.forwardRef<
    React.ElementRef<typeof TouchableOpacity>,
    React.ComponentPropsWithoutRef<typeof TouchableOpacity> &
    VariantProps<typeof toggleVariants> & {
        pressed?: boolean;
        onPressedChange?: (pressed: boolean) => void;
    }
>(({ className, variant, size, pressed, onPressedChange, ...props }, ref) => {
    const [isPressed, setIsPressed] = React.useState(pressed || false);

    // Controlled vs Uncontrolled
    const currentPressed = pressed !== undefined ? pressed : isPressed;

    return (
        <TouchableOpacity
            ref={ref}
            onPress={() => {
                if (pressed === undefined) {
                    setIsPressed(!isPressed);
                }
                onPressedChange?.(!currentPressed);
            }}
            className={cn(
                toggleVariants({ variant, size, className }),
                currentPressed && "bg-accent text-accent-foreground"
            )}
            {...props}
        >
            {/* If children is string wrapped in Text, otherwise render as is (assuming icon) */}
            {typeof props.children === 'string' ? <Text className={currentPressed ? "text-accent-foreground" : "text-foreground"}>{props.children}</Text> : props.children}
        </TouchableOpacity>
    );
});
Toggle.displayName = "Toggle";

export { Toggle, toggleVariants };
