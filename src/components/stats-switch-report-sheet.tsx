import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { STATS_REPORTS, type StatsReportKey } from '@/constants/stats-reports';
import { colors, fonts, radii } from '@/design/theme';

// Tapping a report screen's title chevron opens this — same action-sheet
// pattern as RoomTypeActionsMenu/RoleActionsMenu elsewhere in the app, just
// listing the 5 reports as rows. Not mocked as its own screen (per FLOW.md).
// Uses router.replace so switching reports doesn't pile up a back-stack of
// every report you've looked at — back from any report goes straight to
// the Statistics tab, same as arriving at it fresh from a tile.
export function StatsSwitchReportSheet({
  visible,
  current,
  onClose,
}: {
  visible: boolean;
  current: StatsReportKey;
  onClose: () => void;
}) {
  if (!visible) return null;

  return (
    <>
      <Pressable style={[StyleSheet.absoluteFill, styles.scrim]} onPress={onClose} accessibilityLabel="Close menu" />
      <View style={styles.sheetWrapper}>
        <View style={styles.sheetGroup}>
          {STATS_REPORTS.map((report, i) => (
            <Pressable
              key={report.key}
              style={[styles.sheetItem, i < STATS_REPORTS.length - 1 && styles.sheetItemDivider]}
              disabled={report.key === current}
              onPress={() => {
                onClose();
                router.replace(report.route as never);
              }}>
              <Text style={[styles.sheetItemText, report.key === current && styles.sheetItemTextActive]}>{report.label}</Text>
            </Pressable>
          ))}
        </View>
        <View style={styles.sheetGroup}>
          <Pressable style={styles.sheetItem} onPress={onClose}>
            <Text style={styles.sheetCloseText}>Close</Text>
          </Pressable>
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  scrim: {
    backgroundColor: 'rgba(18,23,58,0.32)',
  },
  sheetWrapper: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 24,
    gap: 8,
  },
  sheetGroup: {
    backgroundColor: colors.surface,
    borderRadius: radii.card,
    overflow: 'hidden',
  },
  sheetItem: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  sheetItemDivider: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  sheetItemText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 16,
    color: colors.navyInk,
  },
  sheetItemTextActive: {
    fontFamily: fonts.bodyBold,
    color: colors.navy,
  },
  sheetCloseText: {
    fontFamily: fonts.bodyBold,
    fontSize: 16,
    color: colors.navyInk,
  },
});
