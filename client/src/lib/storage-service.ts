import { supabase } from './supabase';

/**
 * Storage Service for Supabase Buckets
 * Handles file uploads, downloads, and management for various buckets
 */

export interface UploadOptions {
    upsert?: boolean;
    cacheControl?: string;
    contentType?: string;
}

export interface UploadResult {
    success: boolean;
    url?: string;
    path?: string;
    error?: string;
}

// Bucket names used in the application
export const BUCKETS = {
    PROFILE_PHOTOS: 'profile-photos',
    LICENSES: 'licenses',
    VEHICLES: 'vehicles',
    DOCUMENTS: 'documents',
    RECEIPTS: 'receipts',
    SAFETY_MEDIA: 'safety-media',
} as const;

export type BucketName = typeof BUCKETS[keyof typeof BUCKETS];

/**
 * Upload a file to a Supabase storage bucket
 */
export async function uploadFile(
    bucket: BucketName,
    file: File,
    path?: string,
    options: UploadOptions = {}
): Promise<UploadResult> {
    try {
        // Validate file
        if (!file) {
            return { success: false, error: 'No file provided' };
        }

        // Generate file path if not provided
        const fileExt = file.name.split('.').pop();
        const fileName = path || `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = fileName.startsWith('/') ? fileName.substring(1) : fileName;

        // Upload file
        const { data, error: uploadError } = await supabase.storage
            .from(bucket)
            .upload(filePath, file, {
                upsert: options.upsert ?? false,
                cacheControl: options.cacheControl ?? '3600',
                contentType: options.contentType ?? file.type,
            });

        if (uploadError) {
            console.error('Upload error:', uploadError);
            return { success: false, error: uploadError.message };
        }

        // Get public URL
        const { data: urlData } = supabase.storage
            .from(bucket)
            .getPublicUrl(filePath);

        return {
            success: true,
            url: urlData.publicUrl,
            path: filePath,
        };
    } catch (error: any) {
        console.error('Upload failed:', error);
        return { success: false, error: error.message || 'Upload failed' };
    }
}

/**
 * Upload multiple files to a bucket
 */
export async function uploadFiles(
    bucket: BucketName,
    files: File[],
    pathPrefix?: string,
    options: UploadOptions = {}
): Promise<UploadResult[]> {
    const results: UploadResult[] = [];

    for (const file of files) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${pathPrefix ? pathPrefix + '/' : ''}${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const result = await uploadFile(bucket, file, fileName, options);
        results.push(result);
    }

    return results;
}

/**
 * Delete a file from a bucket
 */
export async function deleteFile(
    bucket: BucketName,
    path: string
): Promise<{ success: boolean; error?: string }> {
    try {
        const { error } = await supabase.storage
            .from(bucket)
            .remove([path]);

        if (error) {
            console.error('Delete error:', error);
            return { success: false, error: error.message };
        }

        return { success: true };
    } catch (error: any) {
        console.error('Delete failed:', error);
        return { success: false, error: error.message || 'Delete failed' };
    }
}

/**
 * Delete multiple files from a bucket
 */
export async function deleteFiles(
    bucket: BucketName,
    paths: string[]
): Promise<{ success: boolean; error?: string }> {
    try {
        const { error } = await supabase.storage
            .from(bucket)
            .remove(paths);

        if (error) {
            console.error('Delete error:', error);
            return { success: false, error: error.message };
        }

        return { success: true };
    } catch (error: any) {
        console.error('Delete failed:', error);
        return { success: false, error: error.message || 'Delete failed' };
    }
}

/**
 * Get public URL for a file
 */
export function getPublicUrl(bucket: BucketName, path: string): string {
    const { data } = supabase.storage
        .from(bucket)
        .getPublicUrl(path);

    return data.publicUrl;
}

/**
 * Download a file from a bucket
 */
export async function downloadFile(
    bucket: BucketName,
    path: string
): Promise<{ success: boolean; data?: Blob; error?: string }> {
    try {
        const { data, error } = await supabase.storage
            .from(bucket)
            .download(path);

        if (error) {
            console.error('Download error:', error);
            return { success: false, error: error.message };
        }

        return { success: true, data };
    } catch (error: any) {
        console.error('Download failed:', error);
        return { success: false, error: error.message || 'Download failed' };
    }
}

/**
 * List files in a bucket folder
 */
export async function listFiles(
    bucket: BucketName,
    folder?: string,
    options?: {
        limit?: number;
        offset?: number;
        sortBy?: { column: string; order: 'asc' | 'desc' };
    }
) {
    try {
        const { data, error } = await supabase.storage
            .from(bucket)
            .list(folder, options);

        if (error) {
            console.error('List error:', error);
            return { success: false, error: error.message, files: [] };
        }

        return { success: true, files: data };
    } catch (error: any) {
        console.error('List failed:', error);
        return { success: false, error: error.message || 'List failed', files: [] };
    }
}

/**
 * Move/rename a file within a bucket
 */
export async function moveFile(
    bucket: BucketName,
    fromPath: string,
    toPath: string
): Promise<{ success: boolean; error?: string }> {
    try {
        const { error } = await supabase.storage
            .from(bucket)
            .move(fromPath, toPath);

        if (error) {
            console.error('Move error:', error);
            return { success: false, error: error.message };
        }

        return { success: true };
    } catch (error: any) {
        console.error('Move failed:', error);
        return { success: false, error: error.message || 'Move failed' };
    }
}

/**
 * Create a signed URL for temporary access to a private file
 */
export async function createSignedUrl(
    bucket: BucketName,
    path: string,
    expiresIn: number = 3600 // Default 1 hour
): Promise<{ success: boolean; url?: string; error?: string }> {
    try {
        const { data, error } = await supabase.storage
            .from(bucket)
            .createSignedUrl(path, expiresIn);

        if (error) {
            console.error('Signed URL error:', error);
            return { success: false, error: error.message };
        }

        return { success: true, url: data.signedUrl };
    } catch (error: any) {
        console.error('Signed URL failed:', error);
        return { success: false, error: error.message || 'Signed URL creation failed' };
    }
}

/**
 * Validate file before upload
 */
export function validateFile(
    file: File,
    options: {
        maxSize?: number; // in bytes
        allowedTypes?: string[];
    } = {}
): { valid: boolean; error?: string } {
    const { maxSize = 5 * 1024 * 1024, allowedTypes = ['image/*'] } = options;

    // Check file size
    if (file.size > maxSize) {
        return {
            valid: false,
            error: `File size exceeds ${(maxSize / 1024 / 1024).toFixed(0)}MB limit`,
        };
    }

    // Check file type
    const fileType = file.type;
    const isAllowed = allowedTypes.some(type => {
        if (type.endsWith('/*')) {
            const category = type.split('/')[0];
            return fileType.startsWith(category + '/');
        }
        return fileType === type;
    });

    if (!isAllowed) {
        return {
            valid: false,
            error: `File type ${fileType} is not allowed`,
        };
    }

    return { valid: true };
}

/**
 * Helper function to upload profile photo
 */
export async function uploadProfilePhoto(
    userId: string,
    file: File
): Promise<UploadResult> {
    const validation = validateFile(file, {
        maxSize: 5 * 1024 * 1024,
        allowedTypes: ['image/*'],
    });

    if (!validation.valid) {
        return { success: false, error: validation.error };
    }

    const fileExt = file.name.split('.').pop();
    const fileName = `avatars/${userId}-${Date.now()}.${fileExt}`;

    return uploadFile(BUCKETS.PROFILE_PHOTOS, file, fileName, { upsert: true });
}

/**
 * Helper function to upload license photo
 */
export async function uploadLicensePhoto(
    userId: string,
    file: File
): Promise<UploadResult> {
    const validation = validateFile(file, {
        maxSize: 10 * 1024 * 1024,
        allowedTypes: ['image/*', 'application/pdf'],
    });

    if (!validation.valid) {
        return { success: false, error: validation.error };
    }

    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}-${Date.now()}.${fileExt}`;

    return uploadFile(BUCKETS.LICENSES, file, fileName);
}

/**
 * Helper function to upload vehicle photos
 */
export async function uploadVehiclePhotos(
    userId: string,
    files: File[]
): Promise<UploadResult[]> {
    const results: UploadResult[] = [];

    for (const file of files) {
        const validation = validateFile(file, {
            maxSize: 10 * 1024 * 1024,
            allowedTypes: ['image/*'],
        });

        if (!validation.valid) {
            results.push({ success: false, error: validation.error });
            continue;
        }

        const fileExt = file.name.split('.').pop();
        const fileName = `${userId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const result = await uploadFile(BUCKETS.VEHICLES, file, fileName);
        results.push(result);
    }

    return results;
}

/**
 * Helper function to upload document
 */
export async function uploadDocument(
    userId: string,
    file: File,
    documentType: string
): Promise<UploadResult> {
    const validation = validateFile(file, {
        maxSize: 10 * 1024 * 1024,
        allowedTypes: ['image/*', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    });

    if (!validation.valid) {
        return { success: false, error: validation.error };
    }

    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}/${documentType}-${Date.now()}.${fileExt}`;

    return uploadFile(BUCKETS.DOCUMENTS, file, fileName);
}

/**
 * Helper function to upload payment receipt
 */
export async function uploadReceipt(
    userId: string,
    file: File,
    paymentId: string
): Promise<UploadResult> {
    const validation = validateFile(file, {
        maxSize: 5 * 1024 * 1024,
        allowedTypes: ['image/*', 'application/pdf'],
    });

    if (!validation.valid) {
        return { success: false, error: validation.error };
    }

    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}/receipt-${paymentId}-${Date.now()}.${fileExt}`;

    return uploadFile(BUCKETS.RECEIPTS, file, fileName);
}

/**
 * Helper function to upload safety media (photos/videos during SOS)
 */
export async function uploadSafetyMedia(
    userId: string,
    file: File,
    tripId: string
): Promise<UploadResult> {
    const validation = validateFile(file, {
        maxSize: 50 * 1024 * 1024, // 50MB for videos
        allowedTypes: ['image/*', 'video/*'],
    });

    if (!validation.valid) {
        return { success: false, error: validation.error };
    }

    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}/${tripId}/safety-${Date.now()}.${fileExt}`;

    return uploadFile(BUCKETS.SAFETY_MEDIA, file, fileName);
}

/**
 * Helper function to upload multiple safety media files
 */
export async function uploadSafetyMediaBatch(
    userId: string,
    files: File[],
    tripId: string
): Promise<UploadResult[]> {
    const results: UploadResult[] = [];

    for (const file of files) {
        const result = await uploadSafetyMedia(userId, file, tripId);
        results.push(result);
    }

    return results;
}

// ============================================================================
// Advanced Storage Operations
// ============================================================================

/**
 * Batch upload files with progress tracking
 */
export async function batchUploadFiles(
    bucket: BucketName,
    files: File[],
    pathPrefix?: string,
    options: UploadOptions = {},
    onProgress?: (completed: number, total: number) => void
): Promise<{
    successful: number;
    failed: number;
    results: UploadResult[];
}> {
    const results: UploadResult[] = [];
    let successful = 0;
    let failed = 0;

    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileExt = file.name.split('.').pop();
        const fileName = `${pathPrefix ? pathPrefix + '/' : ''}${Date.now()}-${i}.${fileExt}`;

        const result = await uploadFile(bucket, file, fileName, options);
        results.push(result);

        if (result.success) {
            successful++;
        } else {
            failed++;
        }

        if (onProgress) {
            onProgress(i + 1, files.length);
        }
    }

    return { successful, failed, results };
}

