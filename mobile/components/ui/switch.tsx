import * as React from "react";
import { Switch as RNSwitch, View } from "react-native";
import { cn } from "../../lib/utils";

const Switch = React.forwardRef<
    React.ElementRef<typeof RNSwitch>,
    React.ComponentPropsWithoutRef<typeof RNSwitch> & { checked?: boolean, onCheckedChange?: (val: boolean) => void }
>(({ className, checked, onCheckedChange, ...props }, ref) => (
    <View className={className}>
        <RNSwitch
            trackColor={{ false: "#767577", true: "#3b82f6" }}
            thumbColor={checked ? "#ffffff" : "#f4f3f4"}
            ios_backgroundColor="#3e3e3e"
            onValueChange={onCheckedChange}
            value={checked}
            ref={ref}
            {...props}
        />
    </View>
));
Switch.displayName = "Switch";

export { Switch };
