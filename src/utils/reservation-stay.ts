import type { Reservation } from '@/api/reservations';

function startOfDay(d: Date) {
  const c = new Date(d);
  c.setHours(0, 0, 0, 0);
  return c;
}

export function formatFullDate(d: Date) {
  return d.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });
}

// null outside a 1-day window either side of today — callers fall back to
// a full date in that case, same as they already do for anything further
// out.
function relativeDayLabel(d: Date): string | null {
  const diffDays = Math.round((startOfDay(d).getTime() - startOfDay(new Date()).getTime()) / 86400000);
  if (diffDays === 0) return 'today';
  if (diffDays === 1) return 'tomorrow';
  if (diffDays === -1) return 'yesterday';
  return null;
}

// "Arrived {date}" is wrong for a RESERVED guest who hasn't arrived yet —
// pick the date (and tense) that's actually relevant to the guest's
// current status, and use relative wording ("today"/"tomorrow") right
// around the date staff care about most for that status: the arrival for
// someone not here yet, the departure for someone who already is. Shared
// by the reservations list row and the reservation detail header — both
// showed the same "Arrived {date}" regardless of status before this.
export function getStayMetaText(guest: Pick<Reservation, 'status' | 'arrivalDate' | 'departureDate'>): string {
  switch (guest.status) {
    case 'RESERVED': {
      const rel = relativeDayLabel(guest.arrivalDate);
      return `Arriving ${rel ?? formatFullDate(guest.arrivalDate)}`;
    }
    case 'IN_HOUSE': {
      const rel = relativeDayLabel(guest.departureDate);
      return rel ? `Departing ${rel}` : `Departs ${formatFullDate(guest.departureDate)}`;
    }
    case 'CHECKED_OUT': {
      const rel = relativeDayLabel(guest.departureDate);
      return `Departed ${rel ?? formatFullDate(guest.departureDate)}`;
    }
    case 'CANCELED':
      return `Was arriving ${formatFullDate(guest.arrivalDate)}`;
  }
}
