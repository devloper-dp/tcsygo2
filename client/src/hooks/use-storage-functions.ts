import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useToast } from './use-toast';

/**
 * React Query Hooks for Supabase Storage Database Functions
 * Integrates with functions defined in storage-functions.sql
 */

// ============================================================================
// Storage Usage Hooks
// ============================================================================

export interface StorageUsage {
    bucket_id: string;
    file_count: number;
    total_size_bytes: number;
    total_size_formatted: string;
}

export interface TotalStorageUsage {
    total_files: number;
    total_size_bytes: number;
    total_size_formatted: string;
}

/**
 * Get user's storage usage by bucket
 */
export function useUserStorageUsage(userId: string) {
    return useQuery({
        queryKey: ['storage-usage', userId],
        queryFn: async () => {
            const { data, error } = await supabase.rpc('get_user_storage_usage', {
                p_user_id: userId,
            });

            if (error) throw error;
            return data as StorageUsage[];
        },
        enabled: !!userId,
    });
}

/**
 * Get user's total storage across all buckets
 */
export function useUserTotalStorage(userId: string) {
    return useQuery({
        queryKey: ['storage-total', userId],
        queryFn: async () => {
            const { data, error } = await supabase.rpc('get_user_total_storage', {
                p_user_id: userId,
            });

            if (error) throw error;
            return data?.[0] as TotalStorageUsage;
        },
        enabled: !!userId,
    });
}

// ============================================================================
// Profile Photo Hooks
// ============================================================================

/**
 * Update user profile photo in database
 */
export function useUpdateProfilePhoto() {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: async ({ userId, photoUrl }: { userId: string; photoUrl: string }) => {
            const { data, error } = await supabase.rpc('update_user_profile_photo', {
                p_user_id: userId,
                p_photo_url: photoUrl,
            });

            if (error) throw error;
            return data;
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['users', variables.userId] });
            toast({
                title: 'Profile photo updated',
                description: 'Your profile photo has been updated successfully',
            });
        },
        onError: (error: any) => {
            toast({
                title: 'Error updating profile photo',
                description: error.message || 'Failed to update profile photo',
                variant: 'destructive',
            });
        },
    });
}

/**
 * Get user profile photo URL
 */
export function useUserProfilePhoto(userId: string) {
    return useQuery({
        queryKey: ['profile-photo', userId],
        queryFn: async () => {
            const { data, error } = await supabase.rpc('get_user_profile_photo', {
                p_user_id: userId,
            });

            if (error) throw error;
            return data as string;
        },
        enabled: !!userId,
    });
}

// ============================================================================
// Driver Document Hooks
// ============================================================================

export interface DriverDocuments {
    license_number: string;
    license_photo: string;
    vehicle_photos: string[];
    verification_status: string;
}

/**
 * Update driver license photo and number
 */
export function useUpdateDriverLicense() {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: async ({
            userId,
            licensePhoto,
            licenseNumber,
        }: {
            userId: string;
            licensePhoto: string;
            licenseNumber?: string;
        }) => {
            const { data, error } = await supabase.rpc('update_driver_license', {
                p_user_id: userId,
                p_license_photo: licensePhoto,
                p_license_number: licenseNumber || null,
            });

            if (error) throw error;
            return data;
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['driver-documents', variables.userId] });
            toast({
                title: 'License updated',
                description: 'Your license has been updated successfully',
            });
        },
        onError: (error: any) => {
            toast({
                title: 'Error updating license',
                description: error.message || 'Failed to update license',
                variant: 'destructive',
            });
        },
    });
}

/**
 * Update all driver vehicle photos
 */
export function useUpdateDriverVehiclePhotos() {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: async ({
            userId,
            vehiclePhotos,
        }: {
            userId: string;
            vehiclePhotos: string[];
        }) => {
            const { data, error } = await supabase.rpc('update_driver_vehicle_photos', {
                p_user_id: userId,
                p_vehicle_photos: vehiclePhotos,
            });

            if (error) throw error;
            return data;
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['driver-documents', variables.userId] });
            toast({
                title: 'Vehicle photos updated',
                description: 'Your vehicle photos have been updated',
            });
        },
        onError: (error: any) => {
            toast({
                title: 'Error updating vehicle photos',
                description: error.message || 'Failed to update vehicle photos',
                variant: 'destructive',
            });
        },
    });
}

/**
 * Add a single vehicle photo to driver
 */
export function useAddDriverVehiclePhoto() {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: async ({ userId, photoUrl }: { userId: string; photoUrl: string }) => {
            const { data, error } = await supabase.rpc('add_driver_vehicle_photo', {
                p_user_id: userId,
                p_photo_url: photoUrl,
            });

            if (error) throw error;
            return data;
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['driver-documents', variables.userId] });
            toast({
                title: 'Photo added',
                description: 'Vehicle photo has been added',
            });
        },
        onError: (error: any) => {
            toast({
                title: 'Error adding photo',
                description: error.message || 'Failed to add vehicle photo',
                variant: 'destructive',
            });
        },
    });
}

