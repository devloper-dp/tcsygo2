import { supabase } from './supabase';
import type {
    StorageUsageByBucket,
    TotalStorageUsage,
    BucketStatistics,
    DetailedBucketStats,
    FileSearchResult,
    RecentFile,
    SearchFilesParams,
    GetRecentFilesParams,
    UserStorageActivity,
    GetUserActivityParams,
    DriverDocuments,
    UpdateDriverLicenseParams,
    UpdateVehiclePhotosParams,
    AddVehiclePhotoParams,
    RemoveVehiclePhotoParams,
    CleanupResult,
    CleanupOptions,
} from '@/types/storage-types';

/**
 * Bucket Management Service
 * Advanced storage bucket operations and statistics
 * Wraps Supabase storage functions defined in storage-functions.sql
 */

class BucketManagementService {
    /**
     * Get user's storage usage by bucket
     */
    async getUserStorageUsage(
        userId: string
    ): Promise<{ data: StorageUsageByBucket[] | null; error: any }> {
        try {
            const { data, error } = await supabase.rpc('get_user_storage_usage', {
                p_user_id: userId,
            });

            if (error) {
                console.error('Error getting user storage usage:', error);
                return { data: null, error };
            }

            return { data: data || [], error: null };
        } catch (error) {
            console.error('Exception getting user storage usage:', error);
            return { data: null, error };
        }
    }

    /**
     * Get user's total storage usage across all buckets
     */
    async getTotalStorageUsage(
        userId: string
    ): Promise<{ data: TotalStorageUsage | null; error: any }> {
        try {
            const { data, error } = await supabase.rpc('get_user_total_storage', {
                p_user_id: userId,
            });

            if (error) {
                console.error('Error getting total storage usage:', error);
                return { data: null, error };
            }

            return { data: data?.[0] || null, error: null };
        } catch (error) {
            console.error('Exception getting total storage usage:', error);
            return { data: null, error };
        }
    }

    /**
     * Get statistics for a specific bucket
     */
    async getBucketStats(
        bucketId: string
    ): Promise<{ data: DetailedBucketStats | null; error: any }> {
        try {
            const { data, error } = await supabase.rpc('get_bucket_stats', {
                p_bucket_id: bucketId,
            });

            if (error) {
                console.error('Error getting bucket stats:', error);
                return { data: null, error };
            }

            return { data: data?.[0] || null, error: null };
        } catch (error) {
            console.error('Exception getting bucket stats:', error);
            return { data: null, error };
        }
    }

    /**
     * Get statistics for all buckets
     */
    async getAllBucketsStats(): Promise<{
        data: BucketStatistics[] | null;
        error: any;
    }> {
        try {
            const { data, error } = await supabase.rpc('get_all_buckets_stats');

            if (error) {
                console.error('Error getting all buckets stats:', error);
                return { data: null, error };
            }

            return { data: data || [], error: null };
        } catch (error) {
            console.error('Exception getting all buckets stats:', error);
            return { data: null, error };
        }
    }

    /**
     * Search files in a bucket by name pattern
     */
    async searchFiles(
        params: SearchFilesParams
    ): Promise<{ data: FileSearchResult[] | null; error: any }> {
        try {
            const { data, error } = await supabase.rpc('search_files', {
                p_bucket_id: params.bucketId,
                p_search_pattern: params.searchPattern,
                p_limit: params.limit || 50,
            });

            if (error) {
                console.error('Error searching files:', error);
                return { data: null, error };
            }

            return { data: data || [], error: null };
        } catch (error) {
            console.error('Exception searching files:', error);
            return { data: null, error };
        }
    }

