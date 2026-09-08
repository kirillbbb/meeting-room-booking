import { useQueries } from '@tanstack/react-query';
import { DateTime } from 'luxon';
import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useOfficeSelection } from '../../app/office-selection';
import { queryKeys } from '../../entities/query/keys';
import { useMe, useOffices, useRooms } from '../../entities/query/hooks';
import { BookingDialog } from '../../features/booking/BookingDialog';
import { OfficeAvailabilityBoard } from '../../features/office-availability/OfficeAvailabilityBoard';
import { api } from '../../shared/api/client';
import type { Room } from '../../shared/api/contracts';
import {
  createOfficeInterval,
  durationLabel,
  formatTime,
  localClock,
  maxBookingDate,
  officeDayInterval,
  todayInZone,
} from '../../shared/lib/date';
import { getPreviewState } from '../../shared/lib/preview-state';
import { Button } from '../../shared/ui/Button';
import { DateControl } from '../../shared/ui/DateControl';
import { Icon } from '../../shared/ui/Icon';
import { Modal } from '../../shared/ui/Modal';
import { SelectControl } from '../../shared/ui/SelectControl';
import { StatusState } from '../../shared/ui/StatusState';
import { SuccessToast } from '../../shared/ui/SuccessToast';
import { TimeInput } from '../../shared/ui/TimeInput';
import {
  ROOM_CAPACITIES,
  allowedDurationsForStart,
  normalizeRoomsSearchParams,
  readRoomsFilters,
} from './rooms-search-params';

