import assert from "node:assert/strict";
import test from "node:test";
import { applySnapshot, categorySnapshot, categoryHistoryValue } from "../app/designer-data.mjs";

const row = { name: "杠杆基金", long: 120, short: 20, spreading: 10, netChange: 5 };
const asset = { symbol: "DXY", reportType: "TFF", coreTrader: "杠杆基金", long: 1, short: 1 };
const snapshot = (date, long) => ({ date, long, short: 20, weeklyDelta: 5, openInterest: 150, breakdown: [
  { name: "交易商 / 中介", long: 10, short: 80 },
  { name: "资管机构", long: 10, short: 20 },
  { ...row, long },
] });

test("financial core means leveraged funds, not asset managers", () => {
  const current = applySnapshot(asset, [snapshot("2026-09-08", 120)], "2026-09-08");
  assert.equal(categorySnapshot(current, "managed").long, 120);
  assert.equal(categorySnapshot(current, "producer").long, 10);
  assert.equal(categorySnapshot(current, "swap"), null);
});

test("historical views exclude future data and mark missing dates", () => {
  const points = [snapshot("2026-09-08", 120), snapshot("2026-09-01", 100)];
  const historical = applySnapshot(asset, points, "2026-09-01");
  assert.equal(historical.long, 100);
  assert.equal(historical.history.length, 1);
  assert.equal(historical.history[0].net, 80);
  assert.equal(applySnapshot(asset, points, "2026-08-01").unavailable, true);
});

test("history uses each actual category observation, never fixed weights", () => {
  assert.equal(categoryHistoryValue(snapshot("2026-09-08", 120), "杠杆基金"), 130);
  assert.equal(categoryHistoryValue(snapshot("2026-09-01", 100), "杠杆基金"), 110);
  assert.equal(categoryHistoryValue({ openInterest: 500 }, "杠杆基金"), null);
});

test("missing categories are not synthesized", () => {
  assert.equal(categorySnapshot(asset, "producer"), null);
  assert.equal(categorySnapshot({ ...asset, unavailable: true }, "managed"), null);
});
