import { View, ScrollView } from "react-native";
import { Link, Stack, useLocalSearchParams } from "expo-router";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../components/ui/card";
import { Text } from "../../components/ui/text";
import { Button } from "../../components/ui/button";
import { MaterialCommunityIcons } from "@expo/vector-icons";

export default function PaymentSuccess() {
    const { bookingId } = useLocalSearchParams();

    return (
        <ScrollView className="flex-1 bg-background p-4">
            <Stack.Screen options={{ title: 'Payment Success', headerLeft: () => null, gestureEnabled: false }} />

            <View className="flex-1 items-center justify-center py-10 gap-6">
                <View className="items-center justify-center w-20 h-20 bg-green-100 rounded-full dark:bg-green-900">
                    <MaterialCommunityIcons name="check-circle" size={48} color="#22c55e" />
                </View>

                <View className="items-center gap-2">
                    <Text variant="h2" className="text-center">Payment Successful!</Text>
                    <Text className="text-center text-muted-foreground">Your booking has been confirmed.</Text>
                    {bookingId && (
                        <Text className="text-center text-sm text-muted-foreground">Booking ID: {bookingId}</Text>
                    )}
                </View>

                <Card className="w-full">
                    <CardHeader>
                        <CardTitle>What's Next?</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Text className="mb-4">
                            Your driver has been notified and is on their way. You can track your trip in real-time.
                        </Text>
                        <View className="gap-2">
                            <Link href="/(tabs)/trips" asChild>
                                <Button>View My Trips</Button>
                            </Link>
                            <Link href="/(tabs)" asChild>
                                <Button variant="outline">Back to Home</Button>
                            </Link>
                        </View>
                    </CardContent>
                </Card>
            </View>
        </ScrollView>
    );
}
