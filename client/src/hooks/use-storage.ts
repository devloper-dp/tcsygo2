import { useState } from 'react';
import { useToast } from './use-toast';
import {
    uploadFile,
    uploadFiles,
    deleteFile,
    uploadProfilePhoto,
    uploadLicensePhoto,
    uploadVehiclePhotos,
    uploadDocument,
    validateFile,
    type BucketName,
    type UploadResult,
    type UploadOptions,
} from '@/lib/storage-service';

export interface UseStorageOptions {
    onSuccess?: (result: UploadResult) => void;
    onError?: (error: string) => void;
    showToast?: boolean;
}

export function useStorage(options: UseStorageOptions = {}) {
    const { toast } = useToast();
    const [uploading, setUploading] = useState(false);
    const [progress, setProgress] = useState(0);

    const showToast = options.showToast ?? true;

    const handleUpload = async (
        bucket: BucketName,
        file: File,
        path?: string,
        uploadOptions?: UploadOptions
    ): Promise<UploadResult> => {
        setUploading(true);
        setProgress(0);

        try {
            // Simulate progress (since Supabase doesn't provide real-time progress)
            const progressInterval = setInterval(() => {
                setProgress((prev) => Math.min(prev + 10, 90));
            }, 100);

            const result = await uploadFile(bucket, file, path, uploadOptions);

            clearInterval(progressInterval);
            setProgress(100);

            if (result.success) {
                if (showToast) {
                    toast({
                        title: 'Upload successful',
                        description: 'File uploaded successfully',
                    });
                }
                options.onSuccess?.(result);
            } else {
                if (showToast) {
                    toast({
                        title: 'Upload failed',
                        description: result.error || 'Failed to upload file',
                        variant: 'destructive',
                    });
                }
                options.onError?.(result.error || 'Upload failed');
            }

            return result;
        } catch (error: any) {
            const errorMessage = error.message || 'Upload failed';
            if (showToast) {
                toast({
                    title: 'Upload failed',
                    description: errorMessage,
                    variant: 'destructive',
                });
            }
            options.onError?.(errorMessage);
            return { success: false, error: errorMessage };
        } finally {
            setUploading(false);
            setTimeout(() => setProgress(0), 1000);
        }
    };

    const handleMultipleUpload = async (
        bucket: BucketName,
        files: File[],
        pathPrefix?: string,
        uploadOptions?: UploadOptions
    ): Promise<UploadResult[]> => {
        setUploading(true);
        setProgress(0);

        try {
            const results = await uploadFiles(bucket, files, pathPrefix, uploadOptions);

            const successCount = results.filter(r => r.success).length;
            const failCount = results.length - successCount;

            if (showToast) {
                if (failCount === 0) {
                    toast({
                        title: 'Upload successful',
                        description: `${successCount} file(s) uploaded successfully`,
                    });
                } else if (successCount === 0) {
                    toast({
                        title: 'Upload failed',
                        description: `Failed to upload ${failCount} file(s)`,
                        variant: 'destructive',
                    });
                } else {
                    toast({
                        title: 'Partial upload',
                        description: `${successCount} uploaded, ${failCount} failed`,
                        variant: 'default',
                    });
                }
            }

            return results;
        } catch (error: any) {
            const errorMessage = error.message || 'Upload failed';
            if (showToast) {
                toast({
                    title: 'Upload failed',
                    description: errorMessage,
                    variant: 'destructive',
                });
            }
            return [];
        } finally {
            setUploading(false);
            setProgress(0);
        }
    };

    const handleDelete = async (
        bucket: BucketName,
        path: string
    ): Promise<boolean> => {
        try {
            const result = await deleteFile(bucket, path);

            if (result.success) {
                if (showToast) {
                    toast({
                        title: 'Delete successful',
                        description: 'File deleted successfully',
                    });
                }
                return true;
            } else {
                if (showToast) {
                    toast({
                        title: 'Delete failed',
                        description: result.error || 'Failed to delete file',
                        variant: 'destructive',
                    });
                }
                return false;
            }
        } catch (error: any) {
            if (showToast) {
                toast({
                    title: 'Delete failed',
                    description: error.message || 'Failed to delete file',
                    variant: 'destructive',
                });
            }
            return false;
        }
    };

    return {
        uploading,
        progress,
        uploadFile: handleUpload,
        uploadFiles: handleMultipleUpload,
        deleteFile: handleDelete,
        validateFile,
    };
}

// Specialized hooks for specific use cases

