import { DateTime } from 'luxon';
import { useEffect, useMemo, useRef, useState } from 'react';
import { formatDateLabel } from '../lib/date';
import { Icon } from './Icon';

interface DateControlProps {
  value: string;
  timezone: string;
  onChange: (value: string) => void;
  ariaLabel: string;
  disabled?: boolean;
  min?: string;
  max?: string;
  className?: string;
  placeholder?: string;
  allowClear?: boolean;
  align?: 'start' | 'end';
}

const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function DateControl({
  value,
  timezone,
  onChange,
  ariaLabel,
  disabled,
  min,
  max,
  className = '',
  placeholder = 'Выберите дату',
  allowClear = false,
  align = 'start',
}: DateControlProps) {
  const initialMonth = DateTime.fromISO(value || min || '', { zone: timezone });
  const [open, setOpen] = useState(false);
  const [visibleMonth, setVisibleMonth] = useState(
    (initialMonth.isValid ? initialMonth : DateTime.now().setZone(timezone)).startOf('month'),
  );
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const selectedDate = value ? DateTime.fromISO(value, { zone: timezone }).startOf('day') : null;
  const minDate = min ? DateTime.fromISO(min, { zone: timezone }).startOf('day') : null;
  const maxDate = max ? DateTime.fromISO(max, { zone: timezone }).endOf('day') : null;

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  useEffect(() => {
    if (value) setVisibleMonth(DateTime.fromISO(value, { zone: timezone }).startOf('month'));
  }, [timezone, value]);

  const days = useMemo(() => {
    const gridStart = visibleMonth.startOf('week');
    return Array.from({ length: 42 }, (_, index) => gridStart.plus({ days: index }));
  }, [visibleMonth]);

  const previousDisabled = Boolean(
    minDate && visibleMonth.minus({ months: 1 }).endOf('month') < minDate,
  );
  const nextDisabled = Boolean(
    maxDate && visibleMonth.plus({ months: 1 }).startOf('month') > maxDate,
  );

  const choose = (day: DateTime) => {
    onChange(day.toISODate() ?? '');
    setOpen(false);
    window.requestAnimationFrame(() => triggerRef.current?.focus());
  };

  return (
    <div ref={rootRef} className={`date-control custom-control ${className}`}>
      <button
        ref={triggerRef}
        type="button"
        className="control-trigger"
        aria-label={ariaLabel}
        aria-expanded={open}
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
      >
        <Icon name="calendar" />
        <span>{value ? formatDateLabel(value, timezone) : placeholder}</span>
      </button>
      {open && (
        <div
          className={`control-popover calendar-popover calendar-popover--${align}`}
          role="dialog"
          aria-label={`Календарь: ${ariaLabel}`}
        >
          <div className="calendar-header">
            <strong>{capitalize(visibleMonth.setLocale('ru').toFormat('LLLL yyyy'))}</strong>
            <div className="calendar-navigation">
              <button
                type="button"
                aria-label="Предыдущий месяц"
                disabled={previousDisabled}
                onClick={() => setVisibleMonth((month) => month.minus({ months: 1 }))}
              >
                ‹
              </button>
              <button
                type="button"
                aria-label="Следующий месяц"
                disabled={nextDisabled}
                onClick={() => setVisibleMonth((month) => month.plus({ months: 1 }))}
              >
                ›
              </button>
            </div>
          </div>
          <div className="calendar-weekdays" aria-hidden="true">
            {WEEKDAYS.map((weekday) => (
              <span key={weekday}>{weekday}</span>
            ))}
          </div>
          <div className="calendar-grid">
            {days.map((day) => {
              const outside = day.month !== visibleMonth.month;
              const unavailable = Boolean((minDate && day < minDate) || (maxDate && day > maxDate));
              const selected = selectedDate?.hasSame(day, 'day') ?? false;
              const today = day.hasSame(DateTime.now().setZone(timezone), 'day');
              return (
                <button
                  type="button"
                  key={day.toISODate()}
                  disabled={unavailable}
                  aria-label={day.setLocale('ru').toFormat('d MMMM yyyy')}
                  aria-pressed={selected}
                  className={`${outside ? 'is-outside' : ''} ${selected ? 'is-selected' : ''} ${today ? 'is-today' : ''}`}
                  onClick={() => choose(day)}
                >
                  {day.day}
                </button>
              );
            })}
          </div>
          {allowClear && value && (
            <button
              type="button"
              className="calendar-clear"
              onClick={() => {
                onChange('');
                setOpen(false);
              }}
            >
              Сбросить дату
            </button>
          )}
        </div>
      )}
    </div>
  );
}
