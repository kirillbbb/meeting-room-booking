import { DateTime } from 'luxon';

export const WORK_START_HOUR = 9;
export const WORK_END_HOUR = 20;
export const SLOT_MINUTES = 15;

export function todayInZone(timezone: string): string {
  return DateTime.now().setZone(timezone).toISODate() ?? '';
}

function nextAvailableSlot(timezone: string): DateTime {
  const now = DateTime.now().setZone(timezone).plus({ minutes: SLOT_MINUTES });
  const roundedMinute = Math.ceil(now.minute / SLOT_MINUTES) * SLOT_MINUTES;
  let result = now.startOf('hour').plus({ minutes: roundedMinute });
  if (result.hour < WORK_START_HOUR) result = result.set({ hour: WORK_START_HOUR, minute: 0 });
  if (result.hour >= WORK_END_HOUR)
    result = result.plus({ days: 1 }).startOf('day').set({ hour: WORK_START_HOUR });
  return result;
}

export function defaultStartTime(timezone: string): string {
  return nextAvailableSlot(timezone).toFormat('HH:mm');
}

export function defaultBookingDate(timezone: string): string {
  return nextAvailableSlot(timezone).toISODate() ?? '';
}

export function createOfficeInterval(
  date: string,
  time: string,
  durationMinutes: number,
  timezone: string,
): { from: string; to: string } {
  const start = DateTime.fromISO(`${date}T${time}`, { zone: timezone });
  return {
    from: start.toUTC().toISO() ?? '',
    to: start.plus({ minutes: durationMinutes }).toUTC().toISO() ?? '',
  };
}

export function officeDayInterval(date: string, timezone: string): { from: string; to: string } {
  const start = DateTime.fromISO(date, { zone: timezone }).startOf('day');
  return { from: start.toUTC().toISO() ?? '', to: start.plus({ days: 1 }).toUTC().toISO() ?? '' };
}

export function isValidBookingInterval(
  date: string,
  time: string,
  duration: number,
  timezone: string,
): boolean {
  const start = DateTime.fromISO(`${date}T${time}`, { zone: timezone });
  const end = start.plus({ minutes: duration });
  const now = DateTime.now().setZone(timezone);
  return (
    start.isValid &&
    start > now &&
    start <= now.plus({ days: 30 }) &&
    start.minute % SLOT_MINUTES === 0 &&
    duration >= SLOT_MINUTES &&
    duration % SLOT_MINUTES === 0 &&
    start.hour >= WORK_START_HOUR &&
    end.startOf('day').equals(start.startOf('day')) &&
    (end.hour < WORK_END_HOUR || (end.hour === WORK_END_HOUR && end.minute === 0))
  );
}

export function formatDateLabel(date: string, timezone: string): string {
  const value = DateTime.fromISO(date, { zone: timezone }).setLocale('ru').toFormat('d MMMM, ccc');
  return value.replace(
    /(^|[ ,])([а-яё])/gu,
    (_, prefix: string, letter: string) => `${prefix}${letter.toUpperCase()}`,
  );
}

export function formatTime(iso: string, timezone: string): string {
  return DateTime.fromISO(iso).setZone(timezone).toFormat('HH:mm');
}

export function formatBookingDate(iso: string, timezone: string): string {
  return DateTime.fromISO(iso).setZone(timezone).setLocale('ru').toFormat('d MMMM yyyy');
}

export function getDateParts(iso: string, timezone: string): { month: string; day: string } {
  const date = DateTime.fromISO(iso).setZone(timezone).setLocale('ru');
  return { month: date.toFormat('LLL').replace('.', ''), day: date.toFormat('dd') };
}

export function maxBookingDate(timezone: string): string {
  return DateTime.now().setZone(timezone).plus({ days: 30 }).toISODate() ?? '';
}

export function maxBookingDateForTime(timezone: string, time: string): string {
  const maximumStart = DateTime.now().setZone(timezone).plus({ days: 30 });
  const maximumDate = maximumStart.toISODate() ?? '';
  const candidate = DateTime.fromISO(`${maximumDate}T${time}`, { zone: timezone });

  if (!candidate.isValid || candidate <= maximumStart) return maximumDate;
  return maximumStart.minus({ days: 1 }).toISODate() ?? maximumDate;
}

export function localClock(timezone: string): string {
  const time = DateTime.now().setZone(timezone);
  const timezoneLabels: Record<string, string> = {
    'Europe/Moscow': 'MSK',
  };
  return `${time.toFormat('HH:mm')} ${timezoneLabels[timezone] ?? time.offsetNameShort}`;
}

export function nextBookingEnd(
  bookings: { startsAt: string; endsAt: string }[],
  timezone: string,
): string | null {
  const now = DateTime.now();
  const active = bookings.find((booking) => {
    const start = DateTime.fromISO(booking.startsAt);
    const end = DateTime.fromISO(booking.endsAt);
    return start <= now && end > now;
  });
  return active ? formatTime(active.endsAt, timezone) : null;
}

export function durationLabel(minutes: number): string {
  if (minutes < 60) return `${minutes} мин.`;
  if (minutes % 60 === 0) {
    const hours = minutes / 60;
    return hours === 1 ? '1 час' : `${hours} часа`;
  }
  return `${Math.floor(minutes / 60)} ч. ${minutes % 60} мин.`;
}
