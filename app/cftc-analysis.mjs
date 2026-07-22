export function netPosition(item) {
  return Number(item?.long ?? 0) - Number(item?.short ?? 0);
}

export function percentileRank(values, current) {
  const clean = values.filter(Number.isFinite);
  if (!clean.length) return 50;
  const below = clean.filter((value) => value < current).length;
  const equal = clean.filter((value) => value === current).length;
  return Math.max(0, Math.min(100, Math.round(((below + equal * 0.5) / clean.length) * 100)));
}

export function rangePosition(values, current) {
  const clean = values.filter(Number.isFinite);
  if (!clean.length) return 50;
  const low = Math.min(...clean);
  const high = Math.max(...clean);
  if (low === high) return 50;
  return Math.max(0, Math.min(100, Math.round(((current - low) / (high - low)) * 100)));
}

export function describeMultiWeekTrend(history, fallbackDelta = 0, window = 4) {
  const values = history.slice(0, window + 1).map((point) => Number(point?.net)).filter(Number.isFinite);
  const changes = [];
  for (let index = 0; index < values.length - 1; index += 1) changes.push(values[index] - values[index + 1]);
  const usable = changes.filter((value) => value !== 0);
  if (usable.length >= 3 && usable.slice(0, 3).every((value) => value > 0)) return { label: "连续3周增多", direction: 1, weeks: 3 };
  if (usable.length >= 3 && usable.slice(0, 3).every((value) => value < 0)) return { label: "连续3周减少", direction: -1, weeks: 3 };
  const latest = changes[0] ?? fallbackDelta;
  const recent = changes.slice(0, 3);
  if (recent.length >= 2 && recent.some((value) => value > 0) && recent.some((value) => value < 0)) {
    return { label: "近期震荡", direction: Math.sign(latest), weeks: recent.length };
  }
  if (latest > 0) return { label: "本周增加", direction: 1, weeks: 1 };
  if (latest < 0) return { label: "本周减少", direction: -1, weeks: 1 };
  return { label: "本周持平", direction: 0, weeks: 1 };
}

export function classifyStructure(long, short) {
  const net = Number(long) - Number(short);
  const total = Math.max(1, Number(long) + Number(short));
  if (net > total * 0.18) return "多头主导";
  if (net < -total * 0.18) return "空头主导";
  return "多空均衡";
}

export function availableHistoryWeeks(total, selectedIndex, requested) {
  return Math.max(0, Math.min(requested, total - Math.max(0, selectedIndex)));
}

export function buildMarketHighlights(assetList, limit = 3) {
  return [...assetList]
    .map((asset) => {
      const net = netPosition(asset);
      const history = asset.history ?? [];
      const values = history.map((point) => Number(point.net)).filter(Number.isFinite);
      const percentile = percentileRank(values, net);
      const previous = history[1]?.net;
      const flipped = Number.isFinite(previous) && Math.sign(previous) !== 0 && Math.sign(net) !== 0 && Math.sign(previous) !== Math.sign(net);
      const extreme = values.length >= 13 && (percentile >= 85 || percentile <= 15);
      const score = Math.abs(Number(asset.weeklyDelta ?? 0)) + (flipped ? 1e9 : 0) + (extreme ? 5e8 : 0);
      const reason = flipped
        ? `核心净仓由${previous > 0 ? "多" : "空"}翻${net > 0 ? "多" : "空"}`
        : extreme
          ? `核心净仓处于近${values.length}周${percentile}%历史分位`
          : `核心净仓本周变化 ${signedCompact(asset.weeklyDelta)}`;
      return { asset, net, percentile, flipped, extreme, score, reason };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

function signedCompact(value) {
  const number = Number(value ?? 0);
  const prefix = number > 0 ? "+" : number < 0 ? "-" : "";
  const absolute = Math.abs(number);
  if (absolute >= 1_000_000) return `${prefix}${(absolute / 1_000_000).toFixed(1)}M`;
  if (absolute >= 1_000) return `${prefix}${(absolute / 1_000).toFixed(1)}K`;
  return `${prefix}${absolute}`;
}
