import { getDefaultConfig } from 'expo/metro-config';
import { withNativeWind } from 'nativewind/metro-config';
import path from 'path';
import { fileURLToPath } from 'url';

// ESM-safe __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Enable web platform
config.resolver.platforms = ['ios', 'android', 'web'];

// Preserve original resolver
const originalResolveRequest = config.resolver.resolveRequest;

config.resolver.resolveRequest = (context, moduleName, platform) => {
    if (platform === 'web') {
        const unsupportedModules = [
            '../Components/AccessibilityInfo/legacySendAccessibilityEvent',
            '../Components/AccessibilityInfo/AccessibilityInfo',
            '../Utilities/Platform',
            '../Components/Touchable/TouchableNativeFeedback',
            '../Components/ToastAndroid/ToastAndroid',
            '../Utilities/PermissionsAndroid',
            './PlatformColorValueTypes',
        ];

        if (unsupportedModules.some(m => moduleName.includes(m))) {
            return {
                filePath: fileURLToPath(new URL(
                    'react-native-web/dist/modules/UnimplementedView.js',
                    import.meta.url
                )),
                type: 'sourceFile',
            };
        }
    }

    return originalResolveRequest(context, moduleName, platform);
};

export default withNativeWind(config, { input: './global.css' });
