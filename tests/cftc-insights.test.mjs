import assert from "node:assert/strict";
import test from "node:test";
import {
  positionAttribution,
  rankStandardizedInsights,
  standardizedInsight,
  windowNetChanges,
} from "../app/cftc-insights.mjs";

test("attributes a net increase to long growth and short reduction", () => {
  const result = positionAttribution({ longChange: 2000, shortChange: -2700, currentNet: 120779 });
  assert.equal(result.available, true);
  assert.equal(result.netChange, 4700);
  assert.equal(result.headline, "净多增加");
  assert.equal(result.stateLabel, "增多与减空共同推动");
  assert.deepEqual(result.shares, { long: 43, short: 57 });
});

test("summarizes 1, 4 and 13 week net movement consistently", () => {
  const history = Array.from({ length: 14 }, (_, index) => ({ net: 140 - index * 5 }));
  const windows = windowNetChanges(history, 0);
  assert.deepEqual(windows.map((item) => item.weeks), [1, 4, 13]);
  assert.equal(windows[0].change, 5);
  assert.equal(windows[1].change, 20);
  assert.equal(windows[2].change, 65);
  assert.equal(windows[2].alignedWeeks, 13);
});

test("standardizes cross-market changes and detects long-range extremes", () => {
  const snapshots = Array.from({ length: 156 }, (_, index) => ({
    date: `week-${index}`,
    openInterest: 1000,
    long: index === 0 ? 120 : 60 - index / 10,
    short: 20,
    weeklyDelta: index === 0 ? 40 : (index % 7) - 3,
  }));
  const insight = standardizedInsight({ symbol: "XAU" }, snapshots);
  assert.equal(insight.symbol, "XAU");
  assert.equal(insight.changeToOiPct, 4);
  assert.ok(insight.changePercentile52 >= 98);
  assert.ok(insight.zScore > 5);
  assert.equal(insight.threeYearExtreme, "high");
  assert.equal(insight.threeYearPercentile, 100);

  const ranked = rankStandardizedInsights([
    { asset: { symbol: "XAU" }, snapshots },
    { asset: { symbol: "CALM" }, snapshots: snapshots.map((snapshot) => ({ ...snapshot, weeklyDelta: 1, long: 50 })) },
  ]);
  assert.equal(ranked[0].symbol, "XAU");
});
