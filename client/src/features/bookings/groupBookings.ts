import type { Booking } from '../../shared/api/contracts';

export interface BookingGroup {
  id: string;
  bookings: Booking[];
  isSeries: boolean;
}

export function groupBookings(bookings: Booking[]): BookingGroup[] {
  const groups = new Map<string, Booking[]>();

  for (const booking of bookings) {
    const key = booking.seriesId ? `series:${booking.seriesId}` : `booking:${booking.id}`;
    const group = groups.get(key);
    if (group) group.push(booking);
    else groups.set(key, [booking]);
  }

  return [...groups.entries()].map(([id, groupedBookings]) => ({
    id,
    bookings: groupedBookings,
    isSeries: Boolean(groupedBookings[0]?.seriesId && groupedBookings.length > 1),
  }));
}
