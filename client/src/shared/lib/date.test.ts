import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createOfficeInterval,
  durationLabel,
  isValidBookingInterval,
  localClock,
  maxBookingDateForTime,
  officeDayInterval,
} from './date';

describe('office date rules', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-08T09:00:00.000Z'));
  });
  afterEach(() => vi.useRealTimers());

  it('converts office-local time to UTC', () => {
    expect(createOfficeInterval('2026-09-09', '15:15', 60, 'Europe/Moscow')).toEqual({
      from: '2026-09-09T12:15:00.000Z',
      to: '2026-09-09T13:15:00.000Z',
    });
  });

  it('accepts a future quarter-hour interval within working hours', () => {
    expect(isValidBookingInterval('2026-09-09', '09:00', 15, 'Europe/Moscow')).toBe(true);
    expect(isValidBookingInterval('2026-09-09', '19:45', 15, 'Europe/Moscow')).toBe(true);
  });

  it('limits the last selectable day using the selected start time', () => {
    expect(maxBookingDateForTime('Europe/Moscow', '12:00')).toBe('2026-10-08');
    expect(maxBookingDateForTime('Europe/Moscow', '12:15')).toBe('2026-10-07');
  });

  it('rejects invalid slots and intervals ending after 20:00', () => {
    expect(isValidBookingInterval('2026-09-09', '08:45', 15, 'Europe/Moscow')).toBe(false);
    expect(isValidBookingInterval('2026-09-09', '19:45', 30, 'Europe/Moscow')).toBe(false);
    expect(isValidBookingInterval('2026-09-09', '10:10', 30, 'Europe/Moscow')).toBe(false);
  });

  it('creates day boundaries in the office timezone', () => {
    expect(officeDayInterval('2026-09-09', 'Europe/Moscow')).toEqual({
      from: '2026-09-08T21:00:00.000Z',
      to: '2026-09-09T21:00:00.000Z',
    });
  });

  it('formats common durations', () => {
    expect(durationLabel(45)).toBe('45 мин.');
    expect(durationLabel(60)).toBe('1 час');
    expect(durationLabel(90)).toBe('1 ч. 30 мин.');
  });

  it('uses the stable office timezone label shown in the design', () => {
    expect(localClock('Europe/Moscow')).toBe('12:00 MSK');
  });
});
