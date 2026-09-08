import { useQuery } from '@tanstack/react-query';
import { api } from '../../shared/api/client';
import { queryKeys } from './keys';

export function useMe() {
  return useQuery({
    queryKey: queryKeys.me,
    queryFn: ({ signal }) => api.getMe(signal),
    staleTime: 60_000,
  });
}

export function useOffices() {
  return useQuery({
    queryKey: queryKeys.offices,
    queryFn: ({ signal }) => api.getOffices(signal),
    staleTime: 300_000,
  });
}

export function useRooms(filters: {
  officeId: string;
  minCapacity?: number;
  from?: string;
  to?: string;
}) {
  return useQuery({
    queryKey: queryKeys.rooms(filters),
    queryFn: ({ signal }) => api.getRooms(filters, signal),
    enabled: Boolean(filters.officeId),
  });
}

export function useRoom(roomId: string) {
  return useQuery({
    queryKey: queryKeys.room(roomId),
    queryFn: ({ signal }) => api.getRoom(roomId, signal),
    enabled: Boolean(roomId),
  });
}

export function useRoomSchedule(roomId: string, date: string, from: string, to: string) {
  return useQuery({
    queryKey: queryKeys.schedule(roomId, date),
    queryFn: ({ signal }) => api.getRoomSchedule(roomId, from, to, signal),
    enabled: Boolean(roomId && date && from && to),
  });
}

export function useBookings(scope: 'upcoming' | 'past', officeId?: string) {
  return useQuery({
    queryKey: queryKeys.bookings(scope, officeId),
    queryFn: ({ signal }) => api.getBookings(scope, officeId, signal),
  });
}
