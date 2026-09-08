import { createContext, useContext } from 'react';

export type ConnectionStatus = 'connecting' | 'connected' | 'reconnecting' | 'disconnected';

export const RealtimeContext = createContext<ConnectionStatus>('connecting');

export const useRealtimeStatus = () => useContext(RealtimeContext);
