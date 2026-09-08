import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { useMe } from '../entities/query/hooks';
import { RealtimeContext } from './realtime-context';
import { AppLayout } from './AppLayout';

vi.mock('../entities/query/hooks', () => ({ useMe: vi.fn() }));

describe('AppLayout', () => {
  it('offers to retry when the current profile cannot be loaded', async () => {
    const user = userEvent.setup();
    const refetch = vi.fn();
    vi.mocked(useMe).mockReturnValue({ isError: true, data: undefined, refetch } as never);

    render(
      <RealtimeContext.Provider value="connected">
        <MemoryRouter
          initialEntries={['/rooms']}
          future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
        >
          <Routes>
            <Route element={<AppLayout />}>
              <Route path="/rooms" element={<h1>Комнаты</h1>} />
            </Route>
          </Routes>
        </MemoryRouter>
      </RealtimeContext.Provider>,
    );

    await user.click(screen.getByRole('button', { name: 'Профиль недоступен · Повторить' }));
    expect(refetch).toHaveBeenCalledOnce();
  });
});
