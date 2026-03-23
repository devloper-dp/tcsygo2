import { Dimensions, PixelRatio, Platform, StatusBar } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Guideline sizes are based on standard ~5" screen mobile device (e.g. iPhone 11/12/13/14)
const GUIDELINE_BASE_WIDTH = 375;
const GUIDELINE_BASE_HEIGHT = 812;

/**
 * Scale value based on screen width
 */
export const horizontalScale = (size: number) => (SCREEN_WIDTH / GUIDELINE_BASE_WIDTH) * size;

/**
 * Scale value based on screen height
 */
export const verticalScale = (size: number) => (SCREEN_HEIGHT / GUIDELINE_BASE_HEIGHT) * size;

/**
 * Moderate scale value to avoid extreme scaling on large screens
 */
export const moderateScale = (size: number, factor = 0.5) => size + (horizontalScale(size) - size) * factor;

/**
 * Responsive font size scaling
 */
export const responsiveFontSize = (size: number) => {
  const newSize = moderateScale(size);
  if (Platform.OS === 'ios') {
    return Math.round(PixelRatio.roundToNearestPixel(newSize));
  } else {
    return Math.round(PixelRatio.roundToNearestPixel(newSize)) - 2;
  }
};

/**
 * Device type helpers
 */
export const isTablet = () => {
  const pixelDensity = PixelRatio.get();
  const adjustedWidth = SCREEN_WIDTH * pixelDensity;
  const adjustedHeight = SCREEN_HEIGHT * pixelDensity;
  
  if (pixelDensity < 2 && (adjustedWidth >= 1000 || adjustedHeight >= 1000)) {
    return true;
  } else if (pixelDensity >= 2 && (adjustedWidth >= 1900 || adjustedHeight >= 1900)) {
    return true;
  }
  return false;
};

export const screenWidth = SCREEN_WIDTH;
export const screenHeight = SCREEN_HEIGHT;
