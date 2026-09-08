import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import '@fontsource-variable/manrope';
import { RealtimeProvider } from './app/RealtimeProvider';
import { router } from './app/router';
import './styles.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (count, error) =>
        count < 2 &&
        !(error && typeof error === 'object' && 'status' in error && Number(error.status) < 500),
    },
    mutations: { retry: false },
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RealtimeProvider>
        <RouterProvider router={router} future={{ v7_startTransition: true }} />
      </RealtimeProvider>
    </QueryClientProvider>
  </StrictMode>,
);