export function useProfilePhotoUpload(userId: string, options: UseStorageOptions = {}) {
    const { toast } = useToast();
    const [uploading, setUploading] = useState(false);

    const upload = async (file: File): Promise<UploadResult> => {
        setUploading(true);

        try {
            const result = await uploadProfilePhoto(userId, file);

            if (result.success) {
                toast({
                    title: 'Profile photo updated',
                    description: 'Your profile photo has been updated successfully',
                });
                options.onSuccess?.(result);
            } else {
                toast({
                    title: 'Upload failed',
                    description: result.error || 'Failed to upload profile photo',
                    variant: 'destructive',
                });
                options.onError?.(result.error || 'Upload failed');
            }

            return result;
        } catch (error: any) {
            const errorMessage = error.message || 'Upload failed';
            toast({
                title: 'Upload failed',
                description: errorMessage,
                variant: 'destructive',
            });
            options.onError?.(errorMessage);
            return { success: false, error: errorMessage };
        } finally {
            setUploading(false);
        }
    };

    return { upload, uploading };
}

export function useLicensePhotoUpload(userId: string, options: UseStorageOptions = {}) {
    const { toast } = useToast();
    const [uploading, setUploading] = useState(false);

    const upload = async (file: File): Promise<UploadResult> => {
        setUploading(true);

        try {
            const result = await uploadLicensePhoto(userId, file);

            if (result.success) {
                toast({
                    title: 'License uploaded',
                    description: 'Your license document has been uploaded successfully',
                });
                options.onSuccess?.(result);
            } else {
                toast({
                    title: 'Upload failed',
                    description: result.error || 'Failed to upload license',
                    variant: 'destructive',
                });
                options.onError?.(result.error || 'Upload failed');
            }

            return result;
        } catch (error: any) {
            const errorMessage = error.message || 'Upload failed';
            toast({
                title: 'Upload failed',
                description: errorMessage,
                variant: 'destructive',
            });
            options.onError?.(errorMessage);
            return { success: false, error: errorMessage };
        } finally {
            setUploading(false);
        }
    };

    return { upload, uploading };
}

export function useVehiclePhotosUpload(userId: string, options: UseStorageOptions = {}) {
    const { toast } = useToast();
    const [uploading, setUploading] = useState(false);
    const [progress, setProgress] = useState(0);

    const upload = async (files: File[]): Promise<UploadResult[]> => {
        setUploading(true);
        setProgress(0);

        try {
            const results = await uploadVehiclePhotos(userId, files);

            const successCount = results.filter(r => r.success).length;
            const failCount = results.length - successCount;

            if (failCount === 0) {
                toast({
                    title: 'Photos uploaded',
                    description: `${successCount} vehicle photo(s) uploaded successfully`,
                });
            } else if (successCount === 0) {
                toast({
                    title: 'Upload failed',
                    description: `Failed to upload ${failCount} photo(s)`,
                    variant: 'destructive',
                });
            } else {
                toast({
                    title: 'Partial upload',
                    description: `${successCount} uploaded, ${failCount} failed`,
                });
            }

            return results;
        } catch (error: any) {
            const errorMessage = error.message || 'Upload failed';
            toast({
                title: 'Upload failed',
                description: errorMessage,
                variant: 'destructive',
            });
            return [];
        } finally {
            setUploading(false);
            setProgress(0);
        }
    };

    return { upload, uploading, progress };
}

export function useDocumentUpload(userId: string, options: UseStorageOptions = {}) {
    const { toast } = useToast();
    const [uploading, setUploading] = useState(false);

    const upload = async (file: File, documentType: string): Promise<UploadResult> => {
        setUploading(true);

        try {
            const result = await uploadDocument(userId, file, documentType);

            if (result.success) {
                toast({
                    title: 'Document uploaded',
                    description: 'Your document has been uploaded successfully',
                });
                options.onSuccess?.(result);
            } else {
                toast({
                    title: 'Upload failed',
                    description: result.error || 'Failed to upload document',
                    variant: 'destructive',
                });
                options.onError?.(result.error || 'Upload failed');
            }

            return result;
        } catch (error: any) {
            const errorMessage = error.message || 'Upload failed';
            toast({
                title: 'Upload failed',
                description: errorMessage,
                variant: 'destructive',
            });
            options.onError?.(errorMessage);
            return { success: false, error: errorMessage };
        } finally {
            setUploading(false);
        }
    };

    return { upload, uploading };
}