function SkeletonCards() {
  return (
    <div className="rooms-grid">
      {Array.from({ length: 4 }, (_, i) => (
        <div key={i} className="room-card room-card-skeleton" aria-hidden="true">
          <div className="skeleton-line skeleton-line--room-title" />
          <div className="skeleton-line skeleton-line--floor" />
          <div className="skeleton-stat">
            <span className="skeleton-line" />
            <span className="skeleton-line" />
          </div>
          <div className="skeleton-stat">
            <span className="skeleton-line" />
            <span className="skeleton-line" />
          </div>
          <div className="skeleton-line skeleton-line--availability" />
          <div className="skeleton-actions">
            <span className="skeleton-line" />
            <span className="skeleton-line" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function RoomsPage() {
  const offices = useOffices();
  const me = useMe();
  const [params, setParams] = useSearchParams();
  const { selectedOfficeId, setSelectedOfficeId } = useOfficeSelection();
  const previewState = getPreviewState(params, ['loading', 'error', 'empty', 'offline']);
  const [bookingSelection, setBookingSelection] = useState<{ room: Room; start: string } | null>(
    null,
  );
  const [feedback, setFeedback] = useState<'success' | 'conflict' | null>(null);
  const officeId = selectedOfficeId || (previewState ? 'office-moscow' : '');
  const office = offices.data?.find((item) => item.id === officeId);
  const timezone = office?.timezone ?? 'Europe/Moscow';
  const filters = readRoomsFilters(params, timezone);
  const { date, start, duration, capacity } = filters;
  const view = params.get('view') === 'schedule' ? 'schedule' : 'cards';
  const durations = allowedDurationsForStart(start);
  const interval = createOfficeInterval(date, start, duration, timezone);
  const rooms = useRooms({
    officeId,
    minCapacity: capacity,
    ...(officeId ? { from: interval.from, to: interval.to } : {}),
  });

  const day = officeDayInterval(date, timezone);
  const scheduleQueries = useQueries({
    queries: (rooms.data ?? []).map((room) => ({
      queryKey: queryKeys.schedule(room.id, date),
      queryFn: ({ signal }: { signal: AbortSignal }) =>
        api.getRoomSchedule(room.id, day.from, day.to, signal),
      staleTime: 30_000,
    })),
  });
  const schedules = useMemo(
    () =>
      new Map(
        (rooms.data ?? []).map((room, index) => [room.id, scheduleQueries[index]?.data ?? []]),
      ),
    [rooms.data, scheduleQueries],
  );

  useEffect(() => {
    if (!office) return;
    const next = normalizeRoomsSearchParams(params, filters);
    if (next.toString() !== params.toString()) setParams(next, { replace: true });
  }, [filters, office, params, setParams]);

  const setFilter = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
  };

  const selectOffice = (value: string) => {
    setSelectedOfficeId(value);
  };

  const openBooking = (room: Room, bookingStart = start) => {
    setBookingSelection({ room, start: bookingStart });
  };

  return (
    <div className="rooms-page">
      <section className="office-selector">
        <div className="office-selector__main">
          <div>
            <SelectControl
              className="office-select-control"
              value={officeId}
              ariaLabel="Офис"
              placeholder={
                offices.isPending
                  ? 'Загрузка офисов…'
                  : offices.isError
                    ? 'Не удалось загрузить офисы'
                    : 'Выберите офис'
              }
              disabled={offices.isPending || offices.isError}
              options={(offices.data ?? []).map((item) => ({ value: item.id, label: item.name }))}
              onChange={selectOffice}
            />
            <p>
              {office
                ? office.address.replace(/^Москва, |^Санкт-Петербург, /, '')
                : 'Адрес не выбран'}
              <span className="dot" />
              Местное время: {office ? localClock(office.timezone) : '--'}
            </p>
          </div>
          {office && (
            <Link className="office-map-link" to={`/offices/${office.id}/map`}>
              <Icon name="home" size={17} />
              Карта офиса
              <span>Концепт</span>
            </Link>
          )}
        </div>
      </section>

      <section className="filter-bar" aria-label="Фильтры переговорных">
        <div className={`filter-field ${!office ? 'filter-field--disabled' : ''}`}>
          <span>Дата</span>
          <DateControl
            value={office ? date : ''}
            timezone={timezone}
            disabled={!office}
            min={todayInZone(timezone)}
            max={maxBookingDate(timezone)}
            ariaLabel="Дата"
            onChange={(value) => setFilter('date', value)}
          />
        </div>
        <div
          className={`filter-field filter-field--time ${!office ? 'filter-field--disabled' : ''}`}
        >
          <span>Время начала</span>
          <TimeInput
            value={office ? start : ''}
            disabled={!office}
            ariaLabel="Время начала"
            onChange={(value) => setFilter('start', value)}
          />
        </div>
        <div className={`filter-field ${!office ? 'filter-field--disabled' : ''}`}>
          <span>Длительность</span>
          <SelectControl
            value={office ? String(duration) : ''}
            ariaLabel="Длительность"
            placeholder="Выберите"
            disabled={!office}
            options={durations.map((item) => ({
              value: String(item),
              label: durationLabel(item),
            }))}
            onChange={(value) => setFilter('duration', value)}
          />
        </div>
        <div className={`filter-field ${!office ? 'filter-field--disabled' : ''}`}>
          <span>Вместимость</span>
          <SelectControl
            value={office ? String(capacity) : ''}
            ariaLabel="Вместимость"
            placeholder="Не указано"
            disabled={!office}
            icon={<Icon name="users" />}
            options={ROOM_CAPACITIES.map((item) => ({
              value: String(item),
              label: `${item} чел.`,
              triggerLabel: `Мин. ${item} чел.`,
            }))}
            onChange={(value) => setFilter('capacity', value)}
          />
        </div>
      </section>

      <section className="rooms-content">
        {offices.isError ? (
          <StatusState
            illustration="error"
            title="Не удалось загрузить офисы"
            description="Проверьте соединение и попробуйте загрузить список офисов ещё раз"
            actionLabel="Попробовать снова"
            onAction={() => void offices.refetch()}
          />
        ) : !office ? (
          <StatusState
            illustration="office"
            title="Выберите офис"
            description="Для просмотра доступных переговорных сначала выберите офис из списка выше"
          />
        ) : previewState === 'loading' || rooms.isPending ? (
          <>
            <h1>Загрузка переговорных...</h1>
            <SkeletonCards />
          </>
        ) : previewState === 'error' || previewState === 'offline' || rooms.isError ? (
          <StatusState
            illustration="error"
            title="Не удалось загрузить данные"
            description="Произошла ошибка при загрузке списка переговорных"
            actionLabel="Попробовать снова"
            onAction={() => void rooms.refetch()}
          />
        ) : previewState === 'empty' || !rooms.data.length ? (
          <StatusState
            illustration="empty"
            title="Нет доступных переговорных"
            description="Попробуйте изменить параметры фильтрации или выбрать другой офис"
            actionLabel="Сбросить фильтры"
            onAction={() => setParams({})}
          />
        ) : (
          <>
            <div className="rooms-content__header">
              <h1>Доступные переговорные в этом офисе</h1>
              <div className="view-switch" aria-label="Представление переговорных">
                <button
                  type="button"
                  className={view === 'cards' ? 'is-active' : ''}
                  aria-pressed={view === 'cards'}
                  onClick={() => setFilter('view', 'cards')}
                >
                  Карточки
                </button>
                <button
                  type="button"
                  className={view === 'schedule' ? 'is-active' : ''}
                  aria-pressed={view === 'schedule'}
                  onClick={() => setFilter('view', 'schedule')}
                >
                  Расписание офиса
                </button>
              </div>
            </div>
            {view === 'schedule' ? (
              <OfficeAvailabilityBoard
                rooms={rooms.data}
                schedules={schedules}
                date={date}
                timezone={timezone}
                selectedStart={start}
                duration={duration}
                currentUserId={me.data?.id}
                loading={scheduleQueries.some((query) => query.isPending)}
                onBook={(room, bookingStart) => openBooking(room, bookingStart)}
              />
            ) : (
              <div className="rooms-grid">
                {rooms.data.map((room) => {
                  const available = room.available ?? false;
                  const roomSchedule = schedules.get(room.id) ?? [];
                  const selectedStart = DateTime.fromISO(interval.from);
                  const previous = roomSchedule
                    .filter((b) => DateTime.fromISO(b.endsAt) <= selectedStart)
                    .at(-1);
                  const current = roomSchedule.find(
                    (b) =>
                      DateTime.fromISO(b.startsAt) <= selectedStart &&
                      DateTime.fromISO(b.endsAt) > selectedStart,
                  );
                  const statusText = current
                    ? `Занята до ${formatTime(current.endsAt, timezone)}`
                    : previous
                      ? `Свободна с ${formatTime(previous.endsAt, timezone)}`
                      : 'Свободна весь день';
                  return (
                    <article className="room-card" key={room.id}>
                      <div className="room-card__header">
                        <h2>{room.name}</h2>
                        <p>{room.floor} этаж</p>
                      </div>
                      <div className="room-card__stats">
                        <p>
                          <Icon name="users" />
                          Вместимость: до {room.capacity} человек
                        </p>
                        <p>
                          <Icon name="clock" />
                          {statusText}
                        </p>
                      </div>
                      <div className={`availability ${available ? 'availability--yes' : ''}`}>
                        <span />
                        {available
                          ? 'Доступно на выбранное время'
                          : 'Недоступно на выбранное время'}
                      </div>
                      <div className="room-card__actions">
                        <Link className="details-link" to={`/rooms/${room.id}?date=${date}`}>
                          Подробнее
                        </Link>
                        <Button disabled={!available} fullWidth onClick={() => openBooking(room)}>
                          Забронировать
                        </Button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </>
        )}
      </section>

      <BookingDialog
        room={bookingSelection?.room ?? null}
        open={Boolean(bookingSelection)}
        initialDate={date}
        initialTime={bookingSelection?.start ?? start}
        initialDuration={duration}
        onClose={() => setBookingSelection(null)}
        onSuccess={() => setFeedback('success')}
        onConflict={() => setFeedback('conflict')}
      />
      <SuccessToast
        open={feedback === 'success'}
        title="Бронирование создано"
        description="Встреча добавлена в «Мои бронирования»."
        onClose={() => setFeedback(null)}
      />
      <Modal
        open={feedback === 'conflict'}
        title="Время уже занято"
        onClose={() => setFeedback(null)}
        footer={<Button onClick={() => setFeedback(null)}>Выбрать другое время</Button>}
      >
        <div className="conflict-message">
          <span>!</span>
          <p className="modal-message">
            Выбранный интервал был забронирован другим сотрудником. Расписание обновлено.
          </p>
        </div>
      </Modal>
    </div>
  );
}
