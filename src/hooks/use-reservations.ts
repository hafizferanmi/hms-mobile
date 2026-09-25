import { useQuery } from '@tanstack/react-query';

import { listReservations, toReservation } from '@/api/reservations';

// Shared by every screen that shows reservation data (reservations-list,
// the Reservation Detail hub, edit-guest, add-visitors, add-charge,
// record-payment) — one fetch of GET /check-ins, mapped once, cached under
// one query key so they all see the same data and a mutation on any of
// them (create, update, check-in, check-out) can invalidate ['reservations']
// and have it refresh everywhere at once.
export function useReservations() {
  return useQuery({
    queryKey: ['reservations'],
    queryFn: async () => {
      const { checkIns } = await listReservations();
      return checkIns.map(toReservation);
    },
  });
}
