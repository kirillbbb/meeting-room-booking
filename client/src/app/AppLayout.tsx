import { useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useMe } from '../entities/query/hooks';
import { getPreviewState } from '../shared/lib/preview-state';
import { Icon } from '../shared/ui/Icon';
import { useRealtimeStatus } from './realtime-context';

export function AppLayout() {
  const me = useMe();
  const realtimeStatus = useRealtimeStatus();
  const location = useLocation();
  const [selectedOfficeId, setSelectedOfficeId] = useState('');
  const connectionPreview = getPreviewState(new URLSearchParams(location.search), ['offline']);
  const connectionLost =
    connectionPreview === 'offline' ||
    realtimeStatus === 'reconnecting' ||
    realtimeStatus === 'disconnected';

  return (
    <div className="app-shell">
      {connectionLost && (
        <div className="connection-banner" role="status">
          <Icon name="info" size={18} />
          <span>Соединение потеряно. Переподключение…</span>
        </div>
      )}
      <header className="navbar">
        <NavLink className="brand" to="/rooms" aria-label="BookRoom — переговорные">
          <span className="brand__badge">
            <Icon name="calendar-check" size={18} />
          </span>
          <span>BookRoom</span>
        </NavLink>
        <nav className="nav-links" aria-label="Основная навигация">
          <NavLink to="/rooms">Переговорные</NavLink>
          <NavLink to="/bookings">Мои бронирования</NavLink>
        </nav>
        <div className="user-profile" aria-label="Текущий пользователь">
          {me.isError ? (
            <button type="button" className="user-profile__retry" onClick={() => void me.refetch()}>
              Профиль недоступен · Повторить
            </button>
          ) : (
            <>
              <span>{me.data?.displayName ?? 'Загрузка…'}</span>
              <span className="avatar">{me.data?.initials ?? '··'}</span>
            </>
          )}
        </div>
      </header>
      <main>
        <Outlet context={{ selectedOfficeId, setSelectedOfficeId }} />
      </main>
    </div>
  );
}
