import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { DateTime } from 'luxon';
import { useEffect, useRef, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import type { Room } from '../../shared/api/contracts';
import { ApiError, api } from '../../shared/api/client';
import {
  createOfficeInterval,
  defaultBookingDate,
  defaultStartTime,
  durationLabel,
  formatDateLabel,
  isValidBookingInterval,
  maxBookingDate,
  maxBookingDateForTime,
  todayInZone,
} from '../../shared/lib/date';
import { Button } from '../../shared/ui/Button';
import { Icon } from '../../shared/ui/Icon';
import { Modal } from '../../shared/ui/Modal';
import { DateControl } from '../../shared/ui/DateControl';
import { SelectControl } from '../../shared/ui/SelectControl';
import { TimeControl } from '../../shared/ui/TimeControl';
import { queryKeys } from '../../entities/query/keys';
import { buildRecurrenceDates, defaultRecurrenceEnd } from './recurrence';

const schema = z.object({
  title: z.string().trim().min(1, 'Введите название встречи').max(200),
  date: z.string().min(1, 'Выберите дату'),
  time: z.string().regex(/^\d{2}:\d{2}$/, 'Выберите время'),
  duration: z.number().int().min(15).max(660),
  comment: z.string().trim().max(2000).optional(),
  repeatEnabled: z.boolean(),
  repeatInterval: z.union([z.literal(1), z.literal(2)]),
  repeatWeekdays: z.array(z.number().int().min(1).max(7)).min(1),
  repeatUntil: z.string().min(1),
});

type FormValues = z.infer<typeof schema>;

const WEEKDAYS = [
  { value: 1, short: 'Пн' },
  { value: 2, short: 'Вт' },
  { value: 3, short: 'Ср' },
  { value: 4, short: 'Чт' },
  { value: 5, short: 'Пт' },
  { value: 6, short: 'Сб' },
  { value: 7, short: 'Вс' },
];

function meetingsLabel(count: number) {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return `${count} встреча`;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return `${count} встречи`;
  return `${count} встреч`;
}

interface BookingDialogProps {
  room: Room | null;
  open: boolean;
  initialDate?: string;
  initialTime?: string;
  initialDuration?: number;
  onClose: () => void;
  onSuccess?: () => void;
  onConflict?: () => void;
}

export function BookingDialog({
  room,
  open,
  initialDate,
  initialTime,
  initialDuration = 60,
  onClose,
  onSuccess,
  onConflict,
}: BookingDialogProps) {
  const queryClient = useQueryClient();
  const [serverError, setServerError] = useState<string>();
  const submitLocked = useRef(false);
  const timezone = room?.office.timezone ?? 'Europe/Moscow';
  const defaultDate = initialDate ?? defaultBookingDate(timezone);
  const calendarHorizon = maxBookingDate(timezone);
  const defaultWeekday = DateTime.fromISO(defaultDate, { zone: timezone }).weekday;
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: '',
      date: defaultDate,
      time: initialTime ?? defaultStartTime(timezone),
      duration: initialDuration,
      comment: '',
      repeatEnabled: false,
      repeatInterval: 1,
      repeatWeekdays: [defaultWeekday],
      repeatUntil: defaultRecurrenceEnd(defaultDate, timezone, calendarHorizon),
    },
  });

  useEffect(() => {
    if (open) {
      const resetDate = initialDate ?? defaultBookingDate(timezone);
      form.reset({
        title: '',
        date: resetDate,
        time: initialTime ?? defaultStartTime(timezone),
        duration: initialDuration,
        comment: '',
        repeatEnabled: false,
        repeatInterval: 1,
        repeatWeekdays: [DateTime.fromISO(resetDate, { zone: timezone }).weekday],
        repeatUntil: defaultRecurrenceEnd(resetDate, timezone, maxBookingDate(timezone)),
      });
      submitLocked.current = false;
      setServerError(undefined);
    }
  }, [form, initialDate, initialDuration, initialTime, open, timezone]);

  const selectedTime = form.watch('time');
  const bookingHorizon = maxBookingDateForTime(timezone, selectedTime);

  useEffect(() => {
    if (!open) return;
    const repeatUntil = form.getValues('repeatUntil');
    if (repeatUntil > bookingHorizon) {
      form.setValue('repeatUntil', bookingHorizon, { shouldValidate: true });
    }
  }, [bookingHorizon, form, open]);

  const mutation = useMutation({
    mutationFn: async (values: FormValues) => {
      if (!room) throw new Error('Комната не выбрана');
      const occurrenceDates = values.repeatEnabled
        ? buildRecurrenceDates({
            startsOn: values.date,
            endsOn: values.repeatUntil,
            intervalWeeks: values.repeatInterval,
            weekdays: values.repeatWeekdays,
            timezone,
          })
        : [values.date];
      if (!occurrenceDates.length) {
        throw new Error('В выбранном диапазоне нет ни одной встречи');
      }
      const occurrences = occurrenceDates.map((occurrenceDate) => {
        if (!isValidBookingInterval(occurrenceDate, values.time, values.duration, timezone)) {
          throw new Error(
            'Все встречи должны быть в будущем, в рабочее время и в пределах 30 дней',
          );
        }
        return createOfficeInterval(occurrenceDate, values.time, values.duration, timezone);
      });
      const seriesId = values.repeatEnabled ? crypto.randomUUID() : undefined;
      const created = [];
      try {
        for (const interval of occurrences) {
          created.push(
            await api.createBooking({
              roomId: room.id,
              ...(seriesId ? { seriesId } : {}),
              title: values.title.trim(),
              comment: values.comment?.trim() || null,
              startsAt: interval.from,
              endsAt: interval.to,
            }),
          );
        }
      } catch (error) {
        await Promise.allSettled(created.map((booking) => api.cancelBooking(booking.id)));
        throw error;
      }
      return created;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.allRooms });
      void queryClient.invalidateQueries({ queryKey: queryKeys.allSchedules });
      void queryClient.invalidateQueries({ queryKey: queryKeys.allBookings });
      onClose();
      onSuccess?.();
    },
    onError: (error) => {
      if (error instanceof ApiError && error.code === 'BOOKING_CONFLICT') {
        onClose();
        onConflict?.();
        void queryClient.invalidateQueries({ queryKey: queryKeys.allSchedules });
        return;
      }
      setServerError(error instanceof Error ? error.message : 'Не удалось создать бронирование');
    },
  });

  if (!room) return null;
  const values = form.watch();
  const recurrenceDates = values.repeatEnabled
    ? buildRecurrenceDates({
        startsOn: values.date,
        endsOn: values.repeatUntil,
        intervalWeeks: values.repeatInterval,
        weekdays: values.repeatWeekdays,
        timezone,
      })
    : [values.date];
  const validInterval =
    recurrenceDates.length > 0 &&
    recurrenceDates.every((date) =>
      isValidBookingInterval(date, values.time, values.duration, timezone),
    );

  return (
    <Modal
      open={open}
      title="Новое бронирование"
      subtitle={
        <>
          Переговорная: <strong>{room.name}</strong> ({room.office.name}, {room.floor} этаж)
        </>
      }
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Отмена
          </Button>
          <Button type="submit" form="booking-form" disabled={mutation.isPending || !validInterval}>
            {mutation.isPending ? 'Бронируем…' : 'Забронировать'}
          </Button>
        </>
      }
    >
      <form
        id="booking-form"
        className="booking-form"
        onChange={() => setServerError(undefined)}
        onSubmit={(event) =>
          void form.handleSubmit((value) => {
            if (!validInterval || submitLocked.current) return;
            submitLocked.current = true;
            mutation.mutate(value, {
              onSettled: () => {
                submitLocked.current = false;
              },
            });
          })(event)
        }
      >
        <label className="field">
          <span>Название встречи</span>
          <input placeholder="Например, обсуждение проекта" {...form.register('title')} />
          {form.formState.errors.title && <small>{form.formState.errors.title.message}</small>}
        </label>
        <div className="form-row">
          <div className="field">
            <span>Дата</span>
            <Controller
              control={form.control}
              name="date"
              render={({ field }) => (
                <DateControl
                  className="field-control"
                  value={field.value}
                  timezone={timezone}
                  ariaLabel="Дата"
                  min={todayInZone(timezone)}
                  max={maxBookingDate(timezone)}
                  onChange={(value) => {
                    field.onChange(value);
                    if (values.repeatEnabled && values.repeatUntil < value) {
                      form.setValue(
                        'repeatUntil',
                        defaultRecurrenceEnd(value, timezone, bookingHorizon),
                      );
                    }
                  }}
                />
              )}
            />
            {form.formState.errors.date && <small>{form.formState.errors.date.message}</small>}
          </div>
          <div className="field">
            <span>Время начала</span>
            <Controller
              control={form.control}
              name="time"
              render={({ field }) => (
                <TimeControl
                  className="field-control"
                  value={field.value}
                  ariaLabel="Время начала"
                  onChange={field.onChange}
                />
              )}
            />
            {form.formState.errors.time && <small>{form.formState.errors.time.message}</small>}
          </div>
        </div>
        <div className="field">
          <span>Длительность</span>
          <Controller
            control={form.control}
            name="duration"
            render={({ field }) => (
              <SelectControl
                className="field-control"
                value={String(field.value)}
                ariaLabel="Длительность"
                options={[15, 30, 45, 60, 90, 120, 180].map((minutes) => ({
                  value: String(minutes),
                  label: durationLabel(minutes),
                }))}
                onChange={(value) => field.onChange(Number(value))}
              />
            )}
          />
        </div>
        <div className="recurrence-section">
          <div className="recurrence-heading">
            <div>
              <strong>Повторять встречу</strong>
              <span>Создать серию бронирований по расписанию</span>
            </div>
            <Controller
              control={form.control}
              name="repeatEnabled"
              render={({ field }) => (
                <button
                  type="button"
                  className="repeat-switch"
                  role="switch"
                  aria-label="Повторять встречу"
                  aria-checked={field.value}
                  onClick={() => {
                    const enabled = !field.value;
                    field.onChange(enabled);
                    if (enabled) {
                      form.setValue('repeatWeekdays', [
                        DateTime.fromISO(values.date, { zone: timezone }).weekday,
                      ]);
                      form.setValue(
                        'repeatUntil',
                        defaultRecurrenceEnd(values.date, timezone, bookingHorizon),
                      );
                    }
                  }}
                >
                  <span />
                </button>
              )}
            />
          </div>
          {values.repeatEnabled && (
            <div className="recurrence-settings">
              <div className="form-row">
                <div className="field">
                  <span>Периодичность</span>
                  <Controller
                    control={form.control}
                    name="repeatInterval"
                    render={({ field }) => (
                      <SelectControl
                        className="field-control"
                        value={String(field.value)}
                        ariaLabel="Периодичность"
                        options={[
                          { value: '1', label: 'Каждую неделю' },
                          { value: '2', label: 'Раз в две недели' },
                        ]}
                        onChange={(value) => field.onChange(Number(value))}
                      />
                    )}
                  />
                </div>
                <div className="field">
                  <span>Повторять до</span>
                  <Controller
                    control={form.control}
                    name="repeatUntil"
                    render={({ field }) => (
                      <DateControl
                        className="field-control"
                        value={field.value}
                        timezone={timezone}
                        ariaLabel="Повторять до"
                        align="end"
                        min={values.date}
                        max={bookingHorizon}
                        onChange={field.onChange}
                      />
                    )}
                  />
                </div>
              </div>
              <div className="field">
                <span>Дни недели</span>
                <Controller
                  control={form.control}
                  name="repeatWeekdays"
                  render={({ field }) => (
                    <div className="weekday-picker" role="group" aria-label="Дни недели">
                      {WEEKDAYS.map((weekday) => {
                        const selected = field.value.includes(weekday.value);
                        return (
                          <button
                            type="button"
                            key={weekday.value}
                            aria-pressed={selected}
                            onClick={() => {
                              if (selected && field.value.length === 1) return;
                              field.onChange(
                                selected
                                  ? field.value.filter((value) => value !== weekday.value)
                                  : [...field.value, weekday.value].sort((a, b) => a - b),
                              );
                            }}
                          >
                            {weekday.short}
                          </button>
                        );
                      })}
                    </div>
                  )}
                />
              </div>
              <button
                type="button"
                className="weekday-preset"
                onClick={() => form.setValue('repeatWeekdays', [1, 2, 3, 4, 5])}
              >
                Выбрать будние дни
              </button>
              <div className="recurrence-preview" aria-live="polite">
                <strong>Будет создано: {meetingsLabel(recurrenceDates.length)}</strong>
                {recurrenceDates.length > 0 && (
                  <span>
                    Ближайшие даты:{' '}
                    {recurrenceDates
                      .slice(0, 4)
                      .map((date) =>
                        DateTime.fromISO(date, { zone: timezone })
                          .setLocale('ru')
                          .toFormat('d MMM'),
                      )
                      .join(', ')}
                    {recurrenceDates.length > 4 ? '…' : ''}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
        <label className="field">
          <span>
            Комментарий <em>необязательно</em>
          </span>
          <textarea placeholder="Добавьте детали встречи" {...form.register('comment')} />
        </label>
        {!validInterval && (
          <p className="form-error">
            {values.repeatEnabled
              ? 'Все встречи должны быть в будущем, в рабочее время 09:00–20:00 и не дальше 30 дней.'
              : 'Встреча должна быть в будущем, в рабочее время 09:00–20:00 и не дальше 30 дней.'}
          </p>
        )}
        {serverError && <p className="form-error">{serverError}</p>}
        {validInterval && (
          <div className="summary-banner">
            <Icon name="info" />{' '}
            {values.repeatEnabled ? (
              <>
                Серия: {meetingsLabel(recurrenceDates.length)}, {values.time} (
                {durationLabel(values.duration)})
              </>
            ) : (
              <>
                Бронирование на {formatDateLabel(values.date, timezone)}, {values.time} (
                {durationLabel(values.duration)})
              </>
            )}
          </div>
        )}
      </form>
    </Modal>
  );
}
