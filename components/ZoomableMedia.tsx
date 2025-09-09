import React, { useCallback, useRef, useState } from 'react';
import { View, StyleSheet, LayoutChangeEvent } from 'react-native';
import {
	PanGestureHandler,
	PinchGestureHandler,
} from 'react-native-gesture-handler';
import Animated, {
	useAnimatedGestureHandler,
	useAnimatedStyle,
	useSharedValue,
	withSpring,
	runOnJS,
} from 'react-native-reanimated';

interface ZoomableMediaProps {
	children: React.ReactNode;
	maxScale?: number;
	resetOnEnd?: boolean; // When true, always spring back to 1x on gesture end (feed-like behavior)
	onZoomActiveChange?: (active: boolean) => void; // Optional callback for parent (e.g., pause list scroll)
}

const SPRING_CONFIG = { damping: 20, stiffness: 150, mass: 0.6 } as const;

export default function ZoomableMedia({
	children,
	maxScale = 4,
	resetOnEnd = true,
	onZoomActiveChange,
}: ZoomableMediaProps) {
	const containerWidth = useSharedValue(0);
	const containerHeight = useSharedValue(0);

	const scale = useSharedValue(1);
	const translateX = useSharedValue(0);
	const translateY = useSharedValue(0);
	const savedScale = useSharedValue(1);
	const savedTranslateX = useSharedValue(0);
	const savedTranslateY = useSharedValue(0);

	const [isActive, setIsActive] = useState(false);
	const panRef = useRef(null);
	const pinchRef = useRef(null);

	const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

	const onLayout = useCallback((e: LayoutChangeEvent) => {
		const { width, height } = e.nativeEvent.layout;
		containerWidth.value = width;
		containerHeight.value = height;
	}, [containerWidth, containerHeight]);

	const updateActive = (active: boolean) => {
		if (active !== isActive) {
			setIsActive(active);
			onZoomActiveChange?.(active);
		}
	};

	const pinchHandler = useAnimatedGestureHandler({
		onStart: (_, ctx: any) => {
			ctx.startScale = savedScale.value;
			ctx.startX = savedTranslateX.value;
			ctx.startY = savedTranslateY.value;
		},
		onActive: (event, ctx: any) => {
			// Scale around center. For simplicity, ignore focal-based transforms here.
			const nextScale = clamp(ctx.startScale * event.scale, 1, maxScale);
			scale.value = nextScale;
			// While scaling up, keep translation from context
			translateX.value = ctx.startX;
			translateY.value = ctx.startY;
		},
		onEnd: () => {
			savedScale.value = scale.value;
			savedTranslateX.value = translateX.value;
			savedTranslateY.value = translateY.value;

			if (resetOnEnd) {
				// Feed-like: always spring back
				scale.value = withSpring(1, SPRING_CONFIG);
				translateX.value = withSpring(0, SPRING_CONFIG);
				translateY.value = withSpring(0, SPRING_CONFIG);
				savedScale.value = 1;
				savedTranslateX.value = 0;
				savedTranslateY.value = 0;
				runOnJS(updateActive)(false);
			} else {
				// Clamp within bounds if persisting
				const maxTranslateX = (containerWidth.value * (scale.value - 1)) / 2;
				const maxTranslateY = (containerHeight.value * (scale.value - 1)) / 2;
				translateX.value = withSpring(
					clamp(translateX.value, -maxTranslateX, maxTranslateX),
					SPRING_CONFIG
				);
				translateY.value = withSpring(
					clamp(translateY.value, -maxTranslateY, maxTranslateY),
					SPRING_CONFIG
				);
			}
		},
	});

	const panHandler = useAnimatedGestureHandler({
		onStart: (_, ctx: any) => {
			ctx.startX = savedTranslateX.value;
			ctx.startY = savedTranslateY.value;
		},
		onActive: (event, ctx: any) => {
			// Only allow panning when zoomed in
			if (scale.value <= 1) return;
			const maxTranslateX = (containerWidth.value * (scale.value - 1)) / 2;
			const maxTranslateY = (containerHeight.value * (scale.value - 1)) / 2;
			translateX.value = clamp(ctx.startX + event.translationX, -maxTranslateX, maxTranslateX);
			translateY.value = clamp(ctx.startY + event.translationY, -maxTranslateY, maxTranslateY);
		},
		onEnd: () => {
			savedTranslateX.value = translateX.value;
			savedTranslateY.value = translateY.value;
			if (resetOnEnd) {
				// Feed-like: always spring back
				scale.value = withSpring(1, SPRING_CONFIG);
				translateX.value = withSpring(0, SPRING_CONFIG);
				translateY.value = withSpring(0, SPRING_CONFIG);
				savedScale.value = 1;
				savedTranslateX.value = 0;
				savedTranslateY.value = 0;
				runOnJS(updateActive)(false);
			}
		},
	});

	const animatedStyle = useAnimatedStyle(() => ({
		transform: [
			{ translateX: translateX.value },
			{ translateY: translateY.value },
			{ scale: scale.value },
		],
	}));

	// Inform parent when zoom becomes active (scale > 1) or inactive
	const containerAnimatedStyle = useAnimatedStyle(() => {
		const nowActive = scale.value > 1.001;
		if (nowActive && !isActive) {
			runOnJS(updateActive)(true);
		}
		if (!nowActive && isActive) {
			runOnJS(updateActive)(false);
		}
		return {};
	});

	return (
		<View onLayout={onLayout} style={styles.container}>
			<PanGestureHandler ref={panRef} simultaneousHandlers={pinchRef} enabled={isActive}>
				<Animated.View style={[styles.fill, containerAnimatedStyle]}>
					<PinchGestureHandler ref={pinchRef} simultaneousHandlers={panRef}>
						<Animated.View style={[styles.fill, animatedStyle]}>
							{children}
						</Animated.View>
					</PinchGestureHandler>
				</Animated.View>
			</PanGestureHandler>
		</View>
	);
}

const styles = StyleSheet.create({
	container: { flex: 1 },
	fill: { flex: 1 },
});



