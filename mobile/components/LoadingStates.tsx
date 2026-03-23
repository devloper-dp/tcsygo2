import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { Text } from '@/components/ui/text';
import { Card } from '@/components/ui/card';
import { useTheme } from '@/contexts/ThemeContext';
 
interface LoadingStateProps {
    message?: string;
    size?: 'small' | 'large';
}
 
export function LoadingState({ message = 'Loading...', size = 'large' }: LoadingStateProps) {
    const { theme } = useTheme();
    const isDark = theme === 'dark';
 
    return (
        <View className="flex-1 justify-center items-center p-5">
            <ActivityIndicator size={size} color="#3b82f6" />
            {message && (
                <Text className="text-slate-500 dark:text-slate-400 font-bold mt-4 uppercase tracking-[2px] text-xs">
                    {message}
                </Text>
            )}
        </View>
    );
}
 
export function FullScreenLoading({ message }: { message?: string }) {
    return (
        <View className="flex-1 justify-center items-center bg-white dark:bg-slate-950">
            <LoadingState message={message} />
        </View>
    );
}
 
export function CardLoading({ message }: { message?: string }) {
    return (
        <Card className="p-10 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[32px]">
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
            className="bg-slate-100 dark:bg-slate-800 overflow-hidden"
            style={[
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
        <Card className="p-6 mb-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl">
            <View className="flex-row gap-4">
                {/* Avatar */}
                <Skeleton width={56} height={56} borderRadius={28} />
 
                <View className="flex-1">
                    {/* Name and Rating */}
                    <View className="flex-row justify-between items-center mb-3">
                        <Skeleton width={140} height={18} borderRadius={9} />
                        <Skeleton width={50} height={18} borderRadius={9} />
                    </View>
 
                    {/* Route */}
                    <Skeleton width="100%" height={14} borderRadius={7} style={{ marginBottom: 6 }} />
                    <Skeleton width="70%" height={14} borderRadius={7} style={{ marginBottom: 10 }} />
 
                    {/* Details */}
                    <View className="flex-row gap-3">
                        <Skeleton width={80} height={12} borderRadius={6} />
                        <Skeleton width={80} height={12} borderRadius={6} />
                    </View>
                </View>
            </View>
        </Card>
    );
}
 
export function TripListSkeleton({ count = 3 }: { count?: number }) {
    return (
        <View className="p-4">
            {Array.from({ length: count }).map((_, i) => (
                <TripCardSkeleton key={i} />
            ))}
        </View>
    );
}
 
export function ProfileSkeleton() {
    return (
        <View className="p-6">
            {/* Header */}
            <View className="flex-row items-center mb-10">
                <Skeleton width={96} height={96} borderRadius={48} />
                <View className="flex-1 ml-6">
                    <Skeleton width={180} height={24} borderRadius={12} />
                    <Skeleton width={220} height={16} borderRadius={8} style={{ marginTop: 10 }} />
                    <View className="flex-row gap-3 mt-4">
                        <Skeleton width={70} height={20} borderRadius={10} />
                        <Skeleton width={70} height={20} borderRadius={10} />
                    </View>
                </View>
            </View>
 
            {/* Stats */}
            <View className="flex-row gap-4 mb-10">
                {[1, 2, 3].map((i) => (
                    <View key={i} className="flex-1 bg-slate-50 dark:bg-slate-800/50 p-6 rounded-3xl items-center border border-slate-100 dark:border-slate-800/50">
                        <Skeleton width={40} height={24} borderRadius={6} />
                        <Skeleton width={60} height={12} borderRadius={6} style={{ marginTop: 6 }} />
                    </View>
                ))}
            </View>
 
            {/* Form Fields */}
            <View className="gap-6">
                <Skeleton width="100%" height={56} borderRadius={16} />
                <Skeleton width="100%" height={56} borderRadius={16} />
                <Skeleton width="100%" height={120} borderRadius={24} />
            </View>
        </View>
    );
}
 
const styles = StyleSheet.create({});
