import { DateTime } from 'luxon';

export type RepeatIntervalWeeks = 1 | 2;

export interface RecurrenceRule {
  startsOn: string;
  endsOn: string;
  intervalWeeks: RepeatIntervalWeeks;
  weekdays: number[];
  timezone: string;
}

export function buildRecurrenceDates({
  startsOn,
  endsOn,
  intervalWeeks,
  weekdays,
  timezone,
}: RecurrenceRule): string[] {
  const start = DateTime.fromISO(startsOn, { zone: timezone }).startOf('day');
  const end = DateTime.fromISO(endsOn, { zone: timezone }).startOf('day');
  if (!start.isValid || !end.isValid || end < start || !weekdays.length) return [];

  const selectedWeekdays = new Set(weekdays);
  const firstWeek = start.startOf('week');
  const dates: string[] = [];

  for (let day = start; day <= end; day = day.plus({ days: 1 })) {
    const weekOffset = Math.floor(day.startOf('week').diff(firstWeek, 'weeks').weeks);
    if (weekOffset % intervalWeeks === 0 && selectedWeekdays.has(day.weekday)) {
      const isoDate = day.toISODate();
      if (isoDate) dates.push(isoDate);
    }
  }

  return dates;
}

export function defaultRecurrenceEnd(startsOn: string, timezone: string, maxDate: string): string {
  const start = DateTime.fromISO(startsOn, { zone: timezone });
  const maximum = DateTime.fromISO(maxDate, { zone: timezone });
  const preferred = start.plus({ months: 1 }).startOf('month');
  return DateTime.min(preferred, maximum).toISODate() ?? maxDate;
}