/**
 * Batch delete files from bucket
 */
export async function batchDeleteFiles(
    bucket: BucketName,
    paths: string[]
): Promise<{
    successful: number;
    failed: number;
    errors: string[];
}> {
    const errors: string[] = [];
    let successful = 0;
    let failed = 0;

    // Delete in chunks of 10 to avoid overwhelming the API
    const chunkSize = 10;
    for (let i = 0; i < paths.length; i += chunkSize) {
        const chunk = paths.slice(i, i + chunkSize);
        const result = await deleteFiles(bucket, chunk);

        if (result.success) {
            successful += chunk.length;
        } else {
            failed += chunk.length;
            if (result.error) {
                errors.push(result.error);
            }
        }
    }

    return { successful, failed, errors };
}

/**
 * Search files across all buckets by pattern
 */
export async function searchFilesAcrossBuckets(
    searchPattern: string,
    buckets?: BucketName[]
): Promise<{
    success: boolean;
    results: Array<{ bucket: BucketName; files: any[] }>;
    error?: string;
}> {
    const bucketsToSearch = buckets || Object.values(BUCKETS);
    const results: Array<{ bucket: BucketName; files: any[] }> = [];

    try {
        for (const bucket of bucketsToSearch) {
            const { files } = await listFiles(bucket);
            const matchingFiles = files.filter((file: any) =>
                file.name.toLowerCase().includes(searchPattern.toLowerCase())
            );

            if (matchingFiles.length > 0) {
                results.push({ bucket, files: matchingFiles });
            }
        }

        return { success: true, results };
    } catch (error: any) {
        console.error('Search across buckets failed:', error);
        return {
            success: false,
            results: [],
            error: error.message || 'Search failed',
        };
    }
}

