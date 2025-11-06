import React, { useState, useRef } from 'react';
import {
  View,
  Modal,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  StatusBar,
  Text,
  Platform,
} from 'react-native';
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  runOnJS,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { X, ZoomIn, ZoomOut } from 'lucide-react-native';
import { Image } from 'react-native';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface ImageZoomViewerProps {
  visible: boolean;
  imageUri: string;
  onClose: () => void;
  colors: any;
}

const ImageZoomViewer: React.FC<ImageZoomViewerProps> = ({
  visible,
  imageUri,
  onClose,
  colors,
}) => {
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [isImageLoaded, setIsImageLoaded] = useState(false);

  // Shared values for animations
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);

  // Refs no longer needed with new Gesture API

  const resetImage = () => {
    translateX.value = withSpring(0);
    translateY.value = withSpring(0);
    scale.value = withSpring(1);
    savedScale.value = 1;
    savedTranslateX.value = 0;
    savedTranslateY.value = 0;
  };

  const zoomIn = () => {
    const newScale = Math.min(scale.value * 1.5, 5);
    scale.value = withSpring(newScale);
    savedScale.value = newScale;
  };

  const zoomOut = () => {
    const newScale = Math.max(scale.value / 1.5, 1);
    scale.value = withSpring(newScale);
    savedScale.value = newScale;
  };

  const panGesture = Gesture.Pan()
    .onStart(() => {
      'worklet';
      // Store current values
    })
    .onUpdate((event) => {
      'worklet';
      if (scale.value > 1) {
        translateX.value = savedTranslateX.value + event.translationX;
        translateY.value = savedTranslateY.value + event.translationY;
      }
    })
    .onEnd(() => {
      'worklet';
      // Constrain the image within bounds
      const maxTranslateX = (scale.value - 1) * screenWidth / 2;
      const maxTranslateY = (scale.value - 1) * screenHeight / 2;

      if (Math.abs(translateX.value) > maxTranslateX) {
        translateX.value = withSpring(
          translateX.value > 0 ? maxTranslateX : -maxTranslateX
        );
      }
      if (Math.abs(translateY.value) > maxTranslateY) {
        translateY.value = withSpring(
          translateY.value > 0 ? maxTranslateY : -maxTranslateY
        );
      }

      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    });

  const pinchGesture = Gesture.Pinch()
    .onStart(() => {
      'worklet';
      // Store current values
    })
    .onUpdate((event) => {
      'worklet';
      const newScale = savedScale.value * event.scale;
      scale.value = Math.max(1, Math.min(newScale, 5));
    })
    .onEnd(() => {
      'worklet';
      savedScale.value = scale.value;
    });

  const handleDoubleTap = () => {
    const nextScale = scale.value > 1 ? 1 : 2;
    scale.value = withSpring(nextScale);
    if (nextScale === 1) {
      translateX.value = withSpring(0);
      translateY.value = withSpring(0);
      savedTranslateX.value = 0;
      savedTranslateY.value = 0;
    }
    savedScale.value = nextScale;
  };

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { scale: scale.value },
      ],
    };
  });

  const handleImageLoad = (event: any) => {
    const { width, height } = event.nativeEvent;
    setImageSize({ width, height });
    setIsImageLoaded(true);
  };

  const handleClose = () => {
    resetImage();
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      statusBarTranslucent={true}
      onRequestClose={handleClose}
    >
      <StatusBar hidden={true} />
      <View style={[styles.container, { backgroundColor: 'rgba(0, 0, 0, 0.95)' }]}>
        {/* Close button */}
        <TouchableOpacity
          style={[styles.closeButton, { backgroundColor: colors.card }]}
          onPress={handleClose}
        >
          <X size={24} color={colors.text} />
        </TouchableOpacity>

        {/* Control buttons */}
        <View style={[styles.controls, { backgroundColor: colors.card }]}>
          <TouchableOpacity
            style={styles.controlButton}
            onPress={zoomIn}
          >
            <ZoomIn size={20} color={colors.text} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.controlButton}
            onPress={zoomOut}
          >
            <ZoomOut size={20} color={colors.text} />
          </TouchableOpacity>
          {/* Removed rotate/reset button as requested */}
        </View>

        {/* Image container */}
        <GestureHandlerRootView style={[
          styles.imageContainer,
          Platform.OS === 'web' ? { touchAction: 'none', userSelect: 'none' as any } : null,
        ]}>
          <GestureDetector gesture={Gesture.Simultaneous(panGesture, pinchGesture, Gesture.Tap().numberOfTaps(2).onEnd(handleDoubleTap))}>
            <Animated.View style={animatedStyle}>
              <Image
                source={{ uri: imageUri }}
                style={styles.image}
                resizeMode="contain"
                onLoad={handleImageLoad}
              />
            </Animated.View>
          </GestureDetector>
        </GestureHandlerRootView>

        {/* Instructions */}
        {isImageLoaded && (
          <View style={styles.instructions}>
            <Text style={[styles.instructionText, { color: colors.textSecondary }]}>
              Pinch to zoom • Drag to pan • Double tap to reset
            </Text>
          </View>
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  controls: {
    position: 'absolute',
    top: 50,
    left: 20,
    borderRadius: 12,
    padding: 8,
    flexDirection: 'row',
    gap: 8,
    zIndex: 10,
  },
  controlButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  imageContainer: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  panContainer: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pinchContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: screenWidth,
    height: screenHeight * 0.8,
  },
  instructions: {
    position: 'absolute',
    bottom: 50,
    left: 20,
    right: 20,
    alignItems: 'center',
  },
  instructionText: {
    fontSize: 14,
    textAlign: 'center',
    opacity: 0.7,
  },
});

export default ImageZoomViewer;
