import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm, useWatch, type Control } from 'react-hook-form';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { z } from 'zod';

import {
  customFieldValuesToMap,
  toCustomFieldValuesPayload,
  validateCustomFieldValues,
  type CustomFieldDto,
} from '@/api/custom-fields';
import {
  createReservation,
  updateReservation,
  type RateType,
  type Reservation,
  type ReservationPayload,
} from '@/api/reservations';
import { checkAvailability, roomTypePrice, type AvailableRoomDto } from '@/api/rooms';
import { KeyboardSafeView } from '@/components/keyboard-safe-view';
import { colors, fonts, radii } from '@/design/theme';
import { useCustomFields } from '@/hooks/use-custom-fields';
import { useInvalidateReservationActivity } from '@/hooks/use-reservation-activity';
import { useReservations } from '@/hooks/use-reservations';

// -----------------------------------------------------------------------
// EditGuest.html, opened two ways:
//   1. Edit mode — from the Reservation Detail hub's pencil icon, with an
//      `id` param. Per design/design-reference/reservations.md: "Save
//      changes → back to ReservationDetail.html, fields updated." Date of
//      Arrival/Departure and Room stay plain read-only rows here — the
//      mockup gives Room a chevron and a note ("Use 'Change room' from the
//      guest card to move this reservation"), implying stay-defining
//      fields are changed through a separate flow, not this form. Those
//      two fields are sent back unchanged on save, since this screen has
//      no control that could change them in edit mode.
//   2. Create mode — no `id` param, reused as the "new reservation" form
//      (Home's floating "New reservation" button, and Check Availability's
//      "Continue"). There's no ReservationDetail to defer stay-defining
//      fields to yet, so Room/Arrival/Departure become real editable
//      controls here instead: a day-stepper for the dates, and a picker
//      backed by GET /rooms/availability (see src/api/rooms.ts) for Room,
//      refetched every time the dates change. Check Availability's
//      "Continue" pre-fills the dates and a real room _id via route
//      params — preselected here if it's still in this screen's own
//      (re-fetched) availability list for those same dates, falling back
//      to the first result otherwise (e.g. if the dates were nudged).
//
// Both modes talk to the real API (POST/PUT /check-ins) — see
// createReservation/updateReservation in src/api/reservations.ts. The
// guest-detail fields (first/last name, email, phone) go through
// react-hook-form + zod, matching hms-backend-node's own CheckInSchema
// constraints (firstName required, email valid if present, phone at
// least 11 digits if present).
//
// "Additional details" now renders this company's actual reservation-form
// custom fields (Settings → Custom fields on the web; GET /custom-fields
// ?form=RESERVATION here — see src/api/custom-fields.ts), the same fields
// hms-frontend-react's CheckInForm.js renders via CustomFieldRenderer.
// Kept outside react-hook-form/zod, same reasoning as that web
// implementation: the set of fields is config-driven, not known at
// compile time, so it's a plain value-map + a manual required-field check
// mirroring the backend's own validateRequiredCustomFields. The section
// doesn't render at all when a company has none.
// -----------------------------------------------------------------------

const guestSchema = z.object({
  firstName: z.string().min(1, { error: 'First name is required' }),
  lastName: z.string().optional(),
  email: z
    .string()
    .optional()
    .refine((v) => !v || z.email().safeParse(v).success, { error: 'Enter a valid email address' }),
  phone: z
    .string()
    .optional()
    .refine((v) => !v || v.length >= 11, { error: 'Phone number must be at least 11 digits' }),
  note: z.string().optional(),
});
type GuestFormValues = z.infer<typeof guestSchema>;

function CloseIcon() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={colors.textMuted} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M6 6l12 12M18 6L6 18" />
    </Svg>
  );
}
function PersonIcon() {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Circle cx={12} cy={8} r={4} />
      <Path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7" />
    </Svg>
  );
}
function CalendarSectionIcon() {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Rect x={3} y={5} width={18} height={16} rx={2} />
      <Path d="M3 10h18M8 3v4M16 3v4" />
    </Svg>
  );
}
function DetailsSectionIcon() {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Rect x={4} y={4} width={16} height={16} rx={2} />
      <Path d="M8 9h8M8 13h5" />
    </Svg>
  );
}
function CalendarFieldIcon() {
  return (
    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={colors.textFaint} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Rect x={3} y={5} width={18} height={16} rx={2} />
      <Path d="M3 10h18" />
    </Svg>
  );
}
function ChevronDownIcon() {
  return (
    <Svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke={colors.textFaint} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M6 9l6 6 6-6" />
    </Svg>
  );
}
function ChevronLeftIcon() {
  return (
    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={colors.navy} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M15 18l-6-6 6-6" />
    </Svg>
  );
}
function ChevronRightIcon() {
  return (
    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={colors.navy} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M9 18l6-6-6-6" />
    </Svg>
  );
}
function PlusIcon({ color = colors.navy }: { color?: string }) {
  return (
    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M12 5v14M5 12h14" />
    </Svg>
  );
}
function SaveIcon() {
  return (
    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
      <Path d="M17 21v-8H7v8M7 3v5h8" />
    </Svg>
  );
}

