import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { checkAvailability, listRoomTypes, roomTypePrice, type RoomTypeDto } from '@/api/rooms';
import { colors, fonts, radii, shadow } from '@/design/theme';

// -----------------------------------------------------------------------
// New flow (not part of design/design-reference/reservations.md) mirroring
// hms-frontend-react's CalendarToolbar.js "Check availability" button —
// reachable from the Calendar tab's header. Both mockups share one header,
// so this is one screen with two states (form vs. results) rather than two
// routes, the same pattern used for the Reservation Detail hub's RESERVED/
// IN HOUSE states.
//
// Check-in/check-out dates are fixed (today / tomorrow) and not tappable —
// there's no date-picker component scoped for this screen, and the
// mockup's own date boxes don't show any tap affordance either, unlike
// e.g. the Room Type row's chevron. Room Type now lists real room types
// (GET /room-types) and results come from the real GET /rooms/availability
// (see src/api/rooms.ts) — the same endpoint edit-guest.tsx's create-mode
// room picker already used. The room type picker is only interactive
// before a search; results always reflect whatever was selected at the
// moment "Check availability" was pressed, so the results query is keyed
// on that captured room type rather than re-filtering live.
//
// "Continue" hands off to edit-guest.tsx in its create-new-reservation
// mode, carrying the selected room's real _id and the dates as route
// params — edit-guest.tsx trusts this room id (it re-searches
// availability for the same date range and preselects it if still
// available, falling back to the first result otherwise).
// -----------------------------------------------------------------------

function BackIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={colors.text} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M15 18l-6-6 6-6" />
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
function ArrowRightIcon() {
  return (
    <Svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M5 12h14" />
      <Path d="m13 6 6 6-6 6" />
    </Svg>
  );
}
function SearchEmptyIcon() {
  return (
    <Svg width={26} height={26} viewBox="0 0 24 24" fill="none" stroke={colors.navy} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
      <Circle cx={10.5} cy={10.5} r={6.5} />
      <Path d="m20 20-4.8-4.8" />
    </Svg>
  );
}
function PencilIcon() {
  return (
    <Svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke={colors.navy} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M12 20h9" />
      <Path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />
    </Svg>
  );
}
function RoomIcon({ color }: { color: string }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Rect x={4} y={2} width={16} height={20} rx={1} />
      <Path d="M9 22v-4h6v4" />
      <Path d="M8 6h1M15 6h1M8 10h1M15 10h1M8 14h1M15 14h1" />
    </Svg>
  );
}

