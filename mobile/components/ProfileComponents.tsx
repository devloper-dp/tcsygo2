import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text } from '@/components/ui/text';
import { Card } from '@/components/ui/card';
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
        <Card className="p-4 mb-4">
            <View style={styles.header}>
                <Text style={styles.title} className="font-semibold text-gray-900">
                    Profile Completion
                </Text>
                <View style={[styles.badge, { backgroundColor: isProfileComplete ? '#10b981' : '#f59e0b' }]}>
                    <Text style={styles.badgeText}>{completionPercentage}%</Text>
                </View>
            </View>

            <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${completionPercentage}%`, backgroundColor: isProfileComplete ? '#10b981' : '#3b82f6' }]} />
            </View>

            <View style={styles.itemsContainer}>
                {completionItems.map((item, index) => (
                    <View key={index} style={styles.item}>
                        <Ionicons
                            name={item.completed ? 'checkmark-circle' : 'ellipse-outline'}
                            size={18}
                            color={item.completed ? '#10b981' : '#d1d5db'}
                        />
                        <Text style={[styles.itemLabel, { color: item.completed ? '#111827' : '#6b7280' }]}>
                            {item.label}
                            {item.required && !item.completed && (
                                <Text style={{ color: '#ef4444' }}> *</Text>
                            )}
                        </Text>
                    </View>
                ))}
            </View>

            {!isProfileComplete && (
                <Text style={styles.footerText} className="text-gray-500">
                    Complete your profile to build trust and unlock all features.
                </Text>
            )}
        </Card>
    );
}

export function AccountDeletionMobile({ onDelete }: { onDelete: () => void }) {
    return (
        <Card className="p-4 border-red-200 bg-red-50">
            <View style={styles.deletionHeader}>
                <Ionicons name="trash-outline" size={20} color="#ef4444" />
                <Text style={styles.deletionTitle} className="font-semibold text-red-700">
                    Delete Account
                </Text>
            </View>

            <Text style={styles.deletionDescription} className="text-red-600">
                This will permanently remove your account, trips, and all history. This action cannot be undone.
            </Text>

            <TouchableOpacity style={styles.deleteButton} onPress={onDelete}>
                <Text style={styles.deleteButtonText}>Proceed with deletion</Text>
            </TouchableOpacity>
        </Card>
    );
}

interface SettingsOption {
    id: string;
    label: string;
    icon: keyof typeof Ionicons.glyphMap;
    value?: string;
    onPress: () => void;
}

interface SettingsSectionProps {
    title: string;
    options: SettingsOption[];
}

export function SettingsSection({ title, options }: SettingsSectionProps) {
    return (
        <View style={settingsStyles.section}>
            <Text style={settingsStyles.sectionTitle}>{title}</Text>
            <Card>
                {options.map((option, index) => (
                    <TouchableOpacity
                        key={option.id}
                        style={[
                            settingsStyles.option,
                            index < options.length - 1 && settingsStyles.optionBorder
                        ]}
                        onPress={option.onPress}
                    >
                        <View style={settingsStyles.optionLeft}>
                            <Ionicons name={option.icon} size={22} color="#6b7280" />
                            <Text style={settingsStyles.optionLabel}>{option.label}</Text>
                        </View>
                        <View style={settingsStyles.optionRight}>
                            {option.value && (
                                <Text style={settingsStyles.optionValue}>{option.value}</Text>
                            )}
                            <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
                        </View>
                    </TouchableOpacity>
                ))}
            </Card>
        </View>
    );
}

interface DarkModeToggleProps {
    isDarkMode: boolean;
    onToggle: (value: boolean) => void;
}

export function DarkModeToggle({ isDarkMode, onToggle }: DarkModeToggleProps) {
    return (
        <Card style={settingsStyles.toggleCard}>
            <View style={settingsStyles.toggleContent}>
                <View style={settingsStyles.toggleLeft}>
                    <View style={[settingsStyles.iconCircle, { backgroundColor: isDarkMode ? '#1f2937' : '#fef3c7' }]}>
                        <Ionicons
                            name={isDarkMode ? "moon" : "sunny"}
                            size={20}
                            color="#f59e0b"
                        />
                    </View>
                    <View>
                        <Text style={settingsStyles.toggleLabel}>Dark Mode</Text>
                        <Text style={settingsStyles.toggleDescription}>
                            {isDarkMode ? 'Dark theme enabled' : 'Light theme enabled'}
                        </Text>
                    </View>
                </View>
                <TouchableOpacity
                    style={[settingsStyles.toggle, isDarkMode && settingsStyles.toggleActive]}
                    onPress={() => onToggle(!isDarkMode)}
                >
                    <View style={[settingsStyles.toggleThumb, isDarkMode && settingsStyles.toggleThumbActive]} />
                </TouchableOpacity>
            </View>
        </Card>
    );
}

interface LanguageOption {
    code: string;
    name: string;
    nativeName: string;
}

interface LanguageSelectorProps {
    currentLanguage: string;
    onSelect: (languageCode: string) => void;
}

// Supported languages configuration
const SUPPORTED_LANGUAGES: LanguageOption[] = [
    { code: 'en', name: 'English', nativeName: 'English' },
    { code: 'hi', name: 'Hindi', nativeName: 'हिंदी' },
    { code: 'kn', name: 'Kannada', nativeName: 'ಕನ್ನಡ' },
    { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்' },
    { code: 'te', name: 'Telugu', nativeName: 'తెలుగు' },
];

export function LanguageSelector({ currentLanguage, onSelect }: LanguageSelectorProps) {
    const languages = SUPPORTED_LANGUAGES;

    return (
        <View style={settingsStyles.section}>
            <Text style={settingsStyles.sectionTitle}>Language</Text>
            <Card>
                {languages.map((lang, index) => (
                    <TouchableOpacity
                        key={lang.code}
                        style={[
                            settingsStyles.languageOption,
                            index < languages.length - 1 && settingsStyles.optionBorder
                        ]}
                        onPress={() => onSelect(lang.code)}
                    >
                        <View>
                            <Text style={settingsStyles.languageName}>{lang.name}</Text>
                            <Text style={settingsStyles.languageNative}>{lang.nativeName}</Text>
                        </View>
                        {currentLanguage === lang.code && (
                            <Ionicons name="checkmark-circle" size={24} color="#3b82f6" />
                        )}
                    </TouchableOpacity>
                ))}
            </Card>
        </View>
    );
}

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    title: {
        fontSize: 16,
    },
    badge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    badgeText: {
        color: 'white',
        fontSize: 12,
        fontWeight: 'bold',
    },
    progressBar: {
        height: 8,
        backgroundColor: '#e5e7eb',
        borderRadius: 4,
        overflow: 'hidden',
        marginBottom: 16,
    },
    progressFill: {
        height: '100%',
        borderRadius: 4,
    },
    itemsContainer: {
        gap: 12,
        marginBottom: 12,
    },
    item: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    itemLabel: {
        fontSize: 14,
    },
    footerText: {
        fontSize: 12,
        marginTop: 4,
    },
    deletionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 8,
    },
    deletionTitle: {
        fontSize: 16,
    },
    deletionDescription: {
        fontSize: 13,
        lineHeight: 18,
        marginBottom: 16,
    },
    deleteButton: {
        alignSelf: 'flex-start',
    },
    deleteButtonText: {
        color: '#ef4444',
        fontSize: 13,
        fontWeight: '600',
        textDecorationLine: 'underline',
    },
});

const settingsStyles = StyleSheet.create({
    section: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#1f2937',
        marginBottom: 12,
        paddingHorizontal: 4,
    },
    option: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
    },
    optionBorder: {
        borderBottomWidth: 1,
        borderBottomColor: '#f3f4f6',
    },
    optionLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    optionLabel: {
        fontSize: 15,
        color: '#374151',
    },
    optionRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    optionValue: {
        fontSize: 14,
        color: '#6b7280',
    },
    toggleCard: {
        padding: 16,
        marginBottom: 24,
    },
    toggleContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    toggleLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    iconCircle: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    toggleLabel: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1f2937',
    },
    toggleDescription: {
        fontSize: 12,
        color: '#6b7280',
        marginTop: 2,
    },
    toggle: {
        width: 52,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#d1d5db',
        padding: 2,
        justifyContent: 'center',
    },
    toggleActive: {
        backgroundColor: '#3b82f6',
    },
    toggleThumb: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: 'white',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    toggleThumbActive: {
        transform: [{ translateX: 20 }],
    },
    languageOption: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
    },
    languageName: {
        fontSize: 15,
        fontWeight: '500',
        color: '#374151',
    },
    languageNative: {
        fontSize: 13,
        color: '#6b7280',
        marginTop: 2,
    },
});