function SectionHeader({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionHeaderIcon}>{icon}</View>
      <Text style={styles.sectionHeaderTitle}>{title}</Text>
    </View>
  );
}

// The four guest-detail fields that actually map to a backend field
// (CheckInSchema) and are validated with it — see guestSchema above.
// Everything else in "Additional details" has no backend counterpart and
// still uses the plain FormField below.
function ControlledFormField({
  control,
  name,
  label,
  placeholder,
  keyboardType,
  error,
}: {
  control: Control<GuestFormValues>;
  name: keyof GuestFormValues;
  label: string;
  placeholder?: string;
  keyboardType?: 'default' | 'numeric' | 'email-address' | 'phone-pad';
  error?: string;
}) {
  return (
    <View>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Controller
        control={control}
        name={name}
        render={({ field: { value, onChange, onBlur } }) => (
          <TextInput
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            placeholder={placeholder}
            placeholderTextColor={colors.textFaint}
            keyboardType={keyboardType}
            autoCapitalize={name === 'email' ? 'none' : 'words'}
            style={styles.input}
          />
        )}
      />
      {error && <Text style={styles.fieldError}>{error}</Text>}
    </View>
  );
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <View>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.readOnlyRow}>
        <CalendarFieldIcon />
        <Text style={styles.readOnlyValue}>{value}</Text>
      </View>
    </View>
  );
}

function formatFullDate(d: Date) {
  return d.toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' });
}

// Create-mode-only: no date-picker component exists in this app, so
// stay-defining dates are set with a simple day-at-a-time stepper instead
// of a calendar.
function DateStepperField({
  label,
  value,
  onStep,
}: {
  label: string;
  value: Date;
  onStep: (direction: -1 | 1) => void;
}) {
  return (
    <View>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.stepperRow}>
        <Pressable hitSlop={8} onPress={() => onStep(-1)}>
          <ChevronLeftIcon />
        </Pressable>
        <View style={styles.stepperValueWrap}>
          <CalendarFieldIcon />
          <Text style={styles.readOnlyValue}>{formatFullDate(value)}</Text>
        </View>
        <Pressable hitSlop={8} onPress={() => onStep(1)}>
          <ChevronRightIcon />
        </Pressable>
      </View>
    </View>
  );
}

function stepDateString(current: Date, direction: -1 | 1) {
  const next = new Date(current);
  next.setDate(next.getDate() + direction);
  return next.toISOString().slice(0, 10);
}

function CustomFieldHelperOrError({ field, error }: { field: CustomFieldDto; error?: string }) {
  if (error) return <Text style={styles.fieldError}>{error}</Text>;
  if (field.helper) return <Text style={styles.customFieldHelper}>{field.helper}</Text>;
  return null;
}

