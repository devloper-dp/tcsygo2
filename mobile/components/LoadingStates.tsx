import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { Text } from '@/components/ui/text';
import { Card } from '@/components/ui/card';

interface LoadingStateProps {
    message?: string;
    size?: 'small' | 'large';
}

export function LoadingState({ message = 'Loading...', size = 'large' }: LoadingStateProps) {
    return (
        <View style={styles.container}>
            <ActivityIndicator size={size} color="#3b82f6" />
            {message && (
                <Text style={styles.message} className="text-gray-600 mt-4">
                    {message}
                </Text>
            )}
        </View>
    );
}

export function FullScreenLoading({ message }: { message?: string }) {
    return (
        <View style={styles.fullScreen}>
            <LoadingState message={message} />
        </View>
    );
}

export function CardLoading({ message }: { message?: string }) {
    return (
        <Card className="p-8">
            <LoadingState message={message} />
        </Card>
    );
}

interface SkeletonProps {
    width?: number | string;
    height?: number;
    borderRadius?: number;
    style?: any;
}

export function Skeleton({
    width = '100%',
    height = 20,
    borderRadius = 4,
    style
}: SkeletonProps) {
    return (
        <View
            style={[
                styles.skeleton,
                {
                    width,
                    height,
                    borderRadius,
                },
                style,
            ]}
        />
    );
}

export function TripCardSkeleton() {
    return (
        <Card className="p-4 mb-3">
            <View style={styles.tripCardSkeleton}>
                {/* Avatar */}
                <Skeleton width={48} height={48} borderRadius={24} />

                <View style={styles.tripCardContent}>
                    {/* Name and Rating */}
                    <View style={styles.row}>
                        <Skeleton width={120} height={16} />
                        <Skeleton width={60} height={16} />
                    </View>

                    {/* Route */}
                    <Skeleton width="100%" height={14} style={{ marginTop: 8 }} />
                    <Skeleton width="80%" height={14} style={{ marginTop: 4 }} />

                    {/* Details */}
                    <View style={[styles.row, { marginTop: 8 }]}>
                        <Skeleton width={80} height={14} />
                        <Skeleton width={80} height={14} />
                    </View>
                </View>

                {/* Price */}
                <View style={styles.priceSection}>
                    <Skeleton width={60} height={24} />
                    <Skeleton width={80} height={32} borderRadius={8} style={{ marginTop: 8 }} />
                </View>
            </View>
        </Card>
    );
}

export function TripListSkeleton({ count = 3 }: { count?: number }) {
    return (
        <View>
            {Array.from({ length: count }).map((_, i) => (
                <TripCardSkeleton key={i} />
            ))}
        </View>
    );
}

export function ProfileSkeleton() {
    return (
        <View style={styles.profileSkeleton}>
            {/* Header */}
            <View style={styles.profileHeader}>
                <Skeleton width={80} height={80} borderRadius={40} />
                <View style={{ flex: 1, marginLeft: 16 }}>
                    <Skeleton width={150} height={20} />
                    <Skeleton width={200} height={14} style={{ marginTop: 8 }} />
                    <View style={[styles.row, { marginTop: 8 }]}>
                        <Skeleton width={60} height={20} borderRadius={12} />
                        <Skeleton width={60} height={20} borderRadius={12} style={{ marginLeft: 8 }} />
                    </View>
                </View>
            </View>

            {/* Stats */}
            <View style={[styles.row, { marginTop: 24 }]}>
                {[1, 2, 3].map((i) => (
                    <View key={i} style={styles.statCard}>
                        <Skeleton width={40} height={24} />
                        <Skeleton width={60} height={14} style={{ marginTop: 4 }} />
                    </View>
                ))}
            </View>

            {/* Form Fields */}
            <View style={{ marginTop: 24 }}>
                <Skeleton width="100%" height={48} borderRadius={8} />
                <Skeleton width="100%" height={48} borderRadius={8} style={{ marginTop: 12 }} />
                <Skeleton width="100%" height={96} borderRadius={8} style={{ marginTop: 12 }} />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    fullScreen: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f9fafb',
    },
    message: {
        marginTop: 12,
        fontSize: 14,
        textAlign: 'center',
    },
    skeleton: {
        backgroundColor: '#e5e7eb',
        overflow: 'hidden',
    },
    tripCardSkeleton: {
        flexDirection: 'row',
        gap: 12,
    },
    tripCardContent: {
        flex: 1,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    priceSection: {
        alignItems: 'flex-end',
        justifyContent: 'space-between',
    },
    profileSkeleton: {
        padding: 16,
    },
    profileHeader: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    statCard: {
        flex: 1,
        alignItems: 'center',
        padding: 12,
        backgroundColor: '#f3f4f6',
        borderRadius: 8,
        marginHorizontal: 4,
    },
});
