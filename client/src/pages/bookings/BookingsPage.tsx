import { useMutation, useQueryClient } from '@tanstack/react-query';
import { DateTime } from 'luxon';
import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useOfficeSelection } from '../../app/office-selection';
import { queryKeys } from '../../entities/query/keys';
import { useBookings, useOffices } from '../../entities/query/hooks';
import { groupBookings } from '../../features/bookings/groupBookings';
import { api } from '../../shared/api/client';
import type { Booking } from '../../shared/api/contracts';
import { formatBookingDate, formatTime, getDateParts } from '../../shared/lib/date';
import { downloadBookingIcs } from '../../shared/lib/ics';
import { getPreviewState } from '../../shared/lib/preview-state';
import { Button } from '../../shared/ui/Button';
import { DateControl } from '../../shared/ui/DateControl';
import { Icon } from '../../shared/ui/Icon';
import { Modal } from '../../shared/ui/Modal';
import { SelectControl } from '../../shared/ui/SelectControl';
import { StatusState } from '../../shared/ui/StatusState';

type CancelTarget = { kind: 'booking'; booking: Booking } | { kind: 'series'; bookings: Booking[] };

function seriesDateRange(bookings: Booking[]): string {
  const first = bookings[0];
  const last = bookings.at(-1);
  if (!first || !last) return '';
  const timezone = first.office.timezone;
  const start = DateTime.fromISO(first.startsAt).setZone(timezone).setLocale('ru');
  const end = DateTime.fromISO(last.startsAt).setZone(timezone).setLocale('ru');
  if (start.hasSame(end, 'day')) return start.toFormat('d MMMM yyyy');
  if (start.hasSame(end, 'month')) return `${start.toFormat('d')}–${end.toFormat('d MMMM yyyy')}`;
  return `${start.toFormat('d MMMM')} — ${end.toFormat('d MMMM yyyy')}`;
}

function meetingsLabel(count: number): string {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return `${count} встреча`;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return `${count} встречи`;
  return `${count} встреч`;
}

