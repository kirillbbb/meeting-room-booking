import { describe, expect, it } from 'vitest';
import { loadConfig } from '../src/config.js';

describe('loadConfig', () => {
  it('disables the destructive test reset by default in production', () => {
    expect(loadConfig({ NODE_ENV: 'production' }).enableTestReset).toBe(false);
  });

  it('keeps the reset available by default for local development', () => {
    expect(loadConfig({ NODE_ENV: 'development' }).enableTestReset).toBe(true);
  });

  it('respects an explicit override', () => {
    expect(
      loadConfig({ NODE_ENV: 'development', ENABLE_TEST_RESET: 'false' }).enableTestReset,
    ).toBe(false);
  });
});
