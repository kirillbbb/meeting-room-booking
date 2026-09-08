import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { queryKeys } from '../entities/query/keys';
import { RealtimeProvider } from './RealtimeProvider';
import { useRealtimeStatus } from './realtime-context';

class MockWebSocket {
  static instances: MockWebSocket[] = [];

  onopen: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;

  constructor(readonly url: string) {
    MockWebSocket.instances.push(this);
  }

  close() {
    this.onclose?.(new Event('close') as CloseEvent);
  }

  open() {
    this.onopen?.(new Event('open'));
  }

  message(data: unknown) {
    this.onmessage?.(new MessageEvent('message', { data: JSON.stringify(data) }));
  }
}

function ConnectionStatus() {
  return <output>{useRealtimeStatus()}</output>;
}

describe('RealtimeProvider', () => {
  afterEach(() => {
    MockWebSocket.instances = [];
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('disconnects offline, reconnects online and resyncs cached data', async () => {
    let online = true;
    vi.spyOn(navigator, 'onLine', 'get').mockImplementation(() => online);
    vi.stubGlobal('WebSocket', MockWebSocket);
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries');

    render(
      <QueryClientProvider client={queryClient}>
        <RealtimeProvider>
          <ConnectionStatus />
        </RealtimeProvider>
      </QueryClientProvider>,
    );

    expect(MockWebSocket.instances).toHaveLength(1);
    act(() => MockWebSocket.instances[0]?.open());
    expect(screen.getByText('connected')).toBeInTheDocument();

    online = false;
    await act(() => window.dispatchEvent(new Event('offline')));
    expect(screen.getByText('disconnected')).toBeInTheDocument();

    online = true;
    await act(() => window.dispatchEvent(new Event('online')));
    expect(MockWebSocket.instances).toHaveLength(2);
    act(() => MockWebSocket.instances[1]?.open());

    await waitFor(() => expect(invalidate).toHaveBeenCalledTimes(3));
    expect(screen.getByText('connected')).toBeInTheDocument();
  });

  it('invalidates room data after a validated availability event', async () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);
    vi.stubGlobal('WebSocket', MockWebSocket);
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries');

    render(
      <QueryClientProvider client={queryClient}>
        <RealtimeProvider>
          <ConnectionStatus />
        </RealtimeProvider>
      </QueryClientProvider>,
    );
    act(() => MockWebSocket.instances[0]?.open());
    act(() =>
      MockWebSocket.instances[0]?.message({
        type: 'room.availability_changed',
        occurredAt: '2026-09-08T12:00:00.000Z',
        data: {
          roomId: 'room-everest',
          officeId: 'office-moscow',
          startsAt: '2026-09-09T09:00:00.000Z',
          endsAt: '2026-09-09T10:00:00.000Z',
          available: false,
        },
      }),
    );

    await waitFor(() => expect(invalidate).toHaveBeenCalledTimes(2));
    expect(invalidate).toHaveBeenNthCalledWith(1, { queryKey: queryKeys.allRooms });
    expect(invalidate).toHaveBeenNthCalledWith(2, { queryKey: queryKeys.allSchedules });
  });
});
