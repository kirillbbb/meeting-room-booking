export const queryKeys = {
  me: ['me'] as const,
  offices: ['offices'] as const,
  rooms: (filters: object) => ['rooms', filters] as const,
  allRooms: ['rooms'] as const,
  room: (id: string) => ['room', id] as const,
  schedule: (roomId: string, date: string) => ['schedule', roomId, date] as const,
  allSchedules: ['schedule'] as const,
  bookings: (scope: string, officeId?: string) => ['bookings', scope, officeId] as const,
  allBookings: ['bookings'] as const,
};