/**
 * Remove a vehicle photo from driver
 */
export function useRemoveDriverVehiclePhoto() {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: async ({ userId, photoUrl }: { userId: string; photoUrl: string }) => {
            const { data, error } = await supabase.rpc('remove_driver_vehicle_photo', {
                p_user_id: userId,
                p_photo_url: photoUrl,
            });

            if (error) throw error;
            return data;
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['driver-documents', variables.userId] });
            toast({
                title: 'Photo removed',
                description: 'Vehicle photo has been removed',
            });
        },
        onError: (error: any) => {
            toast({
                title: 'Error removing photo',
                description: error.message || 'Failed to remove vehicle photo',
                variant: 'destructive',
            });
        },
    });
}

/**
 * Get all driver documents
 */
export function useDriverDocuments(userId: string) {
    return useQuery({
        queryKey: ['driver-documents', userId],
        queryFn: async () => {
            const { data, error } = await supabase.rpc('get_driver_documents', {
                p_user_id: userId,
            });

            if (error) throw error;
            return data?.[0] as DriverDocuments;
        },
        enabled: !!userId,
    });
}

// ============================================================================
// Storage Statistics Hooks
// ============================================================================

export interface BucketStats {
    bucket_id: string;
    total_files: number;
    total_size_bytes: number;
    total_size_formatted: string;
    avg_file_size_bytes: number;
    largest_file_bytes: number;
    smallest_file_bytes: number;
}

export interface AllBucketsStats {
    bucket_id: string;
    bucket_name: string;
    is_public: boolean;
    total_files: number;
    total_size_bytes: number;
    total_size_formatted: string;
}

/**
 * Get statistics for a specific bucket
 */
export function useBucketStats(bucketId: string) {
    return useQuery({
        queryKey: ['bucket-stats', bucketId],
        queryFn: async () => {
            const { data, error } = await supabase.rpc('get_bucket_stats', {
                p_bucket_id: bucketId,
            });

            if (error) throw error;
            return data?.[0] as BucketStats;
        },
        enabled: !!bucketId,
    });
}

/**
 * Get statistics for all buckets
 */
export function useAllBucketsStats() {
    return useQuery({
        queryKey: ['all-buckets-stats'],
        queryFn: async () => {
            const { data, error } = await supabase.rpc('get_all_buckets_stats');

            if (error) throw error;
            return data as AllBucketsStats[];
        },
    });
}

// ============================================================================
// File Search Hooks
// ============================================================================

export interface FileSearchResult {
    id: string;
    name: string;
    bucket_id: string;
    owner: string;
    created_at: string;
    updated_at: string;
    size_bytes: number;
    size_formatted: string;
}

/**
 * Search files by name pattern in a bucket
 */
export function useSearchFiles(bucketId: string, searchPattern: string, limit: number = 50) {
    return useQuery({
        queryKey: ['search-files', bucketId, searchPattern, limit],
        queryFn: async () => {
            const { data, error } = await supabase.rpc('search_files', {
                p_bucket_id: bucketId,
                p_search_pattern: searchPattern,
                p_limit: limit,
            });

            if (error) throw error;
            return data as FileSearchResult[];
        },
        enabled: !!bucketId && !!searchPattern,
    });
}

/**
 * Get recent files uploaded
 */
export function useRecentFiles(
    bucketId?: string,
    userId?: string,
    limit: number = 20
) {
    return useQuery({
        queryKey: ['recent-files', bucketId, userId, limit],
        queryFn: async () => {
            const { data, error } = await supabase.rpc('get_recent_files', {
                p_bucket_id: bucketId || null,
                p_user_id: userId || null,
                p_limit: limit,
            });

            if (error) throw error;
            return data as FileSearchResult[];
        },
    });
}

// ============================================================================
// Storage Activity Hooks
// ============================================================================

export interface StorageActivity {
    action: string;
    bucket_id: string;
    object_name: string;
    created_at: string;
}

/**
 * Get user's storage activity history
 */
export function useUserStorageActivity(
    userId: string,
    days: number = 30,
    limit: number = 100
) {
    return useQuery({
        queryKey: ['storage-activity', userId, days, limit],
        queryFn: async () => {
            const { data, error } = await supabase.rpc('get_user_activity', {
                p_user_id: userId,
                p_days: days,
                p_limit: limit,
            });

            if (error) throw error;
            return data as StorageActivity[];
        },
        enabled: !!userId,
    });
}