// One company-defined reservation-form field (Settings → Custom fields),
// rendered per its `type` — mirrors hms-frontend-react's
// CustomFieldRenderer.js exactly, including which value shape each type
// carries (string/number/boolean/string[]).
function CustomFieldInput({
  field,
  value,
  onChange,
  error,
}: {
  field: CustomFieldDto;
  value: unknown;
  onChange: (value: unknown) => void;
  error?: string;
}) {
  const label = (
    <Text style={styles.fieldLabel}>
      {field.label.toUpperCase()}
      {field.required ? <Text style={styles.fieldRequiredMark}> *</Text> : null}
    </Text>
  );

  switch (field.type) {
    case 'LONG_TEXT':
      return (
        <View>
          {label}
          <TextInput
            value={typeof value === 'string' ? value : ''}
            onChangeText={onChange}
            placeholder="Your answer"
            placeholderTextColor={colors.textFaint}
            multiline
            style={[styles.input, styles.customLongTextInput]}
          />
          <CustomFieldHelperOrError field={field} error={error} />
        </View>
      );

    case 'NUMBER':
      return (
        <View>
          {label}
          <TextInput
            value={value === undefined || value === null ? '' : String(value)}
            onChangeText={(v) => onChange(v === '' ? undefined : Number(v))}
            placeholder="0"
            placeholderTextColor={colors.textFaint}
            keyboardType="numeric"
            style={styles.input}
          />
          <CustomFieldHelperOrError field={field} error={error} />
        </View>
      );

    case 'DATE': {
      const dateValue = typeof value === 'string' && value ? new Date(value) : null;
      return (
        <View>
          {label}
          {dateValue ? (
            <View style={styles.stepperRow}>
              <Pressable hitSlop={8} onPress={() => onChange(stepDateString(dateValue, -1))}>
                <ChevronLeftIcon />
              </Pressable>
              <View style={styles.stepperValueWrap}>
                <CalendarFieldIcon />
                <Text style={styles.readOnlyValue}>{formatFullDate(dateValue)}</Text>
              </View>
              <Pressable hitSlop={8} onPress={() => onChange(stepDateString(dateValue, 1))}>
                <ChevronRightIcon />
              </Pressable>
            </View>
          ) : (
            <Pressable
              style={styles.roomRow}
              onPress={() => onChange(new Date().toISOString().slice(0, 10))}>
              <Text style={styles.customDatePlaceholder}>Tap to set a date</Text>
              <CalendarFieldIcon />
            </Pressable>
          )}
          <CustomFieldHelperOrError field={field} error={error} />
        </View>
      );
    }

    case 'SINGLE_SELECT':
      return (
        <View>
          {label}
          <View style={styles.chipRow}>
            {(field.options ?? []).map((option) => {
              const active = value === option;
              return (
                <Pressable
                  key={option}
                  style={[styles.occasionChip, active && styles.occasionChipActive]}
                  onPress={() => onChange(option)}>
                  <Text style={[styles.occasionChipText, active && styles.occasionChipTextActive]}>{option}</Text>
                </Pressable>
              );
            })}
          </View>
          <CustomFieldHelperOrError field={field} error={error} />
        </View>
      );

    case 'MULTI_SELECT': {
      const selected = Array.isArray(value) ? (value as string[]) : [];
      return (
        <View>
          {label}
          <View style={styles.chipRow}>
            {(field.options ?? []).map((option) => {
              const active = selected.includes(option);
              return (
                <Pressable
                  key={option}
                  style={[styles.occasionChip, active && styles.occasionChipActive]}
                  onPress={() =>
                    onChange(active ? selected.filter((o) => o !== option) : [...selected, option])
                  }>
                  <Text style={[styles.occasionChipText, active && styles.occasionChipTextActive]}>{option}</Text>
                </Pressable>
              );
            })}
          </View>
          <CustomFieldHelperOrError field={field} error={error} />
        </View>
      );
    }

    case 'YES_NO':
      return (
        <View>
          {label}
          <View style={styles.yesNoRow}>
            <Pressable
              style={[styles.yesNoButton, value === true && styles.yesNoButtonActive]}
              onPress={() => onChange(true)}>
              <Text style={[styles.yesNoText, value === true && styles.yesNoTextActive]}>Yes</Text>
            </Pressable>
            <Pressable
              style={[styles.yesNoButton, value === false && styles.yesNoButtonActive]}
              onPress={() => onChange(false)}>
              <Text style={[styles.yesNoText, value === false && styles.yesNoTextActive]}>No</Text>
            </Pressable>
          </View>
          <CustomFieldHelperOrError field={field} error={error} />
        </View>
      );

    case 'SHORT_TEXT':
    default:
      return (
        <View>
          {label}
          <TextInput
            value={typeof value === 'string' ? value : ''}
            onChangeText={onChange}
            placeholder="Your answer"
            placeholderTextColor={colors.textFaint}
            style={styles.input}
          />
          <CustomFieldHelperOrError field={field} error={error} />
        </View>
      );
  }
}

function splitGuestName(fullName: string) {
  const parts = fullName.trim().split(/\s+/);
  // Drop a leading title (Mr/Mrs/Miss/Ms/Dr) if present.
  if (/^(Mr|Mrs|Miss|Ms|Dr)\.?$/i.test(parts[0]) && parts.length > 1) {
    parts.shift();
  }
  return {
    firstName: parts[0] ?? '',
    lastName: parts.slice(1).join(' '),
  };
}

function getInitials(fullName: string) {
  const { firstName, lastName } = splitGuestName(fullName);
  return `${firstName[0] ?? ''}${lastName[0] ?? ''}`.toUpperCase();
}

