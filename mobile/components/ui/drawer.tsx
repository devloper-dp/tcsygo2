import React from 'react';
import {
    View,
    TouchableOpacity,
    Modal,
    Animated,
    Dimensions,
    StyleSheet,
    Pressable,
} from 'react-native';
import { cn } from '@/lib/utils';

interface DrawerProps {
    children: React.ReactNode;
    trigger?: React.ReactNode;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    side?: 'left' | 'right';
    className?: string;
}

export function Drawer({
    children,
    trigger,
    open: controlledOpen,
    onOpenChange,
    side = 'left',
    className,
}: DrawerProps) {
    const [internalOpen, setInternalOpen] = React.useState(false);
    const slideAnim = React.useRef(new Animated.Value(0)).current;
    const screenWidth = Dimensions.get('window').width;
    const drawerWidth = screenWidth * 0.8;

    const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen;

    const setOpen = (value: boolean) => {
        if (onOpenChange) {
            onOpenChange(value);
        } else {
            setInternalOpen(value);
        }
    };

    React.useEffect(() => {
        Animated.timing(slideAnim, {
            toValue: isOpen ? 1 : 0,
            duration: 300,
            useNativeDriver: true,
        }).start();
    }, [isOpen, slideAnim]);

    const translateX = slideAnim.interpolate({
        inputRange: [0, 1],
        outputRange: side === 'left' ? [-drawerWidth, 0] : [drawerWidth, 0],
    });

    return (
        <>
            {trigger && (
                <TouchableOpacity onPress={() => setOpen(true)}>
                    {trigger}
                </TouchableOpacity>
            )}

            <Modal
                transparent
                visible={isOpen}
                animationType="fade"
                onRequestClose={() => setOpen(false)}
            >
                <View style={styles.container}>
                    <Pressable style={styles.overlay} onPress={() => setOpen(false)} />

                    <Animated.View
                        style={[
                            styles.drawer,
                            {
                                width: drawerWidth,
                                transform: [{ translateX }],
                                [side]: 0,
                            },
                        ]}
                        className={className}
                    >
                        {children}
                    </Animated.View>
                </View>
            </Modal>
        </>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    overlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    drawer: {
        position: 'absolute',
        top: 0,
        bottom: 0,
        backgroundColor: '#ffffff',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
        elevation: 10,
    },
});
