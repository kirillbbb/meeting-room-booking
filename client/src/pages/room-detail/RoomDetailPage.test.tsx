import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { useMe, useRoom, useRoomSchedule } from '../../entities/query/hooks';
import { ApiError } from '../../shared/api/client';
import { RoomDetailPage } from './RoomDetailPage';

vi.mock('../../entities/query/hooks', () => ({
  useMe: vi.fn(),
  useRoom: vi.fn(),
  useRoomSchedule: vi.fn(),
}));

function renderPage(error: ApiError, refetch = vi.fn()) {
  vi.mocked(useRoom).mockReturnValue({
    isPending: false,
    isError: true,
    data: undefined,
    error,
    refetch,
  } as never);
  vi.mocked(useMe).mockReturnValue({ data: undefined } as never);
  vi.mocked(useRoomSchedule).mockReturnValue({ data: [] } as never);
  render(
    <MemoryRouter
      initialEntries={['/rooms/missing']}
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <Routes>
        <Route path="/rooms/:roomId" element={<RoomDetailPage />} />
      </Routes>
    </MemoryRouter>,
  );
  return refetch;
}

describe('RoomDetailPage errors', () => {
  it('shows an entity-specific state for a real 404', () => {
    renderPage(new ApiError(404, 'ROOM_NOT_FOUND', 'Комната не найдена'));

    expect(screen.getByRole('heading', { name: 'Переговорная не найдена' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'К списку переговорных' })).toBeVisible();
  });

  it('offers an in-place retry for a network/server failure', async () => {
    const user = userEvent.setup();
    const refetch = renderPage(new ApiError(500, 'INTERNAL_ERROR', 'Ошибка'));

    await user.click(screen.getByRole('button', { name: 'Попробовать снова' }));

    expect(
      screen.getByRole('heading', { name: 'Не удалось загрузить переговорную' }),
    ).toBeVisible();
    expect(refetch).toHaveBeenCalledOnce();
  });
});
