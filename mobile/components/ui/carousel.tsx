import React, { useRef } from 'react';
import { View, ScrollView, Dimensions, StyleSheet, NativeSyntheticEvent, NativeScrollEvent } from 'react-native';
import { cn } from '@/lib/utils';

interface CarouselProps {
    children: React.ReactNode[];
    className?: string;
    autoPlay?: boolean;
    autoPlayInterval?: number;
    showIndicators?: boolean;
}

export function Carousel({
    children,
    className,
    autoPlay = false,
    autoPlayInterval = 3000,
    showIndicators = true,
}: CarouselProps) {
    const scrollViewRef = useRef<ScrollView>(null);
    const [activeIndex, setActiveIndex] = React.useState(0);
    const screenWidth = Dimensions.get('window').width;

    React.useEffect(() => {
        if (autoPlay && children.length > 1) {
            const interval = setInterval(() => {
                const nextIndex = (activeIndex + 1) % children.length;
                scrollViewRef.current?.scrollTo({
                    x: nextIndex * screenWidth,
                    animated: true,
                });
                setActiveIndex(nextIndex);
            }, autoPlayInterval);

            return () => clearInterval(interval);
        }
    }, [autoPlay, activeIndex, children.length, autoPlayInterval, screenWidth]);

    const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
        const contentOffsetX = event.nativeEvent.contentOffset.x;
        const index = Math.round(contentOffsetX / screenWidth);
        setActiveIndex(index);
    };

    return (
        <View className={cn('relative', className)}>
            <ScrollView
                ref={scrollViewRef}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onScroll={handleScroll}
                scrollEventThrottle={16}
            >
                {children.map((child, index) => (
                    <View key={index} style={{ width: screenWidth }}>
                        {child}
                    </View>
                ))}
            </ScrollView>

            {showIndicators && children.length > 1 && (
                <View style={styles.indicatorContainer}>
                    {children.map((_, index) => (
                        <View
                            key={index}
                            style={[
                                styles.indicator,
                                index === activeIndex ? styles.activeIndicator : styles.inactiveIndicator,
                            ]}
                        />
                    ))}
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    indicatorContainer: {
        position: 'absolute',
        bottom: 16,
        left: 0,
        right: 0,
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 8,
    },
    indicator: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    activeIndicator: {
        backgroundColor: '#3b82f6',
        width: 24,
    },
    inactiveIndicator: {
        backgroundColor: 'rgba(255, 255, 255, 0.5)',
    },
});
