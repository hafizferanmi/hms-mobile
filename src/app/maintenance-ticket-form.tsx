import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { z } from 'zod';

import { createTicket, updateTicket, type MaintenanceTicketDto, type TicketCategory, type TicketPriority } from '@/api/maintenance';
import { KeyboardSafeView } from '@/components/keyboard-safe-view';
import {
  MAINTENANCE_RADIUS,
  PRIORITY_META,
  TICKET_CATEGORY_LABEL,
  TICKET_CATEGORY_ORDER,
  TICKET_PRIORITY_LABEL,
} from '@/constants/maintenance';
import { colors, fonts } from '@/design/theme';
import { useStaff } from '@/hooks/use-staff';

// Mobile port of OperationMaintenancePage/TicketFormModal.js — creates a
// new ticket, or (opened with a `ticket` param, same dual-mode convention
// as add-room-type.tsx/edit-guest.tsx) edits an existing one. `assignee` is
// free text on the model, not a Staff ref (see maintenanceTicket.js), so
// the picker below offers real staff names + "External contractor" purely
// as suggestions, same as staffOptions on web.

const formSchema = z.object({
  title: z.string().min(1, { error: 'Enter what the issue is' }),
  roomOrArea: z.string().min(1, { error: 'Enter a room or area' }),
  description: z.string().optional(),
});
type FormValues = z.infer<typeof formSchema>;

function CloseIcon() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={colors.textMuted} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M6 6l12 12M18 6L6 18" />
    </Svg>
  );
}
function ChevronDownIcon() {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={colors.textFaint} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M6 9l6 6 6-6" />
    </Svg>
  );
}
function CheckIcon({ color }: { color: string }) {
  return (
    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M20 6 9 17l-5-5" />
    </Svg>
  );
}

function getInitials(name?: string) {
  if (!name) return '—';
  return name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');
}

function AssigneeSheet({
  visible,
  staffNames,
  selected,
  onClose,
  onSelect,
}: {
  visible: boolean;
  staffNames: string[];
  selected: string;
  onClose: () => void;
  onSelect: (name: string) => void;
}) {
  if (!visible) return null;
  const options = ['', ...staffNames, 'External contractor'];

  return (
    <>
      <Pressable style={[StyleSheet.absoluteFill, styles.scrim]} onPress={onClose} accessibilityLabel="Close" />
      <View style={styles.sheet}>
        <View style={styles.sheetHandle} />
        <View style={styles.sheetHeader}>
          <Text style={styles.sheetTitle}>Assign to</Text>
          <Pressable onPress={onClose} hitSlop={8}>
            <CloseIcon />
          </Pressable>
        </View>
        <ScrollView style={styles.sheetScroll} showsVerticalScrollIndicator={false}>
          {options.map((name) => {
            const active = selected === name;
            const label = name || 'Unassigned';
            return (
              <Pressable
                key={label}
                style={[styles.assigneeOption, active && styles.assigneeOptionActive]}
                onPress={() => {
                  onSelect(name);
                  onClose();
                }}>
                <View style={[styles.assigneeAvatarSm, { backgroundColor: name ? colors.navySoft : colors.slateSoft }]}>
                  <Text style={[styles.assigneeAvatarSmText, { color: name ? colors.navy : colors.textFaint }]}>{getInitials(name)}</Text>
                </View>
                <Text style={styles.assigneeOptionText}>{label}</Text>
                {active && <CheckIcon color={colors.navy} />}
              </Pressable>
            );
          })}
        </ScrollView>
      </View>
    </>
  );
}

