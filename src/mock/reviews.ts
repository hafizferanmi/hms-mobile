// -----------------------------------------------------------------------
// New feature (not part of design/design-reference/) — mockups pasted
// directly in chat: Reviews (list + search-expanded) and its two sheets,
// Rating Breakdown and Reply to Review. Reachable from the More page.
// TODO(data): sourced from hms-backend-node's /reviews endpoint once
// wired up — that resource already exists there per CLAUDE.md, unlike
// most of this mobile app's other mock domains.
//
// The header's "16 reviews · 14 need a reply" and the 2.9 average are
// independent "overall" numbers, same as check-availability.tsx's "53
// rooms available" vs. its 4 listed rooms — they represent the full
// 16-review set the breakdown sheet's bar chart also describes, not just
// the 2 example reviews actually rendered in the list.
// -----------------------------------------------------------------------

export type ReviewReply = {
  author: string;
  daysAgo: number;
  text: string;
};

export type SubRating = {
  label: string;
  value: number;
};

export type Review = {
  id: string;
  guestName: string;
  source: string;
  room: string;
  daysAgo: number;
  rating: number;
  text: string;
  subRatings: SubRating[];
  reply: ReviewReply | null;
};

export const MOCK_REVIEWS: Review[] = [
  {
    id: '1',
    guestName: 'Caleigh Gottlieb',
    source: 'DIRECT',
    room: '123',
    daysAgo: 17,
    rating: 5.0,
    text: 'Wonderful stay, tested end to end by Claude.',
    subRatings: [
      { label: 'Cleanliness', value: 5 },
      { label: 'Staff', value: 5 },
      { label: 'Comfort', value: 4 },
      { label: 'Value', value: 5 },
    ],
    reply: null,
  },
  {
    id: '2',
    guestName: 'Rose Hudson',
    source: 'BOOKING.COM',
    room: '802',
    daysAgo: 18,
    rating: 4.0,
    text: 'The room was fine but the air conditioning was broken for two of our three nights.',
    subRatings: [
      { label: 'Cleanliness', value: 3 },
      { label: 'Staff', value: 5 },
      { label: 'Comfort', value: 2 },
      { label: 'Value', value: 5 },
    ],
    reply: {
      author: 'Metro Inc',
      daysAgo: 17,
      text: 'Thank you for the feedback, we are sorry about the AC issue and have flagged it to maintenance.',
    },
  },
];

export const REVIEW_SOURCES = ['All sources', 'Direct', 'Booking.com'];

// Matches ReviewsRatingBreakdown.html's bar widths (12%/31%/19%/12%/25%)
// exactly — those are each star's share of all 16 reviews, not just the 2
// example reviews above.
export const RATING_BREAKDOWN = [
  { stars: 5, count: 2 },
  { stars: 4, count: 5 },
  { stars: 3, count: 3 },
  { stars: 2, count: 2 },
  { stars: 1, count: 4 },
];

export const REVIEW_STATS = {
  totalReviews: 16,
  needsReply: 14,
  averageRating: 2.9,
  responseRatePct: 13,
};
