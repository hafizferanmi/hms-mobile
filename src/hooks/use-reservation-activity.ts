import { useQuery, useQueryClient } from '@tanstack/react-query';

import { listActivityLogs, listCharges, listPayments, toActivityEntries, toFolioEntries } from '@/api/reservation-activity';

// Shared by reservation/[id].tsx (Charges/Others tabs), add-charge.tsx and
// record-payment.tsx (both need the real running balance for their
// quick-fill/validation, not just to add an entry).

export function useReservationCharges(checkInId: string) {
  return useQuery({
    queryKey: ['reservation-charges', checkInId],
    queryFn: () => listCharges(checkInId),
  });
}

export function useReservationPayments(checkInId: string) {
  return useQuery({
    queryKey: ['reservation-payments', checkInId],
    queryFn: () => listPayments(checkInId),
  });
}

export function useReservationLogs(checkInId: string) {
  return useQuery({
    queryKey: ['reservation-logs', checkInId],
    queryFn: () => listActivityLogs(checkInId),
  });
}

export function useReservationFolio(checkInId: string) {
  const chargesQuery = useReservationCharges(checkInId);
  const paymentsQuery = useReservationPayments(checkInId);
  const charges = chargesQuery.data ?? [];
  const payments = paymentsQuery.data ?? [];
  const charged = charges.reduce((sum, c) => sum + c.amount, 0);
  const paid = payments.reduce((sum, p) => sum + p.amount, 0);

  return {
    folio: toFolioEntries(charges, payments),
    charged,
    paid,
    balance: charged - paid,
    isLoading: chargesQuery.isLoading || paymentsQuery.isLoading,
    isError: chargesQuery.isError || paymentsQuery.isError,
    error: chargesQuery.error ?? paymentsQuery.error,
    // reservation/[id].tsx's pull-to-refresh needs one function that
    // covers both underlying queries, not two separate ones to remember
    // to call.
    refetch: () => Promise.all([chargesQuery.refetch(), paymentsQuery.refetch()]),
  };
}

export function useReservationActivity(checkInId: string) {
  const logsQuery = useReservationLogs(checkInId);
  return {
    activity: toActivityEntries(logsQuery.data ?? []),
    isLoading: logsQuery.isLoading,
    isError: logsQuery.isError,
    error: logsQuery.error,
    refetch: logsQuery.refetch,
  };
}

// Called after any mutation that changes a reservation's charges,
// payments or log (add/record/check-in/check-out/update/add-visitor) so
// every screen showing that data — this reservation's own tabs, plus
// these same three query keys if another screen has them mounted —
// refetches instead of going stale.
export function useInvalidateReservationActivity() {
  const queryClient = useQueryClient();
  return (checkInId: string) => {
    queryClient.invalidateQueries({ queryKey: ['reservation-charges', checkInId] });
    queryClient.invalidateQueries({ queryKey: ['reservation-payments', checkInId] });
    queryClient.invalidateQueries({ queryKey: ['reservation-logs', checkInId] });
  };
}