// Gates on the async reservation fetch (edit mode) before EditGuestForm
// ever mounts, so that form's useForm() can use the resolved reservation
// as its defaultValues directly instead of juggling a reset() once data
// shows up later — avoids either a blank flash or overwriting in-progress
// edits if the shared ['reservations'] query happens to refetch in the
// background while the user is typing.
export default function EditGuestScreen() {
  // `room` arrives via this route's params from Check Availability's
  // "Continue" — a real room _id now that that screen searches GET
  // /rooms/availability itself, so EditGuestForm preselects it if it's
  // still in its own (re-fetched, for the same dates) availability list.
  const {
    id,
    room: roomParam,
    checkIn: checkInParam,
    checkOut: checkOutParam,
  } = useLocalSearchParams<{
    id?: string;
    room?: string;
    checkIn?: string;
    checkOut?: string;
  }>();
  const isCreateMode = !id;
  const { data: reservations, isLoading } = useReservations();
  const reservation = id ? reservations?.find((r) => r.id === id) : undefined;

  if (!isCreateMode && isLoading) {
    return (
      <View style={styles.notFound}>
        <ActivityIndicator color={colors.navy} />
      </View>
    );
  }

  if (!isCreateMode && !reservation) {
    return (
      <View style={styles.notFound}>
        <Text style={styles.notFoundText}>Reservation not found.</Text>
      </View>
    );
  }

  return (
    <EditGuestForm
      isCreateMode={isCreateMode}
      reservation={reservation}
      roomParam={roomParam}
      checkInParam={checkInParam}
      checkOutParam={checkOutParam}
    />
  );
}

