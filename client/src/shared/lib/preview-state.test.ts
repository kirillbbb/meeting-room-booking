import { describe, expect, it } from 'vitest';
import { getPreviewState } from './preview-state';

describe('getPreviewState', () => {
  it('returns an explicitly allowed development state', () => {
    expect(getPreviewState(new URLSearchParams('__state=error'), ['loading', 'error'])).toBe(
      'error',
    );
  });

  it('ignores unknown and disallowed values', () => {
    expect(getPreviewState(new URLSearchParams('__state=offline'), ['error'])).toBeNull();
    expect(getPreviewState(new URLSearchParams('__state=anything'), ['error'])).toBeNull();
  });
});
