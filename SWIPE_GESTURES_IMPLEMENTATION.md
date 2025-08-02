# Swipe Gestures Implementation for My Gym Section

## Overview

This implementation adds swipe left functionality to the My Gym section of the home feed, allowing users to reveal workout details by swiping left on images.

## Implementation Details

### Libraries Used
- `react-native-swipe-gestures` - Provides swipe gesture detection

### Components Modified

#### 1. WorkoutPost Component (`components/WorkoutPost.tsx`)
- **Swipe Direction**: Left swipe
- **Action**: Reveals workout details view
- **Conditions**: Only works when photo is visible and not already in workout view
- **Haptic Feedback**: iOS haptic feedback on successful swipe

#### 2. Post Component (`components/Post.tsx`)
- **Swipe Direction**: Left swipe
- **Action**: Reveals workout details view
- **Conditions**: Only works in My Gym tab (`isMyGymTab = true`) and when image is present
- **Haptic Feedback**: iOS haptic feedback on successful swipe

### Configuration

Both components use the same swipe configuration:
```javascript
const swipeConfig = {
  velocityThreshold: 0.3,        // Minimum velocity required
  directionalOffsetThreshold: 80, // Maximum vertical offset allowed
  gestureIsClickThreshold: 5      // Minimum distance to distinguish from tap
};
```

### Usage

1. **In My Gym Tab**: Navigate to the My Gym section in the home feed
2. **Swipe Left**: On any workout post or regular post with an image, swipe left to reveal workout details
3. **Visual Feedback**: The workout details view will appear with a back button to return to the photo

### Debug Logging

The implementation includes debug logging to track swipe events:
- `🔍 [DEBUG] Swipe left detected for workout: [workout_id]`
- `🔍 [DEBUG] Swipe left detected for post: [post_id]`

### Technical Notes

- Uses `GestureRecognizer` component from `react-native-swipe-gestures`
- Swipe directions are manually defined due to TypeScript definition limitations
- Haptic feedback is only applied on iOS devices
- Swipe gestures only work when images are present and not already in workout view mode

## Future Enhancements

- Add swipe right gesture for additional functionality
- Implement swipe gestures for video content
- Add animation transitions for smoother user experience
- Consider adding swipe gestures to other sections of the app 