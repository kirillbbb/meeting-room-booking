import type { MouseEvent } from 'react';
import { Link } from 'react-router-dom';
import type { Booking, Room } from '../../shared/api/contracts';
import { formatTime } from '../../shared/lib/date';
import {
  WORKDAY_END_MINUTES,
  WORKDAY_START_MINUTES,
  buildAvailabilityRows,
  isIntervalAvailable,
  minuteToPercent,
  timeFromTimelinePosition,
} from './availability';

interface OfficeAvailabilityBoardProps {
  rooms: Room[];
  schedules: Map<string, Booking[]>;
  date: string;
  timezone: string;
  selectedStart: string;
  duration: number;
  currentUserId?: string | undefined;
  loading?: boolean;
  onBook: (room: Room, start: string) => void;
}

const hours = Array.from({ length: 12 }, (_, index) => index + 9);

function selectedPosition(start: string, duration: number) {
  const [hour = 9, minute = 0] = start.split(':').map(Number);
  const startMinute = hour * 60 + minute;
  return {
    left: minuteToPercent(startMinute),
    width: ((Math.min(startMinute + duration, WORKDAY_END_MINUTES) - startMinute) / 660) * 100,
  };
}

export function OfficeAvailabilityBoard({
  rooms,
  schedules,
  date,
  timezone,
  selectedStart,
  duration,
  currentUserId,
  loading,
  onBook,
}: OfficeAvailabilityBoardProps) {
  const rows = buildAvailabilityRows(rooms, schedules, date, timezone, currentUserId);
  const selection = selectedPosition(selectedStart, duration);

  const selectTime = (event: MouseEvent<HTMLButtonElement>, row: (typeof rows)[number]) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    const position = (event.clientX - bounds.left) / bounds.width;
    const start = timeFromTimelinePosition(position, duration);
    if (isIntervalAvailable(row.blocks, start, duration)) onBook(row.room, start);
  };

  return (
    <div className="availability-board" aria-label="Расписание переговорных">
      <div className="availability-board__intro">
        <div>
          <h2>Занятость переговорных</h2>
          <p>Нажмите на свободный интервал, чтобы забронировать комнату</p>
        </div>
        <div className="availability-legend" aria-label="Обозначения">
          <span>
            <i className="legend-swatch legend-swatch--selected" />
            Ваш интервал
          </span>
          <span>
            <i className="legend-swatch legend-swatch--mine" />
            Мои встречи
          </span>
          <span>
            <i className="legend-swatch legend-swatch--busy" />
            Занято
          </span>
        </div>
      </div>
      <div className="availability-board__scroll">
        <div className="availability-board__canvas">
          <div className="availability-axis">
            <span className="availability-axis__corner">Переговорная</span>
            <div className="availability-axis__hours">
              {hours.map((hour) => (
                <span key={hour}>{String(hour).padStart(2, '0')}:00</span>
              ))}
            </div>
          </div>
          {rows.map((row, index) => (
            <div className="availability-row" key={row.room.id}>
              <div className="availability-room">
                <Link to={`/rooms/${row.room.id}?date=${date}`}>{row.room.name}</Link>
                <span>
                  {row.room.floor} этаж · до {row.room.capacity} чел.
                </span>
                <small>{loading ? 'Обновляем…' : `Занята на ${row.occupiedPercent}%`}</small>
              </div>
              <button
                type="button"
                className="availability-track"
                aria-label={`Выбрать свободное время в переговорной ${row.room.name}`}
                onClick={(event) => selectTime(event, row)}
              >
                <span
                  className="availability-selection"
                  style={{ left: `${selection.left}%`, width: `${selection.width}%` }}
                />
                {row.blocks.map((block) => (
                  <span
                    key={block.id}
                    className={`availability-block ${block.isMine ? 'availability-block--mine' : ''}`}
                    style={{ left: `${block.left}%`, width: `${block.width}%` }}
                    title={`${block.title}: ${formatTime(block.startsAt, timezone)}–${formatTime(block.endsAt, timezone)}`}
                  />
                ))}
                {index === 0 && (
                  <span className="sr-only">
                    Рабочий день с {WORKDAY_START_MINUTES / 60}:00 до {WORKDAY_END_MINUTES / 60}:00
                  </span>
                )}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