/**
 * Get storage quota information for user
 */
export async function getStorageQuota(
    userId: string,
    quotaLimit: number = 100 * 1024 * 1024 // 100MB default
): Promise<{
    used: number;
    limit: number;
    remaining: number;
    percentUsed: number;
    warning?: { level: string; message: string };
}> {
    try {
        // Get user's total storage usage
        const { data: usageData } = await supabase.rpc('get_user_total_storage', {
            p_user_id: userId,
        });

        const used = usageData?.[0]?.total_size_bytes || 0;
        const remaining = Math.max(0, quotaLimit - used);
        const percentUsed = (used / quotaLimit) * 100;

        let warning;
        if (percentUsed >= 90) {
            warning = {
                level: 'critical',
                message: 'Storage almost full! Please delete some files.',
            };
        } else if (percentUsed >= 75) {
            warning = {
                level: 'warning',
                message: 'Storage is running low. Consider cleaning up old files.',
            };
        } else if (percentUsed >= 50) {
            warning = {
                level: 'info',
                message: 'You have used half of your storage quota.',
            };
        }

        return {
            used,
            limit: quotaLimit,
            remaining,
            percentUsed: Math.round(percentUsed * 100) / 100,
            warning,
        };
    } catch (error) {
        console.error('Failed to get storage quota:', error);
        return {
            used: 0,
            limit: quotaLimit,
            remaining: quotaLimit,
            percentUsed: 0,
        };
    }
}

