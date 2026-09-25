import { useQuery } from '@tanstack/react-query';

import { listStaff } from '@/api/staff';

// Shared by the Staff tab (staff-roles.tsx) and anywhere else that needs
// the staff list — same one-fetch-shared-cache pattern as
// useReservations(); mutations (add/update/disable/delete) invalidate
// ['staff'] afterward rather than merging their response into the cache.
export function useStaff() {
  return useQuery({
    queryKey: ['staff'],
    queryFn: async () => {
      const { staffs } = await listStaff();
      return staffs;
    },
  });
}
