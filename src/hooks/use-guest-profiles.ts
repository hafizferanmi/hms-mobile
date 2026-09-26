import { useQuery } from '@tanstack/react-query';

import { getGuestProfileDetail, listGuestProfiles } from '@/api/guests';

// guests.tsx's list — search and status filtering both happen client-side
// over the full fetched list, same split as staff-roles.tsx.
export function useGuestProfiles() {
  return useQuery({
    queryKey: ['guest-profiles'],
    queryFn: listGuestProfiles,
  });
}

// guest/[id].tsx's detail screen.
export function useGuestProfileDetail(guestProfileId: string) {
  return useQuery({
    queryKey: ['guest-profile', guestProfileId],
    queryFn: () => getGuestProfileDetail(guestProfileId),
    enabled: !!guestProfileId,
  });
}
