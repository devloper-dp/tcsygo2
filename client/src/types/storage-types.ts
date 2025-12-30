/**
 * Storage Types
 * Comprehensive TypeScript types for Supabase storage operations
 */

// ============================================================================
// Storage Usage Types
// ============================================================================

export interface StorageUsageByBucket {
    bucketId: string;
    fileCount: number;
    totalSizeBytes: number;
    totalSizeFormatted: string;
}

export interface TotalStorageUsage {
    totalFiles: number;
    totalSizeBytes: number;
    totalSizeFormatted: string;
}

export interface BucketStatistics {
    bucketId: string;
    bucketName: string;
    isPublic: boolean;
    totalFiles: number;
    totalSizeBytes: number;
    totalSizeFormatted: string;
}

export interface DetailedBucketStats {
    bucketId: string;
    totalFiles: number;
    totalSizeBytes: number;
    totalSizeFormatted: string;
    avgFileSizeBytes: number;
    largestFileBytes: number;
    smallestFileBytes: number;
}

// ============================================================================
// File Search Types
// ============================================================================

export interface FileSearchResult {
    id: string;
    name: string;
    bucketId: string;
    owner: string;
    createdAt: string;
    updatedAt: string;
    sizeBytes: number;
    sizeFormatted: string;
}

export interface RecentFile {
    id: string;
    name: string;
    bucketId: string;
    owner: string;
    createdAt: string;
    sizeBytes: number;
    sizeFormatted: string;
}

export interface SearchFilesParams {
    bucketId: string;
    searchPattern: string;
    limit?: number;
}

export interface GetRecentFilesParams {
    bucketId?: string;
    userId?: string;
    limit?: number;
}

// ============================================================================
// Storage Audit Types
// ============================================================================

export interface StorageAuditLog {
    id: string;
    bucketId: string;
    objectName: string;
    action: 'upload' | 'download' | 'delete' | 'update';
    userId: string;
    ipAddress?: string;
    userAgent?: string;
    createdAt: string;
}

export interface UserStorageActivity {
    action: string;
    bucketId: string;
    objectName: string;
    createdAt: string;
}

export interface GetUserActivityParams {
    userId: string;
    days?: number;
    limit?: number;
}

// ============================================================================
// Document Management Types
// ============================================================================

export interface DriverDocuments {
    licenseNumber: string;
    licensePhoto: string;
    vehiclePhotos: string[];
    verificationStatus: 'pending' | 'approved' | 'rejected';
}

export interface UpdateDriverLicenseParams {
    userId: string;
    licensePhoto: string;
    licenseNumber?: string;
}

export interface UpdateVehiclePhotosParams {
    userId: string;
    vehiclePhotos: string[];
}

export interface AddVehiclePhotoParams {
    userId: string;
    photoUrl: string;
}

export interface RemoveVehiclePhotoParams {
    userId: string;
    photoUrl: string;
}

// ============================================================================
// Cleanup Types
// ============================================================================

export interface CleanupResult {
    deletedCount: number;
    success: boolean;
    error?: string;
}

export interface CleanupOptions {
    daysOld?: number;
}

// ============================================================================
// Batch Operations Types
// ============================================================================

export interface BatchUploadResult {
    successful: number;
    failed: number;
    results: Array<{
        file: string;
        success: boolean;
        url?: string;
        error?: string;
    }>;
}

export interface BatchDeleteResult {
    successful: number;
    failed: number;
    errors: string[];
}

// ============================================================================
// Storage Quota Types
// ============================================================================

export interface StorageQuota {
    used: number;
    limit: number;
    remaining: number;
    percentUsed: number;
}

export interface QuotaWarning {
    level: 'info' | 'warning' | 'critical';
    message: string;
    percentUsed: number;
}
