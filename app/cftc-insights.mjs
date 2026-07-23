function finite(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function percentileRank(values, current) {
  const clean = values.map(Number).filter(Number.isFinite);
  if (!clean.length) return 50;
  const below = clean.filter((value) => value < current).length;
  const equal = clean.filter((value) => value === current).length;
  return Math.max(0, Math.min(100, Math.round(((below + equal * 0.5) / clean.length) * 100)));
}

function standardDeviation(values) {
  if (values.length < 2) return 0;
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  const variance = values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

export function movementLabel(currentNet, change) {
  const current = finite(currentNet);
  const delta = finite(change);
  const previous = current - delta;
  if (previous < 0 && current > 0) return "由净空转为净多";
  if (previous > 0 && current < 0) return "由净多转为净空";
  if (current > 0) return delta > 0 ? "净多增加" : delta < 0 ? "净多减少" : "净多持平";
  if (current < 0) return delta < 0 ? "净空增加" : delta > 0 ? "净空减少" : "净空持平";
  return delta > 0 ? "净仓向多移动" : delta < 0 ? "净仓向空移动" : "净仓持平";
}

export function positionAttribution({ longChange, shortChange, currentNet }) {
  const available = Number.isFinite(Number(longChange)) && Number.isFinite(Number(shortChange));
  const longDelta = finite(longChange);
  const shortDelta = finite(shortChange);
  const netChange = longDelta - shortDelta;
  let stateLabel = "多空变化有限";
  if (longDelta > 0 && shortDelta < 0) stateLabel = "增多与减空共同推动";
  else if (longDelta < 0 && shortDelta > 0) stateLabel = "减多与增空共同推动";
  else if (longDelta > 0 && shortDelta > 0) stateLabel = "多空双向增加";
  else if (longDelta < 0 && shortDelta < 0) stateLabel = "多空双向减少";
  else if (longDelta > 0) stateLabel = "多头增加主导";
  else if (longDelta < 0) stateLabel = "多头减少主导";
  else if (shortDelta > 0) stateLabel = "空头增加主导";
  else if (shortDelta < 0) stateLabel = "空头减少主导";

  const longEffect = longDelta;
  const shortEffect = -shortDelta;
  const direction = Math.sign(netChange);
  const longDriver = direction !== 0 && Math.sign(longEffect) === direction ? Math.abs(longEffect) : 0;
  const shortDriver = direction !== 0 && Math.sign(shortEffect) === direction ? Math.abs(shortEffect) : 0;
  const driverTotal = longDriver + shortDriver;
  const shares = longDriver > 0 && shortDriver > 0
    ? { long: Math.round((longDriver / driverTotal) * 100), short: Math.round((shortDriver / driverTotal) * 100) }
    : null;

  return {
    available,
    longChange: longDelta,
    shortChange: shortDelta,
    netChange,
    headline: movementLabel(currentNet, netChange),
    stateLabel,
    shares,
  };
}

export function windowNetChanges(history, fallbackWeeklyDelta = 0) {
  const points = Array.isArray(history) ? history : [];
  return [1, 4, 13].map((weeks) => {
    const actualWeeks = Math.min(weeks, Math.max(0, points.length - 1));
    const change = actualWeeks > 0
      ? finite(points[0]?.net) - finite(points[actualWeeks]?.net)
      : weeks === 1 ? finite(fallbackWeeklyDelta) : 0;
    const moves = actualWeeks > 0
      ? Array.from({ length: actualWeeks }, (_, index) => finite(points[index]?.net) - finite(points[index + 1]?.net))
      : weeks === 1 ? [finite(fallbackWeeklyDelta)] : [];
    const direction = Math.sign(change);
    const alignedWeeks = direction === 0 ? moves.filter((value) => value === 0).length : moves.filter((value) => Math.sign(value) === direction).length;
    return { weeks, actualWeeks: Math.max(actualWeeks, moves.length), change, alignedWeeks };
  });
}

export function standardizedInsight(asset, snapshots) {
  const rows = Array.isArray(snapshots) ? snapshots.filter((snapshot) => snapshot?.date) : [];
  if (!rows.length) return null;
  const current = rows[0];
  const currentNet = finite(current.long) - finite(current.short);
  const previousNet = rows[1] ? finite(rows[1].long) - finite(rows[1].short) : currentNet - finite(current.weeklyDelta);
  const weeklyDelta = finite(current.weeklyDelta);
  const changes52 = rows.slice(0, 52).map((snapshot) => finite(snapshot.weeklyDelta));
  const reference = changes52.slice(1);
  const mean = reference.length ? reference.reduce((sum, value) => sum + value, 0) / reference.length : 0;
  const deviation = standardDeviation(reference);
  const zScore = deviation ? (weeklyDelta - mean) / deviation : 0;
  const changePercentile52 = percentileRank(changes52.map(Math.abs), Math.abs(weeklyDelta));
  const changeToOiPct = finite(current.openInterest) ? (weeklyDelta / finite(current.openInterest)) * 100 : 0;
  const sum = (weeks) => rows.slice(0, weeks).reduce((total, snapshot) => total + finite(snapshot.weeklyDelta), 0);
  const nets26 = rows.slice(0, 26).map((snapshot) => finite(snapshot.long) - finite(snapshot.short));
  const nets156 = rows.slice(0, 156).map((snapshot) => finite(snapshot.long) - finite(snapshot.short));
  const halfYearExtreme = nets26.length >= 13
    ? currentNet === Math.max(...nets26) ? "high" : currentNet === Math.min(...nets26) ? "low" : null
    : null;
  const threeYearExtreme = nets156.length >= 100
    ? currentNet === Math.max(...nets156) ? "high" : currentNet === Math.min(...nets156) ? "low" : null
    : null;
  const threeYearPercentile = percentileRank(nets156, currentNet);
  const flipped = Math.sign(currentNet) !== 0 && Math.sign(previousNet) !== 0 && Math.sign(currentNet) !== Math.sign(previousNet);
  const recentMoves = rows.slice(0, 3).map((snapshot) => Math.sign(finite(snapshot.weeklyDelta))).filter(Boolean);
  const sameDirectionWeeks = recentMoves.filter((direction) => direction === Math.sign(weeklyDelta)).length;

  let summary = `${movementLabel(currentNet, weeklyDelta)}，变化幅度处于近52周${changePercentile52}%分位`;
  if (flipped) summary = movementLabel(currentNet, weeklyDelta);
  else if (sameDirectionWeeks === 3) {
    const slowing = Math.abs(weeklyDelta) < Math.abs(finite(rows[1]?.weeklyDelta));
    summary = `连续3周${weeklyDelta >= 0 ? "向多" : "向空"}移动，本周强度${slowing ? "开始放缓" : "继续增强"}`;
  }
  if (threeYearExtreme) summary += `，创近3年净仓${threeYearExtreme === "high" ? "高位" : "低位"}`;
  else if (halfYearExtreme) summary += `，创近半年净仓${halfYearExtreme === "high" ? "高位" : "低位"}`;

  const score = (flipped ? 300 : 0)
    + (threeYearExtreme ? 180 : halfYearExtreme ? 90 : 0)
    + Math.min(180, Math.abs(zScore) * 45)
    + changePercentile52
    + Math.min(80, Math.abs(changeToOiPct) * 20);

  return {
    symbol: asset.symbol,
    reportDate: current.date,
    currentNet,
    previousNet,
    weeklyDelta,
    changeToOiPct,
    changePercentile52,
    zScore,
    change1w: weeklyDelta,
    change4w: sum(4),
    change13w: sum(13),
    flipped,
    halfYearExtreme,
    threeYearExtreme,
    threeYearPercentile,
    summary,
    score,
  };
}

export function rankStandardizedInsights(assetSnapshots, limit = 5) {
  return assetSnapshots
    .map(({ asset, snapshots }) => standardizedInsight(asset, snapshots))
    .filter(Boolean)
    .sort((a, b) => b.score - a.score)
    .slice(0, Math.max(1, limit));
}
