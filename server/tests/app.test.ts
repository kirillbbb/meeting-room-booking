import { afterEach, describe, expect, it } from 'vitest';
import { buildTestApp, closeTestApps } from './helpers.js';

afterEach(closeTestApps);

describe('application HTTP policy', () => {
  it('allows DELETE preflight from a configured origin', async () => {
    const origin = 'http://localhost:5173';
    const app = await buildTestApp({ corsOrigins: [origin] });
    const response = await app.inject({
      method: 'OPTIONS',
      url: '/api/v1/bookings/booking-future-current-user',
      headers: {
        origin,
        'access-control-request-method': 'DELETE',
      },
    });

    expect(response.statusCode).toBe(204);
    expect(response.headers['access-control-allow-origin']).toBe(origin);
    expect(
      response.headers['access-control-allow-methods']?.split(',').map((method) => method.trim()),
    ).toContain('DELETE');
  });
});

describe('production surface', () => {
  it('does not expose the test reset or API documentation', async () => {
    const app = await buildTestApp({
      environment: 'production',
      enableTestReset: false,
    });

    const reset = await app.inject({ method: 'POST', url: '/api/v1/test/reset' });
    expect(reset.statusCode).toBe(404);
    expect(reset.json()).toMatchObject({ error: { code: 'NOT_FOUND' } });

    for (const url of ['/documentation', '/documentation/', '/documentation/json']) {
      const response = await app.inject({ method: 'GET', url });
      expect(response.statusCode).toBe(404);
      expect(response.json()).toMatchObject({ error: { code: 'NOT_FOUND' } });
    }
  });
});
