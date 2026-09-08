import { z } from 'zod';

export const userSchema = z.object({
  id: z.string(),
  login: z.string(),
  displayName: z.string(),
  email: z.string().email(),
  avatarUrl: z.string().nullable(),
  initials: z.string(),
});

export const officeSchema = z.object({
  id: z.string(),
  name: z.string(),
  address: z.string(),
  timezone: z.string(),
});

export const roomFeatureSchema = z.object({ code: z.string(), name: z.string() });

export const roomSchema = z.object({
  id: z.string(),
  officeId: z.string(),
  name: z.string(),
  floor: z.number().int(),
  capacity: z.number().int().positive(),
  features: z.array(roomFeatureSchema),
  office: officeSchema,
  available: z.boolean().optional(),
});

export const bookingSchema = z.object({
  id: z.string(),
  seriesId: z.string().nullable().default(null),
  roomId: z.string(),
  userId: z.string(),
  title: z.string(),
  comment: z.string().nullable(),
  startsAt: z.iso.datetime(),
  endsAt: z.iso.datetime(),
  createdAt: z.iso.datetime(),
  room: z.object({
    id: z.string(),
    officeId: z.string(),
    name: z.string(),
    floor: z.number().int(),
    capacity: z.number().int(),
    features: z.array(roomFeatureSchema),
  }),
  office: officeSchema,
  owner: userSchema,
});

export const apiErrorSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.record(z.string(), z.unknown()).optional(),
  }),
});

export const realtimeEventSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('booking.created'),
    occurredAt: z.iso.datetime(),
    data: z.object({ booking: bookingSchema }),
  }),
  z.object({
    type: z.literal('booking.cancelled'),
    occurredAt: z.iso.datetime(),
    data: z.object({ booking: bookingSchema }),
  }),
  z.object({
    type: z.literal('room.availability_changed'),
    occurredAt: z.iso.datetime(),
    data: z.object({
      roomId: z.string(),
      officeId: z.string(),
      startsAt: z.iso.datetime(),
      endsAt: z.iso.datetime(),
      available: z.boolean(),
    }),
  }),
  z.object({
    type: z.literal('data.reset'),
    occurredAt: z.iso.datetime(),
    data: z.object({}),
  }),
]);

export type User = z.infer<typeof userSchema>;
export type Office = z.infer<typeof officeSchema>;
export type Room = z.infer<typeof roomSchema>;
export type Booking = z.infer<typeof bookingSchema>;
export type RealtimeEvent = z.infer<typeof realtimeEventSchema>;

export interface CreateBookingInput {
  roomId: string;
  seriesId?: string | null;
  title: string;
  comment?: string | null;
  startsAt: string;
  endsAt: string;
}
