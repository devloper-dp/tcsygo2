import * as React from "react";
import { View } from "react-native";

interface AspectRatioProps extends React.ComponentPropsWithoutRef<typeof View> {
    ratio?: number;
}

const AspectRatio = React.forwardRef<React.ElementRef<typeof View>, AspectRatioProps>(
    ({ ratio = 1, style, ...props }, ref) => {
        return (
            <View
                ref={ref}
                style={[style, { aspectRatio: ratio }]}
                {...props}
            />
        );
    }
);
AspectRatio.displayName = "AspectRatio";

export { AspectRatio };
