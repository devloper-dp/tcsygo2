import { View, Image, StyleSheet } from 'react-native';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Ionicons } from '@expo/vector-icons';

interface EmptyStateProps {
    icon?: keyof typeof Ionicons.glyphMap;
    title: string;
    description: string;
    actionLabel?: string;
    onAction?: () => void;
    illustration?: any;
}

export function EmptyState({
    icon = 'search-outline',
    title,
    description,
    actionLabel,
    onAction,
    illustration,
}: EmptyStateProps) {
    return (
        <View style={styles.container}>
            {illustration ? (
                <Image source={illustration} style={styles.illustration} resizeMode="contain" />
            ) : (
                <View style={styles.iconContainer}>
                    <Ionicons name={icon} size={64} color="#9ca3af" />
                </View>
            )}

            <Text style={styles.title} className="font-semibold text-gray-900">
                {title}
            </Text>

            <Text style={styles.description} className="text-gray-600">
                {description}
            </Text>

            {actionLabel && onAction && (
                <Button onPress={onAction} className="mt-6">
                    <Text className="text-white font-medium">{actionLabel}</Text>
                </Button>
            )}
        </View>
    );
}

export function NoTripsFound({ onSearch }: { onSearch?: () => void }) {
    return (
        <EmptyState
            icon="car-outline"
            title="No trips found"
            description="We couldn't find any trips matching your search. Try adjusting your filters or search for a different route."
            actionLabel="Adjust Filters"
            onAction={onSearch}
        />
    );
}

export function NoBookingsYet({ onCreate }: { onCreate?: () => void }) {
    return (
        <EmptyState
            icon="calendar-outline"
            title="No bookings yet"
            description="You haven't booked any trips yet. Start exploring available rides and book your first trip!"
            actionLabel="Find Trips"
            onAction={onCreate}
        />
    );
}

export function NoTripsCreated({ onCreate }: { onCreate?: () => void }) {
    return (
        <EmptyState
            icon="add-circle-outline"
            title="No trips created"
            description="You haven't created any trips yet. Start sharing rides and earn money by creating your first trip!"
            actionLabel="Create Trip"
            onAction={onCreate}
        />
    );
}

export function VerificationPending() {
    return (
        <EmptyState
            icon="time-outline"
            title="Verification Pending"
            description="Your driver application is under review. We'll notify you once your account is verified. This usually takes 24-48 hours."
        />
    );
}

export function NoNotifications() {
    return (
        <EmptyState
            icon="notifications-outline"
            title="No notifications"
            description="You're all caught up! We'll notify you when there's something new."
        />
    );
}

export function NoMessages() {
    return (
        <EmptyState
            icon="chatbubble-outline"
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
    iconContainer: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: '#f3f4f6',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24,
    },
    illustration: {
        width: 200,
        height: 200,
        marginBottom: 24,
    },
    title: {
        fontSize: 20,
        textAlign: 'center',
        marginBottom: 8,
    },
    description: {
        fontSize: 14,
        textAlign: 'center',
        lineHeight: 20,
    },
});
