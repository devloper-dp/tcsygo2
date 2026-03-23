import { useWindowDimensions } from 'react-native';
import { horizontalScale, verticalScale, moderateScale, responsiveFontSize, isTablet } from '../lib/responsive';

export const useResponsive = () => {
  const { width, height } = useWindowDimensions();
  
  const hScale = (size: number) => (width / 375) * size;
  const vScale = (size: number) => (height / 812) * size;
  const mScale = (size: number, factor = 0.5) => size + (hScale(size) - size) * factor;
  const fScale = (size: number) => mScale(size);

  return {
    width,
    height,
    isTablet: isTablet(),
    hScale,
    vScale,
    mScale,
    fScale,
    // Add common responsive spacing presets
    spacing: {
      xs: hScale(4),
      sm: hScale(8),
      md: hScale(12),
      base: hScale(16),
      lg: hScale(20),
      xl: hScale(24),
      xxl: hScale(32),
    },
    fontSize: {
      xs: fScale(12),
      sm: fScale(14),
      base: fScale(16),
      lg: fScale(18),
      xl: fScale(20),
      xxl: fScale(24),
      xxxl: fScale(30),
    }
  };
};
