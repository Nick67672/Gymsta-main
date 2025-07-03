import { Dimensions } from 'react-native';

const { width } = Dimensions.get('window');

// Break-points: small (<360), medium (<400), large (>=400)
const horizontalPadding = width < 360 ? 12 : width < 400 ? 16 : 20;
const verticalPadding = width < 360 ? 12 : 16;
const gap = width < 360 ? 8 : 12;

export default {
  horizontalPadding,
  verticalPadding,
  gap,
}; 