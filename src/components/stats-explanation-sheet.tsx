import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { colors, fonts, radii, shadow } from '@/design/theme';

// StatsExplanation.html — shared by every screen under src/app/stats/, each
// passing its own methodology copy. Replaces the web app's centered
// alert-style Explanation modal with a bottom sheet, per FLOW.md.

function InfoIcon() {
  return (
    <Svg width={19} height={19} viewBox="0 0 24 24" fill="none" stroke={colors.navy} strokeWidth={2.2}>
      <Circle cx={12} cy={12} r={9} />
      <Path d="M12 16v-5" strokeLinecap="round" />
      <Circle cx={12} cy={8.2} r={0.9} fill={colors.navy} stroke="none" />
    </Svg>
  );
}

export function StatsExplanationSheet({
  visible,
  onClose,
  bullets,
}: {
  visible: boolean;
  onClose: () => void;
  bullets: string[];
}) {
  if (!visible) return null;

  return (
    <>
      <Pressable style={[StyleSheet.absoluteFill, styles.scrim]} onPress={onClose} accessibilityLabel="Close explanation" />
      <View style={styles.sheet}>
        <View style={styles.sheetHandle} />
        <View style={styles.headerRow}>
          <View style={styles.headerIcon}>
            <InfoIcon />
          </View>
          <Text style={styles.headerTitle}>How this is calculated</Text>
        </View>
        <Text style={styles.headerSubtitle}>A quick breakdown of what goes into this report.</Text>

        <View style={styles.list}>
          {bullets.map((bullet, i) => (
            <View key={i} style={styles.item}>
              <View style={styles.numBadge}>
                <Text style={styles.numBadgeText}>{i + 1}</Text>
              </View>
              <Text style={styles.itemText}>{bullet}</Text>
            </View>
          ))}
        </View>

        <Pressable style={styles.gotItButton} onPress={onClose}>
          <Text style={styles.gotItButtonText}>Got it</Text>
        </Pressable>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  scrim: {
    backgroundColor: 'rgba(18,23,58,0.34)',
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 6,
    paddingBottom: 32,
    shadowColor: '#12173A',
    shadowOpacity: 0.2,
    shadowRadius: 32,
    shadowOffset: { width: 0, height: -10 },
    elevation: 10,
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    marginBottom: 14,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 6,
  },
  headerIcon: {
    width: 38,
    height: 38,
    borderRadius: 11,
    backgroundColor: colors.navySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontFamily: fonts.headingExtraBold,
    fontSize: 17,
    color: colors.navyInk,
  },
  headerSubtitle: {
    fontFamily: fonts.body,
    fontSize: 12.5,
    color: colors.textMuted,
  },
  list: {
    marginTop: 16,
    marginBottom: 22,
    gap: 16,
  },
  item: {
    flexDirection: 'row',
    gap: 12,
  },
  numBadge: {
    width: 22,
    height: 22,
    borderRadius: 7,
    backgroundColor: colors.navySoft,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  numBadgeText: {
    fontFamily: fonts.headingExtraBold,
    fontSize: 11,
    color: colors.navy,
  },
  itemText: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.text,
    lineHeight: 19.5,
  },
  gotItButton: {
    height: 50,
    borderRadius: radii.input,
    backgroundColor: colors.navy,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.button,
  },
  gotItButtonText: {
    fontFamily: fonts.bodyBold,
    fontSize: 14.5,
    color: '#FFFFFF',
  },
});
