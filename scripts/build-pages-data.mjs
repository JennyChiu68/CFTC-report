import { mkdir, writeFile } from 'node:fs/promises';
import { assets } from '../app/cftc-data.ts';
import { fetchCftcSnapshots, cftcSource } from '../app/cftc-service.ts';

// Do not publish partial, fabricated, or fallback observations. Failed builds
// leave the previous successful GitHub Pages deployment untouched.
const entries = [];
for (const asset of assets) {
  const points = await fetchCftcSnapshots(asset, 104);
  if (!points.length) throw new Error(`No official records for ${asset.symbol}`);
  entries.push([asset.symbol, points]);
}
const dates = new Set(entries.map(([, points]) => points[0].date));
if (dates.size !== 1) throw new Error('Official markets have not all reached the same report date');
const payload = {
  source: cftcSource,
  scope: 'Futures Only',
  reportDate: [...dates][0],
  syncedAt: new Date().toISOString(),
  histories: Object.fromEntries(entries),
  unavailable: [],
};
const dir = new URL('../.pages-dist/data/', import.meta.url);
await mkdir(dir, { recursive: true });
await writeFile(new URL('market.json', dir), JSON.stringify(payload));
await writeFile(new URL('../.pages-dist/.nojekyll', import.meta.url), '');
console.log(`CFTC official data: ${entries.length} markets, as of ${payload.reportDate}`);
