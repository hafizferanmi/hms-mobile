import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';
import { z } from 'zod';

import { addRoom, getRoomType, updateRoom, type RoomDto } from '@/api/rooms';
import { KeyboardSafeView } from '@/components/keyboard-safe-view';
import { colors, fonts, radii, shadow } from '@/design/theme';

// -----------------------------------------------------------------------
// AddRoom.html — add a physical room to an existing room type, opened
// from room-type/[id].tsx's "Add room" tile with ?roomTypeId=<id>. Per
// FLOW.md.
//
// Also doubles as the edit-room screen (no separate mockup for it — the
// web app's equivalent is just this same form pre-filled) when opened
// with an extra ?id=<roomId>, from room-type/[id].tsx's per-room actions
// menu. Editing is a genuinely different shape, not just this form
// pre-filled: there's exactly one room number, not a comma-separated
// batch, and it calls PUT /rooms/:id instead of looping POST /rooms — so
// it's its own form component (EditRoomForm) sharing this screen's
// header/footer chrome and styles rather than branching mid-form.
//
// The mockup's "Separate with commas to add several rooms at once" copy
// isn't backed by a batch endpoint — hms-backend-node's POST /rooms only
// ever creates one room per call (same limitation hms-frontend-react's
// splitRoomNumbers helper works around the same way). This splits the
// input client-side and fires one addRoom() call per resulting number,
// sequentially, so a failure partway through stops rather than silently
// skipping the rest.
// -----------------------------------------------------------------------

const addRoomFormSchema = z.object({
  numbers: z.string().min(1, { error: 'Enter at least one room number' }),
  desc: z.string().optional(),
});
type AddRoomFormValues = z.infer<typeof addRoomFormSchema>;

const editRoomFormSchema = z.object({
  number: z.string().min(1, { error: 'Enter a room number' }),
  desc: z.string().optional(),
});
type EditRoomFormValues = z.infer<typeof editRoomFormSchema>;

function splitRoomNumbers(raw: string) {
  const seen = new Set<string>();
  return raw
    .split(',')
    .map((n) => n.trim())
    .filter(Boolean)
    .filter((n) => {
      if (seen.has(n)) return false;
      seen.add(n);
      return true;
    });
}

function RoomIcon() {
  return (
    <Svg width={17} height={17} viewBox="0 0 24 24" fill="none" stroke={colors.navy} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Rect x={4} y={2} width={16} height={20} rx={1} />
      <Path d="M9 22v-4h6v4" />
    </Svg>
  );
}
function CloseIcon() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={colors.textMuted} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M6 6l12 12M18 6L6 18" />
    </Svg>
  );
}
function CheckIcon() {
  return (
    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M12 5v14M5 12h14" />
    </Svg>
  );
}
function BedIcon() {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={colors.navy} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M3 18v-6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v6" />
      <Path d="M3 18h18M5 10V6a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v4" />
    </Svg>
  );
}
function ChevronDownIcon() {
  return (
    <Svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke={colors.navy} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M6 9l6 6 6-6" />
    </Svg>
  );
}

export default function AddRoomScreen() {
  const { roomTypeId, id } = useLocalSearchParams<{ roomTypeId: string; id?: string }>();
  const { data: roomTypeData, isLoading } = useQuery({
    queryKey: ['room-type', roomTypeId],
    queryFn: () => getRoomType(roomTypeId),
    enabled: !!roomTypeId,
  });

  if (id) {
    if (isLoading || !roomTypeData) {
      return (
        <View style={styles.notFound}>
          <ActivityIndicator color={colors.navy} />
        </View>
      );
    }
    const room = roomTypeData.rooms.find((r) => r._id === id);
    if (!room) {
      return (
        <View style={styles.notFound}>
          <Text style={styles.notFoundText}>Room not found.</Text>
        </View>
      );
    }
    return <EditRoomForm room={room} roomTypeId={roomTypeId} roomTypeName={roomTypeData.type.name} />;
  }

  return <AddRoomForm roomTypeId={roomTypeId} roomTypeName={roomTypeData?.type.name} />;
}

