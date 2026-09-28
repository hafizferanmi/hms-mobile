import { colors } from '@/design/theme';

import type { TicketCategory, TicketLogType, TicketPriority, TicketStatus } from '@/api/maintenance';

// Mirrors hms-backend-node's src/constants/maintenanceTicket.js and
// hms-frontend-react's OperationMaintenancePage — see maintOpsConstants.js
// and constants/maintenanceTicket.js there for the source of truth this is
// ported from.

export const TICKET_CATEGORY_LABEL: Record<TicketCategory, string> = {
  PLUMBING: 'Plumbing',
  ELECTRICAL: 'Electrical',
  HVAC: 'HVAC',
  FURNITURE: 'Furniture',
  OTHER: 'Other',
};

export const TICKET_CATEGORY_ORDER: TicketCategory[] = ['PLUMBING', 'ELECTRICAL', 'HVAC', 'FURNITURE', 'OTHER'];

export const TICKET_PRIORITY_LABEL: Record<TicketPriority, string> = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
  URGENT: 'Urgent',
};

// Highest severity first — matches PRIORITY_DISPLAY_ORDER on web, used both
// for the priority filter chips and the priority-grouped ticket list.
export const PRIORITY_DISPLAY_ORDER: TicketPriority[] = ['URGENT', 'HIGH', 'MEDIUM', 'LOW'];

export const PRIORITY_META: Record<TicketPriority, { color: string; soft: string }> = {
  URGENT: { color: colors.danger, soft: colors.dangerSoft },
  HIGH: { color: colors.amber, soft: colors.amberSoft },
  MEDIUM: { color: colors.navy, soft: colors.navySoft },
  LOW: { color: colors.slate, soft: colors.slateSoft },
};

export const TICKET_STATUS_LABEL: Record<TicketStatus, string> = {
  REPORTED: 'Reported',
  IN_PROGRESS: 'In progress',
  RESOLVED: 'Resolved',
};

export const TICKET_STATUS_ORDER: TicketStatus[] = ['REPORTED', 'IN_PROGRESS', 'RESOLVED'];

export const STATUS_META: Record<TicketStatus, { color: string; soft: string }> = {
  REPORTED: { color: colors.coral, soft: colors.coralSoft },
  IN_PROGRESS: { color: colors.amber, soft: colors.amberSoft },
  RESOLVED: { color: colors.success, soft: colors.successSoft },
};

// REPORTED -> IN_PROGRESS -> RESOLVED -> null. Drives both the list row's
// and the detail screen's "advance" action.
export const MAINT_NEXT_STATUS: Record<TicketStatus, TicketStatus | null> = {
  REPORTED: 'IN_PROGRESS',
  IN_PROGRESS: 'RESOLVED',
  RESOLVED: null,
};

export const ACTION_LABEL: Partial<Record<TicketStatus, string>> = {
  REPORTED: 'Start work',
  IN_PROGRESS: 'Mark resolved',
};

// The status filter's default selection on first load — "still open"
// tickets, not literally everything (matches DEFAULT_STATUS_FILTERS).
export const DEFAULT_STATUS_FILTERS: TicketStatus[] = ['REPORTED', 'IN_PROGRESS'];

export const LOG_TYPE_META: Record<TicketLogType, { color: string; soft: string }> = {
  CREATED: { color: colors.navy, soft: colors.navySoft },
  STATUS_CHANGED: { color: colors.navy, soft: colors.navySoft },
  PRIORITY_CHANGED: { color: colors.amber, soft: colors.amberSoft },
  ASSIGNED: { color: colors.success, soft: colors.successSoft },
  REASSIGNED: { color: colors.purple, soft: colors.purpleSoft },
  UNASSIGNED: { color: colors.slate, soft: colors.slateSoft },
  UPDATED: { color: colors.slate, soft: colors.slateSoft },
};

// This feature's cards/rows deliberately use a tighter 6px radius than the
// app's usual radii.card (18) / radii.input (11) — matches desktop's own
// Maintenance page, which uses `borderRadius: 6` for its filter bar,
// ticket rows, and empty state (see OperationMaintenancePage.js's
// useStyles) rather than its own more-rounded default card style.
export const MAINTENANCE_RADIUS = 6;
