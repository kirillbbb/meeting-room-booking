import { describe, expect, it } from 'vitest';
import type { Booking } from '../../shared/api/contracts';
import { groupBookings } from './groupBookings';

function booking(id: string, seriesId: string | null): Booking {
  return {
    id,
    seriesId,
    roomId: 'room-everest',
    userId: 'user-konstantin',
    title: 'Синхронизация',
    comment: null,
    startsAt: `2026-09-${id.padStart(2, '0')}T12:00:00.000Z`,
    endsAt: `2026-09-${id.padStart(2, '0')}T13:00:00.000Z`,
    createdAt: '2026-09-01T09:00:00.000Z',
    room: {
      id: 'room-everest',
      officeId: 'office-moscow',
      name: 'Эверест',
      floor: 4,
      capacity: 12,
      features: [],
    },
    office: {
      id: 'office-moscow',
      name: 'Офис Москва',
      address: 'Москва, ул. Лесная, 7',
      timezone: 'Europe/Moscow',
    },
    owner: {
      id: 'user-konstantin',
      login: 'konstantin',
      displayName: 'Константин Кузнецов',
      email: 'konstantin@example.com',
      avatarUrl: null,
      initials: 'КК',
    },
  };
}

describe('groupBookings', () => {
  it('combines occurrences with the same series id while keeping single bookings separate', () => {
    const result = groupBookings([
      booking('09', 'series-daily'),
      booking('10', 'series-daily'),
      booking('11', null),
    ]);

    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({ id: 'series:series-daily', isSeries: true });
    expect(result[0]?.bookings).toHaveLength(2);
    expect(result[1]).toMatchObject({ id: 'booking:11', isSeries: false });
  });
});
