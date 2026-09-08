import { Settings } from 'luxon';
import { afterEach, describe, expect, it } from 'vitest';
import {
  allowedDurationsForStart,
  normalizeRoomsSearchParams,
  readRoomsFilters,
} from './rooms-search-params';

afterEach(() => {
  Settings.now = () => Date.now();
});

describe('rooms search params', () => {
  it('normalizes malformed and out-of-range values', () => {
    const fixedNow = Date.parse('2026-09-08T12:00:00+03:00');
    Settings.now = () => fixedNow;
    const filters = readRoomsFilters(
      new URLSearchParams('date=wrong&start=99:45&duration=-1&capacity=NaN'),
      'Europe/Moscow',
    );

    expect(filters).toEqual({ date: '2026-09-08', start: '12:15', duration: 60, capacity: 4 });
  });

  it('limits duration by the end of the workday', () => {
    expect(allowedDurationsForStart('19:45')).toEqual([15]);
    expect(allowedDurationsForStart('18:30')).toEqual([15, 30, 45, 60, 90]);
  });

  it('preserves development preview state while removing legacy office state', () => {
    const next = normalizeRoomsSearchParams(new URLSearchParams('__state=empty&office=old'), {
      date: '2026-09-09',
      start: '10:00',
      duration: 60,
      capacity: 4,
    });

    expect(next.toString()).toBe(
      '__state=empty&date=2026-09-09&start=10%3A00&duration=60&capacity=4',
    );
  });
});
