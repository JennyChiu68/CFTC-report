// Adapt the existing CFTC API to the designer's presentation model.
// Keep report dates and category observations intact; never estimate missing data.
export function applySnapshot(asset, snapshots, reportDate) {
  const eligible = snapshots.filter(point => point.date <= reportDate).sort((a, b) => b.date.localeCompare(a.date));
  const current = eligible.find(point => point.date === reportDate);
  if (!current) return { ...asset, date: reportDate, long: null, short: null, weeklyDelta: null, openInterest: null, unavailable: true, history: [], breakdown: [] };
  const counterpart = current.breakdown[0];
  return {
    ...asset, ...current, unavailable: false,
    counterpartLabel: counterpart?.name,
    history: eligible.slice(0, 52).map(point => ({
      ...point,
      net: point.long - point.short,
      counterpartNet: point.breakdown[0].long - point.breakdown[0].short,
      thirdNet: point.breakdown[1].long - point.breakdown[1].short,
    })),
  };
}

export function categorySnapshot(asset, key) {
  // The financial report has different categories. Match by meaning, not row order.
  const names = asset.reportType === "TFF"
    ? { managed: ["杠杆基金"], producer: ["交易商 / 中介"], swap: ["资管机构"], other: ["其他报告交易者"], nonreport: ["非报告交易者"] }
    : { managed: ["管理基金"], producer: ["生产商 / 商业商"], swap: ["掉期交易商"], other: ["其他报告交易者"], nonreport: ["非报告交易者"] };
  const row = asset.breakdown?.find(item => names[key]?.includes(item.name));
  if (row) return { ...row, weeklyDelta: row.netChange, openInterest: asset.openInterest };
  return null;
}

export function categoryHistoryValue(point, name) {
  const row = point.breakdown?.find(item => item.name === name);
  // Long-side accounting, including spreading, sums to open interest.
  return row ? row.long + (row.spreading || 0) : null;
}
