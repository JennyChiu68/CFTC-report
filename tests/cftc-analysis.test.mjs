import assert from "node:assert/strict";
import test from "node:test";
import {
  availableHistoryWeeks,
  buildMarketHighlights,
  classifyStructure,
  describeMultiWeekTrend,
  percentileRank,
  rangePosition,
} from "../app/cftc-analysis.mjs";

test("calculates a true percentile rank separately from range position", () => {
  const values = [0, 1, 2, 100];
  assert.equal(percentileRank(values, 2), 63);
  assert.equal(rangePosition(values, 2), 2);
});

test("requires three same-direction changes before saying a trend is continuous", () => {
  assert.equal(describeMultiWeekTrend([{ net: 16 }, { net: 13 }, { net: 11 }, { net: 10 }]).label, "连续3周增多");
  assert.equal(describeMultiWeekTrend([{ net: 16 }, { net: 13 }, { net: 15 }, { net: 10 }]).label, "近期震荡");
});

test("keeps 52 weeks available after selecting any of the latest 26 reports", () => {
  assert.equal(availableHistoryWeeks(104, 25, 52), 52);
  assert.equal(availableHistoryWeeks(52, 25, 52), 27);
});

test("classifies structure and prioritizes flips or extremes", () => {
  assert.equal(classifyStructure(120, 20), "多头主导");
  assert.equal(classifyStructure(40, 50), "多空均衡");
  const highlights = buildMarketHighlights([
    { symbol: "A", long: 60, short: 30, weeklyDelta: 3, history: [{ net: 30 }, { net: -2 }, ...Array.from({ length: 11 }, (_, index) => ({ net: index }))] },
    { symbol: "B", long: 40, short: 30, weeklyDelta: 900, history: [{ net: 10 }, { net: 9 }] },
  ]);
  assert.equal(highlights[0].asset.symbol, "A");
  assert.equal(highlights[0].flipped, true);
});
