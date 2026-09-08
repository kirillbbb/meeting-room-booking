import { DateTime } from 'luxon';
import type { Booking, Room } from '../../shared/api/contracts';

export const WORKDAY_START_MINUTES = 9 * 60;
export const WORKDAY_END_MINUTES = 20 * 60;
export const WORKDAY_DURATION_MINUTES = WORKDAY_END_MINUTES - WORKDAY_START_MINUTES;

export interface AvailabilityBlock {
  id: string;
  title: string;
  startsAt: string;
  endsAt: string;
  startMinute: number;
  endMinute: number;
  left: number;
  width: number;
  isMine: boolean;
}

export interface AvailabilityRow {
  room: Room;
  blocks: AvailabilityBlock[];
  occupiedPercent: number;
}

const clamp = (value: number, minimum: number, maximum: number) =>
  Math.min(maximum, Math.max(minimum, value));

export function minuteToPercent(minute: number) {
  return ((minute - WORKDAY_START_MINUTES) / WORKDAY_DURATION_MINUTES) * 100;
}

export function timeFromTimelinePosition(position: number, duration: number) {
  const latestStart = WORKDAY_END_MINUTES - duration;
  const rawMinute = WORKDAY_START_MINUTES + clamp(position, 0, 1) * WORKDAY_DURATION_MINUTES;
  const minute = clamp(Math.round(rawMinute / 15) * 15, WORKDAY_START_MINUTES, latestStart);
  const hours = Math.floor(minute / 60);
  const minutes = minute % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

export function isIntervalAvailable(blocks: AvailabilityBlock[], start: string, duration: number) {
  const [hours = 0, minutes = 0] = start.split(':').map(Number);
  const startMinute = hours * 60 + minutes;
  const endMinute = startMinute + duration;
  return !blocks.some((block) => block.startMinute < endMinute && block.endMinute > startMinute);
}

export function buildAvailabilityRows(
  rooms: Room[],
  schedules: Map<string, Booking[]>,
  date: string,
  timezone: string,
  currentUserId?: string,
): AvailabilityRow[] {
  const workdayStart = DateTime.fromISO(date, { zone: timezone }).set({
    hour: 9,
    minute: 0,
    second: 0,
    millisecond: 0,
  });

  return rooms.map((room) => {
    const blocks = (schedules.get(room.id) ?? []).flatMap<AvailabilityBlock>((booking) => {
      const startsAt = DateTime.fromISO(booking.startsAt).setZone(timezone);
      const endsAt = DateTime.fromISO(booking.endsAt).setZone(timezone);
      const startMinute = clamp(
        WORKDAY_START_MINUTES + startsAt.diff(workdayStart, 'minutes').minutes,
        WORKDAY_START_MINUTES,
        WORKDAY_END_MINUTES,
      );
      const endMinute = clamp(
        WORKDAY_START_MINUTES + endsAt.diff(workdayStart, 'minutes').minutes,
        WORKDAY_START_MINUTES,
        WORKDAY_END_MINUTES,
      );
      if (endMinute <= startMinute) return [];

      return [
        {
          id: booking.id,
          title: booking.title,
          startsAt: booking.startsAt,
          endsAt: booking.endsAt,
          startMinute,
          endMinute,
          left: minuteToPercent(startMinute),
          width: ((endMinute - startMinute) / WORKDAY_DURATION_MINUTES) * 100,
          isMine: booking.userId === currentUserId,
        },
      ];
    });
    const occupiedMinutes = blocks.reduce(
      (total, block) => total + block.endMinute - block.startMinute,
      0,
    );

    return {
      room,
      blocks,
      occupiedPercent: Math.round((occupiedMinutes / WORKDAY_DURATION_MINUTES) * 100),
    };
  });
}
