import { useQuery } from '@tanstack/react-query';

import { listGuestTags } from '@/api/guest-tags';

// Shared by guest/[id].tsx's Add Tag sheet (the full pickable list) and
// New Tag sheet (checking a proposed name isn't already taken client-side
// before hitting the "name already exists" 200-with-failed response).
export function useGuestTags() {
  return useQuery({
    queryKey: ['guest-tags'],
    queryFn: listGuestTags,
  });
}
