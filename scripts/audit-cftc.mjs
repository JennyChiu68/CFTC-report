// Read-only, repeatable audit of the actual production data path against CFTC.
import assert from 'node:assert/strict';
import { assets } from '../app/cftc-data.ts';
import { fetchCftcSnapshots } from '../app/cftc-service.ts';
import { createHash } from 'node:crypto';

const sources = {
  Disaggregated: 'https://www.cftc.gov/dea/futures/other_lf.htm',
  Petroleum: 'https://www.cftc.gov/dea/futures/petroleum_lf.htm',
  NaturalGas: 'https://www.cftc.gov/dea/futures/nat_gas_lf.htm',
  TFF: 'https://www.cftc.gov/dea/futures/financial_lf.htm',
};
const pages = Object.fromEntries(await Promise.all(Object.entries(sources).map(async ([type, url]) => {
  const response = await fetch(url, { signal: AbortSignal.timeout(20000) });
  assert.equal(response.status, 200);
  return [type, (await response.text()).replace(/<[^>]*>/g, '')];
})));
const integers = text => (text.match(/-?\d[\d,]*/g) || []).map(value => Number(value.replaceAll(',', '')));
const results = await Promise.all(assets.map(async asset => {
  const points = await fetchCftcSnapshots(asset, 104);
  assert.ok(points.length);
  const page = pages[asset.symbol === 'NG' ? 'NaturalGas' : ['CL', 'BZ'].includes(asset.symbol) ? 'Petroleum' : asset.reportType];
  const marker = asset.reportType === 'TFF' ? 'CFTC Code #' + asset.contractCode : 'Code-' + asset.contractCode;
  const start = page.indexOf(marker);
  assert.ok(start >= 0, asset.symbol + ' official contract exists');
  const block = page.slice(start);
  const dateText = asset.reportType === 'TFF'
    ? page.slice(0, start).match(/Positions as of ([A-Za-z]+ \d+, \d{4})/g)?.at(-1)?.replace('Positions as of ', '')
    : block.match(/Futures Only, ([A-Za-z]+ \d+, \d{4})/)?.[1];
  assert.equal(new Date(dateText + ' UTC').toISOString().slice(0, 10), points[0].date, asset.symbol + ' publication date');
  const point = points[0];
  if (process.argv[2]) {
    const response = await fetch(new URL('/api/cftc-history?symbol=' + asset.symbol + '&limit=104', process.argv[2]));
    assert.equal(response.status, 200);
    const payload = await response.json();
    // JSON omits optional spreading keys for categories that do not report them.
    assert.deepEqual(payload.snapshots, JSON.parse(JSON.stringify(points)), asset.symbol + ' application API vs direct CFTC');
  }
  const actualPositions = [point.openInterest, ...point.breakdown.flatMap(row => [row.long, row.short, ...(row.spreading === undefined ? [] : [row.spreading])])];
  let officialPositions, officialChanges;
  if (asset.reportType === 'TFF') {
    officialPositions = [integers(block.split('\n')[0]).at(-1), ...integers(block.match(/\nPositions\s*\n([^\n]+)/)[1])];
    const changes = block.match(/Total Change is:\s*(-?[\d,]+)\s*\n([^\n]+)/);
    officialChanges = [...integers(changes[1]), ...integers(changes[2])];
  } else {
    officialPositions = integers(block.match(/\nAll\s*:[^\n]+/)[0]);
    officialChanges = integers(block.match(/Changes in Commitments from:[^\n]+\n([^\n]+)/)[1]);
  }
  assert.deepEqual(actualPositions, officialPositions, asset.symbol + ' all positions vs official text');
  assert.equal(point.openInterestChange, officialChanges[0]);
  let offset = 1;
  for (const row of point.breakdown) {
    assert.equal(row.longChange, officialChanges[offset], asset.symbol + ' long change');
    assert.equal(row.shortChange, officialChanges[offset + 1], asset.symbol + ' short change');
    offset += row.spreading === undefined ? 2 : 3;
  }
  const priorDifferences = [];
  for (let i = 0; i < points.length - 1; i++) {
    if ((new Date(points[i].date) - new Date(points[i + 1].date)) / 86400000 !== 7) continue;
    for (let j = 0; j < 5; j++) for (const side of ['long', 'short']) {
      if (points[i].breakdown[j][side] - points[i + 1].breakdown[j][side] !== points[i].breakdown[j][side + 'Change']) priorDifferences.push(points[i].date + ':' + j + ':' + side);
    }
  }
  return { symbol: asset.symbol, contractCode: asset.contractCode, count: points.length, latest: point.date,
    oldest: points.at(-1).date, latestOfficialTextMatch: true, allRowsValidated: true, applicationApiMatch: !!process.argv[2],
    priorPeriodDifferences: priorDifferences, sha256: createHash('sha256').update(JSON.stringify(points)).digest('hex') };
}));
console.log(JSON.stringify({ auditedAt: new Date().toISOString(), sources, records: results.reduce((sum, row) => sum + row.count, 0), results }, null, 2));
