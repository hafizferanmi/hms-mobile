import { apiGet, apiPost, apiPut } from './client';

// Mirrors hms-backend-node's MaintenanceTicket + MaintenanceTicketLog
// models and businesslogic/maintenanceTicket(.js|Log.js) — the mobile port
// of hms-frontend-react's OperationMaintenancePage. No GET-by-id endpoint
// exists (only list/create/update/delete), so a ticket's detail screen is
// always opened with the full ticket object already in hand (passed as a
// route param) rather than re-fetched — see maintenance-ticket/[id].tsx.
export type TicketCategory = 'PLUMBING' | 'ELECTRICAL' | 'HVAC' | 'FURNITURE' | 'OTHER';
export type TicketPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
export type TicketStatus = 'REPORTED' | 'IN_PROGRESS' | 'RESOLVED';

export type MaintenanceTicketDto = {
  _id: string;
  title: string;
  category: TicketCategory;
  roomOrArea: string;
  priority: TicketPriority;
  status: TicketStatus;
  assignee?: string;
  description?: string;
  resolvedOn?: string;
  // Only ever set alongside the request that actually moves `status` to
  // RESOLVED — see updateTicket in businesslogic/maintenanceTicket.js.
  resolutionNote?: string;
  createdAt: string;
  updatedAt: string;
};

export type ListTicketsParams = {
  search?: string;
  status?: TicketStatus[];
  priority?: TicketPriority[];
  category?: TicketCategory[];
  sort?: 'date_desc' | 'date_asc';
};

export type ListTicketsResponse = {
  tickets: MaintenanceTicketDto[];
  total: number;
  page: number;
  totalPages: number;
  // Scoped to the whole company regardless of the current filter/page —
  // powers the "N urgent" header stat, matching getTickets's own
  // deliberately-unfiltered urgentOpenCount query.
  urgentOpenCount: number;
};

// One large page rather than real pagination — same simplification as
// listStaff(); a hotel's open maintenance tickets are expected to number in
// the dozens, not the hundreds, so this skips a pager UI for now.
const RESULTS_PER_PAGE = 100;

export function listTickets(params: ListTicketsParams) {
  return apiGet<ListTicketsResponse>('/maintenance-tickets', {
    params: {
      search: params.search || undefined,
      status: params.status?.length ? params.status.join(',') : undefined,
      priority: params.priority?.length ? params.priority.join(',') : undefined,
      category: params.category?.length ? params.category.join(',') : undefined,
      sort: params.sort,
      resultsPerPage: RESULTS_PER_PAGE,
    },
  });
}

export type TicketPayload = {
  title: string;
  category: TicketCategory;
  roomOrArea: string;
  priority?: TicketPriority;
  status?: TicketStatus;
  assignee?: string;
  description?: string;
  // Only actually saved server-side when this same request's `status` is
  // RESOLVED — see the model's own comment on why it's optional even then.
  resolutionNote?: string;
};

export function createTicket(payload: TicketPayload) {
  return apiPost<MaintenanceTicketDto>('/maintenance-tickets', payload);
}

export function updateTicket(ticketId: string, payload: Partial<TicketPayload>) {
  return apiPut<MaintenanceTicketDto>(`/maintenance-tickets/${ticketId}`, payload);
}

export type TicketLogType =
  | 'CREATED'
  | 'STATUS_CHANGED'
  | 'PRIORITY_CHANGED'
  | 'ASSIGNED'
  | 'REASSIGNED'
  | 'UNASSIGNED'
  | 'UPDATED';

export type MaintenanceTicketLogDto = {
  _id: string;
  type: TicketLogType;
  message: string;
  meta?: unknown;
  performedBy?: { _id: string; name: string } | null;
  createdAt: string;
};

export function getTicketLogs(ticketId: string) {
  return apiGet<MaintenanceTicketLogDto[]>(`/maintenance-tickets/${ticketId}/logs`);
}
