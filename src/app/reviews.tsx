import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { KeyboardSafeView } from '@/components/keyboard-safe-view';
import { colors, fonts, radii, shadow } from '@/design/theme';
import { MOCK_REVIEWS, RATING_BREAKDOWN, REVIEW_SOURCES, REVIEW_STATS, type Review } from '@/mock/reviews';

// -----------------------------------------------------------------------
// New feature, reachable from the More page. Mockups were pasted directly
// in chat (not part of design/design-reference/): Reviews.html (main
// list), ReviewsSearchExpanded.html (search mode) and
// ReviewsRatingBreakdown.html (the "See breakdown" sheet) all came through
// complete. The message got cut off partway through a fourth mockup,
// ReplyToReview.html, before its actual sheet content (the reply form
// itself) arrived — only the dimmed list behind it came through. The
// ReplyToReviewSheet below is a best-effort reconstruction following this
// app's established sheet conventions (quote the review for context, a
// multiline input, Cancel/Post footer) rather than a match against a seen
// design — worth checking against the real mockup if it looks off.
//
// Same "flavor numbers vs. actual mock list" split used in
// check-availability.tsx: the header's "16 reviews · 14 need a reply" and
// the 2.9 average, plus the breakdown sheet's bar chart, describe a full
// 16-review set: `REVIEW_STATS/RATING_BREAKDOWN`. Only 2 reviews are
// actually rendered, from `MOCK_REVIEWS`.
//
// Search mode replaces the filter chips and list entirely with a plain
// text match over name/room/review text (mirrors ReviewsSearchExpanded.html
// showing only a result count + matching cards, no chips) — it does not
// combine with the Source/rating chip filters, which only apply in the
// normal (non-search) view.
//
// Posting or editing a reply is real, local component state (not just a
// router.back() no-op) — it updates the matching review's `reply` field in
// this screen's own `reviews` state, same spirit as the Reservation Detail
// hub's check-in/check-out toggle actually flipping local status.
// -----------------------------------------------------------------------

function BackIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={colors.text} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M15 18l-6-6 6-6" />
    </Svg>
  );
}
function SearchIcon() {
  return (
    <Svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke={colors.navy} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM21 21l-4.3-4.3" />
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
function ChevronDownIcon() {
  return (
    <Svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke={colors.textMuted} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M6 9l6 6 6-6" />
    </Svg>
  );
}
function ChevronRightIcon() {
  return (
    <Svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke={colors.navy} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M9 6l6 6-6 6" />
    </Svg>
  );
}
function StarIcon({ filled, size = 12, color }: { filled: boolean; size?: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? color : 'none'} stroke={color} strokeWidth={1.6} strokeLinejoin="round">
      <Path d="M12 3.5l2.6 5.6 6.1.6-4.6 4.1 1.3 6-5.4-3.2-5.4 3.2 1.3-6-4.6-4.1 6.1-.6z" />
    </Svg>
  );
}

type RatingFilter = 'all' | 'needsReply' | 1 | 2 | 3 | 4 | 5;

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? '') + (parts[parts.length - 1]?.[0] ?? '')).toUpperCase();
}

function dotColorForRating(n: number) {
  if (n >= 4) return colors.success;
  if (n === 3) return colors.amber;
  return colors.coral;
}

function RatingBreakdownSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  if (!visible) return null;
  const filledStars = Math.round(REVIEW_STATS.averageRating);

  return (
    <>
      <Pressable style={[StyleSheet.absoluteFill, styles.scrim]} onPress={onClose} accessibilityLabel="Close rating breakdown" />
      <View style={styles.sheet}>
        <View style={styles.sheetHandle} />
        <View style={styles.sheetHeader}>
          <Text style={styles.sheetTitle}>Rating breakdown</Text>
          <Pressable onPress={onClose} hitSlop={8}>
            <CloseIcon />
          </Pressable>
        </View>

        <View style={styles.breakdownScoreBlock}>
          <Text style={styles.breakdownScore}>{REVIEW_STATS.averageRating.toFixed(1)}</Text>
          <View style={styles.breakdownStars}>
            {[1, 2, 3, 4, 5].map((n) => (
              <StarIcon key={n} filled={n <= filledStars} size={18} color={colors.amber} />
            ))}
          </View>
          <Text style={styles.breakdownCount}>{REVIEW_STATS.totalReviews} reviews</Text>
        </View>

        <View style={styles.breakdownBars}>
          {RATING_BREAKDOWN.map((b) => (
            <View key={b.stars} style={styles.breakdownBarRow}>
              <View style={styles.breakdownBarLabel}>
                <Text style={styles.breakdownBarLabelText}>{b.stars}</Text>
                <StarIcon filled size={10} color={colors.textFaint} />
              </View>
              <View style={styles.breakdownBarTrack}>
                <View
                  style={[
                    styles.breakdownBarFill,
                    { width: `${(b.count / REVIEW_STATS.totalReviews) * 100}%`, backgroundColor: dotColorForRating(b.stars) },
                  ]}
                />
              </View>
              <Text style={styles.breakdownBarCount}>{b.count}</Text>
            </View>
          ))}
        </View>

        <View style={styles.breakdownStatsFooter}>
          <View style={styles.breakdownStatBlock}>
            <Text style={styles.breakdownStatValue}>{REVIEW_STATS.responseRatePct}%</Text>
            <Text style={styles.breakdownStatLabel}>Response rate</Text>
          </View>
          <View style={styles.breakdownStatDivider} />
          <View style={styles.breakdownStatBlock}>
            <Text style={styles.breakdownStatValue}>{REVIEW_STATS.needsReply}</Text>
            <Text style={styles.breakdownStatLabel}>Need a reply</Text>
          </View>
        </View>
      </View>
    </>
  );
}

function ReplyToReviewSheet({
  review,
  onClose,
  onSubmit,
}: {
  review: Review | null;
  onClose: () => void;
  onSubmit: (text: string) => void;
}) {
  const [draft, setDraft] = useState(review?.reply?.text ?? '');

  if (!review) return null;
  const isEdit = review.reply !== null;
  const canSubmit = draft.trim().length > 0;

  return (
    <>
      <Pressable style={[StyleSheet.absoluteFill, styles.scrim]} onPress={onClose} accessibilityLabel="Close reply" />
      <View style={styles.sheet}>
        <View style={styles.sheetHandle} />
        <View style={styles.sheetHeader}>
          <Text style={styles.sheetTitle}>{isEdit ? 'Edit reply' : 'Reply to review'}</Text>
          <Pressable onPress={onClose} hitSlop={8}>
            <CloseIcon />
          </Pressable>
        </View>

        <View style={styles.replyQuoteCard}>
          <Text style={styles.replyQuoteText} numberOfLines={3}>
            &ldquo;{review.text}&rdquo;
          </Text>
          <Text style={styles.replyQuoteAuthor}>— {review.guestName}</Text>
        </View>

        <TextInput
          value={draft}
          onChangeText={setDraft}
          placeholder="Write your reply..."
          placeholderTextColor={colors.textFaint}
          multiline
          style={styles.replyInput}
        />

        <View style={styles.replyFooter}>
          <Pressable style={styles.replyCancelButton} onPress={onClose}>
            <Text style={styles.replyCancelText}>Cancel</Text>
          </Pressable>
          <Pressable
            style={[styles.replySubmitButton, canSubmit && styles.replySubmitButtonActive]}
            disabled={!canSubmit}
            onPress={() => onSubmit(draft.trim())}>
            <Text style={[styles.replySubmitText, canSubmit && styles.replySubmitTextActive]}>
              {isEdit ? 'Save reply' : 'Post reply'}
            </Text>
          </Pressable>
        </View>
      </View>
    </>
  );
}