    /**
     * Get recent files from bucket(s)
     */
    async getRecentFiles(
        params: GetRecentFilesParams = {}
    ): Promise<{ data: RecentFile[] | null; error: any }> {
        try {
            const { data, error } = await supabase.rpc('get_recent_files', {
                p_bucket_id: params.bucketId || null,
                p_user_id: params.userId || null,
                p_limit: params.limit || 20,
            });

            if (error) {
                console.error('Error getting recent files:', error);
                return { data: null, error };
            }

            return { data: data || [], error: null };
        } catch (error) {
            console.error('Exception getting recent files:', error);
            return { data: null, error };
        }
    }

    /**
     * Get user's storage activity/audit log
     */
    async getUserActivity(
        params: GetUserActivityParams
    ): Promise<{ data: UserStorageActivity[] | null; error: any }> {
        try {
            const { data, error } = await supabase.rpc('get_user_activity', {
                p_user_id: params.userId,
                p_days: params.days || 30,
                p_limit: params.limit || 100,
            });

            if (error) {
                console.error('Error getting user activity:', error);
                return { data: null, error };
            }

            return { data: data || [], error: null };
        } catch (error) {
            console.error('Exception getting user activity:', error);
            return { data: null, error };
        }
    }

    /**
     * Cleanup old temporary files
     */
    async cleanupTempFiles(
        options: CleanupOptions = {}
    ): Promise<CleanupResult> {
        try {
            const { data, error } = await supabase.rpc('cleanup_old_temp_files', {
                days_old: options.daysOld || 7,
            });

            if (error) {
                console.error('Error cleaning up temp files:', error);
                return { deletedCount: 0, success: false, error: error.message };
            }

            return { deletedCount: data || 0, success: true };
        } catch (error: any) {
            console.error('Exception cleaning up temp files:', error);
            return {
                deletedCount: 0,
                success: false,
                error: error.message || 'Cleanup failed',
            };
        }
    }

    /**
     * Cleanup orphaned profile photos
     */
    async cleanupOrphanedProfilePhotos(): Promise<CleanupResult> {
        try {
            const { data, error } = await supabase.rpc(
                'cleanup_orphaned_profile_photos'
            );

            if (error) {
                console.error('Error cleaning up orphaned profile photos:', error);
                return { deletedCount: 0, success: false, error: error.message };
            }

            return { deletedCount: data || 0, success: true };
        } catch (error: any) {
            console.error('Exception cleaning up orphaned profile photos:', error);
            return {
                deletedCount: 0,
                success: false,
                error: error.message || 'Cleanup failed',
            };
        }
    }

    /**
     * Cleanup orphaned vehicle photos
     */
    async cleanupOrphanedVehiclePhotos(): Promise<CleanupResult> {
        try {
            const { data, error } = await supabase.rpc(
                'cleanup_orphaned_vehicle_photos'
            );

            if (error) {
                console.error('Error cleaning up orphaned vehicle photos:', error);
                return { deletedCount: 0, success: false, error: error.message };
            }

            return { deletedCount: data || 0, success: true };
        } catch (error: any) {
            console.error('Exception cleaning up orphaned vehicle photos:', error);
            return {
                deletedCount: 0,
                success: false,
                error: error.message || 'Cleanup failed',
            };
        }
    }

    // ========================================================================
    // Document Management Functions
    // ========================================================================

    /**
     * Update user profile photo in database
     */
    async updateUserProfilePhoto(
        userId: string,
        photoUrl: string
    ): Promise<{ success: boolean; error?: any }> {
        try {
            const { data, error } = await supabase.rpc('update_user_profile_photo', {
                p_user_id: userId,
                p_photo_url: photoUrl,
            });

            if (error) {
                console.error('Error updating profile photo:', error);
                return { success: false, error };
            }

            return { success: data || false };
        } catch (error) {
            console.error('Exception updating profile photo:', error);
            return { success: false, error };
        }
    }

    /**
     * Get user profile photo URL
     */
    async getUserProfilePhoto(
        userId: string
    ): Promise<{ data: string | null; error?: any }> {
        try {
            const { data, error } = await supabase.rpc('get_user_profile_photo', {
                p_user_id: userId,
            });

            if (error) {
                console.error('Error getting profile photo:', error);
                return { data: null, error };
            }

            return { data: data || null };
        } catch (error) {
            console.error('Exception getting profile photo:', error);
            return { data: null, error };
        }
    }

