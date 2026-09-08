import { describe, expect, it } from 'vitest';
import type { Booking, Room } from '../../shared/api/contracts';
import {
  buildAvailabilityRows,
  isIntervalAvailable,
  timeFromTimelinePosition,
} from './availability';

const room = {
  id: 'room-1',
  officeId: 'office-1',
  name: 'Эверест',
  floor: 4,
  capacity: 8,
  features: [],
  office: {
    id: 'office-1',
    name: 'Офис Москва',
    address: 'Москва',
    timezone: 'Europe/Moscow',
  },
} satisfies Room;

const booking = {
  id: 'booking-1',
  seriesId: null,
  roomId: room.id,
  userId: 'user-1',
  title: 'Синк',
  comment: null,
  startsAt: '2026-09-08T07:00:00.000Z',
  endsAt: '2026-09-08T08:30:00.000Z',
  createdAt: '2026-09-07T10:00:00.000Z',
  room: { ...room, features: [], office: undefined },
  office: room.office,
  owner: {
    id: 'user-1',
    login: 'user',
    displayName: 'Пользователь',
    email: 'user@example.com',
    avatarUrl: null,
    initials: 'П',
  },
} as unknown as Booking;

describe('office availability', () => {
  it('maps bookings to the workday timeline and marks the current user', () => {
    const [row] = buildAvailabilityRows(
      [room],
      new Map([[room.id, [booking]]]),
      '2026-09-08',
      'Europe/Moscow',
      'user-1',
    );

    expect(row?.blocks[0]?.left).toBeCloseTo(100 / 11);
    expect(row?.blocks[0]?.width).toBeCloseTo(150 / 11);
    expect(row?.blocks[0]?.isMine).toBe(true);
    expect(row?.occupiedPercent).toBe(14);
  });

  it('rounds a timeline click to 15 minutes and keeps the interval in the workday', () => {
    expect(timeFromTimelinePosition(0.25, 60)).toBe('11:45');
    expect(timeFromTimelinePosition(1, 60)).toBe('19:00');
  });

  it('detects overlapping and free intervals', () => {
    const [row] = buildAvailabilityRows(
      [room],
      new Map([[room.id, [booking]]]),
      '2026-09-08',
      'Europe/Moscow',
    );
    expect(isIntervalAvailable(row?.blocks ?? [], '10:30', 60)).toBe(false);
    expect(isIntervalAvailable(row?.blocks ?? [], '12:00', 60)).toBe(true);
  });
});