export function BookingsPage() {
  const [params, setParams] = useSearchParams();
  const { selectedOfficeId, setSelectedOfficeId } = useOfficeSelection();
  const previewState = getPreviewState(params, ['loading', 'error', 'empty']);
  const scope = params.get('scope') === 'past' ? 'past' : 'upcoming';
  const officeId = selectedOfficeId || undefined;
  const dateFilter = params.get('date') ?? '';
  const offices = useOffices();
  const upcomingBookings = useBookings('upcoming', officeId);
  const pastBookings = useBookings('past', officeId);
  const bookings = scope === 'upcoming' ? upcomingBookings : pastBookings;
  const queryClient = useQueryClient();
  const [cancelTarget, setCancelTarget] = useState<CancelTarget | null>(null);
  const [expandedSeries, setExpandedSeries] = useState<Set<string>>(() => new Set());
  const [cancelError, setCancelError] = useState<string>();
  const filterByDate = (items: Booking[] = []) =>
    items.filter(
      (booking) =>
        !dateFilter ||
        DateTime.fromISO(booking.startsAt).setZone(booking.office.timezone).toISODate() ===
          dateFilter,
    );
  const visibleUpcoming = filterByDate(upcomingBookings.data);
  const visiblePast = filterByDate(pastBookings.data);
  const visibleBookings = scope === 'upcoming' ? visibleUpcoming : visiblePast;
  const visibleGroups = groupBookings(visibleBookings);
  const displayedGroups = previewState === 'empty' ? [] : visibleGroups;
  const upcomingCount =
    previewState === 'error' || (previewState === 'empty' && scope === 'upcoming')
      ? 0
      : groupBookings(visibleUpcoming).length;
  const pastCount =
    previewState === 'error' || (previewState === 'empty' && scope === 'past')
      ? 0
      : groupBookings(visiblePast).length;

  const cancel = useMutation({
    mutationFn: async (target: CancelTarget) => {
      if (target.kind === 'series') {
        const seriesId = target.bookings[0]?.seriesId;
        if (!seriesId) throw new Error('Не удалось определить серию бронирований');
        await api.cancelBookingSeries(seriesId);
        return;
      }
      await api.cancelBooking(target.booking.id);
    },
    onMutate: async (target) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.allBookings });
      const snapshots = queryClient.getQueriesData<Booking[]>({ queryKey: queryKeys.allBookings });
      const cancelledIds = new Set(
        target.kind === 'series'
          ? target.bookings.map((booking) => booking.id)
          : [target.booking.id],
      );
      queryClient.setQueriesData<Booking[]>({ queryKey: queryKeys.allBookings }, (old) =>
        old?.filter((item) => !cancelledIds.has(item.id)),
      );
      setCancelTarget(null);
      return { snapshots };
    },
    onError: (error, _target, context) => {
      context?.snapshots.forEach(([key, data]) => queryClient.setQueryData(key, data));
      setCancelError(error instanceof Error ? error.message : 'Не удалось отменить бронирование');
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.allBookings });
      void queryClient.invalidateQueries({ queryKey: queryKeys.allRooms });
      void queryClient.invalidateQueries({ queryKey: queryKeys.allSchedules });
    },
  });

  const setParam = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next);
  };

  const selectOffice = (value: string) => {
    setSelectedOfficeId(value);
  };

  const cancelSummaryBooking = cancelTarget
    ? cancelTarget.kind === 'series'
      ? cancelTarget.bookings[0]
      : cancelTarget.booking
    : null;

  return (
    <div className="bookings-page page-content">
      <header className="page-header">
        {previewState === 'loading' || bookings.isPending ? (
          <>
            <span className="skeleton-line bookings-heading-skeleton" />
            <div className="header-filters" aria-hidden="true">
              <span className="skeleton-line bookings-filter-skeleton" />
              <span className="skeleton-line bookings-filter-skeleton" />
            </div>
          </>
        ) : (
          <>
            <h1>Мои бронирования</h1>
            <div className="header-filters">
              <SelectControl
                ariaLabel="Фильтр по офису"
                value={officeId ?? ''}
                placeholder="Все офисы"
                options={[
                  { value: '', label: 'Все офисы' },
                  ...(offices.data ?? []).map((office) => ({
                    value: office.id,
                    label: office.name,
                  })),
                ]}
                onChange={selectOffice}
              />
              <DateControl
                className="bookings-date-filter"
                value={dateFilter}
                timezone="Europe/Moscow"
                ariaLabel="Фильтр по дате"
                placeholder="За все время"
                allowClear
                align="end"
                onChange={(value) => setParam('date', value)}
              />
            </div>
          </>
        )}
      </header>
      <div className="tabs" role="tablist">
        {previewState === 'loading' || bookings.isPending ? (
          <>
            <span className="skeleton-line bookings-tab-skeleton" />
            <span className="skeleton-line bookings-tab-skeleton" />
          </>
        ) : (
          <>
            <button
              className={scope === 'upcoming' ? 'active' : ''}
              onClick={() => setParam('scope', 'upcoming')}
            >
              Предстоящие ({upcomingCount})
            </button>
            <button
              className={scope === 'past' ? 'active' : ''}
              onClick={() => setParam('scope', 'past')}
            >
              Прошедшие ({pastCount})
            </button>
          </>
        )}
      </div>
      {previewState === 'loading' || bookings.isPending ? (
        <div className="bookings-list">
          {[1, 2].map((key) => (
            <div key={key} className="booking-card booking-card-skeleton" aria-hidden="true">
              <span className="skeleton-line booking-date-skeleton" />
              <div className="booking-copy-skeleton">
                <span className="skeleton-line" />
                <span className="skeleton-line" />
              </div>
              <span className="skeleton-line booking-action-skeleton" />
            </div>
          ))}
        </div>
      ) : previewState === 'error' || bookings.isError ? (
        <StatusState
          illustration="error"
          title="Не удалось загрузить данные"
          description="Произошла ошибка при загрузке ваших бронирований"
          actionLabel="Попробовать снова"
          onAction={() => void bookings.refetch()}
        />
      ) : previewState === 'empty' || !visibleBookings.length ? (
        <StatusState
          illustration="bookings"
          title="Нет бронирований"
          description={
            scope === 'upcoming'
              ? 'У вас пока нет предстоящих бронирований. Перейдите в раздел переговорных, чтобы забронировать комнату.'
              : 'История встреч пока пуста.'
          }
          {...(scope === 'upcoming'
            ? {
                actionLabel: 'Перейти к переговорным',
                onAction: () => {
                  window.location.href = '/rooms';
                },
              }
            : {})}
        />
      ) : (
        <div className="bookings-list">
          {displayedGroups.map((group) => {
            const booking = group.bookings[0];
            if (!booking) return null;
            const timezone = booking.office.timezone;
            const date = getDateParts(booking.startsAt, timezone);
            const expanded = expandedSeries.has(group.id);

            return (
              <article
                className={`booking-card ${group.isSeries ? 'booking-card--series' : ''}`}
                key={group.id}
              >
                <div className="booking-card__main">
                  <div className="booking-card__details">
                    <div className="date-badge">
                      <span>{date.month}</span>
                      <strong>{date.day}</strong>
                    </div>
                    <div className="booking-info">
                      <div className="booking-title-row">
                        <h2>{booking.title}</h2>
                        {group.isSeries && (
                          <span className="series-badge">
                            Серия · {meetingsLabel(group.bookings.length)}
                          </span>
                        )}
                      </div>
                      <div>
                        <Link to={`/rooms/${booking.roomId}`}>
                          <Icon name="door-open" />
                          {booking.room.name}
                        </Link>
                        <span className="dot" />
                        {group.isSeries
                          ? seriesDateRange(group.bookings)
                          : formatBookingDate(booking.startsAt, timezone)}
                        <span className="dot" />
                        {formatTime(booking.startsAt, timezone)}–
                        {formatTime(booking.endsAt, timezone)}
                      </div>
                    </div>
                  </div>
                  <div className="booking-actions">
                    {group.isSeries ? (
                      <Button
                        variant="ghost"
                        aria-expanded={expanded}
                        onClick={() =>
                          setExpandedSeries((current) => {
                            const next = new Set(current);
                            if (next.has(group.id)) next.delete(group.id);
                            else next.add(group.id);
                            return next;
                          })
                        }
                      >
                        {expanded ? 'Скрыть встречи' : 'Показать встречи'}
                      </Button>
                    ) : (
                      <Button variant="ghost" onClick={() => downloadBookingIcs(booking)}>
                        Скачать .ics
                      </Button>
                    )}
                    {scope === 'upcoming' && (
                      <Button
                        variant="danger"
                        onClick={() =>
                          setCancelTarget(
                            group.isSeries
                              ? { kind: 'series', bookings: group.bookings }
                              : { kind: 'booking', booking },
                          )
                        }
                      >
                        {group.isSeries ? 'Отменить серию' : 'Отменить'}
                      </Button>
                    )}
                  </div>
                </div>
                {group.isSeries && expanded && (
                  <div className="series-occurrences">
                    {group.bookings.map((occurrence) => (
                      <div className="series-occurrence" key={occurrence.id}>
                        <span>
                          <Icon name="calendar" />
                          {formatBookingDate(
                            occurrence.startsAt,
                            occurrence.office.timezone,
                          )} · {formatTime(occurrence.startsAt, occurrence.office.timezone)}–
                          {formatTime(occurrence.endsAt, occurrence.office.timezone)}
                        </span>
                        <div>
                          <Button variant="ghost" onClick={() => downloadBookingIcs(occurrence)}>
                            .ics
                          </Button>
                          {scope === 'upcoming' && (
                            <Button
                              variant="ghost"
                              onClick={() =>
                                setCancelTarget({ kind: 'booking', booking: occurrence })
                              }
                            >
                              Отменить встречу
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
      <Modal
        open={Boolean(cancelTarget)}
        title={
          cancelTarget?.kind === 'series' ? 'Отменить серию встреч?' : 'Отменить бронирование?'
        }
        onClose={() => setCancelTarget(null)}
        width={480}
        footer={
          <>
            <Button variant="secondary" onClick={() => setCancelTarget(null)}>
              Нет, оставить
            </Button>
            <Button
              variant="danger"
              disabled={cancel.isPending}
              onClick={() => cancelTarget && cancel.mutate(cancelTarget)}
            >
              {cancel.isPending ? 'Отменяем…' : 'Да, отменить'}
            </Button>
          </>
        }
      >
        <div className="cancel-dialog">
          <p className="modal-message">
            {cancelTarget?.kind === 'series'
              ? 'Все будущие встречи этой серии будут отменены. Это действие нельзя будет отменить.'
              : 'Это действие нельзя будет отменить. Освободившееся время станет доступно другим сотрудникам.'}
          </p>
          {cancelSummaryBooking && (
            <div className="cancel-summary">
              <strong>{cancelSummaryBooking.title}</strong>
              <span>
                <Icon name="door-open" />
                Комната «{cancelSummaryBooking.room.name}», {cancelSummaryBooking.room.floor} этаж
              </span>
              <span>
                <Icon name="calendar" />
                {cancelTarget?.kind === 'series'
                  ? `${seriesDateRange(cancelTarget.bookings)}, ${meetingsLabel(cancelTarget.bookings.length)}`
                  : `${formatBookingDate(cancelSummaryBooking.startsAt, cancelSummaryBooking.office.timezone)}, ${formatTime(cancelSummaryBooking.startsAt, cancelSummaryBooking.office.timezone)}–${formatTime(cancelSummaryBooking.endsAt, cancelSummaryBooking.office.timezone)}`}
              </span>
            </div>
          )}
        </div>
      </Modal>
      <Modal
        open={Boolean(cancelError)}
        title="Не удалось отменить"
        onClose={() => setCancelError(undefined)}
        width={480}
        footer={<Button onClick={() => setCancelError(undefined)}>Закрыть</Button>}
      >
        <p className="modal-message">{cancelError}</p>
      </Modal>
    </div>
  );
}
