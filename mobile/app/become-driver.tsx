import { useState, useEffect } from 'react';
import { View, ScrollView, TouchableOpacity, Image, Alert, ActivityIndicator, StatusBar, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Check, Upload, Car, FileText, CheckCircle2, ChevronRight, X, Shield, AlertTriangle, Clock } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { decode } from 'base64-arraybuffer';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { z } from 'zod';
import { Text } from '@/components/ui/text';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/contexts/ThemeContext';
import { useResponsive } from '@/hooks/useResponsive';
 
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
    const { theme, isDark, colors } = useTheme();
    const { hScale, vScale, mScale, spacing, fontSize } = useResponsive();
    const { toast } = require('@/components/ui/toast').useToast();
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
    const { data: driverProfile, isLoading: isLoadingProfile } = useQuery({
        queryKey: ['driver-profile-onboarding', user?.id],
        queryFn: async () => {
            if (!user) return null;
            const { data, error } = await supabase
                .from('drivers')
                .select('*')
                .eq('user_id', user.id)
                .limit(1)
                .maybeSingle();
            if (error) return null;
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
 
    if (isLoadingProfile) {
        return (
            <View className="flex-1 justify-center items-center bg-white dark:bg-slate-950">
                <ActivityIndicator size="large" color="#3b82f6" />
            </View>
        );
    }
 
    if (driverProfile) {
        return (
            <View className="flex-1 bg-white dark:bg-slate-950">
                <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
                <SafeAreaView className="flex-1">
                    <View style={{ padding: spacing.xl, borderBottomWidth: 1 }} className="flex-row items-center border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-950">
                        <TouchableOpacity 
                            onPress={() => router.back()} 
                            style={{ width: hScale(40), height: hScale(40), marginRight: spacing.lg }}
                            className="bg-slate-50 dark:bg-slate-900 rounded-full items-center justify-center"
                        >
                            <ArrowLeft size={hScale(20)} color={isDark ? "#f8fafc" : "#1e293b"} />
                        </TouchableOpacity>
                        <Text style={{ fontSize: fontSize.xl }} className="font-bold text-slate-900 dark:text-white">Application Status</Text>
                    </View>
                    <View style={{ padding: spacing.xxl, gap: spacing.lg }} className="flex-1 justify-center items-center">
                        {driverProfile.verification_status === 'pending' ? (
                            <View className="items-center">
                                <View 
                                    style={{ width: hScale(96), height: hScale(96), marginBottom: spacing.xl }}
                                    className="bg-amber-50 dark:bg-amber-900/20 rounded-full items-center justify-center border border-amber-100 dark:border-amber-800/50"
                                >
                                    <Clock size={hScale(48)} color="#f59e0b" />
                                </View>
                                <Text style={{ fontSize: fontSize.xxl }} className="font-black text-slate-900 dark:text-white text-center mb-2">Under Review</Text>
                                <Text style={{ fontSize: fontSize.base, lineHeight: vScale(24) }} className="text-slate-500 dark:text-slate-400 text-center font-medium">
                                    We are currently reviewing your documents.{'\n'}This typically takes 24-48 hours.
                                </Text>
                            </View>
                        ) : driverProfile.verification_status === 'verified' ? (
                            <View className="items-center">
                                <View 
                                    style={{ width: hScale(96), height: hScale(96), marginBottom: spacing.xl }}
                                    className="bg-green-50 dark:bg-green-900/20 rounded-full items-center justify-center border border-green-100 dark:border-green-800/50"
                                >
                                    <CheckCircle2 size={hScale(48)} color="#22c55e" />
                                </View>
                                <Text style={{ fontSize: fontSize.xxl }} className="font-black text-slate-900 dark:text-white text-center mb-2">You're Verified!</Text>
                                <Text style={{ fontSize: fontSize.base, lineHeight: vScale(24), marginBottom: spacing.xxl }} className="text-slate-500 dark:text-slate-400 text-center font-medium">
                                    Your account is fully active.{'\n'}Start driving and earning today.
                                </Text>
                                <Button
                                    className="bg-slate-900 dark:bg-blue-600 w-full rounded-2xl shadow-lg shadow-blue-500/20"
                                    style={{ height: vScale(56) }}
                                    onPress={() => router.replace('/driver')}
                                >
                                    <Text style={{ fontSize: fontSize.lg }} className="text-white font-black uppercase tracking-widest">Go to Dashboard</Text>
                                </Button>
                            </View>
                        ) : (
                            <View className="items-center">
                                <View 
                                    style={{ width: hScale(96), height: hScale(96), marginBottom: spacing.xl }}
                                    className="bg-red-50 dark:bg-red-900/20 rounded-full items-center justify-center border border-red-100 dark:border-red-800/50"
                                >
                                    <AlertTriangle size={hScale(48)} color="#ef4444" />
                                </View>
                                <Text style={{ fontSize: fontSize.xxl }} className="font-black text-slate-900 dark:text-white text-center mb-2">Application Rejected</Text>
                                <Text style={{ fontSize: fontSize.base, lineHeight: vScale(24) }} className="text-slate-500 dark:text-slate-400 text-center font-medium">
                                    Please contact our support team for more details regarding your application status.
                                </Text>
                            </View>
                        )}
                    </View>
                </SafeAreaView>
            </View>
        );
    }
 
    const clearDraft = async () => {
        try {
            await AsyncStorage.removeItem(DRAFT_STORAGE_KEY);
        } catch (e) {
            console.error('Failed to clear draft:', e);
        }
    };
 
    const steps = [
        { number: 1, title: 'License', icon: FileText },
        { number: 2, title: 'Vehicle', icon: Car },
        { number: 3, title: 'Review', icon: CheckCircle2 },
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
            toast({
                title: 'Error',
                description: 'Failed to pick image',
                variant: 'destructive',
            });
        }
    };
 
    const uploadImage = async (base64: string, field: 'license' | 'vehicle') => {
        try {
            setUploading(true);
            const fileExt = 'jpg';
            const fileName = `${user?.id}/${Date.now()}.${fileExt}`;
            const bucket = field === 'license' ? 'licenses' : 'vehicles';
 
            const { data, error } = await supabase.storage
                .from(bucket)
                .upload(fileName, decode(base64), {
                    contentType: 'image/jpeg',
                    upsert: true
                });
 
            if (error) throw new Error(error.message);
 
            const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(fileName);
 
            if (field === 'license') {
                const { data: signedData } = await supabase.storage.from(bucket).createSignedUrl(fileName, 60 * 60);
                setFormData(prev => ({ ...prev, licensePhoto: signedData?.signedUrl || publicUrl }));
            } else {
                setFormData(prev => ({ ...prev, vehiclePhotos: [...prev.vehiclePhotos, publicUrl] }));
            }
 
        } catch (error: any) {
            console.error("Upload failed", error);
            toast({
                title: 'Upload Failed',
                description: error.message,
                variant: 'destructive',
            });
        } finally {
            setUploading(false);
        }
    };
 
    const handleNext = () => {
        if (step === 1) {
            const result = licenseSchema.safeParse(formData);
            if (!result.success) {
                toast({
                    title: 'Validation Check',
                    description: result.error.issues[0]?.message,
                    variant: 'destructive',
                });
                return;
            }
            setStep(2);
        } else if (step === 2) {
            const result = vehicleSchema.safeParse(formData);
            if (!result.success) {
                toast({
                    title: 'Validation Check',
                    description: result.error.issues[0]?.message,
                    variant: 'destructive',
                });
                return;
            }
            setStep(3);
        } else {
            handleSubmit();
        }
    };
 
    const handleSubmit = async () => {
        try {
            if (!user) {
                toast({
                    title: 'Error',
                    description: 'You must be logged in to submit an application.',
                    variant: 'destructive',
                });
                return;
            }
            setSubmitting(true);
            if (user?.role === 'passenger') {
                await supabase.from('users').update({ role: 'both' }).eq('id', user.id);
            }
 
            // Manual Check-Then-Act to avoid "on_conflict" 400 error if unique constraint is missing
            const { data: existingDriver } = await supabase
                .from('drivers')
                .select('id')
                .eq('user_id', user.id)
                .maybeSingle();
 
            const driverData = {
                user_id: user.id,
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
            };
 
            let driverError;
 
            if (existingDriver) {
                const { error } = await supabase
                    .from('drivers')
                    .update(driverData)
                    .eq('id', existingDriver.id);
                driverError = error;
            } else {
                const { error } = await supabase
                    .from('drivers')
                    .insert(driverData);
                driverError = error;
            }
 
            if (driverError) throw driverError;
            await clearDraft();
 
            toast({
                title: 'Success',
                description: 'Application submitted successfully!',
            });
            router.replace('/driver' as any);
        } catch (error: any) {
            toast({
                title: 'Error',
                description: error.message,
                variant: 'destructive',
            });
        } finally {
            setSubmitting(false);
        }
    };
 
    return (
        <View className="flex-1 bg-white dark:bg-slate-950">
            <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
            <SafeAreaView className="flex-1" edges={['top']}>
                {/* Header */}
                <View style={{ paddingHorizontal: spacing.xl, paddingVertical: vScale(16), borderBottomWidth: 1 }} className="bg-white dark:bg-slate-950 border-slate-100 dark:border-slate-800 flex-row items-center justify-between z-10">
                    <View className="flex-row items-center gap-4">
                        <TouchableOpacity
                            onPress={() => step === 1 ? router.back() : setStep(step - 1)}
                            style={{ width: hScale(40), height: hScale(40) }}
                            className="rounded-full bg-slate-50 dark:bg-slate-900 items-center justify-center active:bg-slate-100 dark:active:bg-slate-800"
                        >
                            <ArrowLeft size={hScale(20)} color={isDark ? "#f8fafc" : "#1e293b"} />
                        </TouchableOpacity>
                        <View>
                            <Text style={{ fontSize: hScale(10) }} className="text-slate-500 dark:text-slate-400 font-black uppercase tracking-widest">Onboarding</Text>
                            <Text style={{ fontSize: fontSize.xl }} className="font-bold text-slate-900 dark:text-white">Become a Driver</Text>
                        </View>
                    </View>
                </View>
 
                {/* Progress Steps */}
                <View style={{ paddingHorizontal: spacing.xxl, paddingVertical: vScale(24), marginBottom: spacing.base }} className="bg-white dark:bg-slate-950">
                    <View className="flex-row justify-between relative">
                        {/* Connecting Line */}
                        <View style={{ top: vScale(20), left: hScale(16), right: hScale(16), height: vScale(2) }} className="absolute bg-slate-100 dark:bg-slate-900 -z-10">
                            <View
                                className="h-full bg-blue-600 rounded-full transition-all duration-500"
                                style={{ width: step === 1 ? '0%' : step === 2 ? '50%' : '100%' }}
                            />
                        </View>
 
                        {steps.map((s) => {
                            const Icon = s.icon;
                            const isActive = step >= s.number;
                            const isCurrent = step === s.number;
                            return (
                                <View key={s.number} style={{ gap: spacing.sm, paddingHorizontal: hScale(8) }} className="items-center bg-white dark:bg-slate-950">
                                    <View 
                                        style={{ width: hScale(40), height: hScale(40), borderWidth: 2 }}
                                        className={`rounded-full items-center justify-center transition-all ${isActive ? 'bg-blue-600 border-blue-600 shadow-md shadow-blue-500/20' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'}`}
                                    >
                                        <Icon size={hScale(18)} color={isActive ? 'white' : (isDark ? '#475569' : '#94a3b8')} strokeWidth={2.5} />
                                    </View>
                                    <Text style={{ fontSize: hScale(10) }} className={`font-black uppercase tracking-wider ${isCurrent ? 'text-blue-600 dark:text-blue-400' : isActive ? 'text-slate-900 dark:text-white' : 'text-slate-400 dark:text-slate-600'}`}>
                                        {s.title}
                                    </Text>
                                </View>
                            );
                        })}
                    </View>
                </View>
 
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    className="flex-1"
                >
                    <ScrollView
                        className="flex-1 px-6"
                        contentContainerStyle={{ paddingBottom: 100 }}
                        showsVerticalScrollIndicator={false}
                    >
                        {step === 1 ? (
                            <View style={{ gap: spacing.lg }}>
                                <View>
                                    <Text style={{ fontSize: fontSize.xl }} className="font-black text-slate-900 dark:text-white mb-1">License Details</Text>
                                    <Text style={{ fontSize: fontSize.sm }} className="text-slate-500 dark:text-slate-400 font-medium">Please provide your driving license information.</Text>
                                </View>
 
                                <View style={{ gap: spacing.base }}>
                                    <View style={{ gap: spacing.sm }}>
                                        <Text style={{ fontSize: fontSize.sm }} className="font-black text-slate-700 dark:text-slate-300 ml-1 uppercase tracking-wider">License Number</Text>
                                        <Input
                                            style={{ height: vScale(56) }}
                                            className="bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800"
                                            placeholder="DL-XXXXXXXX"
                                            value={formData.licenseNumber}
                                            onChangeText={t => setFormData({ ...formData, licenseNumber: t })}
                                            placeholderTextColor={isDark ? "#475569" : "#9CA3AF"}
                                        />
                                    </View>
 
                                    <View style={{ gap: spacing.sm }}>
                                        <Text style={{ fontSize: fontSize.sm }} className="font-black text-slate-700 dark:text-slate-300 ml-1 uppercase tracking-wider">License Photo</Text>
                                        <TouchableOpacity
                                            style={{ height: vScale(192), borderRadius: hScale(16), borderWidth: 2 }}
                                            className="border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 overflow-hidden items-center justify-center active:bg-slate-100 dark:active:bg-slate-800"
                                            onPress={() => pickImage('license')}
                                            disabled={uploading}
                                        >
                                            {formData.licensePhoto ? (
                                                <Image source={{ uri: formData.licensePhoto }} className="w-full h-full" resizeMode="cover" />
                                            ) : (
                                                <View style={{ gap: spacing.base }} className="items-center">
                                                    <View style={{ width: hScale(48), height: hScale(48) }} className="bg-blue-100 dark:bg-blue-900/20 rounded-full items-center justify-center">
                                                        <Upload size={hScale(24)} color={isDark ? "#60a5fa" : "#2563eb"} />
                                                    </View>
                                                    <View className="items-center">
                                                        <Text style={{ fontSize: fontSize.sm }} className="font-black text-slate-700 dark:text-slate-300">Tap to upload</Text>
                                                        <Text style={{ fontSize: hScale(10) }} className="text-slate-400 dark:text-slate-500">JPG, PNG max 5MB</Text>
                                                    </View>
                                                </View>
                                            )}
                                            {uploading && (
                                                <View className="absolute inset-0 bg-white/80 dark:bg-slate-950/80 items-center justify-center">
                                                    <ActivityIndicator size="large" color="#3b82f6" />
                                                </View>
                                            )}
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            </View>
                        ) : step === 2 ? (
                            <View style={{ gap: spacing.lg }}>
                                <View>
                                    <Text style={{ fontSize: fontSize.xl }} className="font-black text-slate-900 dark:text-white mb-1">Vehicle Details</Text>
                                    <Text style={{ fontSize: fontSize.sm }} className="text-slate-500 dark:text-slate-400 font-medium">Tell us about the vehicle you'll be driving.</Text>
                                </View>
 
                                <View style={{ flexDirection: 'row', gap: spacing.base }}>
                                    <View style={{ flex: 1, gap: spacing.sm }}>
                                        <Text style={{ fontSize: fontSize.sm }} className="font-black text-slate-700 dark:text-slate-300 ml-1 uppercase tracking-wider">Make</Text>
                                        <Input style={{ height: vScale(56) }} className="bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800" placeholder="Toyota" value={formData.vehicleMake} onChangeText={t => setFormData({ ...formData, vehicleMake: t })} placeholderTextColor={isDark ? "#475569" : "#9CA3AF"} />
                                    </View>
                                    <View style={{ flex: 1, gap: spacing.sm }}>
                                        <Text style={{ fontSize: fontSize.sm }} className="font-black text-slate-700 dark:text-slate-300 ml-1 uppercase tracking-wider">Model</Text>
                                        <Input style={{ height: vScale(56) }} className="bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800" placeholder="Camry" value={formData.vehicleModel} onChangeText={t => setFormData({ ...formData, vehicleModel: t })} placeholderTextColor={isDark ? "#475569" : "#9CA3AF"} />
                                    </View>
                                </View>
 
                                <View style={{ flexDirection: 'row', gap: spacing.base }}>
                                    <View style={{ flex: 1, gap: spacing.sm }}>
                                        <Text style={{ fontSize: fontSize.sm }} className="font-black text-slate-700 dark:text-slate-300 ml-1 uppercase tracking-wider">Year</Text>
                                        <Input style={{ height: vScale(56) }} className="bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800" placeholder="2022" keyboardType="numeric" value={formData.vehicleYear} onChangeText={t => setFormData({ ...formData, vehicleYear: t })} placeholderTextColor={isDark ? "#475569" : "#9CA3AF"} />
                                    </View>
                                    <View style={{ flex: 1, gap: spacing.sm }}>
                                        <Text style={{ fontSize: fontSize.sm }} className="font-black text-slate-700 dark:text-slate-300 ml-1 uppercase tracking-wider">Color</Text>
                                        <Input style={{ height: vScale(56) }} className="bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800" placeholder="White" value={formData.vehicleColor} onChangeText={t => setFormData({ ...formData, vehicleColor: t })} placeholderTextColor={isDark ? "#475569" : "#9CA3AF"} />
                                    </View>
                                </View>
 
                                <View style={{ gap: spacing.sm }}>
                                    <Text style={{ fontSize: fontSize.sm }} className="font-black text-slate-700 dark:text-slate-300 ml-1 uppercase tracking-wider">License Plate</Text>
                                    <Input
                                        style={{ height: vScale(56) }}
                                        className="bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 font-mono"
                                        placeholder="KA-05-AB-1234"
                                        autoCapitalize="characters"
                                        value={formData.vehiclePlate}
                                        onChangeText={t => setFormData({ ...formData, vehiclePlate: t.toUpperCase() })}
                                        placeholderTextColor={isDark ? "#475569" : "#9CA3AF"}
                                    />
                                </View>
 
                                <View style={{ gap: spacing.sm }}>
                                    <Text style={{ fontSize: fontSize.sm }} className="font-black text-slate-700 dark:text-slate-300 ml-1 uppercase tracking-wider">Vehicle Photos</Text>
                                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.base }}>
                                        {formData.vehiclePhotos.map((uri, idx) => (
                                            <View key={idx} style={{ width: hScale(112), height: hScale(112), borderRadius: hScale(12) }} className="bg-slate-100 dark:bg-slate-900 overflow-hidden relative border border-slate-200 dark:border-slate-800">
                                                <Image source={{ uri }} className="w-full h-full" />
                                                <TouchableOpacity
                                                    onPress={() => setFormData(p => ({ ...p, vehiclePhotos: p.vehiclePhotos.filter((_, i) => i !== idx) }))}
                                                    style={{ top: hScale(4), right: hScale(4), padding: hScale(4) }}
                                                    className="absolute bg-black/50 rounded-full"
                                                >
                                                    <X size={hScale(12)} color="white" />
                                                </TouchableOpacity>
                                            </View>
                                        ))}
                                        <TouchableOpacity
                                            style={{ width: hScale(112), height: hScale(112), borderRadius: hScale(12), borderWidth: 2 }}
                                            className="border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 items-center justify-center active:bg-slate-100 dark:active:bg-slate-800"
                                            onPress={() => pickImage('vehicle')}
                                            disabled={uploading}
                                        >
                                            <Upload size={hScale(24)} color={isDark ? "#475569" : "#94a3b8"} />
                                            <Text style={{ fontSize: hScale(10), marginTop: hScale(4) }} className="text-slate-400 dark:text-slate-600 font-black uppercase">Add Photo</Text>
                                            {uploading && <ActivityIndicator className="absolute inset-0" color="#3b82f6" />}
                                        </TouchableOpacity>
                                    </ScrollView>
                                </View>
                            </View>
                        ) : step === 3 ? (
                            <View style={{ gap: spacing.lg }}>
                                <View style={{ paddingVertical: vScale(24) }} className="items-center">
                                    <View 
                                        style={{ width: hScale(80), height: hScale(80), marginBottom: spacing.base, borderWidth: 1 }}
                                        className="bg-blue-100 dark:bg-blue-900/20 rounded-full items-center justify-center border-blue-200 dark:border-blue-800/50"
                                    >
                                        <Shield size={hScale(40)} color={isDark ? "#60a5fa" : "#2563eb"} />
                                    </View>
                                    <Text style={{ fontSize: fontSize.xxl }} className="font-black text-slate-900 dark:text-white text-center">Ready to Submit?</Text>
                                    <Text style={{ fontSize: fontSize.sm, marginTop: spacing.xs }} className="text-slate-500 dark:text-slate-400 text-center max-w-[250px] font-medium">Please review your information carefully before submitting.</Text>
                                </View>
 
                                <View style={{ padding: spacing.xl, gap: spacing.base, borderRadius: hScale(24), borderWidth: 1 }} className="bg-white dark:bg-slate-900 shadow-sm border-slate-100 dark:border-slate-800">
                                    <View style={{ paddingBottom: spacing.base, borderBottomWidth: 1 }} className="flex-row items-center gap-3 border-slate-50 dark:border-slate-800/50">
                                        <View style={{ width: hScale(32), height: hScale(32) }} className="rounded-full bg-green-50 dark:bg-green-900/20 items-center justify-center">
                                            <Check size={hScale(16)} color="#16a34a" />
                                        </View>
                                        <View>
                                            <Text style={{ fontSize: fontSize.sm }} className="font-black text-slate-900 dark:text-white">License Information</Text>
                                            <Text style={{ fontSize: hScale(10) }} className="text-slate-500 dark:text-slate-400">{formData.licenseNumber}</Text>
                                        </View>
                                    </View>
                                    <View style={{ paddingBottom: spacing.base, borderBottomWidth: 1 }} className="flex-row items-center gap-3 border-slate-50 dark:border-slate-800/50">
                                        <View style={{ width: hScale(32), height: hScale(32) }} className="rounded-full bg-green-50 dark:bg-green-900/20 items-center justify-center">
                                            <Check size={hScale(16)} color="#16a34a" />
                                        </View>
                                        <View>
                                            <Text style={{ fontSize: fontSize.sm }} className="font-black text-slate-900 dark:text-white">Vehicle Details</Text>
                                            <Text style={{ fontSize: hScale(10) }} className="text-slate-500 dark:text-slate-400">{formData.vehicleYear} {formData.vehicleMake} {formData.vehicleModel}</Text>
                                        </View>
                                    </View>
                                    <View className="flex-row items-center gap-3">
                                        <View style={{ width: hScale(32), height: hScale(32) }} className="rounded-full bg-green-50 dark:bg-green-900/20 items-center justify-center">
                                            <Check size={hScale(16)} color="#16a34a" />
                                        </View>
                                        <View>
                                            <Text style={{ fontSize: fontSize.sm }} className="font-black text-slate-900 dark:text-white">Documents</Text>
                                            <Text style={{ fontSize: hScale(10) }} className="text-slate-500 dark:text-slate-400">All photos uploaded</Text>
                                        </View>
                                    </View>
                                </View>
 
                                <View style={{ padding: spacing.base, gap: spacing.base, borderRadius: hScale(12), borderWidth: 1 }} className="bg-blue-50 dark:bg-blue-900/10 flex-row border-blue-100 dark:border-blue-900/20">
                                    <AlertTriangle size={hScale(20)} color={isDark ? "#60a5fa" : "#2563eb"} className="mt-0.5" />
                                    <Text style={{ fontSize: hScale(10), lineHeight: vScale(18) }} className="text-blue-700 dark:text-blue-300 flex-1 font-bold">
                                        By submitting this application, you agree to background checks and authorize us to verify your provided documents.
                                    </Text>
                                </View>
                            </View>
                        ) : null}
                    </ScrollView>
                </KeyboardAvoidingView>
 
                {/* Footer Buttons */}
                <View style={{ padding: spacing.xl, borderTopWidth: 1 }} className="bg-white dark:bg-slate-950 border-slate-100 dark:border-slate-800 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
                    <Button
                        className="bg-blue-600 rounded-2xl shadow-lg shadow-blue-500/20"
                        style={{ height: vScale(56) }}
                        onPress={handleNext}
                        disabled={uploading || submitting}
                    >
                        {submitting ? (
                            <ActivityIndicator color="white" />
                        ) : (
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.base }}>
                                <Text style={{ fontSize: fontSize.lg }} className="text-white font-black uppercase tracking-widest">
                                    {step === 3 ? 'Submit Application' : 'Continue'}
                                </Text>
                                {step !== 3 && <ChevronRight size={hScale(20)} color="white" />}
                            </View>
                        )}
                    </Button>
                </View>
            </SafeAreaView>
        </View>
    );
}