export default function ReviewsScreen() {
  const [reviews, setReviews] = useState(MOCK_REVIEWS);
  const [searchOpen, setSearchOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [sourceFilter, setSourceFilter] = useState('All sources');
  const [sourcePickerOpen, setSourcePickerOpen] = useState(false);
  const [ratingFilter, setRatingFilter] = useState<RatingFilter>('all');
  const [breakdownOpen, setBreakdownOpen] = useState(false);
  const [replyTarget, setReplyTarget] = useState<Review | null>(null);

  const searchResults = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return reviews;
    return reviews.filter(
      (r) => r.guestName.toLowerCase().includes(q) || r.text.toLowerCase().includes(q) || r.room.includes(q),
    );
  }, [reviews, search]);

  const filtered = useMemo(() => {
    return reviews.filter((r) => {
      if (sourceFilter !== 'All sources' && r.source !== sourceFilter.toUpperCase()) return false;
      if (ratingFilter === 'needsReply' && r.reply !== null) return false;
      if (typeof ratingFilter === 'number' && Math.round(r.rating) !== ratingFilter) return false;
      return true;
    });
  }, [reviews, sourceFilter, ratingFilter]);

  const visibleReviews = searchOpen ? searchResults : filtered;

  const handleReplySubmit = (text: string) => {
    if (!replyTarget) return;
    setReviews((prev) =>
      prev.map((r) => (r.id === replyTarget.id ? { ...r, reply: { author: 'Metro Inc', daysAgo: 0, text } } : r)),
    );
    setReplyTarget(null);
  };

  return (
    <KeyboardSafeView style={styles.screen}>
      <View style={styles.header}>
        {!searchOpen ? (
          <>
            <View style={styles.headerTopRow}>
              <Pressable onPress={() => router.back()} hitSlop={8}>
                <BackIcon />
              </Pressable>
              <Text style={styles.title}>Reviews</Text>
              <View style={styles.ratingBadge}>
                <StarIcon filled size={11} color={colors.amber} />
                <Text style={styles.ratingBadgeText}>{REVIEW_STATS.averageRating.toFixed(1)}</Text>
              </View>
              <View style={styles.headerSpacer} />
              <Pressable style={styles.searchButton} onPress={() => setSearchOpen(true)} hitSlop={8}>
                <SearchIcon />
              </Pressable>
            </View>
            <View style={styles.subtitleRow}>
              <Text style={styles.subtitleText}>
                {REVIEW_STATS.totalReviews} reviews ·{' '}
                <Text style={styles.subtitleNeedsReply}>{REVIEW_STATS.needsReply} need a reply</Text>
              </Text>
              <Pressable style={styles.breakdownLink} onPress={() => setBreakdownOpen(true)}>
                <Text style={styles.breakdownLinkText}>See breakdown</Text>
                <ChevronRightIcon />
              </Pressable>
            </View>
          </>
        ) : (
          <>
            <View style={styles.searchRow}>
              <View pointerEvents="none" style={styles.searchIconInline}>
                <SearchIcon />
              </View>
              <TextInput
                autoFocus
                value={search}
                onChangeText={setSearch}
                placeholder="Search reviews"
                placeholderTextColor={colors.textFaint}
                style={styles.searchInput}
              />
              <Pressable
                onPress={() => {
                  setSearchOpen(false);
                  setSearch('');
                }}
                hitSlop={8}>
                <CloseIcon />
              </Pressable>
            </View>
            <Text style={styles.resultCount}>
              {searchResults.length} result{searchResults.length === 1 ? '' : 's'}
            </Text>
          </>
        )}
      </View>

      {!searchOpen && (
        <View style={styles.filterRowWrap}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
            <Pressable style={styles.sourceChip} onPress={() => setSourcePickerOpen((v) => !v)}>
              <Text style={styles.sourceChipText}>{sourceFilter}</Text>
              <ChevronDownIcon />
            </Pressable>
            <View style={styles.filterDivider} />
            <Pressable
              style={[styles.filterChip, ratingFilter === 'all' && styles.filterChipActiveDark]}
              onPress={() => setRatingFilter('all')}>
              <Text style={[styles.filterChipText, ratingFilter === 'all' && styles.filterChipTextActiveDark]}>
                All ratings
              </Text>
            </Pressable>
            <Pressable
              style={[styles.filterChip, ratingFilter === 'needsReply' && styles.filterChipActiveCoral]}
              onPress={() => setRatingFilter(ratingFilter === 'needsReply' ? 'all' : 'needsReply')}>
              <View style={[styles.filterDot, { backgroundColor: colors.coral }]} />
              <Text
                style={[styles.filterChipText, ratingFilter === 'needsReply' && styles.filterChipTextActiveCoral]}>
                Needs reply
              </Text>
            </Pressable>
            {[5, 4, 3, 2, 1].map((n) => {
              const active = ratingFilter === n;
              return (
                <Pressable
                  key={n}
                  style={[styles.filterChip, active && styles.filterChipActiveDark]}
                  onPress={() => setRatingFilter(active ? 'all' : (n as RatingFilter))}>
                  <View style={[styles.filterDot, { backgroundColor: dotColorForRating(n) }]} />
                  <Text style={[styles.filterChipText, active && styles.filterChipTextActiveDark]}>{n}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
          {sourcePickerOpen && (
            <View style={styles.sourceOptions}>
              {REVIEW_SOURCES.map((s) => (
                <Pressable
                  key={s}
                  style={styles.sourceOption}
                  onPress={() => {
                    setSourceFilter(s);
                    setSourcePickerOpen(false);
                  }}>
                  <Text style={styles.sourceOptionText}>{s}</Text>
                </Pressable>
              ))}
            </View>
          )}
        </View>
      )}

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {visibleReviews.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>No reviews match this filter.</Text>
          </View>
        ) : (
          <View style={styles.list}>
            {visibleReviews.map((review) => (
              <View key={review.id} style={styles.card}>
                <View style={styles.cardTopRow}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{initials(review.guestName)}</Text>
                  </View>
                  <View style={styles.cardHeaderText}>
                    <View style={styles.nameRow}>
                      <Text style={styles.guestName}>{review.guestName}</Text>
                      <View style={styles.sourceBadge}>
                        <Text style={styles.sourceBadgeText}>{review.source}</Text>
                      </View>
                    </View>
                    <Text style={styles.cardMeta}>
                      Room {review.room} · {review.daysAgo} days ago
                    </Text>
                  </View>
                  <View style={styles.scoreBadge}>
                    <StarIcon filled size={11} color={colors.success} />
                    <Text style={styles.scoreBadgeText}>{review.rating.toFixed(1)}</Text>
                  </View>
                </View>

                <Text style={styles.reviewText}>{review.text}</Text>

                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.subRatingsRow}>
                  {review.subRatings.map((sr) => (
                    <View key={sr.label} style={styles.subRatingChip}>
                      <Text style={styles.subRatingLabel}>{sr.label}</Text>
                      <Text style={styles.subRatingValue}>{sr.value}</Text>
                    </View>
                  ))}
                </ScrollView>

                {review.reply ? (
                  <View style={styles.replyCard}>
                    <View style={styles.replyHeaderRow}>
                      <Text style={styles.replyFrom}>Reply from {review.reply.author}</Text>
                      <Text style={styles.replyTime}>{review.reply.daysAgo}d ago</Text>
                    </View>
                    <Text style={styles.replyText}>{review.reply.text}</Text>
                    <Pressable onPress={() => setReplyTarget(review)} hitSlop={6}>
                      <Text style={styles.editReplyLink}>Edit reply</Text>
                    </Pressable>
                  </View>
                ) : (
                  <Pressable style={styles.replyButton} onPress={() => setReplyTarget(review)}>
                    <Text style={styles.replyButtonText}>Reply to this review</Text>
                  </Pressable>
                )}
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      <RatingBreakdownSheet visible={breakdownOpen} onClose={() => setBreakdownOpen(false)} />
      <ReplyToReviewSheet
        key={replyTarget?.id}
        review={replyTarget}
        onClose={() => setReplyTarget(null)}
        onSubmit={handleReplySubmit}
      />
    </KeyboardSafeView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  header: {
    flexShrink: 0,
    backgroundColor: colors.surface,
    paddingTop: 52,
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  title: {
    fontFamily: fonts.headingExtraBold,
    fontSize: 17,
    color: colors.navyInk,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.amberSoft,
    borderRadius: 999,
    paddingVertical: 4,
    paddingHorizontal: 9,
  },
  ratingBadgeText: {
    fontFamily: fonts.bodyBold,
    fontSize: 11.5,
    color: colors.amber,
  },
  headerSpacer: {
    flex: 1,
  },
  searchButton: {
    width: 36,
    height: 36,
    borderRadius: radii.input,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subtitleRow: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  subtitleText: {
    fontFamily: fonts.body,
    fontSize: 12.5,
    color: colors.textMuted,
    flexShrink: 1,
  },
  subtitleNeedsReply: {
    fontFamily: fonts.bodyBold,
    color: colors.coral,
  },
  breakdownLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    flexShrink: 0,
  },
  breakdownLinkText: {
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    color: colors.navy,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  searchIconInline: {
    position: 'absolute',
    left: 12,
    zIndex: 1,
  },
  searchInput: {
    flex: 1,
    height: 42,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.input,
    backgroundColor: colors.bg,
    paddingLeft: 34,
    paddingRight: 12,
    fontFamily: fonts.body,
    fontSize: 13.5,
    color: colors.text,
  },
  resultCount: {
    marginTop: 10,
    fontFamily: fonts.bodySemibold,
    fontSize: 12,
    color: colors.textMuted,
  },
  filterRowWrap: {
    flexShrink: 0,
    backgroundColor: colors.surface,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  filterRow: {
    paddingHorizontal: 20,
    paddingTop: 12,
    alignItems: 'center',
    gap: 8,
  },
  sourceChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sourceChipText: {
    fontFamily: fonts.bodyBold,
    fontSize: 12.5,
    color: colors.navyInk,
  },
  filterDivider: {
    width: 1,
    height: 20,
    backgroundColor: colors.border,
    marginHorizontal: 2,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 13,
    borderRadius: 999,
    backgroundColor: colors.bg,
  },
  filterChipActiveDark: {
    backgroundColor: colors.navyInk,
  },
  filterChipActiveCoral: {
    backgroundColor: colors.coralSoft,
  },
  filterChipText: {
    fontFamily: fonts.bodyBold,
    fontSize: 12.5,
    color: colors.textMuted,
  },
  filterChipTextActiveDark: {
    color: '#FFFFFF',
  },
  filterChipTextActiveCoral: {
    color: colors.coral,
  },
  filterDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  sourceOptions: {
    marginTop: 8,
    marginHorizontal: 20,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.input,
    overflow: 'hidden',
  },
  sourceOption: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  sourceOptionText: {
    fontFamily: fonts.body,
    fontSize: 13.5,
    color: colors.text,
  },
  body: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 28,
  },
  emptyState: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  emptyStateText: {
    fontFamily: fonts.body,
    fontSize: 13.5,
    color: colors.textMuted,
  },
  list: {
    gap: 14,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.card,
    padding: 16,
    ...shadow.card,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 11,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.navySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontFamily: fonts.headingBold,
    fontSize: 13.5,
    color: colors.navy,
  },
  cardHeaderText: {
    flex: 1,
    minWidth: 0,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    flexWrap: 'wrap',
  },
  guestName: {
    fontFamily: fonts.headingBold,
    fontSize: 14,
    color: colors.navyInk,
  },
  sourceBadge: {
    backgroundColor: colors.navySoft,
    borderRadius: 999,
    paddingVertical: 2,
    paddingHorizontal: 8,
  },
  sourceBadgeText: {
    fontFamily: fonts.bodyBold,
    fontSize: 9,
    color: colors.navy,
    letterSpacing: 0.3,
  },
  cardMeta: {
    fontFamily: fonts.body,
    fontSize: 11.5,
    color: colors.textMuted,
    marginTop: 3,
  },
  scoreBadge: {
    flexShrink: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.successSoft,
    borderRadius: 999,
    paddingVertical: 4,
    paddingHorizontal: 9,
  },
  scoreBadgeText: {
    fontFamily: fonts.bodyBold,
    fontSize: 11.5,
    color: colors.success,
  },
  reviewText: {
    marginTop: 12,
    fontFamily: fonts.body,
    fontSize: 13.5,
    color: colors.text,
    lineHeight: 20,
  },
  subRatingsRow: {
    marginTop: 12,
    gap: 8,
  },
  subRatingChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.bg,
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 11,
  },
  subRatingLabel: {
    fontFamily: fonts.bodyMedium,
    fontSize: 11,
    color: colors.textMuted,
  },
  subRatingValue: {
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    color: colors.navyInk,
  },
  replyButton: {
    marginTop: 14,
    height: 42,
    borderRadius: radii.input,
    backgroundColor: colors.coral,
    alignItems: 'center',
    justifyContent: 'center',
  },
  replyButtonText: {
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    color: '#FFFFFF',
  },
  replyCard: {
    marginTop: 14,
    backgroundColor: colors.bg,
    borderRadius: 14,
    padding: 13,
  },
  replyHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  replyFrom: {
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    color: colors.navyInk,
  },
  replyTime: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.textFaint,
  },
  replyText: {
    marginTop: 5,
    fontFamily: fonts.body,
    fontSize: 12.5,
    color: colors.textMuted,
    lineHeight: 18,
  },
  editReplyLink: {
    marginTop: 8,
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    color: colors.navy,
  },
  scrim: {
    backgroundColor: 'rgba(18,23,58,0.32)',
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 6,
    paddingBottom: 28,
    shadowColor: '#12173A',
    shadowOpacity: 0.2,
    shadowRadius: 32,
    shadowOffset: { width: 0, height: -10 },
    elevation: 10,
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    marginBottom: 14,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  sheetTitle: {
    fontFamily: fonts.headingExtraBold,
    fontSize: 17,
    color: colors.navyInk,
  },
  breakdownScoreBlock: {
    alignItems: 'center',
    gap: 6,
  },
  breakdownScore: {
    fontFamily: fonts.headingExtraBold,
    fontSize: 36,
    color: colors.navyInk,
  },
  breakdownStars: {
    flexDirection: 'row',
    gap: 4,
  },
  breakdownCount: {
    fontFamily: fonts.body,
    fontSize: 12.5,
    color: colors.textMuted,
  },
  breakdownBars: {
    marginTop: 22,
    gap: 10,
  },
  breakdownBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  breakdownBarLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    width: 22,
  },
  breakdownBarLabelText: {
    fontFamily: fonts.bodyBold,
    fontSize: 12.5,
    color: colors.navyInk,
  },
  breakdownBarTrack: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.bg,
    overflow: 'hidden',
  },
  breakdownBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  breakdownBarCount: {
    width: 20,
    textAlign: 'right',
    fontFamily: fonts.bodySemibold,
    fontSize: 12,
    color: colors.textMuted,
  },
  breakdownStatsFooter: {
    marginTop: 22,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bg,
    borderRadius: 14,
    paddingVertical: 16,
  },
  breakdownStatBlock: {
    flex: 1,
    alignItems: 'center',
  },
  breakdownStatDivider: {
    width: 1,
    height: 30,
    backgroundColor: colors.border,
  },
  breakdownStatValue: {
    fontFamily: fonts.headingExtraBold,
    fontSize: 18,
    color: colors.navyInk,
  },
  breakdownStatLabel: {
    marginTop: 2,
    fontFamily: fonts.body,
    fontSize: 11.5,
    color: colors.textMuted,
  },
  replyQuoteCard: {
    backgroundColor: colors.bg,
    borderRadius: 14,
    padding: 14,
  },
  replyQuoteText: {
    fontFamily: fonts.body,
    fontSize: 13,
    fontStyle: 'italic',
    color: colors.text,
    lineHeight: 19,
  },
  replyQuoteAuthor: {
    marginTop: 6,
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    color: colors.textMuted,
  },
  replyInput: {
    marginTop: 14,
    minHeight: 110,
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
  replyFooter: {
    marginTop: 16,
    flexDirection: 'row',
    gap: 10,
  },
  replyCancelButton: {
    flex: 1,
    height: 48,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.input,
    alignItems: 'center',
    justifyContent: 'center',
  },
  replyCancelText: {
    fontFamily: fonts.bodyBold,
    fontSize: 14,
    color: colors.navyInk,
  },
  replySubmitButton: {
    flex: 1.4,
    height: 48,
    borderRadius: radii.input,
    backgroundColor: colors.navySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  replySubmitButtonActive: {
    backgroundColor: colors.navy,
    shadowColor: colors.navy,
    shadowOpacity: 0.24,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  replySubmitText: {
    fontFamily: fonts.bodyBold,
    fontSize: 14,
    color: colors.textFaint,
  },
  replySubmitTextActive: {
    color: '#FFFFFF',
  },
});
