import * as React from "react";
import { View, Text, TouchableOpacity, Animated } from "react-native";
import { cn } from "../../lib/utils";
import { Feather } from "@expo/vector-icons";

type ToastProps = {
    id: string;
    title?: string;
    description?: string;
    action?: React.ReactNode;
    variant?: "default" | "destructive";
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
};

// Simple event emitter or context
type ToastActionElement = React.ReactElement;

const TOAST_LIMIT = 1;
const TOAST_REMOVE_DELAY = 1000000;

type ToasterToast = ToastProps & {
    id: string
    title?: React.ReactNode
    description?: React.ReactNode
    action?: ToastActionElement
}

// Global state for toasts (simplified for mobile without heavy reducer)
// Ideally use a specialized library like 'sonner' or 'react-hot-toast' for RN
// This is a minimal implementation to support the 'use-toast' hook interface.

let listeners: Array<(state: any) => void> = [];
let memoryState = { toasts: [] as ToasterToast[] };

function dispatch(action: any) {
    memoryState = reducer(memoryState, action);
    listeners.forEach((listener) => listener(memoryState));
}

function reducer(state: any, action: any) {
    switch (action.type) {
        case "ADD_TOAST":
            return {
                ...state,
                toasts: [action.toast, ...state.toasts].slice(0, TOAST_LIMIT),
            }
        case "UPDATE_TOAST":
            return {
                ...state,
                toasts: state.toasts.map((t: any) =>
                    t.id === action.toast.id ? { ...t, ...action.toast } : t
                ),
            }
        case "DISMISS_TOAST": {
            const { toastId } = action
            return {
                ...state,
                toasts: state.toasts.map((t: any) =>
                    t.id === toastId || toastId === undefined
                        ? {
                            ...t,
                            open: false,
                        }
                        : t
                ),
            }
        }
        case "REMOVE_TOAST":
            if (action.toastId === undefined) {
                return {
                    ...state,
                    toasts: [],
                }
            }
            return {
                ...state,
                toasts: state.toasts.filter((t: any) => t.id !== action.toastId),
            }
    }
    return state;
}

function useToast() {
    const [state, setState] = React.useState(memoryState);

    React.useEffect(() => {
        listeners.push(setState);
        return () => {
            const index = listeners.indexOf(setState);
            if (index > -1) {
                listeners.splice(index, 1);
            }
        };
    }, [state]);

    return {
        ...state,
        toast: (props: Omit<ToasterToast, "id">) => {
            const id = Math.random().toString(36).substring(2, 9);
            dispatch({
                type: "ADD_TOAST",
                toast: {
                    ...props,
                    id,
                    open: true,
                    onOpenChange: (open: boolean) => {
                        if (!open) dispatch({ type: "DISMISS_TOAST", toastId: id });
                    },
                }
            });
            return {
                id,
                dismiss: () => dispatch({ type: "DISMISS_TOAST", toastId: id }),
                update: (props: ToasterToast) => dispatch({ type: "UPDATE_TOAST", toast: { ...props, id } }),
            }
        },
        dismiss: (toastId?: string) => dispatch({ type: "DISMISS_TOAST", toastId }),
    };
}

export { useToast };

// Toast visual component
export const Toast = React.forwardRef<
    React.ElementRef<typeof View>,
    React.ComponentPropsWithoutRef<typeof View> & { variant?: "default" | "destructive" }
>(({ className, variant, ...props }, ref) => {
    return (
        <View
            ref={ref}
            className={cn(
                "group pointer-events-auto flex w-full items-center justify-between space-x-4 overflow-hidden rounded-md border p-6 pr-8 shadow-lg transition-all",
                variant === "destructive" ? "bg-destructive border-destructive text-destructive-foreground" : "bg-background border-border",
                className
            )}
            {...props}
        />
    )
})
Toast.displayName = "Toast"

export const ToastAction = React.forwardRef<
    React.ElementRef<typeof TouchableOpacity>,
    React.ComponentPropsWithoutRef<typeof TouchableOpacity>
>(({ className, ...props }, ref) => (
    <TouchableOpacity
        ref={ref}
        className={cn(
            "inline-flex h-8 shrink-0 items-center justify-center rounded-md border bg-transparent px-3 text-sm font-medium ring-offset-background transition-colors hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 group-[.destructive]:border-muted/40 group-[.destructive]:hover:border-destructive/30 group-[.destructive]:hover:bg-destructive group-[.destructive]:hover:text-destructive-foreground group-[.destructive]:focus:ring-destructive",
            className
        )}
        {...props}
    />
))
ToastAction.displayName = "ToastAction"

export const ToastTitle = React.forwardRef<
    React.ElementRef<typeof Text>,
    React.ComponentPropsWithoutRef<typeof Text>
>(({ className, ...props }, ref) => (
    <Text
        ref={ref}
        className={cn("text-sm font-semibold", className)}
        {...props}
    />
))
ToastTitle.displayName = "ToastTitle"

export const ToastDescription = React.forwardRef<
    React.ElementRef<typeof Text>,
    React.ComponentPropsWithoutRef<typeof Text>
>(({ className, ...props }, ref) => (
    <Text
        ref={ref}
        className={cn("text-sm opacity-90", className)}
        {...props}
    />
))
ToastDescription.displayName = "ToastDescription"

export const ToastClose = React.forwardRef<
    React.ElementRef<typeof TouchableOpacity>,
    React.ComponentPropsWithoutRef<typeof TouchableOpacity>
>(({ className, ...props }, ref) => (
    <TouchableOpacity
        ref={ref}
        className={cn(
            "absolute right-2 top-2 rounded-md p-1 text-foreground/50 opacity-0 transition-opacity hover:text-foreground focus:opacity-100 focus:outline-none focus:ring-2 group-hover:opacity-100 group-[.destructive]:text-red-300 group-[.destructive]:hover:text-red-50 group-[.destructive]:focus:ring-red-400 group-[.destructive]:focus:ring-offset-red-600",
            className
        )}
        toast-close="" // Mock
        {...props}
    >
        <Feather name="x" size={16} />
    </TouchableOpacity>
))
ToastClose.displayName = "ToastClose"
