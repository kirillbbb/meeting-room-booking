import { Suspense, type PropsWithChildren } from 'react';

export function DeferredPage({ children }: PropsWithChildren) {
  return (
    <Suspense fallback={<div className="route-loading" aria-label="Загрузка страницы" />}>
      {children}
    </Suspense>
  );
}
