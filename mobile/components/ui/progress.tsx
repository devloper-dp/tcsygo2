import * as React from "react";
import { View } from "react-native";
import { cn } from "../../lib/utils";

const Progress = React.forwardRef<
    React.ElementRef<typeof View>,
    React.ComponentPropsWithoutRef<typeof View> & { value?: number | null }
>(({ className, value, ...props }, ref) => (
    <View
        ref={ref}
        className={cn(
            "relative h-4 w-full overflow-hidden rounded-full bg-secondary",
            className
        )}
        {...props}
    >
        <View
            className="h-full w-full flex-1 bg-primary transition-all"
            style={{ transform: [{ translateX: -100 + (value || 0) }] }} // Simplified logic, for exact width mapping: width: `${value}%` is better in web but RN supports percentage widths.
        // Better approach for RN:
        // width: `${value || 0}%` 
        />
        <View
            className="absolute h-full left-0 top-0 bg-primary"
            style={{ width: `${value || 0}%` }}
        />
    </View>
));
Progress.displayName = "Progress";
// Note: transforming translateX requires ensuring container width is known, or strictly using width %. 
// Since I commented out the first View's style logic, I'll just use the absolute one or just standard View width.

// Let's refine implementation to be cleaner
const ProgressRefined = React.forwardRef<
    React.ElementRef<typeof View>,
    React.ComponentPropsWithoutRef<typeof View> & { value?: number | null }
>(({ className, value, ...props }, ref) => (
    <View
        ref={ref}
        className={cn(
            "relative h-4 w-full overflow-hidden rounded-full bg-secondary",
            className
        )}
        {...props}
    >
        <View
            className="h-full bg-primary"
            style={{ width: `${value || 0}%` }}
        />
    </View>
));
ProgressRefined.displayName = "Progress";

export { ProgressRefined as Progress };
