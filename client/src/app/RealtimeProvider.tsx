import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useRef, useState, type PropsWithChildren } from 'react';
import { realtimeEventSchema } from '../shared/api/contracts';
import { queryKeys } from '../entities/query/keys';
import { RealtimeContext, type ConnectionStatus } from './realtime-context';

function websocketUrl(): string {
  const configured = import.meta.env.VITE_WS_URL as string | undefined;
  if (configured) return configured;
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${window.location.host}/api/v1/ws`;
}

export function RealtimeProvider({ children }: PropsWithChildren) {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<ConnectionStatus>('connecting');
  const attempt = useRef(0);

  useEffect(() => {
    let socket: WebSocket | undefined;
    let retryTimer: number | undefined;
    let disposed = false;

    const invalidateAll = () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.allRooms });
      void queryClient.invalidateQueries({ queryKey: queryKeys.allSchedules });
      void queryClient.invalidateQueries({ queryKey: queryKeys.allBookings });
    };

    const connect = () => {
      if (disposed) return;
      if (!navigator.onLine) {
        setStatus('disconnected');
        return;
      }
      setStatus(attempt.current ? 'reconnecting' : 'connecting');
      socket = new WebSocket(websocketUrl());
      socket.onopen = () => {
        const wasReconnect = attempt.current > 0;
        attempt.current = 0;
        setStatus('connected');
        if (wasReconnect) invalidateAll();
      };
      socket.onmessage = (message) => {
        let payload: unknown;
        try {
          payload = JSON.parse(String(message.data));
        } catch {
          return;
        }
        const event = realtimeEventSchema.safeParse(payload);
        if (!event.success) return;
        if (event.data.type === 'room.availability_changed') {
          void queryClient.invalidateQueries({ queryKey: queryKeys.allRooms });
          void queryClient.invalidateQueries({ queryKey: queryKeys.allSchedules });
        } else {
          invalidateAll();
        }
      };
      socket.onclose = () => {
        if (disposed) return;
        if (!navigator.onLine) {
          setStatus('disconnected');
          return;
        }
        attempt.current += 1;
        setStatus('reconnecting');
        const base = Math.min(30_000, 750 * 2 ** Math.min(attempt.current, 5));
        retryTimer = window.setTimeout(connect, base + Math.random() * 400);
      };
      socket.onerror = () => socket?.close();
    };

    const handleOffline = () => {
      if (retryTimer) window.clearTimeout(retryTimer);
      attempt.current = Math.max(1, attempt.current);
      setStatus('disconnected');
      socket?.close();
    };
    const handleOnline = () => connect();

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);
    connect();
    return () => {
      disposed = true;
      if (retryTimer) window.clearTimeout(retryTimer);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
      socket?.close();
      setStatus('disconnected');
    };
  }, [queryClient]);

  const value = useMemo(() => status, [status]);
  return <RealtimeContext.Provider value={value}>{children}</RealtimeContext.Provider>;
}
