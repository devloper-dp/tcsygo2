import * as React from "react";
import { TouchableOpacity, View, Text } from "react-native";
import { cn } from "../../lib/utils";

interface TabsContextType {
    value: string;
    onValueChange: (value: string) => void;
}
const TabsContext = React.createContext<TabsContextType>({ value: "", onValueChange: () => { } });

const Tabs = React.forwardRef<
    React.ElementRef<typeof View>,
    React.ComponentPropsWithoutRef<typeof View> & { value?: string, onValueChange?: (val: string) => void, defaultValue?: string }
>(({ className, value, onValueChange, defaultValue, ...props }, ref) => {
    const [internalValue, setInternalValue] = React.useState(defaultValue || "");
    const isControlled = value !== undefined;
    const currentValue = isControlled ? value : internalValue;
    const handleValueChange = isControlled ? onValueChange : setInternalValue;

    return (
        // @ts-ignore
        <TabsContext.Provider value={{ value: currentValue, onValueChange: handleValueChange }}>
            <View ref={ref} className={cn("", className)} {...props} />
        </TabsContext.Provider>
    )
})
Tabs.displayName = "Tabs"

const TabsList = React.forwardRef<
    React.ElementRef<typeof View>,
    React.ComponentPropsWithoutRef<typeof View>
>(({ className, ...props }, ref) => (
    <View
        ref={ref}
        className={cn(
            "flex-row items-center justify-center rounded-lg bg-muted p-1 text-muted-foreground",
            className
        )}
        {...props}
    />
))
TabsList.displayName = "TabsList"

const TabsTrigger = React.forwardRef<
    React.ElementRef<typeof TouchableOpacity>,
    React.ComponentPropsWithoutRef<typeof TouchableOpacity> & { value: string }
>(({ className, value, ...props }, ref) => {
    const { value: selectedValue, onValueChange } = React.useContext(TabsContext);
    const isSelected = selectedValue === value;

    return (
        <TouchableOpacity
            ref={ref}
            onPress={() => onValueChange(value)}
            className={cn(
                "flex-1 items-center justify-center whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
                isSelected && "bg-background text-foreground shadow-sm",
                className
            )}
            {...props}
        >
            {typeof props.children === 'string' ? <Text className={cn("text-sm font-medium", isSelected ? "text-foreground" : "text-muted-foreground")}>{props.children}</Text> : props.children}
        </TouchableOpacity>
    )
})
TabsTrigger.displayName = "TabsTrigger"

const TabsContent = React.forwardRef<
    React.ElementRef<typeof View>,
    React.ComponentPropsWithoutRef<typeof View> & { value: string }
>(({ className, value, ...props }, ref) => {
    const { value: selectedValue } = React.useContext(TabsContext);
    if (selectedValue !== value) return null;

    return (
        <View
            ref={ref}
            className={cn(
                "mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                className
            )}
            {...props}
        />
    )
})
TabsContent.displayName = "TabsContent"

export { Tabs, TabsList, TabsTrigger, TabsContent };