function AddRoomForm({ roomTypeId, roomTypeName }: { roomTypeId: string; roomTypeName?: string }) {
  const queryClient = useQueryClient();

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<AddRoomFormValues>({
    resolver: zodResolver(addRoomFormSchema),
    defaultValues: { numbers: '', desc: '' },
  });

  const mutation = useMutation({
    mutationFn: async (values: AddRoomFormValues) => {
      const numbers = splitRoomNumbers(values.numbers);
      for (const number of numbers) {
        // Sequential on purpose: if one number fails (e.g. already
        // exists), the ones before it are still created and the user
        // sees exactly which one stopped it, rather than a partial
        // Promise.all failure silently interleaving successes and
        // failures.
        await addRoom(number, roomTypeId, values.desc || undefined);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['room-type', roomTypeId] });
      router.back();
    },
  });

  return (
    <KeyboardSafeView style={styles.screen}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.headerIcon}>
            <RoomIcon />
          </View>
          <View style={styles.headerText}>
            <Text style={styles.headerTitle}>Add room</Text>
            <Text style={styles.headerSubtitle}>Add a physical room to an existing room type</Text>
          </View>
        </View>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <CloseIcon />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={styles.contextPill}>
          <BedIcon />
          <Text style={styles.contextText}>
            Adding to <Text style={styles.contextTextBold}>{roomTypeName ?? '…'}</Text>
          </Text>
          <View style={styles.contextChevron}>
            <ChevronDownIcon />
          </View>
        </View>

        <View style={styles.field}>
          <Text style={styles.fieldLabel}>ROOM NUMBER</Text>
          <Controller
            control={control}
            name="numbers"
            render={({ field: { value, onChange, onBlur } }) => (
              <TextInput
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                placeholder="e.g. 12B or 101, 102, 103"
                placeholderTextColor={colors.textFaint}
                style={styles.inputPrimary}
              />
            )}
          />
          <Text style={styles.helperText}>Separate with commas to add several rooms at once</Text>
          {errors.numbers && <Text style={styles.fieldError}>{errors.numbers.message}</Text>}
        </View>

        <View style={styles.field}>
          <Text style={styles.fieldLabel}>
            DESCRIPTION <Text style={styles.optionalLabel}>optional</Text>
          </Text>
          <Controller
            control={control}
            name="desc"
            render={({ field: { value, onChange, onBlur } }) => (
              <TextInput
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                placeholder="Anything staff should know about this specific room"
                placeholderTextColor={colors.textFaint}
                multiline
                style={styles.textArea}
              />
            )}
          />
        </View>

        {mutation.isError && <Text style={styles.submitErrorText}>{mutation.error.message}</Text>}
      </ScrollView>

      <View style={styles.footer}>
        <Pressable style={styles.cancelButton} onPress={() => router.back()} disabled={mutation.isPending}>
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </Pressable>
        <Pressable style={styles.submitButton} onPress={handleSubmit((values) => mutation.mutate(values))} disabled={mutation.isPending}>
          {mutation.isPending ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <CheckIcon />
              <Text style={styles.submitButtonText}>Add room</Text>
            </>
          )}
        </Pressable>
      </View>
    </KeyboardSafeView>
  );
}