export default function MaintenanceTicketFormScreen() {
  const { ticket: ticketParam } = useLocalSearchParams<{ ticket?: string }>();
  const editingTicket = useMemo<MaintenanceTicketDto | null>(() => {
    if (!ticketParam) return null;
    try {
      return JSON.parse(ticketParam) as MaintenanceTicketDto;
    } catch {
      return null;
    }
  }, [ticketParam]);
  const isEditMode = !!editingTicket;
  const queryClient = useQueryClient();

  const [category, setCategory] = useState<TicketCategory>(editingTicket?.category ?? 'PLUMBING');
  const [priority, setPriority] = useState<TicketPriority>(editingTicket?.priority ?? 'MEDIUM');
  const [assignee, setAssignee] = useState(editingTicket?.assignee ?? '');
  const [assigneeSheetOpen, setAssigneeSheetOpen] = useState(false);

  const { data: staff } = useStaff();
  const staffNames = useMemo(() => (staff ?? []).map((s) => s.name), [staff]);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: editingTicket?.title ?? '',
      roomOrArea: editingTicket?.roomOrArea ?? '',
      description: editingTicket?.description ?? '',
    },
  });

  const mutation = useMutation({
    mutationFn: (values: FormValues) => {
      const payload = {
        title: values.title.trim(),
        category,
        roomOrArea: values.roomOrArea.trim(),
        priority,
        assignee: assignee || undefined,
        description: values.description?.trim() || undefined,
      };
      return editingTicket ? updateTicket(editingTicket._id, payload) : createTicket(payload);
    },
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['maintenance-tickets'] });
      if (editingTicket) {
        queryClient.setQueryData(['maintenance-ticket', updated._id], updated);
        queryClient.invalidateQueries({ queryKey: ['maintenance-ticket-logs', updated._id] });
      }
      router.back();
    },
  });

  const onSubmit = (values: FormValues) => mutation.mutate(values);

  return (
    <KeyboardSafeView style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{isEditMode ? 'Edit ticket' : 'New maintenance ticket'}</Text>
        <Pressable style={styles.closeButton} onPress={() => router.back()} hitSlop={8}>
          <CloseIcon />
        </Pressable>
      </View>

      <ScrollView
        style={styles.body}
        contentContainerStyle={styles.bodyContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        <Text style={styles.label}>Issue</Text>
        <Controller
          control={control}
          name="title"
          render={({ field: { value, onChange, onBlur } }) => (
            <TextInput
              style={styles.input}
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              placeholder="e.g. AC not cooling"
              placeholderTextColor={colors.textFaint}
            />
          )}
        />
        {errors.title && <Text style={styles.errorText}>{errors.title.message}</Text>}

        <Text style={styles.label}>Category</Text>
        <View style={styles.chipGrid}>
          {TICKET_CATEGORY_ORDER.map((c) => {
            const active = category === c;
            return (
              <Pressable
                key={c}
                style={[styles.chip, { backgroundColor: active ? colors.navySoft : colors.surface, borderColor: active ? colors.navy : colors.border }]}
                onPress={() => setCategory(c)}>
                <Text style={[styles.chipLabel, { color: active ? colors.navy : colors.textMuted }]}>{TICKET_CATEGORY_LABEL[c]}</Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.label}>Room / area</Text>
        <Controller
          control={control}
          name="roomOrArea"
          render={({ field: { value, onChange, onBlur } }) => (
            <TextInput
              style={styles.input}
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              placeholder="e.g. Room 204"
              placeholderTextColor={colors.textFaint}
            />
          )}
        />
        {errors.roomOrArea && <Text style={styles.errorText}>{errors.roomOrArea.message}</Text>}

        <Text style={styles.label}>Priority</Text>
        <View style={styles.priorityRow}>
          {(['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as TicketPriority[]).map((p) => {
            const active = priority === p;
            const meta = PRIORITY_META[p];
            return (
              <Pressable
                key={p}
                style={[styles.priorityOpt, { backgroundColor: active ? meta.soft : colors.surface, borderColor: active ? meta.color : colors.border }]}
                onPress={() => setPriority(p)}>
                <Text style={[styles.priorityOptText, { color: active ? meta.color : colors.textMuted }]}>{TICKET_PRIORITY_LABEL[p]}</Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.label}>Assign to</Text>
        <Pressable style={styles.dropdownButton} onPress={() => setAssigneeSheetOpen(true)}>
          <View style={[styles.assigneeAvatarSm, { backgroundColor: assignee ? colors.navySoft : colors.slateSoft }]}>
            <Text style={[styles.assigneeAvatarSmText, { color: assignee ? colors.navy : colors.textFaint }]}>{getInitials(assignee)}</Text>
          </View>
          <Text style={styles.dropdownButtonLabel} numberOfLines={1}>
            {assignee || 'Unassigned'}
          </Text>
          <ChevronDownIcon />
        </Pressable>

        <Text style={styles.label}>
          Description <Text style={styles.labelOptional}>(optional)</Text>
        </Text>
        <Controller
          control={control}
          name="description"
          render={({ field: { value, onChange, onBlur } }) => (
            <TextInput
              style={[styles.input, styles.textArea]}
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              placeholder="Any other details"
              placeholderTextColor={colors.textFaint}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          )}
        />

        {mutation.isError && <Text style={styles.errorText}>{mutation.error.message}</Text>}
      </ScrollView>

      <View style={styles.actionsRow}>
        <Pressable style={styles.cancelButton} onPress={() => router.back()} disabled={mutation.isPending}>
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </Pressable>
        <Pressable style={styles.submitButton} onPress={handleSubmit(onSubmit)} disabled={mutation.isPending}>
          {mutation.isPending ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <Text style={styles.submitButtonText}>{isEditMode ? 'Save changes' : 'Create ticket'}</Text>
          )}
        </Pressable>
      </View>

      <AssigneeSheet
        visible={assigneeSheetOpen}
        staffNames={staffNames}
        selected={assignee}
        onClose={() => setAssigneeSheetOpen(false)}
        onSelect={setAssignee}
      />
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
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 14,
  },
  headerTitle: {
    fontFamily: fonts.headingExtraBold,
    fontSize: 18,
    color: colors.navyInk,
  },
  closeButton: {
    width: 34,
    height: 34,
    borderRadius: MAINTENANCE_RADIUS,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    flex: 1,
  },
  bodyContent: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  label: {
    fontFamily: fonts.bodyBold,
    fontSize: 10.5,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
    color: colors.textMuted,
    marginBottom: 8,
    marginTop: 18,
  },
  labelOptional: {
    textTransform: 'none',
    fontFamily: fonts.bodyMedium,
    color: colors.textFaint,
  },
  input: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: MAINTENANCE_RADIUS,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: fonts.body,
    fontSize: 13.5,
    color: colors.text,
  },
  textArea: {
    minHeight: 90,
    paddingTop: 12,
  },
  errorText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 11.5,
    color: colors.danger,
    marginTop: 6,
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    borderWidth: 1.5,
    borderRadius: MAINTENANCE_RADIUS,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  chipLabel: {
    fontFamily: fonts.bodySemibold,
    fontSize: 12.5,
  },
  priorityRow: {
    flexDirection: 'row',
    gap: 8,
  },
  priorityOpt: {
    flex: 1,
    borderWidth: 1.5,
    borderRadius: MAINTENANCE_RADIUS,
    paddingVertical: 10,
    alignItems: 'center',
  },
  priorityOptText: {
    fontFamily: fonts.bodyBold,
    fontSize: 12,
  },
  dropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: MAINTENANCE_RADIUS,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  dropdownButtonLabel: {
    flex: 1,
    fontFamily: fonts.bodySemibold,
    fontSize: 13.5,
    color: colors.text,
  },
  assigneeAvatarSm: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  assigneeAvatarSmText: {
    fontFamily: fonts.bodyBold,
    fontSize: 9.5,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 24,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  cancelButton: {
    flex: 1,
    height: 48,
    borderRadius: MAINTENANCE_RADIUS + 4,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    fontFamily: fonts.bodyBold,
    fontSize: 13.5,
    color: colors.text,
  },
  submitButton: {
    flex: 1,
    height: 48,
    borderRadius: MAINTENANCE_RADIUS + 4,
    backgroundColor: colors.navy,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonText: {
    fontFamily: fonts.bodyBold,
    fontSize: 13.5,
    color: '#FFFFFF',
  },
  scrim: {
    backgroundColor: 'rgba(18,23,58,0.32)',
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    maxHeight: '70%',
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingBottom: 28,
  },
  sheetHandle: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 14,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  sheetTitle: {
    fontFamily: fonts.headingExtraBold,
    fontSize: 16,
    color: colors.navyInk,
  },
  sheetScroll: {
    maxHeight: 340,
  },
  assigneeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: MAINTENANCE_RADIUS,
    paddingHorizontal: 10,
    paddingVertical: 11,
  },
  assigneeOptionActive: {
    backgroundColor: colors.bg,
  },
  assigneeOptionText: {
    flex: 1,
    fontFamily: fonts.bodySemibold,
    fontSize: 13.5,
    color: colors.text,
  },
});
