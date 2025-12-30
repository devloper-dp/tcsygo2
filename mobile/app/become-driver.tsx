import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, ScrollView, TouchableOpacity, Image, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { decode } from 'base64-arraybuffer';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { z } from 'zod';

const DRAFT_STORAGE_KEY = 'driver_onboarding_draft';

const licenseSchema = z.object({
    licenseNumber: z.string().min(5, 'Invalid license number'),
    licensePhoto: z.string().min(1, 'License photo is required')
});

const vehicleSchema = z.object({
    vehicleMake: z.string().min(2, 'Make is required'),
    vehicleModel: z.string().min(2, 'Model is required'),
    vehicleYear: z.string().regex(/^\d{4}$/, 'Invalid year'),
    vehicleColor: z.string().min(2, 'Color is required'),
    vehiclePlate: z.string().min(4, 'Invalid plate number'),
    vehiclePhotos: z.array(z.string()).min(1, 'At least one photo required')
});

export default function BecomeDriverScreen() {
    const router = useRouter();
    const { user } = useAuth();
    const [step, setStep] = useState(1);
    const [uploading, setUploading] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const [formData, setFormData] = useState({
        licenseNumber: '',
        licensePhoto: '',
        vehicleMake: '',
        vehicleModel: '',
        vehicleYear: '',
        vehicleColor: '',
        vehiclePlate: '',
        vehiclePhotos: [] as string[]
    });

    const [isDraftLoaded, setIsDraftLoaded] = useState(false);

    // Check for existing driver profile
    const { data: driverProfile, isLoading: isLoadingProfile } = useQuery({ // Added typing fix by removing <any> to infer or just let it be
        queryKey: ['driver-profile-onboarding', user?.id],
        queryFn: async () => {
            if (!user) return null;
            const { data, error } = await supabase
                .from('drivers')
                .select('*')
                .eq('user_id', user.id)
                .single();
            if (error) return null; // PostgrestError if not found
            return data;
        },
        enabled: !!user,
    });

    // Load draft on mount
    useEffect(() => {
        async function loadDraft() {
            try {
                const draft = await AsyncStorage.getItem(DRAFT_STORAGE_KEY);
                if (draft) {
                    const parsed = JSON.parse(draft);
                    setFormData(parsed.formData);
                    setStep(parsed.step || 1);
                }
            } catch (e) {
                console.error('Failed to load draft:', e);
            } finally {
                setIsDraftLoaded(true);
            }
        }
        loadDraft();
    }, []);

    if (isLoadingProfile) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" color="#3b82f6" />
            </View>
        );
    }

    if (driverProfile) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={24} color="#1f2937" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Driver Status</Text>
                    <View style={{ width: 40 }} />
                </View>
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, gap: 16 }}>
                    {driverProfile.verification_status === 'pending' ? (
                        <>
                            <Ionicons name="time-outline" size={64} color="#f59e0b" />
                            <Text style={{ fontSize: 24, fontWeight: 'bold', textAlign: 'center' }}>Application Pending</Text>
                            <Text style={{ fontSize: 16, color: '#6b7280', textAlign: 'center' }}>
                                Your driver application is currently under review. We will notify you once your verification is complete.
                            </Text>
                        </>
                    ) : driverProfile.verification_status === 'verified' ? (
                        <>
                            <Ionicons name="checkmark-circle-outline" size={64} color="#22c55e" />
                            <Text style={{ fontSize: 24, fontWeight: 'bold', textAlign: 'center' }}>You are verified!</Text>
                            <Text style={{ fontSize: 16, color: '#6b7280', textAlign: 'center' }}>
                                You can now start accepting rides and earning money.
                            </Text>
                            <TouchableOpacity
                                style={styles.nextBtn}
                                onPress={() => router.replace('/(tabs)/profile')}
                            >
                                <Text style={styles.nextBtnText}>Go to Profile</Text>
                            </TouchableOpacity>
                        </>
                    ) : (
                        <>
                            <Ionicons name="alert-circle-outline" size={64} color="#ef4444" />
                            <Text style={{ fontSize: 24, fontWeight: 'bold', textAlign: 'center' }}>Application Rejected</Text>
                            <Text style={{ fontSize: 16, color: '#6b7280', textAlign: 'center' }}>
                                Unfortunately your application was rejected. Please contact support for more details.
                            </Text>
                        </>
                    )}
                </View>
            </SafeAreaView>
        );
    }


    // Save draft on change
    useEffect(() => {
        if (!isDraftLoaded) return;
        async function saveDraft() {
            try {
                await AsyncStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify({
                    formData,
                    step,
                    updatedAt: new Date().toISOString()
                }));
            } catch (e) {
                console.error('Failed to save draft:', e);
            }
        }
        saveDraft();
    }, [formData, step, isDraftLoaded]);

    const clearDraft = async () => {
        try {
            await AsyncStorage.removeItem(DRAFT_STORAGE_KEY);
        } catch (e) {
            console.error('Failed to clear draft:', e);
        }
    };

    const steps = [
        { number: 1, title: 'License', icon: 'document-text-outline' },
        { number: 2, title: 'Vehicle', icon: 'car-sport-outline' },
        { number: 3, title: 'Confirm', icon: 'checkmark-done-outline' },
    ];

    const pickImage = async (field: 'license' | 'vehicle') => {
        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [4, 3],
                quality: 0.5,
                base64: true,
            });

            if (!result.canceled && result.assets[0].base64) {
                uploadImage(result.assets[0].base64, field);
            }
        } catch (error) {
            Alert.alert('Error', 'Failed to pick image');
        }
    };

    const uploadImage = async (base64: string, field: 'license' | 'vehicle') => {
        try {
            setUploading(true);
            const fileExt = 'jpg';
            const fileName = `${user?.id}/${Date.now()}.${fileExt}`;
            const bucket = field === 'license' ? 'licenses' : 'vehicles';

            // Ensure we use the correct bucket based on the field type
            // Note: 'licenses' bucket should be private, 'vehicles' public

            const { data, error } = await supabase.storage
                .from(bucket)
                .upload(fileName, decode(base64), {
                    contentType: 'image/jpeg',
                    upsert: true
                });

            if (error) {
                console.error('Supabase Upload Error:', error);
                throw new Error(error.message);
            }

            const { data: { publicUrl } } = supabase.storage
                .from(bucket)
                .getPublicUrl(fileName);

            // For private buckets like licenses, we normally wouldn't use getPublicUrl 
            // but for this MVP we might need signed URLs or just rely on RLS if public is false
            // However, the schema setup showed 'licenses' bucket as private.
            // If it's private, getPublicUrl returns a URL but it might not be accessible without a token.
            // For now, let's assume we store the path or signed URL. 
            // BUT the schema setup showed: 'vehicles' is public, 'licenses' is private.
            // We should store the path for licenses if we can't get a public URL.

            // Let's stick to the previous pattern but be robust.

            if (field === 'license') {
                // Store the path or a signed URL. For simplicity in this app structure, 
                // we'll assume the backend handles the viewing or we generate a signed URL when viewing.
                // But the UI needs to show a preview. 
                // Let's try to get a signed URL for immediate preview if it's private.

                // Check if we can get a Signed URL
                const { data: signedData, error: signedError } = await supabase.storage
                    .from(bucket)
                    .createSignedUrl(fileName, 60 * 60); // 1 hour

                if (signedData) {
                    setFormData(prev => ({ ...prev, licensePhoto: signedData.signedUrl }));
                } else {
                    // If signed URL fails (maybe bucket is actually public?), try public
                    setFormData(prev => ({ ...prev, licensePhoto: publicUrl }));
                }
            } else {
                setFormData(prev => ({ ...prev, vehiclePhotos: [...prev.vehiclePhotos, publicUrl] }));
            }

        } catch (error: any) {
            console.error("Upload failed", error);
            Alert.alert(
                'Upload Failed',
                `Could not upload image: ${error.message}. Please check your connection and try again.`
            );
            // Do NOT fallback to placeholder silently
        } finally {
            setUploading(false);
        }
    };

    const handleNext = () => {
        if (step === 1) {
            const result = licenseSchema.safeParse(formData);
            if (!result.success) {
                Alert.alert('Validation Error', result.error.errors[0].message);
                return;
            }
            setStep(2);
        } else if (step === 2) {
            const result = vehicleSchema.safeParse(formData);
            if (!result.success) {
                Alert.alert('Validation Error', result.error.errors[0].message);
                return;
            }
            setStep(3);
        } else {
            handleSubmit();
        }
    };

    const handleSubmit = async () => {
        try {
            setSubmitting(true);
            if (user?.role === 'passenger') {
                const { error: roleError } = await supabase
                    .from('users')
                    .update({ role: 'both' })
                    .eq('id', user.id);
                if (roleError) throw roleError;
            }

            const { error: driverError } = await supabase
                .from('drivers')
                .insert({
                    user_id: user?.id,
                    license_number: formData.licenseNumber,
                    license_photo: formData.licensePhoto,
                    vehicle_make: formData.vehicleMake,
                    vehicle_model: formData.vehicleModel,
                    vehicle_year: parseInt(formData.vehicleYear),
                    vehicle_color: formData.vehicleColor,
                    vehicle_plate: formData.vehiclePlate,
                    vehicle_photos: formData.vehiclePhotos,
                    verification_status: 'pending',
                    is_available: false
                });

            if (driverError) throw driverError;
            await clearDraft();

            Alert.alert(
                'Application Submitted',
                'Your profile is under review.',
                [{ text: 'OK', onPress: () => router.replace('/(tabs)/profile') }]
            );
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to submit application');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => step === 1 ? router.back() : setStep(step - 1)} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#1f2937" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Become a Driver</Text>
                <View style={{ width: 24 }} />
            </View>

            <View style={styles.stepper}>
                {steps.map((s) => (
                    <View key={s.number} style={styles.stepItem}>
                        <View style={[
                            styles.stepCircle,
                            step >= s.number ? styles.stepActive : styles.stepInactive
                        ]}>
                            <Ionicons
                                name={s.icon as any}
                                size={20}
                                color={step >= s.number ? 'white' : '#9ca3af'}
                            />
                        </View>
                        <Text style={[
                            styles.stepText,
                            step >= s.number ? styles.stepTextActive : styles.stepTextInactive
                        ]}>{s.title}</Text>
                    </View>
                ))}
                <View style={styles.progressBar}>
                    <View style={[
                        styles.progressFill,
                        { width: step === 1 ? '33%' : step === 2 ? '66%' : '100%' }
                    ]} />
                </View>
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                {step === 1 ? (
                    <View style={styles.formSection}>
                        <Text style={styles.sectionTitle}>License Information</Text>
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>License Number</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="DL-XXXXXXXX"
                                value={formData.licenseNumber}
                                onChangeText={t => setFormData({ ...formData, licenseNumber: t })}
                            />
                        </View>
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>License Photo</Text>
                            <TouchableOpacity
                                style={styles.uploadArea}
                                onPress={() => pickImage('license')}
                                disabled={uploading}
                            >
                                {formData.licensePhoto ? (
                                    <Image source={{ uri: formData.licensePhoto }} style={styles.previewImage} resizeMode="contain" />
                                ) : (
                                    <>
                                        <Ionicons name="cloud-upload-outline" size={32} color="#6b7280" />
                                        <Text style={styles.uploadText}>Tap to Upload License</Text>
                                    </>
                                )}
                                {uploading && <ActivityIndicator style={StyleSheet.absoluteFill} color="#3b82f6" />}
                            </TouchableOpacity>
                        </View>
                    </View>
                ) : step === 2 ? (
                    <View style={styles.formSection}>
                        <Text style={styles.sectionTitle}>Vehicle Information</Text>
                        <View style={styles.row}>
                            <View style={[styles.inputGroup, { flex: 1 }]}>
                                <Text style={styles.label}>Make</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Toyota"
                                    value={formData.vehicleMake}
                                    onChangeText={t => setFormData({ ...formData, vehicleMake: t })}
                                />
                            </View>
                            <View style={[styles.inputGroup, { flex: 1 }]}>
                                <Text style={styles.label}>Model</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Corolla"
                                    value={formData.vehicleModel}
                                    onChangeText={t => setFormData({ ...formData, vehicleModel: t })}
                                />
                            </View>
                        </View>
                        <View style={styles.row}>
                            <View style={[styles.inputGroup, { flex: 1 }]}>
                                <Text style={styles.label}>Year</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="2020"
                                    keyboardType="numeric"
                                    value={formData.vehicleYear}
                                    onChangeText={t => setFormData({ ...formData, vehicleYear: t })}
                                />
                            </View>
                            <View style={[styles.inputGroup, { flex: 1 }]}>
                                <Text style={styles.label}>Color</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="White"
                                    value={formData.vehicleColor}
                                    onChangeText={t => setFormData({ ...formData, vehicleColor: t })}
                                />
                            </View>
                        </View>
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>License Plate</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="KA-01-AB-1234"
                                autoCapitalize="characters"
                                value={formData.vehiclePlate}
                                onChangeText={t => setFormData({ ...formData, vehiclePlate: t })}
                            />
                        </View>
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Vehicle Photos</Text>
                            <View style={styles.photoGrid}>
                                {formData.vehiclePhotos.map((uri, idx) => (
                                    <View key={idx} style={styles.photoThumb}>
                                        <Image source={{ uri }} style={styles.thumbImage} />
                                    </View>
                                ))}
                                <TouchableOpacity
                                    style={styles.addPhotoBtn}
                                    onPress={() => pickImage('vehicle')}
                                    disabled={uploading}
                                >
                                    <Ionicons name="add" size={24} color="#6b7280" />
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                ) : (
                    <View style={styles.formSection}>
                        <Text style={styles.sectionTitle}>Final Verification</Text>
                        <View style={styles.verificationCard}>
                            <View style={styles.verificationItem}>
                                <Ionicons name="checkmark-circle" size={24} color="#10b981" />
                                <Text style={styles.verificationText}>License Information Provided</Text>
                            </View>
                            <View style={styles.verificationItem}>
                                <Ionicons name="checkmark-circle" size={24} color="#10b981" />
                                <Text style={styles.verificationText}>Vehicle Details Completed</Text>
                            </View>
                            <View style={styles.verificationItem}>
                                <Ionicons name="documents-outline" size={24} color="#3b82f6" />
                                <Text style={styles.verificationText}>Documents uploaded and ready</Text>
                            </View>
                        </View>
                        <Text style={styles.disclaimerText}>
                            By submitting, you agree to our Driver Terms & Conditions and understand that your account will undergo a background check.
                        </Text>
                    </View>
                )}
            </ScrollView>

            <View style={styles.footer}>
                <TouchableOpacity
                    style={[styles.nextBtn, (uploading || submitting) && styles.disabledBtn]}
                    onPress={handleNext}
                    disabled={uploading || submitting}
                >
                    {submitting ? (
                        <ActivityIndicator color="white" />
                    ) : (
                        <Text style={styles.nextBtnText}>
                            {step === 3 ? 'Submit Application' : 'Next Step'}
                        </Text>
                    )}
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#f3f4f6',
    },
    backButton: {
        padding: 4,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1f2937',
    },
    stepper: {
        paddingVertical: 16,
        paddingHorizontal: 40,
        position: 'relative',
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 20,
    },
    progressBar: {
        position: 'absolute',
        top: 36,
        left: 60,
        right: 60,
        height: 2,
        backgroundColor: '#e5e7eb',
        zIndex: -1,
    },
    progressFill: {
        height: '100%',
        backgroundColor: '#3b82f6',
    },
    stepItem: {
        alignItems: 'center',
        gap: 8,
        backgroundColor: '#fff',
        zIndex: 1,
    },
    stepCircle: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    stepActive: {
        backgroundColor: '#3b82f6',
    },
    stepInactive: {
        backgroundColor: '#e5e7eb',
    },
    stepText: {
        fontSize: 12,
        fontWeight: '500',
    },
    stepTextActive: {
        color: '#3b82f6',
    },
    stepTextInactive: {
        color: '#9ca3af',
    },
    content: {
        padding: 24,
    },
    formSection: {
        gap: 20,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#1f2937',
        marginBottom: 8,
    },
    inputGroup: {
        gap: 8,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: '#374151',
    },
    input: {
        borderWidth: 1,
        borderColor: '#d1d5db',
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
    },
    row: {
        flexDirection: 'row',
        gap: 16,
    },
    uploadArea: {
        borderWidth: 2,
        borderColor: '#d1d5db',
        borderStyle: 'dashed',
        borderRadius: 12,
        height: 160,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 8,
        backgroundColor: '#f9fafb',
        overflow: 'hidden',
    },
    uploadText: {
        color: '#6b7280',
        fontSize: 14,
    },
    previewImage: {
        width: '100%',
        height: '100%',
    },
    photoGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    photoThumb: {
        width: 80,
        height: 80,
        borderRadius: 8,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#e5e7eb',
    },
    thumbImage: {
        width: '100%',
        height: '100%',
    },
    addPhotoBtn: {
        width: 80,
        height: 80,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#d1d5db',
        borderStyle: 'dashed',
        justifyContent: 'center',
        alignItems: 'center',
    },
    footer: {
        padding: 16,
        borderTopWidth: 1,
        borderTopColor: '#f3f4f6',
    },
    nextBtn: {
        backgroundColor: '#3b82f6',
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
    },
    disabledBtn: {
        opacity: 0.7,
    },
    nextBtnText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
    verificationCard: {
        backgroundColor: '#f9fafb',
        borderRadius: 16,
        padding: 20,
        gap: 16,
        borderWidth: 1,
        borderColor: '#e5e7eb',
    },
    verificationItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    verificationText: {
        fontSize: 16,
        color: '#374151',
    },
    disclaimerText: {
        fontSize: 13,
        color: '#6b7280',
        textAlign: 'center',
        marginTop: 16,
        lineHeight: 18,
    },
});
