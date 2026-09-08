import { lazy } from 'react';
import { Navigate, createBrowserRouter } from 'react-router-dom';
import { AppLayout } from './AppLayout';
import { DeferredPage } from './DeferredPage';
import { RouteErrorPage } from './RouteErrorPage';

const RoomsPage = lazy(() =>
  import('../pages/rooms/RoomsPage').then((module) => ({ default: module.RoomsPage })),
);
const RoomDetailPage = lazy(() =>
  import('../pages/room-detail/RoomDetailPage').then((module) => ({
    default: module.RoomDetailPage,
  })),
);
const BookingsPage = lazy(() =>
  import('../pages/bookings/BookingsPage').then((module) => ({ default: module.BookingsPage })),
);
const OfficeMapPage = lazy(() =>
  import('../pages/office-map/OfficeMapPage').then((module) => ({
    default: module.OfficeMapPage,
  })),
);
const NotFoundPage = lazy(() =>
  import('../pages/not-found/NotFoundPage').then((module) => ({ default: module.NotFoundPage })),
);

export const router = createBrowserRouter([
  {
    element: <AppLayout />,
    children: [
      { path: '/', element: <Navigate to="/rooms" replace /> },
      {
        path: '/rooms',
        errorElement: <RouteErrorPage />,
        element: (
          <DeferredPage>
            <RoomsPage />
          </DeferredPage>
        ),
      },
      {
        path: '/rooms/:roomId',
        errorElement: <RouteErrorPage />,
        element: (
          <DeferredPage>
            <RoomDetailPage />
          </DeferredPage>
        ),
      },
      {
        path: '/bookings',
        errorElement: <RouteErrorPage />,
        element: (
          <DeferredPage>
            <BookingsPage />
          </DeferredPage>
        ),
      },
      {
        path: '/offices/:officeId/map',
        errorElement: <RouteErrorPage />,
        element: (
          <DeferredPage>
            <OfficeMapPage />
          </DeferredPage>
        ),
      },
      {
        path: '*',
        element: (
          <DeferredPage>
            <NotFoundPage />
          </DeferredPage>
        ),
      },
    ],
  },
]);
