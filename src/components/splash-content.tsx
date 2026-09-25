import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Rect } from 'react-native-svg';

import { colors, fonts } from '@/design/theme';

// One-off decorative colors lifted straight from design/design-reference/Splash.html.
// They don't have named tokens in design/theme.ts (they're used nowhere else in the
// design system — just this screen's background rings and logomark bars).
const DECORATIVE = {
  ringBase: '#2B3A78',
  ringBlue: '#7C93FF',
  logomarkAmber: '#F0B429',
  tagline: '#B9C0E8',
};

const DOT_COUNT = 3;

/** Matches the `elen-pulse` CSS keyframe: 0/80/100% at rest, peak at 40%, over 1.2s. */
function PulseDot({ delay }: { delay: number }) {
  const t = useSharedValue(0);

  useEffect(() => {
    t.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 480, easing: Easing.inOut(Easing.ease) }),
          withTiming(0, { duration: 480, easing: Easing.inOut(Easing.ease) }),
          withTiming(0, { duration: 240 }),
        ),
        -1,
      ),
    );
  }, [delay, t]);

  const style = useAnimatedStyle(() => ({
    opacity: 0.35 + t.value * 0.65,
    transform: [{ scale: 0.85 + t.value * 0.15 }],
  }));

  return <Animated.View style={[styles.dot, style]} />;
}

export function SplashContent() {
  return (
    <View style={styles.container}>
      <Svg width={260} height={260} viewBox="0 0 260 260" style={styles.ringTopLeft}>
        <Circle cx={130} cy={130} r={130} fill={DECORATIVE.ringBase} />
        <Circle
          cx={130}
          cy={130}
          r={112}
          fill="none"
          stroke={colors.coral}
          strokeWidth={10}
          opacity={0.55}
        />
      </Svg>

      <Svg width={180} height={180} viewBox="0 0 180 180" style={styles.ringBottomRight}>
        <Circle cx={90} cy={90} r={90} fill={DECORATIVE.ringBase} />
        <Circle
          cx={90}
          cy={90}
          r={76}
          fill="none"
          stroke={DECORATIVE.ringBlue}
          strokeWidth={9}
          opacity={0.6}
        />
      </Svg>

      <View style={styles.brand}>
        <Svg width={46} height={35} viewBox="0 0 22 17">
          <Rect x={0} y={7} width={5} height={10} rx={1} fill={colors.coral} />
          <Rect x={8.5} y={2} width={5} height={15} rx={1} fill={DECORATIVE.logomarkAmber} />
          <Rect x={17} y={9} width={5} height={8} rx={1} fill={DECORATIVE.ringBlue} />
        </Svg>

        <View style={styles.wordmarkBlock}>
          <Text style={styles.title}>iSuites</Text>
          <Text style={styles.tagline}>Property management, simplified</Text>
        </View>
      </View>

      <View style={styles.dots}>
        {Array.from({ length: DOT_COUNT }, (_, i) => (
          <PulseDot key={i} delay={i * 150} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  ringTopLeft: {
    position: 'absolute',
    top: -90,
    left: -90,
    opacity: 0.5,
  },
  ringBottomRight: {
    position: 'absolute',
    bottom: -60,
    right: -60,
    opacity: 0.45,
  },
  brand: {
    alignItems: 'center',
    gap: 18,
  },
  wordmarkBlock: {
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontFamily: fonts.headingExtraBold,
    fontSize: 38,
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  tagline: {
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
    color: DECORATIVE.tagline,
    letterSpacing: 0.2,
  },
  dots: {
    position: 'absolute',
    bottom: 64,
    flexDirection: 'row',
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
  },
});
