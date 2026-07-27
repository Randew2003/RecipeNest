import { useEffect, useRef, useState } from "react";
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Pressable,
  View,
} from "react-native";

function useReduceMotion() {
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    let mounted = true;

    AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (mounted) setReduceMotion(enabled);
    });

    return () => {
      mounted = false;
    };
  }, []);

  return reduceMotion;
}

export function FadeInView({
  children,
  delay = 0,
  duration = 430,
  translateY = 14,
  style,
  ...props
}) {
  const reduceMotion = useReduceMotion();
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    progress.stopAnimation();
    progress.setValue(reduceMotion ? 1 : 0);

    if (reduceMotion) return undefined;

    const animation = Animated.timing(progress, {
      toValue: 1,
      duration,
      delay,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });

    animation.start();
    return () => animation.stop();
  }, [delay, duration, progress, reduceMotion]);

  return (
    <Animated.View
      {...props}
      style={[
        style,
        {
          opacity: progress,
          transform: [
            {
              translateY: progress.interpolate({
                inputRange: [0, 1],
                outputRange: [translateY, 0],
              }),
            },
          ],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}

const AnimatedPressableBase = Animated.createAnimatedComponent(Pressable);

export function ScalePressable({
  children,
  style,
  pressedScale = 0.97,
  onPressIn,
  onPressOut,
  disabled,
  ...props
}) {
  const reduceMotion = useReduceMotion();
  const scale = useRef(new Animated.Value(1)).current;

  const animateTo = (value) => {
    if (reduceMotion) return;

    Animated.spring(scale, {
      toValue: value,
      speed: 24,
      bounciness: 4,
      useNativeDriver: true,
    }).start();
  };

  return (
    <AnimatedPressableBase
      {...props}
      disabled={disabled}
      onPressIn={(event) => {
        animateTo(pressedScale);
        onPressIn?.(event);
      }}
      onPressOut={(event) => {
        animateTo(1);
        onPressOut?.(event);
      }}
      style={[style, { transform: [{ scale }] }]}
    >
      {children}
    </AnimatedPressableBase>
  );
}

export function AnimatedProgressBar({ progress = 0, trackStyle, fillStyle }) {
  const reduceMotion = useReduceMotion();
  const animatedProgress = useRef(new Animated.Value(0)).current;
  const safeProgress = Math.max(0, Math.min(Number(progress) || 0, 1));

  useEffect(() => {
    animatedProgress.stopAnimation();

    if (reduceMotion) {
      animatedProgress.setValue(safeProgress);
      return undefined;
    }

    const animation = Animated.timing(animatedProgress, {
      toValue: safeProgress,
      duration: 700,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    });

    animation.start();
    return () => animation.stop();
  }, [animatedProgress, reduceMotion, safeProgress]);

  const width = animatedProgress.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"],
  });

  return (
    <View style={trackStyle}>
      <Animated.View style={[fillStyle, { width }]} />
    </View>
  );
}
