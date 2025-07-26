// Utility helpers for responsive, proportionate sizing across any phone.
// Based on standard guideline dimensions of iPhone X (375 × 812).
import { Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

const guidelineBaseWidth = 375;  // iPhone X width
const guidelineBaseHeight = 812; // iPhone X height

export const scale = (size: number) => (width / guidelineBaseWidth) * size;
export const verticalScale = (size: number) => (height / guidelineBaseHeight) * size;
// Moderates the resize factor so small changes on bigger devices don’t blow up fonts/elements
export const moderateScale = (size: number, factor = 0.5) =>
  size + (scale(size) - size) * factor;

export const responsiveSpacing = {
  xs: scale(4),
  sm: scale(8),
  md: scale(12),
  lg: scale(16),
  xl: scale(24),
}; 