function formatShort(d: Date) {
  return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function CheckAvailabilityScreen() {
  const [roomType, setRoomType] = useState<RoomTypeDto | null>(null);
  const [roomTypePickerOpen, setRoomTypePickerOpen] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);

  const checkIn = new Date();
  const checkOut = new Date(checkIn);
  checkOut.setDate(checkOut.getDate() + 1);
  const nights = 1;

  const roomTypesQuery = useQuery({ queryKey: ['room-types'], queryFn: listRoomTypes });
  const roomTypes = roomTypesQuery.data ?? [];

  const availabilityQuery = useQuery({
    queryKey: ['rooms-availability', checkIn.toDateString(), checkOut.toDateString(), roomType?._id ?? 'all'],
    queryFn: () => checkAvailability(checkIn.toISOString(), checkOut.toISOString(), roomType?._id),
    enabled: hasSearched,
  });
  const results = availabilityQuery.data?.rooms ?? [];
  const selectedRoom = results.find((r) => r._id === selectedRoomId) ?? results[0] ?? null;

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Pressable
          onPress={() => (hasSearched ? setHasSearched(false) : router.back())}
          hitSlop={8}>
          <BackIcon />
        </Pressable>
        <Text style={styles.title}>Check Availability</Text>
      </View>

      {!hasSearched ? (
        <>
          <View style={styles.form}>
            <View style={styles.dateRow}>
              <View style={styles.dateField}>
                <Text style={styles.fieldLabel}>CHECK-IN</Text>
                <View style={styles.dateBox}>
                  <CalendarFieldIcon />
                  <Text style={styles.dateValue}>{formatShort(checkIn)}</Text>
                </View>
              </View>
              <View style={styles.dateField}>
                <Text style={styles.fieldLabel}>CHECK-OUT</Text>
                <View style={styles.dateBox}>
                  <CalendarFieldIcon />
                  <Text style={styles.dateValue}>{formatShort(checkOut)}</Text>
                </View>
              </View>
            </View>

            <View style={styles.field}>
              <Text style={styles.fieldLabel}>ROOM TYPE</Text>
              <Pressable style={styles.roomTypeRow} onPress={() => setRoomTypePickerOpen((v) => !v)}>
                <Text style={styles.roomTypeValue}>{roomType?.name ?? 'All types'}</Text>
                <ChevronDownIcon />
              </Pressable>
              {roomTypePickerOpen && (
                <View style={styles.roomTypeOptions}>
                  <Pressable
                    style={styles.roomTypeOption}
                    onPress={() => {
                      setRoomType(null);
                      setRoomTypePickerOpen(false);
                    }}>
                    <Text style={styles.roomTypeOptionText}>All types</Text>
                  </Pressable>
                  {roomTypes.map((type) => (
                    <Pressable
                      key={type._id}
                      style={styles.roomTypeOption}
                      onPress={() => {
                        setRoomType(type);
                        setRoomTypePickerOpen(false);
                      }}>
                      <Text style={styles.roomTypeOptionText}>{type.name}</Text>
                    </Pressable>
                  ))}
                </View>
              )}
            </View>

            <Pressable
              style={styles.searchButton}
              onPress={() => {
                setSelectedRoomId(null);
                setHasSearched(true);
              }}>
              <Text style={styles.searchButtonText}>Check availability</Text>
              <ArrowRightIcon />
            </Pressable>
          </View>

          <View style={styles.emptyState}>
            <View style={styles.emptyIconCircle}>
              <SearchEmptyIcon />
            </View>
            <View style={styles.emptyTextBlock}>
              <Text style={styles.emptyTitle}>Ready when you are</Text>
              <Text style={styles.emptySubtitle}>
                Pick your dates above, then tap Check availability to see which rooms are free.
              </Text>
            </View>
          </View>
        </>
      ) : (
        <>
          <View style={styles.summaryRow}>
            <View>
              <Text style={styles.summaryDates}>
                {formatShort(checkIn)} – {formatShort(checkOut)} · {nights} night{nights === 1 ? '' : 's'}
              </Text>
              <Text style={styles.summaryType}>{roomType?.name ?? 'All types'}</Text>
            </View>
            <Pressable style={styles.editLink} onPress={() => setHasSearched(false)}>
              <PencilIcon />
              <Text style={styles.editLinkText}>Edit</Text>
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.resultsBody} showsVerticalScrollIndicator={false}>
            {availabilityQuery.isLoading ? (
              <View style={styles.resultsStateBox}>
                <ActivityIndicator color={colors.navy} />
              </View>
            ) : availabilityQuery.isError ? (
              <View style={styles.resultsStateBox}>
                <Text style={styles.resultsStateErrorText}>{availabilityQuery.error.message}</Text>
              </View>
            ) : (
              <>
                <View style={styles.countCard}>
                  <Text style={styles.countText}>
                    {results.length} room{results.length === 1 ? '' : 's'} available
                  </Text>
                  <View style={styles.realtimeBadge}>
                    <View style={styles.realtimeDot} />
                    <Text style={styles.realtimeText}>REAL-TIME</Text>
                  </View>
                </View>

                {results.length === 0 ? (
                  <View style={styles.resultsStateBox}>
                    <Text style={styles.resultsStateText}>No rooms available for these dates.</Text>
                  </View>
                ) : (
                  <View style={styles.resultsList}>
                    {results.map((r) => {
                      const active = selectedRoom?._id === r._id;
                      const price = roomTypePrice(r.roomTypeId);
                      return (
                        <Pressable
                          key={r._id}
                          style={[styles.roomCard, active && styles.roomCardActive]}
                          onPress={() => setSelectedRoomId(r._id)}>
                          <View style={[styles.roomIconWrap, active && styles.roomIconWrapActive]}>
                            <RoomIcon color={active ? '#FFFFFF' : colors.navy} />
                          </View>
                          <View style={styles.roomInfo}>
                            <Text style={styles.roomNumber}>Room {r.number}</Text>
                            <Text style={styles.roomMeta}>
                              {r.roomTypeId?.name ?? 'Room'}
                              {r.roomTypeId?.maxNumberOfGuest ? ` · ${r.roomTypeId.maxNumberOfGuest} guests` : ''}
                            </Text>
                          </View>
                          <View style={styles.roomPriceBlock}>
                            <Text style={styles.roomPrice}>NGN {price.toLocaleString('en-US')}</Text>
                            <Text style={styles.roomPriceLabel}>PER NIGHT</Text>
                          </View>
                        </Pressable>
                      );
                    })}
                  </View>
                )}
              </>
            )}
          </ScrollView>

          <View style={styles.resultsFooter}>
            <View style={styles.resultsFooterText}>
              <Text style={styles.resultsFooterLabel}>
                Room <Text style={styles.resultsFooterRoom}>{selectedRoom?.number ?? '—'}</Text> selected
              </Text>
              <Text style={styles.resultsFooterTotal}>
                NGN {(roomTypePrice(selectedRoom?.roomTypeId ?? null) * nights).toLocaleString('en-US')} total
              </Text>
            </View>
            <Pressable
              style={styles.continueButton}
              disabled={!selectedRoom}
              onPress={() =>
                selectedRoom &&
                router.push({
                  pathname: '/edit-guest',
                  params: {
                    room: selectedRoom._id,
                    checkIn: checkIn.toISOString(),
                    checkOut: checkOut.toISOString(),
                  },
                })
              }>
              <Text style={styles.continueButtonText}>Continue</Text>
              <ArrowRightIcon />
            </Pressable>
          </View>
        </>
      )}
    </View>
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
    gap: 12,
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    fontFamily: fonts.headingExtraBold,
    fontSize: 17,
    color: colors.navyInk,
  },
  form: {
    paddingHorizontal: 20,
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  dateRow: {
    flexDirection: 'row',
    gap: 10,
  },
  dateField: {
    flex: 1,
  },
  fieldLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: 10,
    color: colors.textFaint,
    letterSpacing: 0.5,
  },
  dateBox: {
    marginTop: 6,
    height: 46,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.input,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  dateValue: {
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    color: colors.navyInk,
  },
  field: {
    marginTop: 14,
  },
  roomTypeRow: {
    marginTop: 6,
    height: 46,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.input,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  roomTypeValue: {
    fontFamily: fonts.bodyBold,
    fontSize: 14,
    color: colors.navyInk,
  },
  roomTypeOptions: {
    marginTop: 6,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.input,
    overflow: 'hidden',
  },
  roomTypeOption: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  roomTypeOptionText: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.text,
  },
  searchButton: {
    marginTop: 14,
    height: 48,
    borderRadius: radii.input,
    backgroundColor: colors.navy,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    ...shadow.button,
  },
  searchButtonText: {
    fontFamily: fonts.bodyBold,
    fontSize: 14.5,
    color: '#FFFFFF',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    paddingHorizontal: 40,
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.navySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTextBlock: {
    alignItems: 'center',
    gap: 6,
  },
  emptyTitle: {
    fontFamily: fonts.headingBold,
    fontSize: 15,
    color: colors.navyInk,
  },
  emptySubtitle: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 19.5,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  summaryDates: {
    fontFamily: fonts.bodyBold,
    fontSize: 13.5,
    color: colors.navyInk,
  },
  summaryType: {
    fontFamily: fonts.body,
    fontSize: 11.5,
    color: colors.textMuted,
    marginTop: 2,
  },
  editLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  editLinkText: {
    fontFamily: fonts.bodyBold,
    fontSize: 12.5,
    color: colors.navy,
  },
  resultsBody: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
  },
  resultsStateBox: {
    paddingVertical: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultsStateText: {
    marginTop: 14,
    fontFamily: fonts.body,
    fontSize: 13.5,
    color: colors.textMuted,
    textAlign: 'center',
  },
  resultsStateErrorText: {
    fontFamily: fonts.bodySemibold,
    fontSize: 13.5,
    color: colors.danger,
    textAlign: 'center',
  },
  countCard: {
    backgroundColor: colors.bg,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  countText: {
    fontFamily: fonts.headingExtraBold,
    fontSize: 15,
    color: colors.navyInk,
  },
  realtimeBadge: {
    backgroundColor: colors.successSoft,
    borderRadius: 999,
    paddingVertical: 4,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  realtimeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.success,
  },
  realtimeText: {
    fontFamily: fonts.bodyBold,
    fontSize: 9.5,
    color: colors.success,
  },
  resultsList: {
    marginTop: 14,
    gap: 10,
  },
  roomCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1.4,
    borderColor: colors.border,
    borderRadius: 14,
    padding: 14,
  },
  roomCardActive: {
    borderWidth: 1.6,
    borderColor: colors.navy,
    backgroundColor: colors.navySoft,
  },
  roomIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 11,
    backgroundColor: colors.navySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roomIconWrapActive: {
    backgroundColor: colors.navy,
  },
  roomInfo: {
    flex: 1,
    minWidth: 0,
  },
  roomNumber: {
    fontFamily: fonts.headingBold,
    fontSize: 14,
    color: colors.navyInk,
  },
  roomMeta: {
    fontFamily: fonts.body,
    fontSize: 11.5,
    color: colors.textMuted,
    marginTop: 2,
  },
  roomPriceBlock: {
    alignItems: 'flex-end',
  },
  roomPrice: {
    fontFamily: fonts.headingExtraBold,
    fontSize: 14,
    color: colors.coral,
  },
  roomPriceLabel: {
    fontFamily: fonts.body,
    fontSize: 9.5,
    color: colors.textFaint,
  },
  resultsFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 28,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  resultsFooterText: {
    minWidth: 0,
  },
  resultsFooterLabel: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.textMuted,
  },
  resultsFooterRoom: {
    fontFamily: fonts.bodyBold,
    color: colors.navyInk,
  },
  resultsFooterTotal: {
    fontFamily: fonts.headingExtraBold,
    fontSize: 15,
    color: colors.navyInk,
  },
  continueButton: {
    flexShrink: 0,
    height: 48,
    paddingHorizontal: 20,
    borderRadius: radii.input,
    backgroundColor: colors.navy,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    ...shadow.button,
  },
  continueButtonText: {
    fontFamily: fonts.bodyBold,
    fontSize: 14.5,
    color: '#FFFFFF',
  },
});
