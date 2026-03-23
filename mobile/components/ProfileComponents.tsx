import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text } from '@/components/ui/text';
import { Card } from '@/components/ui/card';
import { useTheme } from '@/contexts/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
 
interface ProfileCompletionProps {
    user: {
        fullName?: string;
        email?: string;
        phone?: string;
        profilePhoto?: string;
        bio?: string;
    };
    isDriver?: boolean;
    driverProfile?: {
        licenseNumber?: string;
        vehicleMake?: string;
        verificationStatus?: string;
    };
}
 
export function ProfileCompletionMobile({ user, isDriver, driverProfile }: ProfileCompletionProps) {
    const { theme } = useTheme();
    const isDark = theme === 'dark';
 
    const completionItems = [
        { label: 'Full Name', completed: !!user?.fullName, required: true },
        { label: 'Email', completed: !!user?.email, required: true },
        { label: 'Phone Number', completed: !!user?.phone, required: true },
        { label: 'Profile Photo', completed: !!user?.profilePhoto, required: false },
        { label: 'Bio', completed: !!user?.bio, required: false },
    ];
 
    if (isDriver) {
        completionItems.push(
            { label: 'License Details', completed: !!driverProfile?.licenseNumber, required: true },
            { label: 'Vehicle Information', completed: !!driverProfile?.vehicleMake, required: true },
            { label: 'Driver Verification', completed: driverProfile?.verificationStatus === 'verified', required: true }
        );
    }
 
    const totalItems = completionItems.length;
    const completedItems = completionItems.filter(item => item.completed).length;
    const completionPercentage = Math.round((completedItems / totalItems) * 100);
 
    const requiredItems = completionItems.filter(item => item.required);
    const completedRequiredItems = requiredItems.filter(item => item.completed).length;
    const isProfileComplete = completedRequiredItems === requiredItems.length;
 
    return (
        <Card className="p-0 border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm rounded-2xl mb-6 overflow-hidden">
            <View className="p-5">
                <View className="flex-row justify-between items-center mb-4">
                    <Text className="font-bold text-slate-800 dark:text-white text-lg">
                        Profile Completion
                    </Text>
                    <View className={`px-3 py-1 rounded-full ${isProfileComplete ? 'bg-green-100 dark:bg-green-900/30' : 'bg-amber-100 dark:bg-amber-900/30'}`}>
                        <Text className={`font-bold text-xs ${isProfileComplete ? 'text-green-700 dark:text-green-400' : 'text-amber-700 dark:text-amber-400'}`}>
                            {completionPercentage}%
                        </Text>
                    </View>
                </View>
 
                <View className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden mb-6">
                    <View className={`h-full rounded-full ${isProfileComplete ? 'bg-green-500' : 'bg-blue-600'}`} style={{ width: `${completionPercentage}%` }} />
                </View>
 
                <View className="gap-4 mb-2">
                    {completionItems.map((item, index) => (
                        <View key={index} className="flex-row items-center gap-3">
                            <Ionicons
                                name={item.completed ? 'checkmark-circle' : 'ellipse-outline'}
                                size={20}
                                color={item.completed ? '#22c55e' : (isDark ? '#334155' : '#e2e8f0')}
                            />
                            <Text className={`text-sm font-medium ${item.completed ? 'text-slate-600 dark:text-slate-300' : 'text-slate-400 dark:text-slate-500'}`}>
                                {item.label}
                                {item.required && !item.completed && (
                                    <Text className="text-red-400 font-bold"> *</Text>
                                )}
                            </Text>
                        </View>
                    ))}
                </View>
 
                {!isProfileComplete && (
                    <View className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl mt-4 border border-blue-100 dark:border-blue-900/30 flex-row items-start">
                        <Ionicons name="information-circle" size={20} color={isDark ? "#60a5fa" : "#2563eb"} style={{ marginTop: 2, marginRight: 8 }} />
                        <Text className="text-blue-700 dark:text-blue-300 font-medium flex-1 text-xs leading-5">
                            Complete your profile to build trust and unlock all features.
                        </Text>
                    </View>
                )}
            </View>
        </Card>
    );
}
 
export function AccountDeletionMobile({ onDelete }: { onDelete: () => void }) {
    const { theme } = useTheme();
    const isDark = theme === 'dark';
 
    return (
        <Card className="p-5 border border-red-100 dark:border-red-900/30 bg-red-50/30 dark:bg-red-950/20 shadow-none rounded-2xl">
            <View className="flex-row items-center gap-4 mb-3">
                <View className="bg-red-100 dark:bg-red-900/50 p-2.5 rounded-xl">
                    <Ionicons name="warning-outline" size={22} color={isDark ? "#f87171" : "#dc2626"} />
                </View>
                <Text className="font-bold text-slate-900 dark:text-white text-base">
                    Delete Account
                </Text>
            </View>
 
            <Text className="text-slate-500 dark:text-slate-400 font-medium mb-4 ml-1 text-sm leading-5">
                Permanently remove your account and data. This action cannot be undone.
            </Text>
 
            <TouchableOpacity
                onPress={onDelete}
                className="bg-white dark:bg-slate-900 border border-red-200 dark:border-red-900/50 py-3.5 px-4 rounded-xl shadow-sm active:bg-red-50 dark:active:bg-red-950/30 w-full items-center justify-center"
            >
                <Text className="text-red-600 dark:text-red-400 font-bold text-sm">Proceed with deletion</Text>
            </TouchableOpacity>
        </Card>
    );
}
 
const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    title: {
        fontSize: 18,
    },
    badge: {
        paddingHorizontal: 12,
        paddingVertical: 5,
        borderRadius: 20,
    },
    badgeText: {
        fontSize: 13,
        fontWeight: '700',
    },
    progressBar: {
        height: 8,
        backgroundColor: '#f1f5f9', // slate-100
        borderRadius: 4,
        overflow: 'hidden',
        marginBottom: 24,
    },
    progressFill: {
        height: '100%',
        borderRadius: 4,
    },
    itemsContainer: {
        gap: 16,
        marginBottom: 8,
    },
    item: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    itemLabel: {
        fontSize: 15,
        fontWeight: '500',
    },
    footerText: {
        fontSize: 13,
        lineHeight: 20,
    },
    deletionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        marginBottom: 12,
    },
    deletionTitle: {
        fontSize: 16,
    },
    deletionDescription: {
        fontSize: 14,
        lineHeight: 20,
    },
    deleteButton: {
        alignSelf: 'flex-start',
    },
    deleteButtonText: {
        color: '#dc2626',
        fontSize: 14,
        fontWeight: '600',
    },
});