function EditRoomForm({ room, roomTypeId, roomTypeName }: { room: RoomDto; roomTypeId: string; roomTypeName: string }) {
  const queryClient = useQueryClient();

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<EditRoomFormValues>({
    resolver: zodResolver(editRoomFormSchema),
    defaultValues: { number: room.number, desc: room.desc ?? '' },
  });

  const mutation = useMutation({
    mutationFn: (values: EditRoomFormValues) => updateRoom(room._id, values.number.trim(), roomTypeId, values.desc || undefined),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['room-type', roomTypeId] });
      router.back();
    },
  });

  return (
    <KeyboardSafeView style={styles.screen}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.headerIcon}>
            <RoomIcon />
          </View>
          <View style={styles.headerText}>
            <Text style={styles.headerTitle}>Edit room</Text>
            <Text style={styles.headerSubtitle}>Update this room&apos;s number or description</Text>
          </View>
        </View>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <CloseIcon />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={styles.contextPill}>
          <BedIcon />
          <Text style={styles.contextText}>
            Room under <Text style={styles.contextTextBold}>{roomTypeName}</Text>
          </Text>
        </View>

        <View style={styles.field}>
          <Text style={styles.fieldLabel}>ROOM NUMBER</Text>
          <Controller
            control={control}
            name="number"
            render={({ field: { value, onChange, onBlur } }) => (
              <TextInput
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                placeholder="e.g. 12B"
                placeholderTextColor={colors.textFaint}
                style={styles.inputPrimary}
              />
            )}
          />
          {errors.number && <Text style={styles.fieldError}>{errors.number.message}</Text>}
        </View>

        <View style={styles.field}>
          <Text style={styles.fieldLabel}>
            DESCRIPTION <Text style={styles.optionalLabel}>optional</Text>
          </Text>
          <Controller
            control={control}
            name="desc"
            render={({ field: { value, onChange, onBlur } }) => (
              <TextInput
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                placeholder="Anything staff should know about this specific room"
                placeholderTextColor={colors.textFaint}
                multiline
                style={styles.textArea}
              />
            )}
          />
        </View>

        {mutation.isError && <Text style={styles.submitErrorText}>{mutation.error.message}</Text>}
      </ScrollView>

      <View style={styles.footer}>
        <Pressable style={styles.cancelButton} onPress={() => router.back()} disabled={mutation.isPending}>
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </Pressable>
        <Pressable style={styles.submitButton} onPress={handleSubmit((values) => mutation.mutate(values))} disabled={mutation.isPending}>
          {mutation.isPending ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <CheckIcon />
              <Text style={styles.submitButtonText}>Save changes</Text>
            </>
          )}
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
  notFound: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    paddingHorizontal: 20,
  },
  notFoundText: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerLeft: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
    flexShrink: 1,
  },
  headerIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.navySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    flexShrink: 1,
  },
  headerTitle: {
    fontFamily: fonts.headingExtraBold,
    fontSize: 17,
    color: colors.navyInk,
  },
  headerSubtitle: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 3,
  },
  body: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 24,
  },
  contextPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.navySoft,
    borderRadius: 11,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  contextText: {
    fontFamily: fonts.bodyBold,
    fontSize: 13.5,
    color: colors.navy,
  },
  contextTextBold: {
    fontFamily: fonts.headingBold,
  },
  contextChevron: {
    marginLeft: 'auto',
  },
  field: {
    marginTop: 20,
  },
  fieldLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: 10,
    color: colors.textFaint,
    letterSpacing: 0.5,
  },
  optionalLabel: {
    fontFamily: fonts.bodyMedium,
    fontSize: 10,
    color: colors.textFaint,
    letterSpacing: 0,
    textTransform: 'none',
  },
  fieldError: {
    marginTop: 6,
    fontFamily: fonts.bodyMedium,
    fontSize: 11.5,
    color: colors.danger,
  },
  helperText: {
    marginTop: 6,
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.textFaint,
  },
  submitErrorText: {
    marginTop: 18,
    fontFamily: fonts.bodySemibold,
    fontSize: 12.5,
    color: colors.danger,
    textAlign: 'center',
  },
  inputPrimary: {
    marginTop: 8,
    height: 46,
    borderWidth: 1.6,
    borderColor: colors.navy,
    borderRadius: radii.input,
    paddingHorizontal: 14,
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.text,
  },
  textArea: {
    marginTop: 8,
    minHeight: 80,
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
