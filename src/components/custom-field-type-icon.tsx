import Svg, { Circle, Path, Rect } from 'react-native-svg';

import type { CustomFieldType } from '@/api/custom-fields';

// Shared between custom-fields.tsx's list rows and add-custom-field.tsx's
// type picker (see src/constants/custom-field-types.ts for the color/label
// half of this same per-type vocabulary) — the one icon dispatcher both
// screens need, so it lives alongside src/components/keyboard-safe-view.tsx
// rather than being copy-pasted into both files.
export function CustomFieldTypeIcon({
  type,
  color,
  size = 18,
}: {
  type: CustomFieldType;
  color: string;
  size?: number;
}) {
  switch (type) {
    case 'SHORT_TEXT':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
          <Path d="M4 6h16M4 12h10" />
        </Svg>
      );
    case 'LONG_TEXT':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
          <Path d="M4 6h16M4 12h16M4 18h10" />
        </Svg>
      );
    case 'NUMBER':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <Rect x={4} y={2} width={16} height={20} rx={2} />
          <Circle cx={8.5} cy={7.5} r={0.9} fill={color} stroke="none" />
          <Circle cx={12} cy={7.5} r={0.9} fill={color} stroke="none" />
          <Circle cx={15.5} cy={7.5} r={0.9} fill={color} stroke="none" />
          <Circle cx={8.5} cy={12} r={0.9} fill={color} stroke="none" />
          <Circle cx={12} cy={12} r={0.9} fill={color} stroke="none" />
          <Circle cx={15.5} cy={12} r={0.9} fill={color} stroke="none" />
        </Svg>
      );
    case 'DATE':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <Rect x={3} y={5} width={18} height={16} rx={2} />
          <Path d="M3 10h18" />
          <Path d="M8 3v4M16 3v4" />
        </Svg>
      );
    case 'SINGLE_SELECT':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2}>
          <Circle cx={12} cy={12} r={9} />
          <Circle cx={12} cy={12} r={3} fill={color} stroke="none" />
        </Svg>
      );
    case 'MULTI_SELECT':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <Rect x={4} y={4} width={16} height={16} rx={3} />
          <Path d="m8.5 12 2.2 2.2L15.5 9.5" />
        </Svg>
      );
    case 'YES_NO':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <Rect x={2} y={7} width={20} height={10} rx={5} />
          <Circle cx={16} cy={12} r={3} fill={color} stroke="none" />
        </Svg>
      );
    default:
      return null;
  }
}
