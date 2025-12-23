import * as React from "react";
import { View, Text, TouchableOpacity, LayoutAnimation, Platform, UIManager } from "react-native";
import { cn } from "../../lib/utils";
import { Feather } from "@expo/vector-icons";

if (
    Platform.OS === "android" &&
    UIManager.setLayoutAnimationEnabledExperimental
) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

const Accordion = React.forwardRef<
    React.ElementRef<typeof View>,
    React.ComponentPropsWithoutRef<typeof View> & {
        type?: "single" | "multiple";
        collapsible?: boolean;
        defaultValue?: string | string[];
    }
>(({ className, type = "single", collapsible = false, defaultValue, children, ...props }, ref) => {
    const [value, setValue] = React.useState<string | string[]>(defaultValue || (type === "single" ? "" : []));

    return (
        <View ref={ref} className={cn("", className)} {...props}>
            {React.Children.map(children, (child) => {
                if (React.isValidElement(child)) {
                    return React.cloneElement(child, {
                        // @ts-ignore
                        value,
                        // @ts-ignore
                        setValue,
                        // @ts-ignore
                        type,
                        // @ts-ignore
                        collapsible
                    });
                }
                return child;
            })}
        </View>
    );
});
Accordion.displayName = "Accordion";

const AccordionItem = React.forwardRef<
    React.ElementRef<typeof View>,
    React.ComponentPropsWithoutRef<typeof View> & { value: string }
>(({ className, value: itemValue, ...props }, ref) => {
    // @ts-ignore
    const { value, setValue, type, collapsible } = props;

    const isExpanded = type === "single"
        ? value === itemValue
        // @ts-ignore
        : value.includes(itemValue);

    const handlePress = () => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        if (type === "single") {
            if (isExpanded && collapsible) {
                setValue("");
            } else {
                setValue(itemValue);
            }
        } else {
            // @ts-ignore
            if (isExpanded) {
                // @ts-ignore
                setValue(value.filter((v: string) => v !== itemValue));
            } else {
                // @ts-ignore
                setValue([...value, itemValue]);
            }
        }
    };

    return (
        <View ref={ref} className={cn("border-b border-border", className)}>
            {React.Children.map(props.children, child => {
                if (React.isValidElement(child)) {
                    return React.cloneElement(child, {
                        // @ts-ignore
                        isExpanded,
                        // @ts-ignore
                        handlePress
                    });
                }
                return child;
            })}
        </View>
    );
});
AccordionItem.displayName = "AccordionItem";

const AccordionTrigger = React.forwardRef<
    React.ElementRef<typeof TouchableOpacity>,
    React.ComponentPropsWithoutRef<typeof TouchableOpacity>
>(({ className, children, ...props }, ref) => {
    // @ts-ignore
    const { isExpanded, handlePress } = props;
    return (
        <TouchableOpacity
            ref={ref}
            onPress={handlePress}
            className={cn(
                "flex-row flex-1 items-center justify-between py-4 font-medium transition-all",
                className
            )}
            {...props}
        >
            <Text className="text-sm font-medium text-foreground">{children}</Text>
            <Feather name="chevron-down" size={16} className={cn("text-foreground transition-transform duration-200", isExpanded ? "rotate-180" : "rotate-0")} />
        </TouchableOpacity>
    );
});
AccordionTrigger.displayName = "AccordionTrigger";

const AccordionContent = React.forwardRef<
    React.ElementRef<typeof View>,
    React.ComponentPropsWithoutRef<typeof View>
>(({ className, children, ...props }, ref) => {
    // @ts-ignore
    const { isExpanded } = props;
    if (!isExpanded) return null;

    return (
        <View
            ref={ref}
            className={cn("overflow-hidden text-sm transition-all pb-4 pt-0", className)}
            {...props}
        >
            <Text className="text-sm text-muted-foreground">{children}</Text>
        </View>
    );
});
AccordionContent.displayName = "AccordionContent";

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent };
