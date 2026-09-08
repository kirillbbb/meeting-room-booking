import { describe, expect, it } from 'vitest';
import { realtimeEventSchema, roomSchema } from './contracts';

describe('API boundary contracts', () => {
  it('accepts a room returned by the backend', () => {
    const parsed = roomSchema.parse({
      id: 'room-everest',
      officeId: 'office-moscow',
      name: 'Эверест',
      floor: 4,
      capacity: 12,
      features: [{ code: 'display', name: 'ТВ-панель' }],
      office: {
        id: 'office-moscow',
        name: 'Офис Москва',
        address: 'Москва, ул. Лесная, 7',
        timezone: 'Europe/Moscow',
      },
      available: true,
    });
    expect(parsed.available).toBe(true);
  });

  it('rejects malformed real-time events instead of poisoning the cache', () => {
    expect(
      realtimeEventSchema.safeParse({ type: 'room.availability_changed', data: {} }).success,
    ).toBe(false);
  });
});
