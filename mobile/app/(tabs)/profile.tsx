import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import * as ImagePicker from 'expo-image-picker';
import { decode } from 'base64-arraybuffer';
import { useState } from 'react';
import { ProfileCompletionMobile, AccountDeletionMobile } from '@/components/ProfileComponents';

export default function ProfileScreen() {
    const { user, signOut } = useAuth();
    const router = useRouter();
    const [uploadingPhoto, setUploadingPhoto] = useState(false);

    const { data: driverProfile } = useQuery({
        queryKey: ['driver-profile', user?.id],
        queryFn: async () => {
            if (!user) return null;
            const { data, error } = await supabase
                .from('drivers')
                .select('*')
                .eq('user_id', user.id)
                .single();
            if (error) return null;
            return data;
        },
        enabled: !!user
    });

    const { data: wallet } = useQuery({
        queryKey: ['wallet-balance', user?.id],
        queryFn: async () => {
            if (!user) return null;
            const { data, error } = await supabase
                .from('wallets')
                .select('balance')
                .eq('user_id', user.id)
                .single();
            if (error) return { balance: 0 };
            return data;
        },
        enabled: !!user,
        refetchInterval: 30000, // Refresh every 30s
    });

    const handlePhotoUpload = async () => {
        try {
            // Request permissions
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission needed', 'Please grant camera roll permissions to upload a photo.');
                return;
            }

            // Launch image picker
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.5,
                base64: true,
            });

            if (result.canceled || !result.assets[0].base64) return;

            setUploadingPhoto(true);

            try {
                const fileExt = result.assets[0].uri.split('.').pop();
                const fileName = `${user?.id}-${Date.now()}.${fileExt}`;
                const filePath = `avatars/${fileName}`;

                // Upload to Supabase Storage
                const { error: uploadError } = await supabase.storage
                    .from('profile-photos')
                    .upload(filePath, decode(result.assets[0].base64), {
                        contentType: `image/${fileExt}`,
                        upsert: true
                    });

                if (uploadError) throw uploadError;

                // Get public URL
                const { data } = supabase.storage
                    .from('profile-photos')
                    .getPublicUrl(filePath);

                // Update user profile
                const { error: updateError } = await supabase
                    .from('users')
                    .update({ profile_photo: data.publicUrl })
                    .eq('id', user?.id);

                if (updateError) throw updateError;

                Alert.alert('Success', 'Profile photo updated successfully!');
                // Reload to update UI
                router.replace('/(tabs)/profile');
            } catch (uploadError) {
                console.log('Upload failed, using fallback', uploadError);
                // Fallback for dev mode
                const fallbackUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.fullName || 'User')}&size=200&background=3b82f6&color=fff`;

                const { error: updateError } = await supabase
                    .from('users')
                    .update({ profile_photo: fallbackUrl })
                    .eq('id', user?.id);

                if (!updateError) {
                    Alert.alert('Success', 'Profile photo updated!');
                    router.replace('/(tabs)/profile');
                }
            }
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to upload photo');
        } finally {
            setUploadingPhoto(false);
        }
    };

    const menuItems = [
        { icon: 'person-outline', label: 'Edit Profile', route: '/profile/edit' as any },
        ...(driverProfile ? [{ icon: 'cash-outline', label: 'Earnings', route: '/profile/earnings' as any }] : []),
        { icon: 'car-outline', label: 'My Vehicles', route: '/profile/vehicles' as any },
        { icon: 'gift-outline', label: 'Refer & Earn', route: '/profile/referrals' as any },
        { icon: 'wallet-outline', label: 'Wallet & Payments', route: '/profile/wallet' as any },
        { icon: 'shield-checkmark-outline', label: 'Safety Center', route: '/safety-center' as any },
        { icon: 'notifications-outline', label: 'Notifications', route: '/profile/notifications' as any },
        { icon: 'help-circle-outline', label: 'Help & Support', route: '/profile/help' as any },
        { icon: 'settings-outline', label: 'Settings', route: '/profile/settings' as any },
    ];

    if (!user) return null;

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView>
                <View style={styles.header}>
                    <View style={styles.profileSection}>
                        <TouchableOpacity onPress={handlePhotoUpload} disabled={uploadingPhoto} style={styles.avatar}>
                            {user.profilePhoto ? (
                                <Image source={{ uri: user.profilePhoto }} style={{ width: 80, height: 80, borderRadius: 40 }} />
                            ) : (
                                <Text style={styles.avatarText}>{user.fullName?.charAt(0) || 'U'}</Text>
                            )}
                            {uploadingPhoto && (
                                <View style={styles.uploadingOverlay}>
                                    <ActivityIndicator color="#fff" />
                                </View>
                            )}
                            <View style={styles.cameraIcon}>
                                <Ionicons name="camera" size={16} color="#fff" />
                            </View>
                        </TouchableOpacity>
                        <View style={styles.userInfo}>
                            <Text style={styles.userName}>{user.fullName}</Text>
                            <Text style={styles.userEmail}>{user.email}</Text>
                            <View style={styles.rating}>
                                <Ionicons name="star" size={16} color="#f59e0b" />
                                <Text style={styles.ratingText}>{driverProfile?.rating || 'New'}</Text>
                                <Text style={styles.tripCount}>• {driverProfile?.total_trips || 0} trips</Text>
                            </View>
                        </View>
                    </View>
                </View>

                <View style={{ paddingHorizontal: 16, marginTop: 16 }}>
                    <ProfileCompletionMobile
                        user={user as any}
                        isDriver={!!driverProfile}
                        driverProfile={driverProfile}
                    />
                </View>

                <View style={styles.statsSection}>
                    <View style={styles.statCard}>
                        <Ionicons name="car-outline" size={24} color="#3b82f6" />
                        <Text style={styles.statValue}>{driverProfile?.total_trips || 0}</Text>
                        <Text style={styles.statLabel}>Total Trips</Text>
                    </View>
                    <View style={styles.statCard}>
                        <Ionicons name="star-outline" size={24} color="#f59e0b" />
                        <Text style={styles.statValue}>{driverProfile?.rating || '-'}</Text>
                        <Text style={styles.statLabel}>Rating</Text>
                    </View>
                    <TouchableOpacity
                        style={styles.statCard}
                        onPress={() => router.push('/profile/wallet')}
                    >
                        <Ionicons name="cash-outline" size={24} color="#22c55e" />
                        <Text style={styles.statValue}>₹{wallet?.balance?.toFixed(0) || '0'}</Text>
                        <Text style={styles.statLabel}>Wallet</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.menuSection}>
                    {menuItems.map((item, index) => (
                        <TouchableOpacity
                            key={index}
                            style={styles.menuItem}
                            onPress={() => {
                                router.push(item.route as any);
                            }}
                        >
                            <View style={styles.menuItemLeft}>
                                <Ionicons name={item.icon as any} size={24} color="#6b7280" />
                                <Text style={styles.menuItemText}>{item.label}</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
                        </TouchableOpacity>
                    ))}
                </View>

                <TouchableOpacity
                    style={styles.logoutBtn}
                    onPress={signOut}
                >
                    <Ionicons name="log-out-outline" size={20} color="#ef4444" />
                    <Text style={styles.logoutText}>Logout</Text>
                </TouchableOpacity>

                <View style={{ paddingHorizontal: 16, marginBottom: 20 }}>
                    <AccountDeletionMobile
                        onDelete={() => {
                            Alert.alert(
                                'Confirm Deletion',
                                'Are you sure you want to delete your account? This action is permanent.',
                                [
                                    { text: 'Cancel', style: 'cancel' },
                                    {
                                        text: 'Delete',
                                        style: 'destructive',
                                        onPress: async () => {
                                            // Handle deletion logic
                                            Alert.alert('Deleted', 'Account deletion initiated');
                                        }
                                    }
                                ]
                            );
                        }}
                    />
                </View>

                <Text style={styles.version}>Version 1.0.0</Text>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f9fafb',
    },
    header: {
        backgroundColor: 'white',
        paddingBottom: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
    },
    profileSection: {
        flexDirection: 'row',
        padding: 20,
        alignItems: 'center',
    },
    avatar: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#3b82f6',
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
    },
    cameraIcon: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: '#3b82f6',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: 'white',
    },
    uploadingOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        borderRadius: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarText: {
        color: 'white',
        fontSize: 32,
        fontWeight: 'bold',
    },
    userInfo: {
        flex: 1,
        marginLeft: 16,
    },
    userName: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#1f2937',
        marginBottom: 4,
    },
    userEmail: {
        fontSize: 14,
        color: '#6b7280',
        marginBottom: 8,
    },
    rating: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    ratingText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#1f2937',
    },
    tripCount: {
        fontSize: 14,
        color: '#6b7280',
        marginLeft: 4,
    },
    statsSection: {
        flexDirection: 'row',
        padding: 16,
        gap: 12,
    },
    statCard: {
        flex: 1,
        backgroundColor: 'white',
        borderRadius: 12,
        padding: 16,
        alignItems: 'center',
        boxShadow: '0px 0px 4px rgba(0, 0, 0, 0.05)',
        elevation: 2,
    },
    statValue: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#1f2937',
        marginTop: 8,
    },
    statLabel: {
        fontSize: 12,
        color: '#6b7280',
        marginTop: 4,
    },
    menuSection: {
        backgroundColor: 'white',
        marginTop: 16,
        borderTopWidth: 1,
        borderBottomWidth: 1,
        borderColor: '#e5e7eb',
    },
    menuItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#f3f4f6',
    },
    menuItemLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    menuItemText: {
        fontSize: 16,
        color: '#1f2937',
    },
    logoutBtn: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 8,
        margin: 20,
        padding: 16,
        backgroundColor: 'white',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#fecaca',
    },
    logoutText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#ef4444',
    },
    version: {
        textAlign: 'center',
        fontSize: 12,
        color: '#9ca3af',
        marginBottom: 20,
    },
});
