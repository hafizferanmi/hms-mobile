import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { KeyboardSafeView } from '@/components/keyboard-safe-view';
import { colors, fonts, radii, shadow } from '@/design/theme';
import { LOST_FOUND_CATEGORIES, STAFF_NAMES } from '@/mock/lost-and-found';

// -----------------------------------------------------------------------
// "Log a Found Item", opened from lost-and-found.tsx's FAB. Same
// no-backend-yet limitation as every other action screen in this app —
// "Log item" just navigates back rather than adding to the mock list.
// Real wiring would be a POST to a lost-and-found endpoint once one
// exists. Date Found uses the same day-stepper pattern as edit-guest.tsx's
// create-reservation mode, since there's no calendar-picker component in
// this app either. "Add a photo" is a placeholder — the mockup itself
// labels it "Coming soon."
// -----------------------------------------------------------------------

function CloseIcon() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={colors.textMuted} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M6 6l12 12M18 6L6 18" />
    </Svg>
  );
}
function PhotoIcon() {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={colors.navy} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Rect x={3} y={3} width={18} height={18} rx={3} />
      <Circle cx={8.5} cy={8.5} r={1.5} />
      <Path d="m21 15-5-5L5 21" />
    </Svg>
  );
}
function ChevronDownIcon() {
  return (
    <Svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke={colors.textFaint} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M6 9l6 6 6-6" />
    </Svg>
  );
}
function ChevronLeftIcon() {
  return (
    <Svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke={colors.navy} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M15 18l-6-6 6-6" />
    </Svg>
  );
}
function ChevronRightIcon() {
  return (
    <Svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke={colors.navy} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M9 18l6-6-6-6" />
    </Svg>
  );
}
function CalendarFieldIcon() {
  return (
    <Svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke={colors.textFaint} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Rect x={3} y={5} width={18} height={16} rx={2} />
      <Path d="M3 10h18" />
    </Svg>
  );
}
function PlusIcon() {
  return (
    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M12 5v14M5 12h14" />
    </Svg>
  );
}

function formatFullDate(d: Date) {
  return d.toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' });
}

