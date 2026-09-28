// Shared by every report screen under src/app/stats/ — StatsDateRange.html's
// preset chips + calendar sheet. hms-backend-node's analytics endpoints only
// ever accept concrete `{from, to}` dates (see src/api/analytics.ts); there
// is no preset the server understands, so every preset here resolves to a
// concrete Date pair before the API is ever called.

export type StatsPreset = 'Today' | 'This week' | 'This month' | 'Last month' | 'All time';

export const STATS_PRESETS: StatsPreset[] = ['Today', 'This week', 'This month', 'Last month', 'All time'];

export type StatsDateRange = { from: Date; to: Date; label: string };

export function startOfDay(d: Date) {
  const c = new Date(d);
  c.setHours(0, 0, 0, 0);
  return c;
}
export function endOfDay(d: Date) {
  const c = new Date(d);
  c.setHours(23, 59, 59, 999);
  return c;
}
export function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

// Monday-start week, matching StatsDateRange.html's calendar (its "This
// week" highlight spans a Monday-to-Sunday block), not a Sunday-start one.
function startOfWeekMonday(d: Date) {
  const day = d.getDay(); // 0 = Sunday
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(d);
  monday.setDate(d.getDate() + diff);
  return startOfDay(monday);
}

const VERY_EARLY_DATE = new Date(2000, 0, 1);

export function presetRange(preset: StatsPreset): { from: Date; to: Date } {
  const today = startOfDay(new Date());
  switch (preset) {
    case 'Today':
      return { from: today, to: endOfDay(today) };
    case 'This week': {
      const monday = startOfWeekMonday(today);
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      return { from: monday, to: endOfDay(sunday) };
    }
    case 'This month': {
      const first = new Date(today.getFullYear(), today.getMonth(), 1);
      const last = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      return { from: first, to: endOfDay(last) };
    }
    case 'Last month': {
      const first = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const last = new Date(today.getFullYear(), today.getMonth(), 0);
      return { from: first, to: endOfDay(last) };
    }
    case 'All time':
      return { from: VERY_EARLY_DATE, to: endOfDay(today) };
  }
}

export function defaultStatsRange(): StatsDateRange {
  return { ...presetRange('This week'), label: 'This week' };
}

// Matches a hand-picked {from, to} back to one of the 5 presets, if it
// happens to line up exactly with one — same "does this look like a
// preset" convention reservations-list.tsx uses for its own date sheet.
export function matchingPreset(from: Date, to: Date): StatsPreset | null {
  for (const preset of STATS_PRESETS) {
    const range = presetRange(preset);
    if (isSameDay(range.from, from) && isSameDay(range.to, to)) return preset;
  }
  return null;
}

function formatShort(d: Date) {
  return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
}

export function formatRangeLabel(from: Date, to: Date) {
  const preset = matchingPreset(from, to);
  if (preset) return preset;
  if (isSameDay(from, to)) return formatShort(from);
  return `${formatShort(from)} - ${formatShort(to)}`;
}

// Formats a {from, to} range as the "YYYY-MM-DD" strings
// hms-backend-node's analytics endpoints expect.
export function toApiRangeParams(range: { from: Date; to: Date }) {
  const fmt = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };
  return { from: fmt(range.from), to: fmt(range.to) };
}

// The immediately-preceding window of the same length — e.g. for "This
// week" (Mon-Sun), the previous Mon-Sun. Used for every report's "vs
// previous period" percentage, none of which hms-backend-node computes
// itself (see each report screen's own comment on this).
export function priorRange(range: { from: Date; to: Date }): { from: Date; to: Date } {
  const dayMs = 24 * 60 * 60 * 1000;
  const lengthDays = Math.round((startOfDay(range.to).getTime() - startOfDay(range.from).getTime()) / dayMs) + 1;
  const priorTo = new Date(range.from.getTime() - dayMs);
  const priorFrom = new Date(priorTo.getTime() - (lengthDays - 1) * dayMs);
  return { from: startOfDay(priorFrom), to: endOfDay(priorTo) };
}

// Labels a dailyTrend point ("YYYY-MM-DD") for a chart's x-axis — a short
// weekday ("Mon") for a week-or-shorter range (matching every mockup's
// default "This week" view), else a short date ("21 Sep") since "Mon"
// alone is ambiguous across a month or more.
export function formatTrendLabel(dateStr: string, totalPoints: number) {
  const d = new Date(`${dateStr}T00:00:00`);
  return totalPoints <= 7
    ? d.toLocaleDateString('en-US', { weekday: 'short' })
    : d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
}

// Percentage change from `previous` to `current`, matching the mockups'
// "+12.4%"/"-0.3%" style. `null` when there's nothing to compare against
// (previous was 0) — callers should hide the badge rather than show a
// meaningless "+Infinity%"/"0%".
export function percentChange(current: number, previous: number): number | null {
  if (!previous) return null;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}
