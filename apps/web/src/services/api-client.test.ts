import { afterEach, expect, test, vi } from 'vitest';
import { fetchApiHealth } from './api-client';

afterEach(() => vi.unstubAllGlobals());

test('reads a healthy API response', async () => {
  const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ status: 'ok' }) });
  vi.stubGlobal('fetch', fetchMock);
  await expect(fetchApiHealth('live')).resolves.toEqual({ status: 'ok' });
  expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('/api/v1/health/live'));
});

test('reports an unavailable API', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 503 }));
  await expect(fetchApiHealth('ready')).rejects.toThrow('HTTP 503');
});