function PickerField({
  label,
  value,
  placeholder,
  open,
  onToggle,
  options,
  onSelect,
}: {
  label: string;
  value: string | null;
  placeholder: string;
  open: boolean;
  onToggle: () => void;
  options: string[];
  onSelect: (v: string) => void;
}) {
  return (
    <View style={styles.halfField}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Pressable style={styles.pickerRow} onPress={onToggle}>
        <Text style={value ? styles.pickerValue : styles.pickerPlaceholder} numberOfLines={1}>
          {value ?? placeholder}
        </Text>
        <ChevronDownIcon />
      </Pressable>
      {open && (
        <View style={styles.pickerOptions}>
          {options.map((option) => (
            <Pressable key={option} style={styles.pickerOption} onPress={() => onSelect(option)}>
              <Text style={styles.pickerOptionText}>{option}</Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

export default function LogFoundItemScreen() {
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<string | null>(null);
  const [categoryPickerOpen, setCategoryPickerOpen] = useState(false);
  const [foundIn, setFoundIn] = useState('');
  const [foundDate, setFoundDate] = useState(() => new Date());
  const [foundBy, setFoundBy] = useState<string | null>(null);
  const [foundByPickerOpen, setFoundByPickerOpen] = useState(false);
  const [storageLocation, setStorageLocation] = useState('');
  const [notes, setNotes] = useState('');

  function stepFoundDate(direction: -1 | 1) {
    const next = new Date(foundDate);
    next.setDate(next.getDate() + direction);
    setFoundDate(next);
  }

  return (
    <KeyboardSafeView style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Log a found item</Text>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <CloseIcon />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.body}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled">
        {/* TODO(media): no image picker is wired up — the mockup itself
            labels this "Coming soon". */}
        <View style={styles.photoCard}>
          <View style={styles.photoIcon}>
            <PhotoIcon />
          </View>
          <View style={styles.photoText}>
            <Text style={styles.photoTitle}>Add a photo</Text>
            <Text style={styles.photoHint}>Coming soon — helps guests recognize their item</Text>
          </View>
        </View>

        <View style={styles.field}>
          <Text style={styles.fieldLabel}>DESCRIPTION</Text>
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="e.g. Black leather wallet"
            placeholderTextColor={colors.textFaint}
            style={styles.input}
          />
        </View>

        <View style={styles.row}>
          <PickerField
            label="CATEGORY"
            value={category}
            placeholder="Select category"
            open={categoryPickerOpen}
            onToggle={() => setCategoryPickerOpen((v) => !v)}
            options={LOST_FOUND_CATEGORIES}
            onSelect={(v) => {
              setCategory(v);
              setCategoryPickerOpen(false);
            }}
          />
          <View style={styles.halfField}>
            <Text style={styles.fieldLabel}>FOUND IN</Text>
            <TextInput
              value={foundIn}
              onChangeText={setFoundIn}
              placeholder="e.g. Room 204"
              placeholderTextColor={colors.textFaint}
              style={styles.inputSmall}
            />
          </View>
        </View>

        <View style={styles.row}>
          <View style={styles.halfField}>
            <Text style={styles.fieldLabel}>DATE FOUND</Text>
            <View style={styles.stepperRow}>
              <Pressable hitSlop={8} onPress={() => stepFoundDate(-1)}>
                <ChevronLeftIcon />
              </Pressable>
              <View style={styles.stepperValueWrap}>
                <CalendarFieldIcon />
                <Text style={styles.stepperValueText} numberOfLines={1}>
                  {formatFullDate(foundDate)}
                </Text>
              </View>
              <Pressable hitSlop={8} onPress={() => stepFoundDate(1)}>
                <ChevronRightIcon />
              </Pressable>
            </View>
          </View>
          <PickerField
            label="FOUND BY"
            value={foundBy}
            placeholder="Select staff"
            open={foundByPickerOpen}
            onToggle={() => setFoundByPickerOpen((v) => !v)}
            options={STAFF_NAMES}
            onSelect={(v) => {
              setFoundBy(v);
              setFoundByPickerOpen(false);
            }}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.fieldLabel}>STORAGE LOCATION</Text>
          <TextInput
            value={storageLocation}
            onChangeText={setStorageLocation}
            placeholder="e.g. Front desk drawer"
            placeholderTextColor={colors.textFaint}
            style={styles.input}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.fieldLabel}>
            NOTES <Text style={styles.fieldLabelOptional}>optional</Text>
          </Text>
          <TextInput
            value={notes}
            onChangeText={setNotes}
            placeholder="Any other details"
            placeholderTextColor={colors.textFaint}
            multiline
            style={styles.notesInput}
          />
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Pressable style={styles.cancelButton} onPress={() => router.back()}>
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </Pressable>
        <Pressable style={styles.submitButton} onPress={() => router.back()}>
          <PlusIcon />
          <Text style={styles.submitButtonText}>Log item</Text>
        </Pressable>
      </View>
    </KeyboardSafeView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontFamily: fonts.headingExtraBold,
    fontSize: 18,
    color: colors.navyInk,
  },
  body: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 24,
  },
  photoCard: {
    borderWidth: 1.4,
    borderStyle: 'dashed',
    borderColor: colors.navySoft,
    borderRadius: radii.card,
    padding: 20,
    backgroundColor: colors.bg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  photoIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: colors.navySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoText: {
    flexShrink: 1,
  },
  photoTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    color: colors.navyInk,
  },
  photoHint: {
    fontFamily: fonts.body,
    fontSize: 11.5,
    color: colors.textFaint,
    marginTop: 2,
  },
  field: {
    marginTop: 18,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  halfField: {
    flex: 1,
  },
  fieldLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: 10,
    color: colors.textFaint,
    letterSpacing: 0.5,
  },
  fieldLabelOptional: {
    fontFamily: fonts.bodyMedium,
    textTransform: 'none',
    letterSpacing: 0,
    color: colors.textFaint,
  },
  input: {
    marginTop: 8,
    height: 46,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.input,
    paddingHorizontal: 14,
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.text,
  },
  inputSmall: {
    marginTop: 8,
    height: 44,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    fontFamily: fonts.body,
    fontSize: 13.5,
    color: colors.text,
  },
  notesInput: {
    marginTop: 8,
    height: 80,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.input,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: fonts.body,
    fontSize: 13.5,
    color: colors.text,
    textAlignVertical: 'top',
  },
  pickerRow: {
    marginTop: 8,
    height: 44,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pickerPlaceholder: {
    flexShrink: 1,
    fontFamily: fonts.body,
    fontSize: 13.5,
    color: colors.textFaint,
  },
  pickerValue: {
    flexShrink: 1,
    fontFamily: fonts.bodyBold,
    fontSize: 13.5,
    color: colors.text,
  },
  pickerOptions: {
    marginTop: 6,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    overflow: 'hidden',
  },
  pickerOption: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  pickerOptionText: {
    fontFamily: fonts.body,
    fontSize: 13.5,
    color: colors.text,
  },
  stepperRow: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  stepperValueWrap: {
    flex: 1,
    height: 44,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  stepperValueText: {
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    color: colors.navyInk,
    flexShrink: 1,
  },
  footer: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 28,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  cancelButton: {
    flex: 1,
    height: 48,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.input,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    fontFamily: fonts.bodyBold,
    fontSize: 14,
    color: colors.navyInk,
  },
  submitButton: {
    flex: 1.4,
    height: 48,
    borderRadius: radii.input,
    backgroundColor: colors.navy,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    ...shadow.button,
  },
  submitButtonText: {
    fontFamily: fonts.bodyBold,
    fontSize: 14,
    color: '#FFFFFF',
  },
});
