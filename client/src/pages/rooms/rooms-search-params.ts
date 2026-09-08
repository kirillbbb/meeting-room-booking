import { DateTime } from 'luxon';
import {
  defaultBookingDate,
  defaultStartTime,
  maxBookingDate,
  todayInZone,
} from '../../shared/lib/date';

export const ROOM_CAPACITIES = [2, 4, 6, 8, 10, 12] as const;
export const ROOM_DURATIONS = [15, 30, 45, 60, 90, 120] as const;

export interface RoomsFilters {
  date: string;
  start: string;
  duration: number;
  capacity: number;
}

function isAllowedDate(value: string | null, timezone: string): value is string {
  if (!value) return false;
  const date = DateTime.fromISO(value, { zone: timezone }).startOf('day');
  return (
    date.isValid &&
    date.toISODate() === value &&
    value >= todayInZone(timezone) &&
    value <= maxBookingDate(timezone)
  );
}

function isAllowedStart(value: string | null): value is string {
  if (!value || !/^\d{2}:\d{2}$/.test(value)) return false;
  const [hours = -1, minutes = -1] = value.split(':').map(Number);
  const total = hours * 60 + minutes;
  return minutes % 15 === 0 && total >= 9 * 60 && total <= 19 * 60 + 45;
}

export function allowedDurationsForStart(start: string): number[] {
  const [hours = 20, minutes = 0] = start.split(':').map(Number);
  const remaining = 20 * 60 - (hours * 60 + minutes);
  return ROOM_DURATIONS.filter((duration) => duration <= remaining);
}

export function readRoomsFilters(params: URLSearchParams, timezone: string): RoomsFilters {
  const fallbackStart = defaultStartTime(timezone);
  const start = isAllowedStart(params.get('start')) ? params.get('start')! : fallbackStart;
  const durations = allowedDurationsForStart(start);
  const requestedDuration = Number(params.get('duration'));
  const duration = durations.includes(requestedDuration)
    ? requestedDuration
    : durations.includes(60)
      ? 60
      : (durations.at(-1) ?? 15);
  const requestedCapacity = Number(params.get('capacity'));

  return {
    date: isAllowedDate(params.get('date'), timezone)
      ? params.get('date')!
      : defaultBookingDate(timezone),
    start,
    duration,
    capacity: ROOM_CAPACITIES.includes(requestedCapacity as (typeof ROOM_CAPACITIES)[number])
      ? requestedCapacity
      : 4,
  };
}

export function normalizeRoomsSearchParams(
  params: URLSearchParams,
  filters: RoomsFilters,
): URLSearchParams {
  const next = new URLSearchParams(params);
  next.delete('office');
  next.set('date', filters.date);
  next.set('start', filters.start);
  next.set('duration', String(filters.duration));
  next.set('capacity', String(filters.capacity));
  return next;
}
