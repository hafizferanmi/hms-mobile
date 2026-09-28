import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  getTicketLogs,
  listTickets,
  updateTicket,
  type ListTicketsParams,
  type MaintenanceTicketDto,
  type TicketStatus,
} from '@/api/maintenance';

// GET /maintenance-tickets applies every filter server-side (search,
// status, priority, category, sort) — the query key includes the whole
// filters object so a change to any of them refetches, same as
// useCalendarBookings' windowed fetch on the web side. There's
// deliberately no client-side re-filtering of a broader cached batch here.
export function useTickets(filters: ListTicketsParams) {
  return useQuery({
    queryKey: ['maintenance-tickets', filters],
    queryFn: () => listTickets(filters),
  });
}

// No GET-by-id endpoint exists, so this is seeded once from whatever
// ticket object the caller already has (passed via route params) and from
// then on only ever updated in place via setQueryData — by the edit form's
// mutation and by useAdvanceTicketStatus below — rather than re-fetched.
// staleTime: Infinity means this never silently refetches (there's nothing
// to refetch from); it exists purely as a cache slot two different screens
// can both read and write.
export function useTicket(ticketId: string, initialTicket: MaintenanceTicketDto) {
  return useQuery({
    queryKey: ['maintenance-ticket', ticketId],
    queryFn: () => Promise.resolve(initialTicket),
    initialData: initialTicket,
    staleTime: Infinity,
  });
}

export function useTicketLogs(ticketId: string) {
  return useQuery({
    queryKey: ['maintenance-ticket-logs', ticketId],
    queryFn: () => getTicketLogs(ticketId),
  });
}

// Shared by the list row's action button and the detail screen's status
// block — both advance a ticket to MAINT_NEXT_STATUS[ticket.status] after
// the same confirm sheet (see components/advance-ticket-sheet.tsx). Keeps
// every cache a change to one ticket touches in sync in one place: the
// list (which may now exclude this ticket if it just moved outside the
// active status filter), the per-ticket detail cache slot above, and this
// ticket's activity log (the update writes a new STATUS_CHANGED entry
// server-side).
export function useAdvanceTicketStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      ticketId,
      status,
      resolutionNote,
    }: {
      ticketId: string;
      status: TicketStatus;
      resolutionNote?: string;
    }) => updateTicket(ticketId, resolutionNote ? { status, resolutionNote } : { status }),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['maintenance-tickets'] });
      queryClient.setQueryData(['maintenance-ticket', updated._id], updated);
      queryClient.invalidateQueries({ queryKey: ['maintenance-ticket-logs', updated._id] });
    },
  });
}
