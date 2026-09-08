export type PreviewState = 'loading' | 'error' | 'empty' | 'offline';

export function getPreviewState(
  searchParams: URLSearchParams,
  allowedStates: readonly PreviewState[],
): PreviewState | null {
  if (!import.meta.env.DEV) return null;

  const state = searchParams.get('__state');
  return allowedStates.includes(state as PreviewState) ? (state as PreviewState) : null;
}
