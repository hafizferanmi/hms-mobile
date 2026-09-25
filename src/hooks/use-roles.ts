import { useQuery } from '@tanstack/react-query';

import { listRoles } from '@/api/roles';

// Shared by the Roles tab (staff-roles.tsx) and Add Staff's "ROLE" picker.
export function useRoles() {
  return useQuery({
    queryKey: ['roles'],
    queryFn: listRoles,
  });
}