function EditGuestForm({
  isCreateMode,
  reservation,
  roomParam,
  checkInParam,
  checkOutParam,
}: {
  isCreateMode: boolean;
  reservation: Reservation | undefined;
  roomParam?: string;
  checkInParam?: string;
  checkOutParam?: string;
}) {
  const queryClient = useQueryClient();
  const initial = splitGuestName(reservation?.guestName ?? '');
  const {
    control,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<GuestFormValues>({
    resolver: zodResolver(guestSchema),
    defaultValues: {
      firstName: initial.firstName,
      lastName: initial.lastName,
      email: reservation?.email ?? '',
      phone: reservation?.phone ?? '',
      note: reservation?.note ?? '',
    },
  });

  const customFieldsQuery = useCustomFields('RESERVATION');
  const customFields = customFieldsQuery.data ?? [];
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, unknown>>(() =>
    customFieldValuesToMap(reservation?.customFieldValues),
  );
  const [customFieldErrors, setCustomFieldErrors] = useState<Record<string, string>>({});

  function setCustomFieldValue(fieldId: string, value: unknown) {
    setCustomFieldValues((prev) => ({ ...prev, [fieldId]: value }));
    setCustomFieldErrors((prev) => ({ ...prev, [fieldId]: '' }));
  }

  const defaultArrival = new Date();
  const defaultDeparture = new Date(defaultArrival);
  defaultDeparture.setDate(defaultDeparture.getDate() + 1);

  const [arrivalDate, setArrivalDate] = useState(
    reservation?.arrivalDate ?? (checkInParam ? new Date(checkInParam) : defaultArrival),
  );
  const [departureDate, setDepartureDate] = useState(
    reservation?.departureDate ?? (checkOutParam ? new Date(checkOutParam) : defaultDeparture),
  );
  const [roomPickerOpen, setRoomPickerOpen] = useState(false);
  // Overrides the availability query's default (first result) once the
  // user actually picks a room — cleared whenever the dates change, since
  // a room available for one range may not be for another.
  const [roomIdOverride, setRoomIdOverride] = useState<string | null>(null);

  const availabilityQuery = useQuery({
    queryKey: ['rooms-availability', arrivalDate.toISOString(), departureDate.toISOString()],
    queryFn: () => checkAvailability(arrivalDate.toISOString(), departureDate.toISOString()),
    enabled: isCreateMode,
  });
  const availableRooms: AvailableRoomDto[] = availabilityQuery.data?.rooms ?? [];
  const roomParamStillAvailable = roomParam && availableRooms.some((r) => r._id === roomParam);
  const selectedRoomId =
    roomIdOverride ?? (roomParamStillAvailable ? roomParam : availableRooms[0]?._id) ?? null;
  const selectedRoom = availableRooms.find((r) => r._id === selectedRoomId) ?? null;

  // "Add custom rate"/"Add a note" — collapsed disclosures matching
  // hms-frontend-react's CheckInForm.js exactly: open by default only when
  // editing a reservation that already has that data set.
  const [showRate, setShowRate] = useState(reservation?.rateType === 'CUSTOM');
  const [showNote, setShowNote] = useState(Boolean(reservation?.note));
  const [rateType, setRateType] = useState<RateType>(reservation?.rateType ?? 'FLAT');
  const [rateAmount, setRateAmount] = useState(reservation?.rateAmount != null ? String(reservation.rateAmount) : '');
  const [rateError, setRateError] = useState<string | undefined>();

  // Keeps the displayed rate in sync with the selected room's own price
  // while on Flat rate — same as CheckInForm.js's flatRate effect. Typing
  // a different amount is what flips this to Custom rate (see the input's
  // onChangeText below); there's no live room-price lookup to sync against
  // in edit mode (Room is read-only there), so this only applies on create.
  // Adjusted during render rather than in a useEffect, per
  // https://react.dev/learn/you-might-not-need-an-effect#adjusting-state-when-a-prop-changes
  // (same pattern already used in custom-fields.tsx for the same reason).
  const flatRateSyncKey = `${rateType}:${selectedRoom?._id ?? ''}`;
  const [prevFlatRateSyncKey, setPrevFlatRateSyncKey] = useState(flatRateSyncKey);
  if (isCreateMode && rateType === 'FLAT' && flatRateSyncKey !== prevFlatRateSyncKey) {
    setPrevFlatRateSyncKey(flatRateSyncKey);
    setRateAmount(selectedRoom ? String(roomTypePrice(selectedRoom.roomTypeId)) : '');
  } else if (flatRateSyncKey !== prevFlatRateSyncKey) {
    setPrevFlatRateSyncKey(flatRateSyncKey);
  }

  const invalidateActivity = useInvalidateReservationActivity();
  const saveMutation = useMutation({
    mutationFn: (payload: ReservationPayload) =>
      reservation ? updateReservation(reservation.id, payload) : createReservation(payload),
    onSuccess: ({ checkIn }) => {
      queryClient.invalidateQueries({ queryKey: ['reservations'] });
      if (isCreateMode) {
        router.replace(`/reservation/${checkIn._id}`);
      } else {
        if (reservation) invalidateActivity(reservation.id);
        router.back();
      }
    },
  });

  function onSubmit(values: GuestFormValues) {
    const roomId = isCreateMode ? selectedRoomId : reservation?.roomId;
    if (!roomId) return;

    const fieldErrors = validateCustomFieldValues(customFields, customFieldValues);
    if (Object.keys(fieldErrors).length > 0) {
      setCustomFieldErrors(fieldErrors);
      return;
    }

    // Matches CheckInSchema server-side: rateAmount is only required when
    // rateType is CUSTOM (FLAT resolves the room type's own price instead,
    // regardless of what's in this field).
    if (showRate && rateType === 'CUSTOM' && !rateAmount.trim()) {
      setRateError('Enter a rate for this reservation');
      return;
    }
    setRateError(undefined);

    saveMutation.mutate({
      firstName: values.firstName,
      lastName: values.lastName,
      email: values.email,
      phone: values.phone,
      dateOfArrival: arrivalDate.toISOString(),
      dateOfDeparture: departureDate.toISOString(),
      room: roomId,
      customFieldValues: toCustomFieldValuesPayload(customFieldValues),
      rateType: showRate ? rateType : undefined,
      rateAmount: showRate && rateAmount.trim() ? Number(rateAmount) : undefined,
      note: showNote ? values.note || undefined : undefined,
    });
  }

  function stepArrival(direction: -1 | 1) {
    const next = new Date(arrivalDate);
    next.setDate(next.getDate() + direction);
    setArrivalDate(next);
    setRoomIdOverride(null);
    // Keep at least one night between the two dates.
    if (next >= departureDate) {
      const bumpedDeparture = new Date(next);
      bumpedDeparture.setDate(bumpedDeparture.getDate() + 1);
      setDepartureDate(bumpedDeparture);
    }
  }

  function stepDeparture(direction: -1 | 1) {
    const next = new Date(departureDate);
    next.setDate(next.getDate() + direction);
    if (next > arrivalDate) {
      setDepartureDate(next);
      setRoomIdOverride(null);
    }
  }

  const watchedFirstName = useWatch({ control, name: 'firstName' });
  const watchedLastName = useWatch({ control, name: 'lastName' });
  const guestName = `${watchedFirstName} ${watchedLastName ?? ''}`.trim();
  const previewName = guestName || 'New guest';
  const previewInitials = guestName ? getInitials(guestName) : '?';

  return (
    <KeyboardSafeView style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{isCreateMode ? 'New reservation' : 'Edit guest'}</Text>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <CloseIcon />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.body}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled">
        <SectionHeader icon={<PersonIcon />} title="Guest details" />

        <View style={styles.previewCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{previewInitials}</Text>
          </View>
          <View style={styles.previewText}>
            <Text style={styles.previewName}>{previewName}</Text>
            <Text style={styles.previewHint}>This is how they&apos;ll appear in your guest list</Text>
          </View>
        </View>

        <View style={styles.sectionCard}>
          <ControlledFormField control={control} name="firstName" label="FIRST NAME" error={errors.firstName?.message} />
          <ControlledFormField control={control} name="lastName" label="LAST NAME" error={errors.lastName?.message} />
          <ControlledFormField
            control={control}
            name="email"
            label="EMAIL"
            keyboardType="email-address"
            error={errors.email?.message}
          />
          <ControlledFormField
            control={control}
            name="phone"
            label="PHONE"
            keyboardType="phone-pad"
            error={errors.phone?.message}
          />
        </View>

        <View style={styles.sectionHeaderSpaced}>
          <SectionHeader icon={<CalendarSectionIcon />} title="Stay details" />
        </View>

        <View style={styles.sectionCard}>
          {isCreateMode ? (
            <>
              <DateStepperField label="DATE OF ARRIVAL" value={arrivalDate} onStep={stepArrival} />
              <DateStepperField label="DATE OF DEPARTURE" value={departureDate} onStep={stepDeparture} />
            </>
          ) : (
            <>
              <ReadOnlyField label="DATE OF ARRIVAL" value={formatFullDate(arrivalDate)} />
              <ReadOnlyField label="DATE OF DEPARTURE" value={formatFullDate(departureDate)} />
            </>
          )}

          <View>
            <Text style={styles.fieldLabel}>ROOM</Text>
            {isCreateMode ? (
              <>
                <Pressable
                  style={styles.roomRow}
                  disabled={availabilityQuery.isLoading || availableRooms.length === 0}
                  onPress={() => setRoomPickerOpen((v) => !v)}>
                  <Text style={styles.roomValue}>
                    {availabilityQuery.isLoading
                      ? 'Checking availability…'
                      : selectedRoom
                        ? `Room ${selectedRoom.number}`
                        : 'No rooms available'}
                  </Text>
                  <ChevronDownIcon />
                </Pressable>
                {roomPickerOpen && availableRooms.length > 0 && (
                  <View style={styles.roomOptions}>
                    {availableRooms.map((r) => (
                      <Pressable
                        key={r._id}
                        style={styles.roomOption}
                        onPress={() => {
                          setRoomIdOverride(r._id);
                          setRoomPickerOpen(false);
                        }}>
                        <Text style={styles.roomOptionText}>Room {r.number}</Text>
                        <Text style={styles.roomOptionMeta}>{r.roomTypeId?.name ?? 'Room'}</Text>
                      </Pressable>
                    ))}
                  </View>
                )}
                {availabilityQuery.isError && (
                  <Text style={styles.roomHint}>{availabilityQuery.error.message}</Text>
                )}
              </>
            ) : (
              <>
                <View style={styles.roomRow}>
                  <Text style={styles.roomValue}>Room {reservation?.room}</Text>
                  <ChevronDownIcon />
                </View>
                <Text style={styles.roomHint}>
                  Use &quot;Change room&quot; from the guest card to move this reservation.
                </Text>
              </>
            )}
          </View>

          <View style={styles.divider} />

          {showRate ? (
            <View style={styles.disclosureOpen}>
              <View style={styles.disclosureHeaderRow}>
                <Text style={styles.disclosureTitle}>Custom rate</Text>
                <Pressable
                  onPress={() => {
                    setShowRate(false);
                    setRateType('FLAT');
                    setRateError(undefined);
                  }}
                  hitSlop={8}>
                  <CloseIcon />
                </Pressable>
              </View>
              <View style={styles.rateRow}>
                <View style={styles.rateTypeField}>
                  <Text style={styles.fieldLabel}>RATE TYPE</Text>
                  <View style={styles.rateTypeToggle}>
                    {(['FLAT', 'CUSTOM'] as RateType[]).map((type) => (
                      <Pressable
                        key={type}
                        style={[styles.rateTypeOption, rateType === type && styles.rateTypeOptionActive]}
                        onPress={() => setRateType(type)}>
                        <Text style={[styles.rateTypeOptionText, rateType === type && styles.rateTypeOptionTextActive]}>
                          {type === 'FLAT' ? 'Flat rate' : 'Custom rate'}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
                <View style={styles.rateAmountField}>
                  <Text style={styles.fieldLabel}>RATE / NIGHT</Text>
                  <TextInput
                    value={rateAmount}
                    onChangeText={(text) => {
                      setRateAmount(text);
                      setRateError(undefined);
                      if (rateType !== 'CUSTOM') setRateType('CUSTOM');
                    }}
                    placeholder={isCreateMode && !selectedRoom ? 'Select a room first' : 'Rate per night'}
                    placeholderTextColor={colors.textFaint}
                    keyboardType="numeric"
                    style={styles.input}
                  />
                </View>
              </View>
              {rateError && <Text style={styles.fieldError}>{rateError}</Text>}
            </View>
          ) : (
            <Pressable style={styles.linkRow} onPress={() => setShowRate(true)}>
              <PlusIcon />
              <Text style={styles.linkText}>Add custom rate</Text>
            </Pressable>
          )}

          {showNote ? (
            <View style={styles.disclosureOpen}>
              <View style={styles.disclosureHeaderRow}>
                <Text style={styles.disclosureTitle}>Note</Text>
                <Pressable
                  onPress={() => {
                    setShowNote(false);
                    setValue('note', '');
                  }}
                  hitSlop={8}>
                  <CloseIcon />
                </Pressable>
              </View>
              <Controller
                control={control}
                name="note"
                render={({ field: { value, onChange, onBlur } }) => (
                  <TextInput
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    placeholder="Add your note"
                    placeholderTextColor={colors.textFaint}
                    multiline
                    style={styles.noteInput}
                  />
                )}
              />
            </View>
          ) : (
            <Pressable style={styles.linkRow} onPress={() => setShowNote(true)}>
              <PlusIcon />
              <Text style={styles.linkText}>Add a note</Text>
            </Pressable>
          )}
        </View>

        {customFieldsQuery.isLoading ? (
          <View style={styles.customFieldsLoading}>
            <ActivityIndicator color={colors.navy} />
          </View>
        ) : customFieldsQuery.isError ? (
          <Text style={styles.roomHint}>{customFieldsQuery.error.message}</Text>
        ) : (
          customFields.length > 0 && (
            <>
              <View style={styles.additionalHeader}>
                <SectionHeader icon={<DetailsSectionIcon />} title="Additional details" />
                <View style={styles.customBadge}>
                  <Text style={styles.customBadgeText}>CUSTOM</Text>
                </View>
              </View>

              <View style={styles.customSectionCard}>
                {customFields.map((field) => (
                  <CustomFieldInput
                    key={field._id}
                    field={field}
                    value={customFieldValues[field._id]}
                    onChange={(value) => setCustomFieldValue(field._id, value)}
                    error={customFieldErrors[field._id]}
                  />
                ))}
              </View>
            </>
          )
        )}
      </ScrollView>

      {saveMutation.isError && <Text style={styles.submitErrorText}>{saveMutation.error.message}</Text>}

      <View style={styles.footer}>
        <Pressable style={styles.cancelButton} onPress={() => router.back()} disabled={saveMutation.isPending}>
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </Pressable>
        <Pressable
          style={[styles.saveButton, saveMutation.isPending && styles.saveButtonDisabled]}
          onPress={handleSubmit(onSubmit)}
          disabled={saveMutation.isPending || (isCreateMode && !selectedRoomId)}>
          {saveMutation.isPending ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              {isCreateMode ? <PlusIcon color="#FFFFFF" /> : <SaveIcon />}
              <Text style={styles.saveButtonText}>{isCreateMode ? 'Create reservation' : 'Save changes'}</Text>
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
  },
  notFoundText: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.textMuted,
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
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sectionHeaderSpaced: {
    marginTop: 26,
  },
  sectionHeaderIcon: {
    width: 32,
    height: 32,
    borderRadius: 9,
    backgroundColor: colors.navy,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionHeaderTitle: {
    fontFamily: fonts.headingBold,
    fontSize: 15,
    color: colors.navyInk,
  },
  previewCard: {
    marginTop: 12,
    backgroundColor: colors.bg,
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.navy,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontFamily: fonts.bodyBold,
    fontSize: 14,
    color: '#FFFFFF',
  },
  previewText: {
    flexShrink: 1,
  },
  previewName: {
    fontFamily: fonts.headingBold,
    fontSize: 14.5,
    color: colors.navyInk,
  },
  previewHint: {
    fontFamily: fonts.body,
    fontSize: 11.5,
    color: colors.textMuted,
    marginTop: 2,
  },
  sectionCard: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.card,
    padding: 16,
    gap: 12,
  },
  customSectionCard: {
    marginTop: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.border,
    borderRadius: radii.card,
    backgroundColor: colors.bg,
    padding: 16,
    gap: 12,
  },
  customFieldsLoading: {
    marginTop: 26,
    alignItems: 'center',
  },
  fieldLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: 10,
    color: colors.textFaint,
    letterSpacing: 0.5,
  },
  fieldRequiredMark: {
    color: colors.coral,
  },
  fieldError: {
    marginTop: 5,
    fontFamily: fonts.bodyMedium,
    fontSize: 11.5,
    color: colors.danger,
  },
  customFieldHelper: {
    marginTop: 5,
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.textFaint,
  },
  customLongTextInput: {
    height: 84,
    paddingTop: 10,
    textAlignVertical: 'top',
  },
  customDatePlaceholder: {
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
    color: colors.textFaint,
  },
  input: {
    marginTop: 6,
    height: 44,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.text,
    backgroundColor: colors.surface,
  },
  readOnlyRow: {
    marginTop: 6,
    height: 44,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  readOnlyValue: {
    fontFamily: fonts.bodyBold,
    fontSize: 13.5,
    color: colors.navyInk,
  },
  roomRow: {
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
  roomValue: {
    fontFamily: fonts.bodyBold,
    fontSize: 14,
    color: colors.navyInk,
  },
  roomHint: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.textFaint,
    marginTop: 6,
    lineHeight: 15.4,
  },
  roomOptions: {
    marginTop: 6,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    overflow: 'hidden',
  },
  roomOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  roomOptionText: {
    fontFamily: fonts.bodyBold,
    fontSize: 14,
    color: colors.text,
  },
  roomOptionMeta: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.textMuted,
  },
  stepperRow: {
    marginTop: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  stepperValueWrap: {
    flex: 1,
    height: 44,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  linkText: {
    fontFamily: fonts.bodyBold,
    fontSize: 13.5,
    color: colors.navy,
  },
  disclosureOpen: {
    gap: 12,
  },
  disclosureHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  disclosureTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: 13.5,
    color: colors.navyInk,
  },
  rateRow: {
    flexDirection: 'row',
    gap: 10,
  },
  rateTypeField: {
    flex: 1,
  },
  rateAmountField: {
    flex: 1,
  },
  rateTypeToggle: {
    marginTop: 6,
    flexDirection: 'row',
    backgroundColor: colors.bg,
    borderRadius: 10,
    padding: 3,
  },
  rateTypeOption: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 8,
  },
  rateTypeOptionActive: {
    backgroundColor: colors.navy,
  },
  rateTypeOptionText: {
    fontFamily: fonts.bodyBold,
    fontSize: 11.5,
    color: colors.textMuted,
  },
  rateTypeOptionTextActive: {
    color: '#FFFFFF',
  },
  noteInput: {
    marginTop: 6,
    minHeight: 80,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.text,
    backgroundColor: colors.surface,
    textAlignVertical: 'top',
  },
  additionalHeader: {
    marginTop: 26,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  customBadge: {
    backgroundColor: colors.purpleSoft,
    borderRadius: 999,
    paddingVertical: 3,
    paddingHorizontal: 10,
  },
  customBadgeText: {
    fontFamily: fonts.bodyBold,
    fontSize: 9.5,
    color: colors.purple,
  },
  yesNoRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
  },
  yesNoButton: {
    flex: 1,
    height: 44,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  yesNoButtonActive: {
    backgroundColor: colors.navy,
    borderColor: colors.navy,
  },
  yesNoText: {
    fontFamily: fonts.bodyBold,
    fontSize: 13.5,
    color: colors.textMuted,
  },
  yesNoTextActive: {
    color: '#FFFFFF',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  occasionChip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 14,
    backgroundColor: colors.surface,
  },
  occasionChipActive: {
    backgroundColor: colors.navy,
    borderColor: colors.navy,
  },
  occasionChipText: {
    fontFamily: fonts.bodyBold,
    fontSize: 12.5,
    color: colors.textMuted,
  },
  occasionChipTextActive: {
    color: '#FFFFFF',
  },
  submitErrorText: {
    fontFamily: fonts.bodySemibold,
    fontSize: 12.5,
    color: colors.danger,
    textAlign: 'center',
    paddingHorizontal: 20,
    paddingTop: 10,
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
  saveButton: {
    flex: 1.4,
    height: 48,
    borderRadius: radii.input,
    backgroundColor: colors.navy,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    shadowColor: colors.navy,
    shadowOpacity: 0.24,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    fontFamily: fonts.bodyBold,
    fontSize: 14,
    color: '#FFFFFF',
  },
});
