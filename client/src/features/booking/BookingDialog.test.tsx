import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DateTime } from 'luxon';
import { describe, expect, it, vi } from 'vitest';
import { api } from '../../shared/api/client';
import type { Booking, Room } from '../../shared/api/contracts';
import { BookingDialog } from './BookingDialog';

const room: Room = {
  id: 'room-everest',
  officeId: 'office-moscow',
  name: 'Эверест',
  floor: 4,
  capacity: 12,
  features: [],
  office: {
    id: 'office-moscow',
    name: 'Офис Москва',
    address: 'Москва, ул. Лесная, 7',
    timezone: 'Europe/Moscow',
  },
};

function renderDialog(overrides: { onClose?: () => void; onSuccess?: () => void } = {}) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const tomorrow = DateTime.now().setZone(room.office.timezone).plus({ days: 1 }).toISODate()!;
  render(
    <QueryClientProvider client={queryClient}>
      <BookingDialog
        room={room}
        open
        initialDate={tomorrow}
        initialTime="12:00"
        onClose={overrides.onClose ?? vi.fn()}
        {...(overrides.onSuccess ? { onSuccess: overrides.onSuccess } : {})}
      />
    </QueryClientProvider>,
  );
}

describe('BookingDialog', () => {
  it('validates a required title without sending a request', async () => {
    const user = userEvent.setup();
    const create = vi.spyOn(api, 'createBooking');
    renderDialog();

    await user.click(screen.getByRole('button', { name: 'Забронировать' }));

    expect(await screen.findByText('Введите название встречи')).toBeVisible();
    expect(create).not.toHaveBeenCalled();
  });

  it('creates a booking once and reports success', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const onSuccess = vi.fn();
    const startsAt =
      DateTime.now().plus({ days: 1 }).set({ hour: 12, minute: 0 }).toUTC().toISO() ?? '';
    const booking: Booking = {
      id: 'booking-created',
      seriesId: null,
      roomId: room.id,
      userId: 'user-konstantin',
      title: 'Планирование',
      comment: null,
      startsAt,
      endsAt: DateTime.fromISO(startsAt).plus({ hours: 1 }).toISO() ?? '',
      createdAt: new Date().toISOString(),
      room: {
        id: room.id,
        officeId: room.officeId,
        name: room.name,
        floor: room.floor,
        capacity: room.capacity,
        features: room.features,
      },
      office: room.office,
      owner: {
        id: 'user-konstantin',
        login: 'kkuznetsov',
        displayName: 'Константин Кузнецов',
        email: 'kkuznetsov@example.test',
        avatarUrl: null,
        initials: 'КК',
      },
    };
    let resolveBooking!: (value: Booking) => void;
    const pendingBooking = new Promise<Booking>((resolve) => {
      resolveBooking = resolve;
    });
    const create = vi.spyOn(api, 'createBooking').mockReturnValue(pendingBooking);
    renderDialog({ onClose, onSuccess });

    await user.type(screen.getByLabelText('Название встречи'), 'Планирование');
    const submit = screen.getByRole('button', { name: 'Забронировать' });
    await user.click(submit);
    await user.click(submit);

    expect(create).toHaveBeenCalledOnce();
    resolveBooking(booking);
    await waitFor(() => expect(onSuccess).toHaveBeenCalledOnce());
    expect(onClose).toHaveBeenCalledOnce();
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ roomId: room.id, title: 'Планирование' }),
    );
  });
});
