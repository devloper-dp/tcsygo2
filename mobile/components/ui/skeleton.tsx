import * as React from "react";
import { Animated, View } from "react-native";
import { cn } from "../../lib/utils";

const Skeleton = ({
    className,
    ...props
}: React.ComponentPropsWithoutRef<typeof View>) => {
    const opacity = React.useRef(new Animated.Value(0.5)).current;

    React.useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(opacity, {
                    toValue: 1,
                    duration: 1000,
                    useNativeDriver: true,
                }),
                Animated.timing(opacity, {
                    toValue: 0.5,
                    duration: 1000,
                    useNativeDriver: true,
                }),
            ])
        ).start();
    }, [opacity]);

    return (
        <Animated.View
            className={cn("rounded-md bg-muted bg-gray-200", className)}
            style={[{ opacity }, props.style]} // Merge animated opacity with passed style
            //   @ts-ignore
            {...props}
        />
    );
}

export { Skeleton };