    /**
     * Update driver license information
     */
    async updateDriverLicense(
        params: UpdateDriverLicenseParams
    ): Promise<{ success: boolean; error?: any }> {
        try {
            const { data, error } = await supabase.rpc('update_driver_license', {
                p_user_id: params.userId,
                p_license_photo: params.licensePhoto,
                p_license_number: params.licenseNumber || null,
            });

            if (error) {
                console.error('Error updating driver license:', error);
                return { success: false, error };
            }

            return { success: data || false };
        } catch (error) {
            console.error('Exception updating driver license:', error);
            return { success: false, error };
        }
    }

    /**
     * Update driver vehicle photos
     */
    async updateDriverVehiclePhotos(
        params: UpdateVehiclePhotosParams
    ): Promise<{ success: boolean; error?: any }> {
        try {
            const { data, error } = await supabase.rpc(
                'update_driver_vehicle_photos',
                {
                    p_user_id: params.userId,
                    p_vehicle_photos: params.vehiclePhotos,
                }
            );

            if (error) {
                console.error('Error updating vehicle photos:', error);
                return { success: false, error };
            }

            return { success: data || false };
        } catch (error) {
            console.error('Exception updating vehicle photos:', error);
            return { success: false, error };
        }
    }

    /**
     * Add a vehicle photo to driver
     */
    async addDriverVehiclePhoto(
        params: AddVehiclePhotoParams
    ): Promise<{ success: boolean; error?: any }> {
        try {
            const { data, error } = await supabase.rpc('add_driver_vehicle_photo', {
                p_user_id: params.userId,
                p_photo_url: params.photoUrl,
            });

            if (error) {
                console.error('Error adding vehicle photo:', error);
                return { success: false, error };
            }

            return { success: data || false };
        } catch (error) {
            console.error('Exception adding vehicle photo:', error);
            return { success: false, error };
        }
    }

    /**
     * Remove a vehicle photo from driver
     */
    async removeDriverVehiclePhoto(
        params: RemoveVehiclePhotoParams
    ): Promise<{ success: boolean; error?: any }> {
        try {
            const { data, error } = await supabase.rpc(
                'remove_driver_vehicle_photo',
                {
                    p_user_id: params.userId,
                    p_photo_url: params.photoUrl,
                }
            );

            if (error) {
                console.error('Error removing vehicle photo:', error);
                return { success: false, error };
            }

            return { success: data || false };
        } catch (error) {
            console.error('Exception removing vehicle photo:', error);
            return { success: false, error };
        }
    }

    /**
     * Get driver documents
     */
    async getDriverDocuments(
        userId: string
    ): Promise<{ data: DriverDocuments | null; error?: any }> {
        try {
            const { data, error } = await supabase.rpc('get_driver_documents', {
                p_user_id: userId,
            });

            if (error) {
                console.error('Error getting driver documents:', error);
                return { data: null, error };
            }

            return { data: data?.[0] || null };
        } catch (error) {
            console.error('Exception getting driver documents:', error);
            return { data: null, error };
        }
    }
}

// Export singleton instance
export const bucketManagement = new BucketManagementService();

// Export individual functions for convenience
export const {
    getUserStorageUsage,
    getTotalStorageUsage,
    getBucketStats,
    getAllBucketsStats,
    searchFiles,
    getRecentFiles,
    getUserActivity,
    cleanupTempFiles,
    cleanupOrphanedProfilePhotos,
    cleanupOrphanedVehiclePhotos,
    updateUserProfilePhoto,
    getUserProfilePhoto,
    updateDriverLicense,
    updateDriverVehiclePhotos,
    addDriverVehiclePhoto,
    removeDriverVehiclePhoto,
    getDriverDocuments,
} = bucketManagement;
