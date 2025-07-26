// Centralised spacing & padding values that automatically scale to the device width.
// Relies on the responsive helpers in `lib/responsive.ts`.

import { responsiveSpacing as RS, scale } from '@/lib/responsive';

export const horizontalPadding = RS.lg;   // ~16-24 dp depending on screen width
export const verticalPadding   = RS.md;   // ~12-18 dp
export const gap               = RS.md;   // Consistent inter-item gap

export default {
  horizontalPadding,
  verticalPadding,
  gap,
  scale,              // re-export so other modules can `import { scale } from '@/constants/Layout'`
}; 