import { useMutation, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import ReorderableList, { reorderItems, useReorderableDrag, type ReorderableListReorderEvent } from 'react-native-reorderable-list';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';

import { deleteCustomField, reorderCustomFields, type CustomFieldDto, type CustomFieldForm } from '@/api/custom-fields';
import { CustomFieldTypeIcon } from '@/components/custom-field-type-icon';
import { CUSTOM_FIELD_TYPE_META, describeFieldType } from '@/constants/custom-field-types';
import { colors, fonts, radii, shadow } from '@/design/theme';
import { useCustomFields } from '@/hooks/use-custom-fields';

// -----------------------------------------------------------------------
// CustomFields.html/CustomFieldsReview.html — one screen, a segmented
// control switches the `form` (RESERVATION/REVIEW), same pattern as
// staff-roles.tsx's Staff/Roles tabs. CustomFieldActionsMenu.html is the
// scrim + bottom sheet overlay, local to this screen rather than a route
// — same convention as every other actions menu in this app.
//
// The Review tab's amber tip banner ("Keep it short... N added") uses the
// real count of that company's review-form fields, not a fixed example
// number.
// -----------------------------------------------------------------------

const FORM_TABS: { key: CustomFieldForm; label: string }[] = [
  { key: 'RESERVATION', label: 'Reservation form' },
  { key: 'REVIEW', label: 'Review form' },
];

function BackIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={colors.text} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M15 18l-6-6 6-6" />
    </Svg>
  );
}
function PlusIcon() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M12 5v14M5 12h14" />
    </Svg>
  );
}
function MoreIcon() {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={colors.text} strokeWidth={1.8}>
      <Circle cx={5} cy={12} r={1.6} fill={colors.text} stroke="none" />
      <Circle cx={12} cy={12} r={1.6} fill={colors.text} stroke="none" />
      <Circle cx={19} cy={12} r={1.6} fill={colors.text} stroke="none" />
    </Svg>
  );
}
function TipIcon() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={colors.amber} strokeWidth={2}>
      <Circle cx={12} cy={12} r={9} />
      <Path d="M12 8v5" strokeLinecap="round" />
      <Circle cx={12} cy={16} r={0.6} fill={colors.amber} stroke="none" />
    </Svg>
  );
}
function GripIcon() {
  const dots = [0, 1, 2];
  return (
    <Svg width={14} height={20} viewBox="0 0 14 20">
      {dots.map((row) =>
        [0, 1].map((col) => (
          <Circle key={`${row}-${col}`} cx={col === 0 ? 4 : 10} cy={4 + row * 6} r={1.6} fill={colors.textFaint} />
        )),
      )}
    </Svg>
  );
}

// Long-pressing the grip handle starts the drag (useReorderableDrag can
// only be called from inside a list item component, per the library's
// README) — kept separate from the row's own tap target so a normal tap
// still opens the actions menu instead of racing the drag gesture.
function FieldRow({ field, onPress }: { field: CustomFieldDto; onPress: () => void }) {
  const meta = CUSTOM_FIELD_TYPE_META[field.type];
  const drag = useReorderableDrag();
  return (
    <View style={styles.row}>
      <Pressable style={styles.gripHandle} onLongPress={drag} hitSlop={10}>
        <GripIcon />
      </Pressable>
      <Pressable style={styles.rowMain} onPress={onPress}>
        <View style={[styles.rowIconTile, { backgroundColor: meta.bg }]}>
          <CustomFieldTypeIcon type={field.type} color={meta.color} />
        </View>
        <View style={styles.rowText}>
          <View style={styles.rowTitleLine}>
            <Text style={styles.rowTitle} numberOfLines={1}>
              {field.label}
            </Text>
            {field.required && (
              <View style={styles.requiredBadge}>
                <Text style={styles.requiredBadgeText}>REQUIRED</Text>
              </View>
            )}
          </View>
          <Text style={styles.rowSubtitle}>{describeFieldType(field.type, field.options)}</Text>
        </View>
        <MoreIcon />
      </Pressable>
    </View>
  );
}

