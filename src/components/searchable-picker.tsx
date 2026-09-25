import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { colors, fonts } from '@/design/theme';

// Shared by company-settings.tsx (Country/Currency) and
// switch-property-sheet.tsx's "New company" form (Country) — a searchable
// inline dropdown, not a real form field: its "validation" is just
// requiring one be chosen, enforced by the caller rather than baked in
// here, same split as edit-guest.tsx's room picker.
function ChevronDownIcon() {
  return (
    <Svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke={colors.textFaint} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M6 9l6 6 6-6" />
    </Svg>
  );
}

export function SearchablePicker({
  label,
  displayValue,
  placeholder,
  options,
  onSelect,
  error,
}: {
  label: string;
  displayValue?: string;
  placeholder: string;
  options: { value: string; label: string }[];
  onSelect: (value: string) => void;
  error?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? options.filter((o) => o.label.toLowerCase().includes(q)) : options;
  }, [options, query]);

  return (
    <View style={styles.pickerField}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Pressable style={styles.pickerRow} onPress={() => setOpen((v) => !v)}>
        <Text style={displayValue ? styles.pickerValue : styles.pickerPlaceholder}>
          {displayValue || placeholder}
        </Text>
        <ChevronDownIcon />
      </Pressable>
      {open && (
        <View style={styles.pickerPanel}>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search"
            placeholderTextColor={colors.textFaint}
            style={styles.pickerSearchInput}
            autoFocus
          />
          <ScrollView
            style={styles.pickerOptionsScroll}
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled
            showsVerticalScrollIndicator={false}>
            {filtered.length === 0 ? (
              <Text style={styles.pickerEmptyText}>No matches</Text>
            ) : (
              filtered.map((o) => (
                <Pressable
                  key={o.value}
                  style={styles.pickerOption}
                  onPress={() => {
                    onSelect(o.value);
                    setOpen(false);
                    setQuery('');
                  }}>
                  <Text style={styles.pickerOptionText}>{o.label}</Text>
                </Pressable>
              ))
            )}
          </ScrollView>
        </View>
      )}
      {error && <Text style={styles.fieldError}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  pickerField: {
    position: 'relative',
  },
  fieldLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: 10,
    color: colors.textFaint,
    letterSpacing: 0.5,
  },
  fieldError: {
    marginTop: 5,
    fontFamily: fonts.bodyMedium,
    fontSize: 11.5,
    color: colors.danger,
  },
  pickerRow: {
    marginTop: 6,
    height: 44,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pickerValue: {
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    color: colors.navyInk,
  },
  pickerPlaceholder: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.textFaint,
  },
  pickerPanel: {
    marginTop: 6,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: colors.surface,
  },
  pickerSearchInput: {
    height: 40,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.text,
  },
  pickerOptionsScroll: {
    maxHeight: 180,
  },
  pickerOption: {
    paddingVertical: 11,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  pickerOptionText: {
    fontFamily: fonts.body,
    fontSize: 13.5,
    color: colors.text,
  },
  pickerEmptyText: {
    padding: 14,
    fontFamily: fonts.body,
    fontSize: 12.5,
    color: colors.textFaint,
    textAlign: 'center',
  },
});
