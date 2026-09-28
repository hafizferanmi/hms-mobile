import { StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { STATUS_META, TICKET_STATUS_ORDER } from '@/constants/maintenance';
import { colors } from '@/design/theme';

import type { TicketStatus } from '@/api/maintenance';

// Mirrors OperationMaintenancePage/StatusStepper.js: three dots (one per
// TICKET_STATUS_ORDER stage), each stage keeping its own color the whole
// way across (Reported stays coral, In progress amber, Resolved green)
// rather than one flat color for "how far along" — so this reads as
// "which stage", not just progress. `size`: "sm" for the list row, "md"
// for the detail screen's status block.
const SIZES = {
  sm: { dot: 8, current: 11, line: 12 },
  md: { dot: 10, current: 14, line: 16 },
} as const;

function CheckIcon({ size }: { size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth={3.5} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M20 6 9 17l-5-5" />
    </Svg>
  );
}

export function MaintenanceStatusStepper({ status, size = 'sm' }: { status: TicketStatus; size?: 'sm' | 'md' }) {
  const dims = SIZES[size];
  const statusIdx = TICKET_STATUS_ORDER.indexOf(status);

  return (
    <View style={styles.row}>
      {TICKET_STATUS_ORDER.map((step, idx) => {
        const color = STATUS_META[step].color;
        const isDone = idx < statusIdx;
        const isCurrent = idx === statusIdx;
        const dotSize = isCurrent ? dims.current : dims.dot;
        return (
          <View key={step} style={styles.row}>
            {idx > 0 && (
              <View
                style={[
                  styles.line,
                  { width: dims.line, backgroundColor: idx <= statusIdx ? color : colors.border },
                ]}
              />
            )}
            <View
              style={[
                styles.dot,
                {
                  width: dotSize,
                  height: dotSize,
                  borderRadius: dotSize / 2,
                  borderColor: idx > statusIdx ? colors.border : color,
                  backgroundColor: isDone || isCurrent ? color : colors.surface,
                },
              ]}>
              {isDone && <CheckIcon size={dotSize * 0.55} />}
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dot: {
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  line: {
    height: 2,
    borderRadius: 1,
  },
});
