import { View, StyleSheet } from 'react-native';
import { Link, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';

export default function NotFoundScreen() {
    return (
        <>
            <Stack.Screen options={{ title: 'Page Not Found' }} />
            <View style={styles.container}>
                <View style={styles.iconContainer}>
                    <Ionicons name="alert-circle-outline" size={100} color="#ef4444" />
                </View>

                <Text style={styles.errorCode}>404</Text>
                <Text style={styles.title}>Page Not Found</Text>
                <Text style={styles.description}>
                    Oops! The page you're looking for doesn't exist or has been moved.
                </Text>

                <View style={styles.actions}>
                    <Link href="/(tabs)" asChild>
                        <Button style={styles.primaryButton}>
                            <View style={styles.buttonContent}>
                                <Ionicons name="home" size={20} color="white" />
                                <Text style={styles.buttonText}>Go to Home</Text>
                            </View>
                        </Button>
                    </Link>

                    <Link href="/(tabs)/search" asChild>
                        <Button variant="outline" style={styles.secondaryButton}>
                            <View style={styles.buttonContent}>
                                <Ionicons name="search" size={20} color="#3b82f6" />
                                <Text style={styles.secondaryButtonText}>Search Trips</Text>
                            </View>
                        </Button>
                    </Link>
                </View>

                <View style={styles.helpSection}>
                    <Text style={styles.helpText}>Need help?</Text>
                    <Link href="/profile/help" asChild>
                        <Button variant="ghost" size="sm">
                            <Text style={styles.helpLink}>Contact Support</Text>
                        </Button>
                    </Link>
                </View>
            </View>
        </>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
        backgroundColor: '#f9fafb',
    },
    iconContainer: {
        marginBottom: 24,
    },
    errorCode: {
        fontSize: 72,
        fontWeight: 'bold',
        color: '#ef4444',
        marginBottom: 8,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#1f2937',
        marginBottom: 12,
        textAlign: 'center',
    },
    description: {
        fontSize: 16,
        color: '#6b7280',
        textAlign: 'center',
        marginBottom: 32,
        paddingHorizontal: 20,
        lineHeight: 24,
    },
    actions: {
        width: '100%',
        gap: 12,
        marginBottom: 32,
    },
    primaryButton: {
        width: '100%',
    },
    secondaryButton: {
        width: '100%',
    },
    buttonContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    buttonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600',
    },
    secondaryButtonText: {
        color: '#3b82f6',
        fontSize: 16,
        fontWeight: '600',
    },
    helpSection: {
        alignItems: 'center',
        gap: 8,
    },
    helpText: {
        fontSize: 14,
        color: '#9ca3af',
    },
    helpLink: {
        color: '#3b82f6',
        fontSize: 14,
        fontWeight: '600',
    },
});
