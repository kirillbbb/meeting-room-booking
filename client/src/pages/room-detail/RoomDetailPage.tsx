import { DateTime } from 'luxon';
import { useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useMe, useRoom, useRoomSchedule } from '../../entities/query/hooks';
import { BookingDialog } from '../../features/booking/BookingDialog';
import { ApiError } from '../../shared/api/client';
import { maxBookingDate, officeDayInterval, todayInZone } from '../../shared/lib/date';
import { getPreviewState } from '../../shared/lib/preview-state';
import { Button } from '../../shared/ui/Button';
import { DateControl } from '../../shared/ui/DateControl';
import { Icon } from '../../shared/ui/Icon';
import { Modal } from '../../shared/ui/Modal';
import { StatusState } from '../../shared/ui/StatusState';
import { SuccessToast } from '../../shared/ui/SuccessToast';

const FEATURE_ICONS = { display: 'tv', whiteboard: 'edit', video: 'video' } as const;

export function RoomDetailPage() {
  const { roomId = '' } = useParams();
  const room = useRoom(roomId);
  const me = useMe();
  const [params, setParams] = useSearchParams();
  const previewState = getPreviewState(params, ['loading', 'error']);
  const timezone = room.data?.office.timezone ?? 'Europe/Moscow';
  const date = params.get('date') ?? todayInZone(timezone);
  const day = officeDayInterval(date, timezone);
  const schedule = useRoomSchedule(roomId, date, day.from, day.to);
  const [bookingOpen, setBookingOpen] = useState(false);
  const [feedback, setFeedback] = useState<'success' | 'conflict' | null>(null);

  if (previewState === 'loading' || room.isPending) {
    return (
      <div className="detail-page">
        <div className="breadcrumbs detail-breadcrumbs-skeleton" aria-hidden="true">
          <span className="skeleton-line" />
          <span>›</span>
          <span className="skeleton-line" />
          <span>›</span>
          <span className="skeleton-line" />
        </div>
        <div className="detail-columns">
          <div className="info-card detail-info-skeleton" aria-hidden="true">
            <span className="skeleton-line detail-title-skeleton" />
            <span className="skeleton-line detail-subtitle-skeleton" />
            <hr />
            {[1, 2, 3, 4].map((key) => (
              <div className="skeleton-stat" key={key}>
                <span className="skeleton-line" />
                <span className="skeleton-line" />
              </div>
            ))}
          </div>
          <div className="schedule-card detail-schedule-skeleton" aria-hidden="true">
            <header className="schedule-header">
              <div>
                <span className="skeleton-line detail-schedule-title-skeleton" />
                <span className="skeleton-line detail-schedule-subtitle-skeleton" />
              </div>
              <span className="skeleton-line detail-date-skeleton" />
            </header>
            <div className="timeline">
              {Array.from({ length: 12 }, (_, index) => (
                <div key={index} className="hour-row">
                  <time>{String(index + 9).padStart(2, '0')}:00</time>
                  <div />
                </div>
              ))}
            </div>
            <span className="skeleton-line detail-button-skeleton" />
          </div>
        </div>
      </div>
    );
  }
  if (room.isError || !room.data) {
    const notFound = room.error instanceof ApiError && room.error.status === 404;
    return (
      <StatusState
        illustration="error"
        title={notFound ? 'Переговорная не найдена' : 'Не удалось загрузить переговорную'}
        description={
          notFound
            ? 'Возможно, она была удалена или ссылка указана неверно.'
            : 'Проверьте соединение и попробуйте загрузить данные ещё раз.'
        }
        actionLabel={notFound ? 'К списку переговорных' : 'Попробовать снова'}
        onAction={() => {
          if (notFound) window.location.href = '/rooms';
          else void room.refetch();
        }}
      />
    );
  }

  return (
    <div className="detail-page">
      <nav className="breadcrumbs" aria-label="Хлебные крошки">
        <Link to="/rooms">Переговорные</Link>
        <Icon name="chevron-right" size={14} />
        <span>{room.data.office.name}</span>
        <Icon name="chevron-right" size={14} />
        <strong>Комната «{room.data.name}»</strong>
      </nav>
      <div className="detail-columns">
        <aside className="info-card">
          <div>
            <h1>{room.data.name}</h1>
            <p>
              {room.data.floor} этаж · {room.data.office.name}
            </p>
          </div>
          <hr />
          <ul className="features-list">
            <li>
              <Icon name="users" size={18} />
              До {room.data.capacity} человек
            </li>
            {room.data.features.map((feature) => (
              <li key={feature.code}>
                <Icon
                  name={FEATURE_ICONS[feature.code as keyof typeof FEATURE_ICONS] ?? 'info'}
                  size={18}
                />
                {feature.name}
              </li>
            ))}
          </ul>
        </aside>
        <section className="schedule-card">
          <header className="schedule-header">
            <div>
              <h2>Расписание</h2>
              <p>Рабочие часы: 09:00–20:00</p>
            </div>
            <DateControl
              className="date-select"
              value={date}
              timezone={timezone}
              ariaLabel="Дата расписания"
              min={todayInZone(timezone)}
              max={maxBookingDate(timezone)}
              onChange={(value) => setParams({ date: value })}
            />
          </header>
          {schedule.isPending ? (
            <div className="timeline-skeleton skeleton-card" />
          ) : previewState === 'error' || schedule.isError ? (
            <StatusState
              illustration="error"
              title="Не удалось загрузить расписание"
              description="Произошла ошибка при загрузке расписания переговорной"
              actionLabel="Попробовать снова"
              onAction={() => void schedule.refetch()}
            />
          ) : (
            <div className="timeline" aria-label="Расписание с 09:00 до 20:00">
              {Array.from({ length: 12 }, (_, index) => (
                <div key={index} className="hour-row">
                  <time>{String(index + 9).padStart(2, '0')}:00</time>
                  <div />
                </div>
              ))}
              {(schedule.data ?? []).map((booking) => {
                const start = DateTime.fromISO(booking.startsAt).setZone(timezone);
                const end = DateTime.fromISO(booking.endsAt).setZone(timezone);
                const top = Math.max(
                  0,
                  start.diff(start.startOf('day').set({ hour: 9 }), 'minutes').minutes * 0.8,
                );
                const height = Math.max(24, end.diff(start, 'minutes').minutes * 0.8);
                const own = booking.userId === me.data?.id;
                return (
                  <article
                    key={booking.id}
                    className={`timeline-event ${own ? 'timeline-event--own' : ''}`}
                    style={{ top, height }}
                  >
                    <strong>{own ? booking.title : 'Занято'}</strong>
                    <span>
                      {start.toFormat('HH:mm')}–{end.toFormat('HH:mm')}
                    </span>
                  </article>
                );
              })}
            </div>
          )}
          {!schedule.isPending && previewState !== 'error' && !schedule.isError && (
            <div className="timeline-actions">
              <Button onClick={() => setBookingOpen(true)}>Забронировать</Button>
            </div>
          )}
        </section>
      </div>
      <BookingDialog
        room={room.data}
        open={bookingOpen}
        initialDate={date}
        onClose={() => setBookingOpen(false)}
        onSuccess={() => setFeedback('success')}
        onConflict={() => setFeedback('conflict')}
      />
      <SuccessToast
        open={feedback === 'success'}
        title="Бронирование создано"
        description={`Комната ${room.data.name}. Встреча добавлена в «Мои бронирования».`}
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
