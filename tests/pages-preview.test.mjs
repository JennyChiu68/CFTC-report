import test from 'node:test';
import assert from 'node:assert/strict';
import { createPagesDataClient } from '../github-preview/data-client.mjs';

test('Pages serves home and history from the same official snapshot under its base path', async () => {
  let calls = 0;
  const histories = { XAU: Array.from({ length: 104 }, (_, n) => ({ id: n })) };
  const client = createPagesDataClient('/CFTC-report/', async (url, options) => {
    calls++;
    assert.equal(url, '/CFTC-report/data/market.json');
    assert.equal(options.cache, 'no-cache');
    return Response.json({ histories, syncedAt: 'verified', unavailable: [] });
  });
  const home = await (await client('/api/cftc-market')).json();
  assert.equal(home.histories.XAU.length, 26);
  const detail = await (await client('/api/cftc-history?symbol=XAU&limit=104')).json();
  assert.equal(detail.snapshots.length, 104);
  assert.equal(detail.syncedAt, 'verified');
  assert.equal(calls, 1);
  assert.equal((await client('/api/cftc-history?symbol=BTC')).status, 400);
  await client('/api/cftc-market');
  assert.equal(calls, 2);
});

test('Pages rejects unavailable data rather than producing example figures', async () => {
  const client = createPagesDataClient('/CFTC-report/', async () => new Response('', { status: 503 }));
  await assert.rejects(client('/api/cftc-market'), /unavailable/);
});
