import { z } from 'zod';
import {
  apiErrorSchema,
  bookingSchema,
  officeSchema,
  roomSchema,
  userSchema,
  type CreateBookingInput,
} from './contracts';

const API_BASE_URL: string = (import.meta.env.VITE_API_URL as string | undefined) ?? '/api/v1';
const withSignal = (signal?: AbortSignal): RequestInit => (signal ? { signal } : {});

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(path: string, schema: z.ZodType<T>, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: { 'content-type': 'application/json', ...init?.headers },
  });

  if (!response.ok) {
    const payload: unknown = await response.json().catch(() => undefined);
    const parsed = apiErrorSchema.safeParse(payload);
    if (parsed.success) {
      throw new ApiError(
        response.status,
        parsed.data.error.code,
        parsed.data.error.message,
        parsed.data.error.details,
      );
    }
    throw new ApiError(response.status, 'UNKNOWN_ERROR', 'Не удалось выполнить запрос');
  }

  return schema.parse(await response.json());
}

const list = <T>(schema: z.ZodType<T>) =>
  z.object({ items: z.array(schema) }).transform((v) => v.items);

export const api = {
  getMe: (signal?: AbortSignal) => request('/me', userSchema, withSignal(signal)),
  getOffices: (signal?: AbortSignal) => request('/offices', list(officeSchema), withSignal(signal)),
  getRooms: (
    filters: { officeId: string; minCapacity?: number; from?: string; to?: string },
    signal?: AbortSignal,
  ) => {
    const search = new URLSearchParams({ officeId: filters.officeId });
    if (filters.minCapacity) search.set('minCapacity', String(filters.minCapacity));
    if (filters.from && filters.to) {
      search.set('from', filters.from);
      search.set('to', filters.to);
    }
    return request(`/rooms?${search.toString()}`, list(roomSchema), withSignal(signal));
  },
  getRoom: (roomId: string, signal?: AbortSignal) =>
    request(`/rooms/${encodeURIComponent(roomId)}`, roomSchema, withSignal(signal)),
  getRoomSchedule: (roomId: string, from: string, to: string, signal?: AbortSignal) => {
    const search = new URLSearchParams({ from, to });
    return request(
      `/rooms/${encodeURIComponent(roomId)}/bookings?${search.toString()}`,
      list(bookingSchema),
      withSignal(signal),
    );
  },
  getBookings: (scope: 'upcoming' | 'past' | 'all', officeId?: string, signal?: AbortSignal) => {
    const search = new URLSearchParams({ scope });
    if (officeId) search.set('officeId', officeId);
    return request(`/bookings?${search.toString()}`, list(bookingSchema), withSignal(signal));
  },
  createBooking: (input: CreateBookingInput) =>
    request('/bookings', bookingSchema, { method: 'POST', body: JSON.stringify(input) }),
  cancelBooking: async (bookingId: string) => {
    const response = await fetch(`${API_BASE_URL}/bookings/${encodeURIComponent(bookingId)}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      const payload: unknown = await response.json().catch(() => undefined);
      const parsed = apiErrorSchema.safeParse(payload);
      throw new ApiError(
        response.status,
        parsed.success ? parsed.data.error.code : 'UNKNOWN_ERROR',
        parsed.success ? parsed.data.error.message : 'Не удалось отменить бронирование',
        parsed.success ? parsed.data.error.details : undefined,
      );
    }
  },
  cancelBookingSeries: async (seriesId: string) => {
    const response = await fetch(
      `${API_BASE_URL}/bookings/series/${encodeURIComponent(seriesId)}`,
      {
        method: 'DELETE',
      },
    );
    if (!response.ok) {
      const payload: unknown = await response.json().catch(() => undefined);
      const parsed = apiErrorSchema.safeParse(payload);
      throw new ApiError(
        response.status,
        parsed.success ? parsed.data.error.code : 'UNKNOWN_ERROR',
        parsed.success ? parsed.data.error.message : 'Не удалось отменить серию',
        parsed.success ? parsed.data.error.details : undefined,
      );
    }
  },
};
