import { useQuery } from '@tanstack/react-query';

import { listRoomsForHousekeeping } from '@/api/rooms';

// housekeeping.tsx's board — separate query key from ['rooms']/
// ['room-types'] (the Room Types settings screens) even though it's the
// same GET /rooms endpoint, so a clean-status update here invalidates
// just this board instead of also refetching unrelated screens.
export function useHousekeepingRooms() {
  return useQuery({
    queryKey: ['housekeeping-rooms'],
    queryFn: listRoomsForHousekeeping,
  });
}
