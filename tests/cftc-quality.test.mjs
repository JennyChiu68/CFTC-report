import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { assets } from '../app/cftc-data.ts';
import { validateCftcRows } from '../app/cftc-service.ts';

// CFTC GOLD Futures Only, 2026-09-08: official text/API reconciliation fixture.
const gold = {
  cftc_contract_market_code: '088691', report_date_as_yyyy_mm_dd: '2026-09-08T00:00:00.000',
  open_interest_all: '411227', change_in_open_interest_all: '-3969',
  prod_merc_positions_long: '16588', prod_merc_positions_short: '47549', change_in_prod_merc_long: '-856', change_in_prod_merc_short: '-1184',
  swap_positions_long_all: '14542', swap__positions_short_all: '253855', swap__positions_spread_all: '23273', change_in_swap_long_all: '-3256', change_in_swap_short_all: '2628',
  m_money_positions_long_all: '145804', m_money_positions_short_all: '10832', m_money_positions_spread: '29462', change_in_m_money_long_all: '-3917', change_in_m_money_short_all: '-2118',
  other_rept_positions_long: '115203', other_rept_positions_short: '18215', other_rept_positions_spread: '13801', change_in_other_rept_long: '4439', change_in_other_rept_short: '-1196',
  nonrept_positions_long_all: '52554', nonrept_positions_short_all: '14240', change_in_nonrept_long_all: '524', change_in_nonrept_short_all: '-1196',
};
test('official gold fields reconcile on both sides and preserve the published changes', () => {
  const [point] = validateCftcRows(assets[0], [gold]);
  assert.equal(point.long - point.short, 134972);
  assert.equal(point.weeklyDelta, -1799);
  assert.equal(point.breakdown[0].longChange, -856);
});
test('missing, nonnumeric, fractional and negative position fields are rejected, not zero-filled', () => {
  for (const value of [undefined, null, '', ' ', 'NaN', 'Infinity', '1.5', '-1']) {
    assert.throws(() => validateCftcRows(assets[0], [{ ...gold, m_money_positions_long_all: value }]));
  }
  for (const key of Object.keys(gold).filter(key => key.includes('positions') || key.startsWith('change_'))) {
    const row = { ...gold }; delete row[key];
    assert.throws(() => validateCftcRows(assets[0], [row]), key);
  }
});
test('duplicate dates, wrong contracts, invalid dates and unbalanced totals fail closed', () => {
  assert.throws(() => validateCftcRows(assets[0], [gold, gold]));
  for (const override of [{ cftc_contract_market_code: '084691' }, { report_date_as_yyyy_mm_dd: '2026-02-30' }, { report_date_as_yyyy_mm_dd: '2999-01-01' }, { open_interest_all: '411228' }]) {
    assert.throws(() => validateCftcRows(assets[0], [{ ...gold, ...override }]));
  }
});
test('actual zero positions and zero changes remain valid', () => {
  const zero = Object.fromEntries(Object.entries(gold).map(([key, value]) => [key, key.includes('positions') || key.includes('interest') || key.startsWith('change_') ? '0' : value]));
  const [point] = validateCftcRows(assets[0], [zero]);
  assert.equal(point.long, 0);
  assert.equal(point.openInterest, 0);
});
test('production catalog cannot supply snapshot numbers or example dates', async () => {
  assert.equal(assets.length, 14);
  for (const asset of assets) for (const key of ['long', 'short', 'weeklyDelta', 'openInterest', 'history', 'breakdown']) assert.equal(asset[key], undefined);
  const runtime = await readFile(new URL('../app/designer-runtime.js', import.meta.url), 'utf8');
  assert.doesNotMatch(runtime, /savedReportMeta|deepHighlightOverrides|\[net\]|2026-09-01/);
});
