import { describe, expect, it, vi } from 'vitest';
import { downloadBookingIcs } from './ics';

describe('calendar export', () => {
  it('creates a downloadable calendar file', () => {
    const createObjectURL = vi.fn(() => 'blob:booking');
    const revokeObjectURL = vi.fn();
    Object.defineProperty(URL, 'createObjectURL', { value: createObjectURL, configurable: true });
    Object.defineProperty(URL, 'revokeObjectURL', { value: revokeObjectURL, configurable: true });
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => undefined);

    downloadBookingIcs({
      id: 'booking-1',
      seriesId: null,
      roomId: 'room-1',
      userId: 'user-1',
      title: 'Sync, team',
      comment: null,
      startsAt: '2026-09-09T10:00:00.000Z',
      endsAt: '2026-09-09T11:00:00.000Z',
      createdAt: '2026-09-08T10:00:00.000Z',
      room: {
        id: 'room-1',
        officeId: 'office-1',
        name: 'Эверест',
        floor: 4,
        capacity: 8,
        features: [],
      },
      office: {
        id: 'office-1',
        name: 'Офис Москва',
        address: 'ул. Лесная, 7',
        timezone: 'Europe/Moscow',
      },
      owner: {
        id: 'user-1',
        login: 'user',
        displayName: 'User',
        email: 'user@example.test',
        avatarUrl: null,
        initials: 'UU',
      },
    });

    expect(createObjectURL).toHaveBeenCalledOnce();
    expect(click).toHaveBeenCalledOnce();
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:booking');
  });
});