/**
 * Log storage action for audit trail
 */
export async function logStorageAction(
    bucketId: BucketName,
    objectName: string,
    action: 'upload' | 'download' | 'delete' | 'update',
    userId?: string
): Promise<{ success: boolean; error?: string }> {
    try {
        const { error } = await supabase.rpc('log_action', {
            p_bucket_id: bucketId,
            p_object_name: objectName,
            p_action: action,
            p_user_id: userId || null,
        });

        if (error) {
            console.error('Failed to log storage action:', error);
            return { success: false, error: error.message };
        }

        return { success: true };
    } catch (error: any) {
        console.error('Exception logging storage action:', error);
        return { success: false, error: error.message || 'Logging failed' };
    }
}

/**
 * Get file metadata including size and type
 */
export async function getFileMetadata(
    bucket: BucketName,
    path: string
): Promise<{
    success: boolean;
    metadata?: {
        name: string;
        size: number;
        mimeType: string;
        lastModified: string;
        cacheControl: string;
    };
    error?: string;
}> {
    try {
        const { data, error } = await supabase.storage
            .from(bucket)
            .list(path.substring(0, path.lastIndexOf('/')), {
                limit: 1,
                search: path.substring(path.lastIndexOf('/') + 1),
            });

        if (error) {
            return { success: false, error: error.message };
        }

        if (!data || data.length === 0) {
            return { success: false, error: 'File not found' };
        }

        const file = data[0];
        return {
            success: true,
            metadata: {
                name: file.name,
                size: file.metadata?.size || 0,
                mimeType: file.metadata?.mimetype || 'application/octet-stream',
                lastModified: file.updated_at || file.created_at,
                cacheControl: file.metadata?.cacheControl || '3600',
            },
        };
    } catch (error: any) {
        console.error('Failed to get file metadata:', error);
        return { success: false, error: error.message || 'Failed to get metadata' };
    }
}

/**
 * Copy file from one location to another within the same bucket
 */
export async function copyFile(
    bucket: BucketName,
    fromPath: string,
    toPath: string
): Promise<{ success: boolean; error?: string }> {
    try {
        // Download the file
        const { data: fileData, error: downloadError } = await supabase.storage
            .from(bucket)
            .download(fromPath);

        if (downloadError || !fileData) {
            return { success: false, error: downloadError?.message || 'Download failed' };
        }

        // Upload to new location
        const { error: uploadError } = await supabase.storage
            .from(bucket)
            .upload(toPath, fileData);

        if (uploadError) {
            return { success: false, error: uploadError.message };
        }

        return { success: true };
    } catch (error: any) {
        console.error('Copy file failed:', error);
        return { success: false, error: error.message || 'Copy failed' };
    }
}

