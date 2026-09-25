import { useQuery } from '@tanstack/react-query';

import { getMyCompany } from '@/api/company';

// Shared by property-info.tsx, company-settings.tsx and edit-policies.tsx
// — one fetch of GET /staffs/me, cached under its own key so a settings/
// policies save can invalidate ['company'] without touching ['staff']
// (src/hooks/use-staff.ts's unrelated staff-list query).
export function useCompany() {
  return useQuery({
    queryKey: ['company'],
    queryFn: async () => {
      const { company } = await getMyCompany();
      return company;
    },
  });
}
