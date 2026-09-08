import { describe, expect, it } from 'vitest';
import { buildRecurrenceDates, defaultRecurrenceEnd } from './recurrence';

describe('buildRecurrenceDates', () => {
  it('builds selected weekdays every week', () => {
    expect(
      buildRecurrenceDates({
        startsOn: '2026-09-07',
        endsOn: '2026-09-18',
        intervalWeeks: 1,
        weekdays: [1, 3, 5],
        timezone: 'Europe/Moscow',
      }),
    ).toEqual(['2026-09-07', '2026-09-09', '2026-09-11', '2026-09-14', '2026-09-16', '2026-09-18']);
  });

  it('skips alternate weeks for a two-week interval', () => {
    expect(
      buildRecurrenceDates({
        startsOn: '2026-09-07',
        endsOn: '2026-10-05',
        intervalWeeks: 2,
        weekdays: [1],
        timezone: 'Europe/Moscow',
      }),
    ).toEqual(['2026-09-07', '2026-09-21', '2026-10-05']);
  });

  it('returns no dates for an invalid rule', () => {
    expect(
      buildRecurrenceDates({
        startsOn: '2026-09-10',
        endsOn: '2026-09-01',
        intervalWeeks: 1,
        weekdays: [1],
        timezone: 'Europe/Moscow',
      }),
    ).toEqual([]);
  });
});

describe('defaultRecurrenceEnd', () => {
  it('uses the first day of the next month', () => {
    expect(defaultRecurrenceEnd('2026-09-08', 'Europe/Moscow', '2026-10-08')).toBe('2026-10-01');
  });

  it('caps the next month boundary at the booking horizon', () => {
    expect(defaultRecurrenceEnd('2026-01-31', 'Europe/Moscow', '2026-01-31')).toBe('2026-01-31');
  });
});
