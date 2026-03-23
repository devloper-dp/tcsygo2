import { View, ScrollView } from 'react-native';
import { Link, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { useResponsive } from '@/hooks/useResponsive';

export default function NotFoundScreen() {
    const { hScale, vScale, spacing, fontSize } = useResponsive();
    return (
        <>
            <Stack.Screen options={{ title: 'Page Not Found' }} />
            <View style={{ padding: spacing.xl }} className="flex-1 justify-center items-center bg-gray-50">
                <View style={{ marginBottom: vScale(24) }}>
                    <Ionicons name="alert-circle-outline" size={hScale(100)} color="#ef4444" />
                </View>

                <Text style={{ fontSize: hScale(60), marginBottom: vScale(8) }} className="font-bold text-red-500">404</Text>
                <Text style={{ fontSize: fontSize.xxl, marginBottom: vScale(12) }} className="font-bold text-gray-900 text-center">Page Not Found</Text>
                <Text style={{ fontSize: fontSize.base, marginBottom: vScale(32), paddingHorizontal: spacing.xl, lineHeight: vScale(24) }} className="text-gray-500 text-center font-medium">
                    Oops! The page you're looking for doesn't exist or has been moved.
                </Text>

                <View style={{ width: '100%', gap: spacing.md, marginBottom: vScale(32) }}>
                    <Link href="/" asChild>
                        <Button style={{ width: '100%', height: vScale(56), borderRadius: hScale(12), flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm }}>
                            <Ionicons name="home" size={hScale(20)} color="white" />
                            <Text style={{ fontSize: fontSize.base }} className="text-white font-semibold">Go to Home</Text>
                        </Button>
                    </Link>

                    <Link href="/search" asChild>
                        <Button variant="outline" style={{ width: '100%', height: vScale(56), borderRadius: hScale(12), flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm }}>
                            <Ionicons name="search" size={hScale(20)} color="#3b82f6" />
                            <Text style={{ fontSize: fontSize.base }} className="text-blue-500 font-semibold">Search Trips</Text>
                        </Button>
                    </Link>
                </View>

                <View style={{ gap: spacing.sm }} className="items-center">
                    <Text style={{ fontSize: fontSize.sm }} className="text-gray-400">Need help?</Text>
                    <Link href="/profile/help" asChild>
                        <Button variant="ghost" size="sm">
                            <Text style={{ fontSize: fontSize.sm }} className="text-blue-500 font-semibold">Contact Support</Text>
                        </Button>
                    </Link>
                </View>
            </View>
        </>
    );
}
