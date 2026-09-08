import { afterEach, describe, expect, it, vi } from 'vitest';
import { api } from './client';

describe('API client errors', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('normalizes a structured backend error', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            error: {
              code: 'BOOKING_CONFLICT',
              message: 'Переговорная уже занята',
              details: { roomId: 'room-everest' },
            },
          }),
          { status: 409, headers: { 'content-type': 'application/json' } },
        ),
      ),
    );

    await expect(
      api.createBooking({
        roomId: 'room-everest',
        title: 'Встреча',
        startsAt: '2026-09-09T09:00:00.000Z',
        endsAt: '2026-09-09T10:00:00.000Z',
      }),
    ).rejects.toMatchObject({
      status: 409,
      code: 'BOOKING_CONFLICT',
      message: 'Переговорная уже занята',
      details: { roomId: 'room-everest' },
    });
  });

  it('uses a safe fallback for an invalid error payload', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response('service unavailable', { status: 503 })),
    );

    await expect(api.getOffices()).rejects.toMatchObject({
      status: 503,
      code: 'UNKNOWN_ERROR',
      message: 'Не удалось выполнить запрос',
    });
  });
});
