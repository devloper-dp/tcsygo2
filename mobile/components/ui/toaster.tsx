import * as React from "react"
import { useToast } from "./toast"
import { View, Text, TouchableOpacity, Animated } from "react-native"
import { Feather } from "@expo/vector-icons"

function ToastItem({ id, title, description, variant, open, onOpenChange }: any) {
    const slideAnim = React.useRef(new Animated.Value(-100)).current;
    const opacityAnim = React.useRef(new Animated.Value(0)).current;

    React.useEffect(() => {
        if (open) {
            Animated.parallel([
                Animated.spring(slideAnim, {
                    toValue: 0,
                    useNativeDriver: true,
                    tension: 80,
                    friction: 10,
                }),
                Animated.timing(opacityAnim, {
                    toValue: 1,
                    duration: 200,
                    useNativeDriver: true,
                }),
            ]).start();
        } else {
            Animated.parallel([
                Animated.timing(slideAnim, {
                    toValue: -100,
                    duration: 200,
                    useNativeDriver: true,
                }),
                Animated.timing(opacityAnim, {
                    toValue: 0,
                    duration: 200,
                    useNativeDriver: true,
                }),
            ]).start();
        }
    }, [open]);

    if (!open) return null;

    const isDestructive = variant === "destructive";

    const bgColor = isDestructive ? "#dc2626" : "#059669"; // red-600 | emerald-600
    const icon = isDestructive ? "alert-circle" : "check-circle";

    return (
        <Animated.View
            style={{
                transform: [{ translateY: slideAnim }],
                opacity: opacityAnim,
                marginBottom: 8,
            }}
        >
            <View
                style={{
                    backgroundColor: bgColor,
                    borderRadius: 14,
                    paddingHorizontal: 14,
                    paddingVertical: 12,
                    flexDirection: "row",
                    alignItems: "center",
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.18,
                    shadowRadius: 8,
                    elevation: 8,
                    maxWidth: 300,
                    minWidth: 200,
                }}
            >
                <Feather name={icon as any} size={18} color="white" style={{ marginRight: 10 }} />
                <View style={{ flex: 1 }}>
                    {title ? (
                        <Text style={{ color: "white", fontWeight: "700", fontSize: 13, lineHeight: 18 }}>
                            {title}
                        </Text>
                    ) : null}
                    {description ? (
                        <Text style={{ color: "rgba(255,255,255,0.85)", fontSize: 12, marginTop: 1 }}>
                            {description}
                        </Text>
                    ) : null}
                </View>
                <TouchableOpacity
                    onPress={() => onOpenChange && onOpenChange(false)}
                    style={{ marginLeft: 10, padding: 2 }}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                    <Feather name="x" size={16} color="rgba(255,255,255,0.75)" />
                </TouchableOpacity>
            </View>
        </Animated.View>
    );
}

export function Toaster() {
    const { toasts } = useToast();

    return (
        <View
            style={{
                position: "absolute",
                top: 56,
                right: 16,
                zIndex: 9999,
                alignItems: "flex-end",
                pointerEvents: "box-none",
            }}
        >
            {toasts.map(({ id, title, description, variant, open, onOpenChange }: any) => (
                <ToastItem
                    key={id}
                    id={id}
                    title={title}
                    description={description}
                    variant={variant}
                    open={open}
                    onOpenChange={onOpenChange}
                />
            ))}
        </View>
    );
}
