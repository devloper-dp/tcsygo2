import { Stack } from "expo-router";
import { useTranslation } from "react-i18next";

export default function DriverLayout() {
    const { t } = useTranslation();
    return (
        <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" options={{ title: t('profile.driver') }} />
            <Stack.Screen name="trips" options={{ title: t('tabs.trips') }} />
            <Stack.Screen name="profile" options={{ title: t('tabs.profile') }} />
            <Stack.Screen name="requests" options={{ title: t('driver.ride_requests') }} />
        </Stack>
    );
}
