import * as React from "react";
import { ScrollView, View, Text } from "react-native";
import { cn } from "../../lib/utils";

const Table = React.forwardRef<
    React.ElementRef<typeof ScrollView>,
    React.ComponentPropsWithoutRef<typeof ScrollView>
>(({ className, ...props }, ref) => (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ minWidth: "100%" }}>
        <View
            ref={ref}
            className={cn("w-full caption-bottom text-sm", className)}
            {...props}
        />
    </ScrollView>
))
Table.displayName = "Table"

const TableHeader = React.forwardRef<
    React.ElementRef<typeof View>,
    React.ComponentPropsWithoutRef<typeof View>
>(({ className, ...props }, ref) => (
    <View ref={ref} className={cn("[&_tr]:border-b", className)} {...props} />
))
TableHeader.displayName = "TableHeader"

const TableBody = React.forwardRef<
    React.ElementRef<typeof View>,
    React.ComponentPropsWithoutRef<typeof View>
>(({ className, ...props }, ref) => (
    <View
        ref={ref}
        className={cn("[&_tr:last-child]:border-0", className)}
        {...props}
    />
))
TableBody.displayName = "TableBody"

const TableFooter = React.forwardRef<
    React.ElementRef<typeof View>,
    React.ComponentPropsWithoutRef<typeof View>
>(({ className, ...props }, ref) => (
    <View
        ref={ref}
        className={cn(
            "border-t bg-muted/50 font-medium [&>tr]:last:border-b-0",
            className
        )}
        {...props}
    />
))
TableFooter.displayName = "TableFooter"

const TableRow = React.forwardRef<
    React.ElementRef<typeof View>,
    React.ComponentPropsWithoutRef<typeof View>
>(({ className, ...props }, ref) => (
    <View
        ref={ref}
        className={cn(
            "flex-row border-b transition-colors data-[state=selected]:bg-muted",
            className
        )}
        {...props}
    />
))
TableRow.displayName = "TableRow"

const TableHead = React.forwardRef<
    React.ElementRef<typeof View>,
    React.ComponentPropsWithoutRef<typeof View>
>(({ className, ...props }, ref) => (
    <View
        ref={ref}
        className={cn(
            "h-12 px-4 text-left align-middle font-medium text-muted-foreground flex justify-center", // Added flex centering
            className
        )}
        {...props}
    />
))
TableHead.displayName = "TableHead"
// Note: In RN, TD and TH usually wrap Text. But here they wrap Views so children can be Text.
// Ideally usage is <TableHead><Text>Header</Text></TableHead>

const TableCell = React.forwardRef<
    React.ElementRef<typeof View>,
    React.ComponentPropsWithoutRef<typeof View>
>(({ className, ...props }, ref) => (
    <View
        ref={ref}
        className={cn("p-4 align-middle flex justify-center", className)}
        {...props}
    />
))
TableCell.displayName = "TableCell"

const TableCaption = React.forwardRef<
    React.ElementRef<typeof Text>,
    React.ComponentPropsWithoutRef<typeof Text>
>(({ className, ...props }, ref) => (
    <Text
        ref={ref}
        className={cn("mt-4 text-sm text-muted-foreground text-center", className)}
        {...props}
    />
))
TableCaption.displayName = "TableCaption"

export {
    Table,
    TableHeader,
    TableBody,
    TableFooter,
    TableHead,
    TableRow,
    TableCell,
    TableCaption,
}
