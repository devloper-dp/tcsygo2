import * as React from "react";
import { View, PanResponder, Dimensions } from "react-native";
import { cn } from "../../lib/utils";

const Slider = React.forwardRef<
    React.ElementRef<typeof View>,
    React.ComponentPropsWithoutRef<typeof View> & { value?: number[], onValueChange?: (val: number[]) => void, min?: number, max?: number, step?: number }
>(({ className, value = [0], onValueChange, min = 0, max = 100, step = 1, ...props }, ref) => {
    // Basic single thumb slider implementation
    const [width, setWidth] = React.useState(0);
    const currentValue = value[0] || min;
    const percentage = ((currentValue - min) / (max - min)) * 100;

    // PanResponder for drag interaction (Simple version)
    // For production, use 'react-native-slider' or similar. 
    // This is a placeholder visual that can support basic tap/drag if expanded, but mainly visual for now.

    return (
        <View
            ref={ref}
            className={cn(
                "relative flex w-full touch-none select-none items-center",
                className
            )}
            onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
            {...props}
        >
            <View className="relative h-2 w-full grow overflow-hidden rounded-full bg-secondary">
                <View
                    className="absolute h-full bg-primary"
                    style={{ width: `${percentage}%` }}
                />
            </View>
            <View
                className="block h-5 w-5 rounded-full border-2 border-primary bg-background ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 shadow-sm"
                style={{
                    position: 'absolute',
                    left: `${percentage}%`,
                    marginLeft: -10 // offset half width 
                }}
            />
        </View>
    );
});
Slider.displayName = "Slider";

export { Slider };
