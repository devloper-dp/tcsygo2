import * as React from "react";
import { ScrollView, View } from "react-native";
import { cn } from "../../lib/utils";

const ScrollArea = React.forwardRef<
    React.ElementRef<typeof ScrollView>,
    React.ComponentPropsWithoutRef<typeof ScrollView>
>(({ className, children, ...props }, ref) => (
    <ScrollView
        ref={ref}
        className={cn("relative overflow-hidden", className)}
        {...props}
    >
        {children}
    </ScrollView>
));
ScrollArea.displayName = "ScrollArea";

export { ScrollArea };
