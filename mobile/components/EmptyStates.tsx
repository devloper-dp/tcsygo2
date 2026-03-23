import { View, Image, StyleSheet } from 'react-native';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
 
interface EmptyStateProps {
    icon?: keyof typeof Ionicons.glyphMap;
    title: string;
    description: string;
    actionLabel?: string;
    onAction?: () => void;
    illustration?: any;
    iconColor?: string;
}
 
export function EmptyState({
    icon = 'search-outline',
    title,
    description,
    actionLabel,
    onAction,
    illustration,
    iconColor,
}: EmptyStateProps) {
    const { theme } = useTheme();
    const isDark = theme === 'dark';
 
    // Default icon color if not provided
    const defaultIconColor = isDark ? '#334155' : '#e2e8f0';
    const finalIconColor = iconColor || defaultIconColor;
 
    return (
        <View style={styles.container}>
            {illustration ? (
                <Image source={illustration} style={styles.illustration} resizeMode="contain" />
            ) : (
                <View className="w-32 h-32 rounded-full bg-slate-50 dark:bg-slate-800/50 justify-center items-center mb-8 border-4 border-white dark:border-slate-900 shadow-xl shadow-slate-200/50 dark:shadow-slate-950/20">
                    <Ionicons name={icon} size={64} color={finalIconColor} />
                </View>
            )}
 
            <Text className="text-2xl font-black text-slate-900 dark:text-white text-center mb-3 tracking-tight">{title}</Text>
            <Text className="text-base font-medium text-slate-500 dark:text-slate-400 text-center leading-6 max-w-[280px]">{description}</Text>
 
            {actionLabel && onAction && (
                <Button 
                    onPress={onAction} 
                    className="mt-10 rounded-2xl shadow-lg shadow-blue-500/20 px-10 h-14 bg-blue-600 active:bg-blue-700"
                >
                    <Text className="text-white font-black text-base">{actionLabel}</Text>
                </Button>
            )}
        </View>
    );
}
 
export function NoTripsFound({ onSearch }: { onSearch?: () => void }) {
    return (
        <EmptyState
            icon="car-sport-outline"
            title="No trips found"
            description="We couldn't find any trips matching your search. Try adjusting your filters."
            actionLabel="Adjust Filters"
            onAction={onSearch}
        />
    );
}
 
export function NoBookingsYet({ onCreate }: { onCreate?: () => void }) {
    return (
        <EmptyState
            icon="calendar-clear-outline"
            title="No bookings yet"
            description="Ready to hit the road? Book your first ride and travel comfortably."
            actionLabel="Find a Ride"
            onAction={onCreate}
            iconColor="#3b82f6"
        />
    );
}
 
export function NoTripsCreated({ onCreate }: { onCreate?: () => void }) {
    return (
        <EmptyState
            icon="add-circle-outline"
            title="No trips created"
            description="Driving somewhere? Offer a ride and save on travel costs."
            actionLabel="Offer a Ride"
            onAction={onCreate}
            iconColor="#10b981"
        />
    );
}
 
export function VerificationPending() {
    return (
        <EmptyState
            icon="time-outline"
            title="Verification Pending"
            description="Your driver application is under review. We'll notify you once your account is verified."
            iconColor="#f59e0b"
        />
    );
}
 
export function NoNotifications() {
    return (
        <EmptyState
            icon="notifications-off-outline"
            title="No notifications"
            description="You're all caught up! We'll notify you when there's something new."
        />
    );
}
 
export function NoMessages() {
    return (
        <EmptyState
            icon="chatbubble-ellipses-outline"
            title="No messages"
            description="Start a conversation with your driver or passengers to coordinate trip details."
        />
    );
}
 
export function NetworkError({ onRetry }: { onRetry?: () => void }) {
    return (
        <EmptyState
            icon="cloud-offline-outline"
            title="No internet connection"
            description="Please check your internet connection and try again."
            actionLabel="Retry"
            onAction={onRetry}
            iconColor="#ef4444"
        />
    );
}
 
export function GenericError({ onRetry }: { onRetry?: () => void }) {
    return (
        <EmptyState
            icon="alert-circle-outline"
            title="Something went wrong"
            description="We encountered an error while loading this content. Please try again."
            actionLabel="Try Again"
            onAction={onRetry}
            iconColor="#ef4444"
        />
    );
}
 
const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 32,
    },
    illustration: {
        width: 240,
        height: 240,
        marginBottom: 32,
    },
});