function FieldActionsMenu({
  field,
  pending,
  errorMessage,
  onClose,
  onEdit,
  onDelete,
}: {
  field: CustomFieldDto;
  pending: boolean;
  errorMessage?: string;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <>
      <Pressable style={[StyleSheet.absoluteFill, styles.scrim]} onPress={onClose} accessibilityLabel="Close menu" />
      <View style={styles.sheetWrapper}>
        <View style={styles.sheetGroup}>
          <View style={[styles.sheetItem, styles.sheetItemDivider]}>
            <Text style={styles.sheetKicker}>{field.label.toUpperCase()}</Text>
          </View>
          <Pressable style={styles.sheetItem} onPress={onEdit}>
            <Text style={styles.sheetItemText}>Edit field</Text>
          </Pressable>
        </View>
        {!!errorMessage && (
          <View style={styles.sheetGroup}>
            <View style={styles.sheetItem}>
              <Text style={styles.sheetErrorText}>{errorMessage}</Text>
            </View>
          </View>
        )}
        <View style={styles.sheetGroup}>
          <Pressable style={styles.sheetItem} onPress={onDelete} disabled={pending}>
            {pending ? <ActivityIndicator color={colors.coral} /> : <Text style={styles.sheetDestructiveText}>Delete field</Text>}
          </Pressable>
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

export default function CustomFieldsScreen() {
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<CustomFieldForm>('RESERVATION');
  const [activeFieldMenu, setActiveFieldMenu] = useState<CustomFieldDto | null>(null);
  const [menuError, setMenuError] = useState<string | undefined>();

  const queryClient = useQueryClient();
  const { data: fields, isLoading, isError, error, refetch, isRefetching } = useCustomFields(tab);

  // A local, drag-reorderable copy of the list — ReorderableList animates
  // drags against whatever array it's given, so the visual order needs to
  // live in state rather than being derived fresh from `fields` on every
  // render. Resynced (during render, not an effect, per
  // https://react.dev/learn/you-might-not-need-an-effect#adjusting-state-when-a-prop-changes)
  // whenever the server's copy changes: tab switch, add/edit/delete, or
  // this screen's own reorder mutation settling.
  const [prevFields, setPrevFields] = useState(fields);
  const [orderedFields, setOrderedFields] = useState<CustomFieldDto[]>(fields ?? []);
  if (fields !== prevFields) {
    setPrevFields(fields);
    setOrderedFields(fields ?? []);
  }

  const deleteMutation = useMutation({
    mutationFn: (f: CustomFieldDto) => deleteCustomField(f._id),
    onSuccess: (_result, f) => {
      queryClient.invalidateQueries({ queryKey: ['custom-fields', f.form] });
      setActiveFieldMenu(null);
      setMenuError(undefined);
    },
    onError: (err: Error) => setMenuError(err.message),
  });

  const reorderMutation = useMutation({
    mutationFn: (orderedIds: string[]) => reorderCustomFields(tab, orderedIds),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['custom-fields', tab] }),
  });

  function handleReorder({ from, to }: ReorderableListReorderEvent) {
    const next = reorderItems(orderedFields, from, to);
    setOrderedFields(next);
    reorderMutation.mutate(next.map((f) => f._id));
  }

  function openFieldMenu(f: CustomFieldDto) {
    setMenuError(undefined);
    setActiveFieldMenu(f);
  }

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={styles.headerRow}>
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <BackIcon />
          </Pressable>
          <View>
            <Text style={styles.headerTitle}>Custom Fields</Text>
            <Text style={styles.headerSubtitle}>Add your own fields to your forms</Text>
          </View>
        </View>
        <View style={styles.segmented}>
          {FORM_TABS.map((t) => (
            <Pressable
              key={t.key}
              style={[styles.segment, tab === t.key && styles.segmentActive]}
              onPress={() => setTab(t.key)}>
              <Text style={[styles.segmentText, tab === t.key && styles.segmentTextActive]}>{t.label}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      {isLoading ? (
        <ActivityIndicator color={colors.navy} style={styles.loading} />
      ) : isError ? (
        <Text style={styles.errorText}>{error.message}</Text>
      ) : (
        <ReorderableList
          data={orderedFields}
          keyExtractor={(f) => f._id}
          onReorder={handleReorder}
          style={styles.list}
          contentContainerStyle={styles.body}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.navy} />}
          ListHeaderComponent={
            tab === 'REVIEW' ? (
              <View style={styles.tipCard}>
                <TipIcon />
                <View style={styles.tipText}>
                  <View style={styles.tipTitleRow}>
                    <Text style={styles.tipTitle}>Keep it short</Text>
                    <View style={styles.tipCountBadge}>
                      <Text style={styles.tipCountText}>{orderedFields.length} added</Text>
                    </View>
                  </View>
                  <Text style={styles.tipBody}>
                    Guests finish reviews faster with fewer questions. We recommend 2–3 at most.
                  </Text>
                </View>
              </View>
            ) : null
          }
          ListEmptyComponent={<Text style={styles.emptyText}>No custom fields yet.</Text>}
          renderItem={({ item }) => <FieldRow field={item} onPress={() => openFieldMenu(item)} />}
        />
      )}

      <Pressable
        style={[styles.fab, { bottom: insets.bottom + 24 }]}
        onPress={() => router.push({ pathname: '/add-custom-field', params: { form: tab } })}>
        <PlusIcon />
        <Text style={styles.fabText}>Add field</Text>
      </Pressable>

      {activeFieldMenu && (
        <FieldActionsMenu
          field={activeFieldMenu}
          pending={deleteMutation.isPending}
          errorMessage={menuError}
          onClose={() => setActiveFieldMenu(null)}
          onEdit={() => {
            const id = activeFieldMenu._id;
            const form = activeFieldMenu.form;
            setActiveFieldMenu(null);
            router.push({ pathname: '/add-custom-field', params: { id, form } });
          }}
          onDelete={() => deleteMutation.mutate(activeFieldMenu)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 14,
    backgroundColor: colors.surface,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerTitle: {
    fontFamily: fonts.headingExtraBold,
    fontSize: 18,
    color: colors.navyInk,
  },
  headerSubtitle: {
    fontFamily: fonts.body,
    fontSize: 11.5,
    color: colors.textMuted,
    marginTop: 1,
  },
  segmented: {
    flexDirection: 'row',
    backgroundColor: colors.bg,
    borderRadius: 11,
    padding: 4,
    marginTop: 16,
  },
  segment: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 9,
    borderRadius: 9,
  },
  segmentActive: {
    backgroundColor: colors.navy,
  },
  segmentText: {
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    color: colors.textMuted,
  },
  segmentTextActive: {
    color: '#FFFFFF',
  },
  body: {
    paddingTop: 14,
    paddingHorizontal: 20,
    paddingBottom: 120,
    gap: 10,
  },
  tipCard: {
    backgroundColor: colors.amberSoft,
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  tipText: {
    flex: 1,
    minWidth: 0,
  },
  tipTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  tipTitle: {
    fontFamily: fonts.headingBold,
    fontSize: 13,
    color: colors.navyInk,
  },
  tipCountBadge: {
    backgroundColor: colors.surface,
    borderRadius: 999,
    paddingVertical: 3,
    paddingHorizontal: 9,
  },
  tipCountText: {
    fontFamily: fonts.bodyBold,
    fontSize: 10,
    color: colors.amber,
  },
  tipBody: {
    fontFamily: fonts.body,
    fontSize: 11.5,
    color: colors.textMuted,
    marginTop: 4,
    lineHeight: 16.5,
  },
  list: {
    flex: 1,
  },
  loading: {
    marginTop: 24,
  },
  errorText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    color: colors.danger,
    textAlign: 'center',
    marginTop: 24,
  },
  emptyText: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 24,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 14,
  },
  gripHandle: {
    paddingLeft: 12,
    paddingRight: 2,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 13,
    paddingRight: 16,
    paddingLeft: 8,
  },
  rowIconTile: {
    width: 40,
    height: 40,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: {
    flex: 1,
    minWidth: 0,
  },
  rowTitleLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  rowTitle: {
    fontFamily: fonts.headingBold,
    fontSize: 13.5,
    color: colors.navyInk,
    flexShrink: 1,
  },
  requiredBadge: {
    backgroundColor: colors.coralSoft,
    borderRadius: 999,
    paddingVertical: 2,
    paddingHorizontal: 7,
  },
  requiredBadgeText: {
    fontFamily: fonts.bodyBold,
    fontSize: 8.5,
    color: colors.coral,
  },
  rowSubtitle: {
    fontFamily: fonts.body,
    fontSize: 11.5,
    color: colors.textMuted,
    marginTop: 2,
  },
  fab: {
    position: 'absolute',
    right: 18,
    height: 52,
    paddingLeft: 18,
    paddingRight: 20,
    borderRadius: 26,
    backgroundColor: colors.navy,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    ...shadow.button,
  },
  fabText: {
    fontFamily: fonts.bodyBold,
    fontSize: 13.5,
    color: '#FFFFFF',
  },
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
  sheetKicker: {
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    color: colors.textFaint,
  },
  sheetItemText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 16,
    color: colors.navyInk,
  },
  sheetErrorText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12.5,
    color: colors.danger,
    textAlign: 'center',
    paddingHorizontal: 12,
  },
  sheetDestructiveText: {
    fontFamily: fonts.bodyBold,
    fontSize: 16,
    color: colors.coral,
  },
  sheetCloseText: {
    fontFamily: fonts.bodyBold,
    fontSize: 16,
    color: colors.navyInk,
  },
});
