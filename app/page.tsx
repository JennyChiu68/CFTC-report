"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  buildMarketHighlights,
  classifyStructure,
  describeMultiWeekTrend,
  percentileRank,
  rangePosition,
} from "./cftc-analysis.mjs";
import { assets, reportMeta, type CftcAsset, type CftcSnapshot, type HistoryPoint, type TraderRow } from "./cftc-data";

type Screen = "home" | "detail" | "pro";
type DetailTab = "positions" | "history";
type Filter = "全部" | "贵金属" | "能源" | "外汇" | "股指/加密";
type MarketPayload = {
  source: string;
  scope: string;
  reportDate: string | null;
  syncedAt: string;
  histories: Record<string, CftcSnapshot[]>;
  unavailable: string[];
};

const physicalSource = "https://www.cftc.gov/dea/futures/other_lf.htm";
const financialSource = "https://www.cftc.gov/dea/futures/financial_lf.htm";
const methodSource = "https://www.cftc.gov/MarketReports/CommitmentsofTraders/AbouttheCOTReports/index.htm";

const filters: Array<{ key: Filter; icon?: string }> = [
  { key: "全部" }, { key: "贵金属", icon: "🥇" }, { key: "能源", icon: "⚡" },
  { key: "外汇", icon: "💱" }, { key: "股指/加密", icon: "📈" },
];

const groups = [
  { key: "贵金属" as const, icon: "🥇", title: "贵金属", subtitle: "黄金、白银、铜", symbols: ["XAU", "XAG", "HG"] },
  { key: "能源" as const, icon: "⚡", title: "能源", subtitle: "原油、天然气、布伦特", symbols: ["CL", "NG", "BZ"] },
  { key: "外汇" as const, icon: "💱", title: "外汇", subtitle: "美元指数、欧元、英镑等", symbols: ["DXY", "EUR", "GBP", "JPY", "AUD", "CAD"] },
  { key: "股指/加密" as const, icon: "📈", title: "股指/加密", subtitle: "标普500、纳斯达克、比特币", symbols: ["ES", "NQ", "BTC"] },
];

const displayNames: Record<string, string> = { CL: "原油(WTI)", ES: "标普500", NQ: "纳斯达克100" };
const displaySymbols: Record<string, string> = {
  XAU: "XAU/USD", XAG: "XAG/USD", EUR: "EUR/USD", GBP: "GBP/USD",
  JPY: "JPY/USD", AUD: "AUD/USD", CAD: "CAD/USD",
};
const traderLabels: Record<string, string> = {
  "生产商 / 商业商": "生产商/商业", "交易商 / 中介": "交易商/中介",
  "资产管理机构": "资管机构", "其他报告交易者": "其他可报告", "非报告交易者": "非报告持仓",
};
const traderDots = ["#f5ad3d", "#8b5cf6", "#55d39a", "#5d82ff", "#758091"];
type PositionCategory = { name: string; net: number; color: string };

function netOf(asset: CftcAsset) { return asset.long - asset.short; }
function share(long: number, short: number) { return Math.round((long / Math.max(1, long + short)) * 100); }
function format(value: number, signed = false) {
  const absolute = Math.abs(value);
  const prefix = value < 0 ? "-" : signed && value > 0 ? "+" : "";
  if (absolute >= 1_000_000) return `${prefix}${(absolute / 1_000_000).toFixed(1)}M`;
  if (absolute >= 1_000) return `${prefix}${(absolute / 1_000).toFixed(1)}K`;
  return `${prefix}${absolute.toLocaleString("en-US")}`;
}
function formatNetPosition(value: number, compact = false) {
  const direction = value > 0 ? (compact ? "多" : "净多") : value < 0 ? (compact ? "空" : "净空") : (compact ? "平" : "持平");
  return `${direction} ${format(Math.abs(value))}`;
}
function sourceFor(asset: CftcAsset) { return asset.reportType === "TFF" ? financialSource : physicalSource; }
function traderName(name: string) { return traderLabels[name] ?? name; }
function screenName(asset: CftcAsset) { return displayNames[asset.symbol] ?? asset.name; }
function screenSymbol(asset: CftcAsset) { return displaySymbols[asset.symbol] ?? asset.symbol; }
function displayReportDate(date: string) { return date.replaceAll("-", "/"); }
function axisDateLabel(date: string) { const parts = date.split("-"); return parts.length === 3 ? `${parts[1]}/${parts[2]}` : date.replace("-", "/"); }
function reportPublishedDate(reportDate: string) {
  if (reportDate === reportMeta.asOf) return reportMeta.published;
  const parts = reportDate.split("-").map(Number);
  if (parts.length !== 3 || parts.some(Number.isNaN)) return reportMeta.published;
  const published = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2] + 3));
  return published.toISOString().slice(0, 10);
}
function trackEvent(name: string, properties: Record<string, string | number | boolean> = {}) {
  if (typeof window === "undefined") return;
  const payload = { event: `cftc_${name}`, ...properties };
  const target = window as Window & { dataLayer?: Array<Record<string, unknown>> };
  target.dataLayer?.push(payload);
  window.dispatchEvent(new CustomEvent("cftc:analytics", { detail: payload }));
}

function snapshotsToHistory(asset: CftcAsset, snapshots: CftcSnapshot[], selected = false): HistoryPoint[] {
  return snapshots.map((snapshot, index) => {
    const counterpart = snapshot.breakdown[asset.reportType === "Disaggregated" ? 0 : 1];
    const third = snapshot.breakdown[asset.reportType === "Disaggregated" ? 1 : 0];
    return {
      date: snapshot.date,
      net: snapshot.long - snapshot.short,
      counterpartNet: counterpart ? counterpart.long - counterpart.short : 0,
      thirdNet: third ? third.long - third.short : 0,
      categoryNets: snapshot.breakdown.map((row) => ({ name: traderName(row.name), net: row.long - row.short })),
      openInterest: snapshot.openInterest,
      selected: selected && index === 0,
    };
  });
}

function mergeOfficialAsset(asset: CftcAsset, snapshots?: CftcSnapshot[]) {
  const latest = snapshots?.[0];
  if (!latest) return asset;
  return {
    ...asset,
    openInterest: latest.openInterest,
    long: latest.long,
    short: latest.short,
    weeklyDelta: latest.weeklyDelta,
    breakdown: latest.breakdown,
    history: snapshotsToHistory(asset, snapshots ?? []),
  };
}

function BrandHeader({ premium }: { premium: boolean }) {
  return <header className="cot-header"><div className="cot-brand"><span className="brand-chart"><i /><i /><i /></span><div><strong>CFTC持仓动向</strong></div></div>{premium ? <span className="premium-status"><b>✧</b> PRO</span> : <span className="official-status"><i /> 官方数据</span>}</header>;
}

function BottomNav({ screen, onHome, onPro }: { screen: Screen; onHome: () => void; onPro: () => void }) {
  return <nav className="cot-bottom-nav" aria-label="主导航">
    <button className={screen !== "pro" ? "active" : ""} onClick={onHome}><span className="home-icon">⌂</span><small>品种</small></button>
    <button className={screen === "pro" ? "active" : ""} onClick={onPro}><span className="pro-icon">✧</span><small>专业版</small></button>
  </nav>;
}

function AssetCard({ asset, date, onOpen }: { asset: CftcAsset; date: string; onOpen: () => void }) {
  const net = netOf(asset);
  const longPct = share(asset.long, asset.short);
  return <button className="cot-asset-card" onClick={onOpen} aria-label={`查看${screenName(asset)}完整分析`}>
    <div className="asset-card-heading"><div><strong>{screenName(asset)}</strong><span>{screenSymbol(asset)}</span></div><small>{date}<b>›</b></small></div>
    <div className="asset-card-sub"><strong>{asset.coreTrader}</strong><span>OI {format(asset.openInterest)}手</span></div>
    <div className="summary-metrics"><div className="metric-long"><span>多头</span><strong>{format(asset.long)}</strong></div><div className="metric-short"><span>空头</span><strong>{format(asset.short)}</strong></div><div className={net >= 0 ? "metric-long" : "metric-short"}><span>{net > 0 ? "净多" : net < 0 ? "净空" : "持平"}</span><strong>{format(Math.abs(net))}</strong></div></div>
    <div className="summary-bar"><i className="bar-long" style={{ width: `${longPct}%` }} /><i className="bar-short" style={{ width: `${100 - longPct}%` }} /></div>
    <div className="summary-labels"><span>多 {longPct}%</span><span>空 {100 - longPct}%</span></div>
    <div className="weekly-line">较上周净持仓 <strong className={asset.weeklyDelta >= 0 ? "red" : "green"}>{format(asset.weeklyDelta, true)}</strong></div>
  </button>;
}

function HomeView({ filter, setFilter, onOpen, assetList, reportDate, loading, unavailable }: { filter: Filter; setFilter: (filter: Filter) => void; onOpen: (asset: CftcAsset) => void; assetList: CftcAsset[]; reportDate: string; loading: boolean; unavailable: string[] }) {
  const visibleGroups = groups.filter((group) => filter === "全部" || group.key === filter);
  const publishedDate = reportPublishedDate(reportDate);
  return <div className="cot-scroll home-scroll">
    <section className="home-intro"><h1>CFTC 持仓报告</h1><div className="report-times"><p><span>持仓截至时间</span><strong>{reportDate}（周二）</strong></p><p><span>报告发布时间</span><strong>{publishedDate}（周五）</strong></p></div><small>Futures Only · {loading ? "正在获取 CFTC 官方数据" : "CFTC 官方数据"}</small></section>
    {unavailable.length > 0 && <div className="data-notice">{unavailable.join("、")} 暂用最近缓存，其余品种已同步</div>}
    <div className="filter-strip" aria-label="品种分类">{filters.map((item) => <button key={item.key} className={filter === item.key ? "active" : ""} onClick={() => { setFilter(item.key); trackEvent("filter", { filter: item.key }); }}>{item.icon && <span>{item.icon}</span>}{item.key}</button>)}</div>
    {visibleGroups.map((group) => <section className="market-group" key={group.key}><div className="group-title"><span>{group.icon}</span><h2>{group.title}</h2><p>{group.subtitle}</p></div><div className="asset-stack">{group.symbols.map((symbol) => { const asset = assetList.find((item) => item.symbol === symbol); return asset ? <AssetCard key={symbol} asset={asset} date={reportDate} onOpen={() => onOpen(asset)} /> : null; })}</div></section>)}
    <div className="method-links"><a href={methodSource} target="_blank" rel="noreferrer">CFTC 原始说明</a><a href={physicalSource} target="_blank" rel="noreferrer">Disaggregated 原表</a><a href={financialSource} target="_blank" rel="noreferrer">TFF 原表</a></div>
  </div>;
}

function TraderPositionRow({ row, index }: { row: TraderRow; index: number }) {
  const net = row.long - row.short;
  const longPct = share(row.long, row.short);
  return <div className="trader-position-row"><div className="trader-row-heading"><strong><i style={{ background: traderDots[index % traderDots.length] }} />{traderName(row.name)}</strong><span className={net >= 0 ? "red" : "green"}>{formatNetPosition(net)}</span></div><div className="trader-numbers"><span>多 <b className="red">{format(row.long)}</b></span><span>空 <b className="green">{format(row.short)}</b></span></div><div className="detail-bar"><i className="bar-long" style={{ width: `${longPct}%` }} /><i className="bar-short" style={{ width: `${100 - longPct}%` }} /></div><div className="detail-percent"><span>{longPct}%</span><span>{100 - longPct}%</span></div></div>;
}

function WeeklyChangeRow({ row, index }: { row: TraderRow; index: number }) {
  const longChange = row.longChange ?? 0;
  const shortChange = row.shortChange ?? 0;
  return <div className="change-row"><div className="change-heading"><strong><i style={{ background: traderDots[index % traderDots.length] }} />{traderName(row.name)}</strong><span className={row.netChange >= 0 ? "red" : "green"}>⌁ 净 {format(row.netChange, true)}</span></div><div className="change-grid"><div><span>多头变化</span><strong className={longChange >= 0 ? "red" : "green"}>⌁ {format(longChange, true)}</strong><small>当前 {format(row.long)}</small></div><div><span>空头变化</span><strong className={shortChange >= 0 ? "red" : "green"}>⌁ {format(shortChange, true)}</strong><small>当前 {format(row.short)}</small></div></div></div>;
}

function axisValue(value: number) {
  if (Math.abs(value) >= 1_000_000) return `${(value / 1_000_000).toFixed(value % 1_000_000 === 0 ? 0 : 1)}M`;
  if (Math.abs(value) >= 1_000) return `${Math.round(value / 1_000)}K`;
  return Math.round(value).toString();
}

function LineCanvas({ series, colors, dates, labels, scale = "signed", highlightIndex, onHighlight }: { series: number[][]; colors: string[]; dates: string[]; labels: string[]; scale?: "signed" | "positive"; highlightIndex: number; onHighlight: (index: number) => void }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas || !series.length || !series[0]?.length) return;
    const rect = canvas.getBoundingClientRect();
    const ratio = window.devicePixelRatio || 1;
    canvas.width = rect.width * ratio; canvas.height = rect.height * ratio;
    const context = canvas.getContext("2d"); if (!context) return;
    context.scale(ratio, ratio);
    const width = rect.width; const height = rect.height; const pad = { left: 43, right: 10, top: 12, bottom: 25 };
    const all = series.flat(); const absoluteMax = Math.max(1, ...all.map((value) => Math.abs(value)));
    const magnitude = 10 ** Math.floor(Math.log10(absoluteMax));
    const step = Math.max(1, magnitude / (absoluteMax / magnitude < 2 ? 2 : 1));
    const bound = Math.ceil(absoluteMax / step) * step;
    const min = scale === "positive" ? 0 : -bound; const max = bound; const range = Math.max(1, max - min);
    context.strokeStyle = "#1b252a"; context.lineWidth = 1; context.setLineDash([3, 3]);
    for (let index = 0; index <= 4; index += 1) {
      const y = pad.top + ((height - pad.top - pad.bottom) / 4) * index;
      context.beginPath(); context.moveTo(pad.left, y); context.lineTo(width - pad.right, y); context.stroke();
      context.fillStyle = "#7f8c93"; context.font = "10px ui-monospace";
      context.fillText(axisValue(max - (range / 4) * index), 2, y + 3);
    }
    for (let index = 0; index <= 3; index += 1) { const x = pad.left + ((width - pad.left - pad.right) / 3) * index; context.beginPath(); context.moveTo(x, pad.top); context.lineTo(x, height - pad.bottom); context.stroke(); }
    context.setLineDash([]);
    series.forEach((values, seriesIndex) => {
      context.strokeStyle = colors[seriesIndex]; context.lineWidth = 2; context.beginPath();
      values.forEach((value, pointIndex) => { const x = pad.left + (pointIndex / Math.max(1, values.length - 1)) * (width - pad.left - pad.right); const y = pad.top + ((max - value) / range) * (height - pad.top - pad.bottom); if (pointIndex === 0) context.moveTo(x, y); else context.lineTo(x, y); });
      context.stroke();
    });
    const safeIndex = Math.max(0, Math.min(highlightIndex, series[0].length - 1));
    const markerX = pad.left + (safeIndex / Math.max(1, series[0].length - 1)) * (width - pad.left - pad.right);
    context.strokeStyle = "rgba(230,238,241,.45)"; context.setLineDash([2, 3]); context.beginPath(); context.moveTo(markerX, pad.top); context.lineTo(markerX, height - pad.bottom); context.stroke(); context.setLineDash([]);
    series.forEach((values, seriesIndex) => { const markerY = pad.top + ((max - values[safeIndex]) / range) * (height - pad.top - pad.bottom); context.fillStyle = colors[seriesIndex]; context.beginPath(); context.arc(markerX, markerY, 3.5, 0, Math.PI * 2); context.fill(); });
    const dateIndexes = [0, Math.round((dates.length - 1) / 3), Math.round(((dates.length - 1) * 2) / 3), dates.length - 1];
    context.fillStyle = "#7f8c93"; context.font = "10px ui-monospace";
    dateIndexes.map((index) => axisDateLabel(dates[index] ?? "")).forEach((label, index) => { const x = pad.left + (index / 3) * (width - pad.left - pad.right); context.fillText(label, x - (index === 3 ? 27 : 11), height - 5); });
  }, [series, colors, dates, scale, highlightIndex]);

  function setPointer(event: React.PointerEvent<HTMLCanvasElement>) {
    const rect = event.currentTarget.getBoundingClientRect(); const padLeft = 43; const padRight = 10;
    const ratio = Math.max(0, Math.min(1, (event.clientX - rect.left - padLeft) / Math.max(1, rect.width - padLeft - padRight)));
    onHighlight(Math.round(ratio * Math.max(0, (series[0]?.length ?? 1) - 1)));
  }
  return <canvas className="line-canvas" ref={ref} role="img" tabIndex={0} aria-label={`${labels.join("、")}历史趋势，可触摸查看单周数值`} onPointerMove={setPointer} onClick={setPointer} />;
}

function PositionFanCanvas({ categories }: { categories: PositionCategory[] }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current; if (!canvas) return; const rect = canvas.getBoundingClientRect(); const ratio = window.devicePixelRatio || 1;
    canvas.width = rect.width * ratio; canvas.height = rect.height * ratio; const context = canvas.getContext("2d"); if (!context) return; context.scale(ratio, ratio);
    const centerX = rect.width / 2; const centerY = rect.height - 9; const outerRadius = Math.min(rect.width * 0.42, rect.height - 18); const innerRadius = outerRadius * 0.57; const ringRadius = (outerRadius + innerRadius) / 2; const ringWidth = outerRadius - innerRadius; const total = categories.reduce((sum, category) => sum + Math.abs(category.net), 0) || 1;
    context.strokeStyle = "#131d22"; context.lineWidth = ringWidth; context.beginPath(); context.arc(centerX, centerY, ringRadius, Math.PI, Math.PI * 2); context.stroke();
    let angle = Math.PI; categories.forEach((category) => { const sweep = (Math.abs(category.net) / total) * Math.PI; const gap = Math.min(0.018, sweep * 0.18); if (sweep > gap) { context.strokeStyle = category.color; context.lineWidth = ringWidth; context.beginPath(); context.arc(centerX, centerY, ringRadius, angle + gap / 2, angle + sweep - gap / 2); context.stroke(); } angle += sweep; });
    context.textAlign = "center"; context.fillStyle = "#f0f3f4"; context.font = '700 15px Inter, "PingFang SC", sans-serif'; context.fillText(`${categories.length}类资金`, centerX, centerY - innerRadius * 0.46); context.fillStyle = "#9aa6ac"; context.font = '11px Inter, "PingFang SC", sans-serif'; context.fillText("绝对净仓占比", centerX, centerY - innerRadius * 0.46 + 19);
  }, [categories]);
  return <canvas className="fan-canvas" ref={ref} role="img" aria-label={`${categories.length}类资金绝对净仓规模占比`} />;
}

function HistoryPanel({ asset }: { asset: CftcAsset }) {
  const [weeks, setWeeks] = useState<13 | 26 | 52>(26);
  const [visualMode, setVisualMode] = useState<"fan" | "line">("fan");
  const history = asset.history ?? []; const count = Math.min(weeks, history.length); const visible = history.slice(0, count).reverse();
  const currentCategories: PositionCategory[] = (asset.breakdown ?? [{ name: asset.coreTrader, long: asset.long, short: asset.short, netChange: asset.weeklyDelta }]).map((row, index) => ({ name: traderName(row.name), net: row.long - row.short, color: traderDots[index % traderDots.length] }));
  const categoryNames = history.find((point) => point.categoryNets?.length)?.categoryNets?.map((category) => category.name) ?? currentCategories.map((category) => category.name);
  const categories = categoryNames.map((name, index) => ({ name, color: currentCategories.find((item) => item.name === name)?.color ?? traderDots[index % traderDots.length] }));
  const [enabled, setEnabled] = useState<string[]>(categoryNames);
  const activeCategories = categories.filter((category) => enabled.includes(category.name));
  const historicalSeries = activeCategories.map((category) => visible.map((point) => point.categoryNets?.find((item) => item.name === category.name)?.net ?? 0));
  const oi = visible.map((point) => point.openInterest ?? asset.openInterest);
  const [highlightIndex, setHighlightIndex] = useState(Math.max(0, visible.length - 1));
  const safeHighlight = Math.max(0, Math.min(highlightIndex, visible.length - 1));
  const fanTotal = currentCategories.reduce((sum, category) => sum + Math.abs(category.net), 0) || 1;
  const point = visible[safeHighlight];
  function toggleCategory(name: string) { setEnabled((current) => current.includes(name) ? (current.length === 1 ? current : current.filter((item) => item !== name)) : [...current, name]); trackEvent("chart_category", { symbol: asset.symbol, category: name }); }
  return <div className="tab-panel">
    <section className="detail-card chart-card"><div className="chart-card-heading"><div><h3>{visualMode === "fan" ? "当前净仓结构" : "净持仓历史趋势"}</h3><p>{visualMode === "fan" ? `比较${currentCategories.length}类资金的净仓规模` : `近${count}周${activeCategories.length}类交易者净持仓变化`}</p></div><div className="chart-mode-switch" role="tablist" aria-label="净持仓图表视图"><button type="button" role="tab" aria-selected={visualMode === "fan"} className={visualMode === "fan" ? "active" : ""} onClick={() => { setVisualMode("fan"); trackEvent("chart_mode", { mode: "fan", symbol: asset.symbol }); }}>扇形</button><button type="button" role="tab" aria-selected={visualMode === "line"} className={visualMode === "line" ? "active" : ""} onClick={() => { setVisualMode("line"); trackEvent("chart_mode", { mode: "line", symbol: asset.symbol }); }}>趋势</button></div></div>
      {visualMode === "fan" ? <><PositionFanCanvas categories={currentCategories} /><p className="chart-caveat">仅比较各类别净仓绝对规模，不代表多空持仓比例。</p><div className="fan-legend">{currentCategories.map((category) => <div key={category.name}><span><i style={{ background: category.color }} />{category.name}</span><small>{Math.round((Math.abs(category.net) / fanTotal) * 100)}%</small><strong className={category.net >= 0 ? "red" : "green"}>{formatNetPosition(category.net)}</strong></div>)}</div></> : history.length ? <><LineCanvas series={historicalSeries} colors={activeCategories.map((category) => category.color)} dates={visible.map((item) => item.date)} labels={activeCategories.map((item) => item.name)} highlightIndex={safeHighlight} onHighlight={setHighlightIndex} /><div className="chart-readout"><strong>{point?.date ?? "--"}</strong>{activeCategories.map((category, index) => <span key={category.name}><i style={{ background: category.color }} />{category.name} <b className={(historicalSeries[index]?.[safeHighlight] ?? 0) >= 0 ? "red" : "green"}>{formatNetPosition(historicalSeries[index]?.[safeHighlight] ?? 0, true)}</b></span>)}</div><div className="chart-legend toggles">{categories.map((category) => <button type="button" key={category.name} className={enabled.includes(category.name) ? "active" : ""} aria-pressed={enabled.includes(category.name)} onClick={() => toggleCategory(category.name)}><i style={{ background: category.color }} />{category.name}</button>)}</div></> : <div className="no-history">历史序列暂时不可用</div>}
    </section>
    {history.length > 0 && <div className="range-row"><span>历史明细与趋势:</span>{([13, 26, 52] as const).map((item) => <button key={item} disabled={history.length < item} title={history.length < item ? `当前仅有${history.length}期可用` : undefined} className={weeks === item ? "active" : ""} onClick={() => { setWeeks(item); setHighlightIndex(Math.max(0, Math.min(item, history.length) - 1)); trackEvent("history_range", { symbol: asset.symbol, weeks: item }); }}>{item}周</button>)}</div>}
    {history.length > 0 && <section className="detail-card data-card"><h3>近期数据明细</h3><div className="history-table"><div className="history-row history-head"><span>日期</span><span>总持仓</span><span>{asset.coreTrader}净</span><span>{asset.counterpartLabel ?? "对手净"}</span></div>{history.slice(0, count).map((item, index) => <div className="history-row" key={item.date}><span className={index === 0 ? "latest-date" : ""}>{item.date}<small>{index === 0 ? (item.selected ? "所选" : "当前") : ""}</small></span><span>{format(item.openInterest ?? asset.openInterest)}</span><span className={item.net >= 0 ? "red" : "green"}>{formatNetPosition(item.net, true)}</span><span className={item.counterpartNet >= 0 ? "red" : "green"}>{formatNetPosition(item.counterpartNet, true)}</span></div>)}</div></section>}
    {history.length > 0 && <section className="detail-card chart-card"><h3>总持仓趋势</h3><p>近{count}周总持仓量变化（纵轴从0开始）</p><LineCanvas series={[oi]} colors={["#13b8b1"]} dates={visible.map((item) => item.date)} labels={["总持仓"]} scale="positive" highlightIndex={safeHighlight} onHighlight={setHighlightIndex} /><div className="chart-readout single"><strong>{point?.date ?? "--"}</strong><span>总持仓 <b>{format(oi[safeHighlight] ?? 0)}</b></span></div></section>}
  </div>;
}

function PositionsPanel({ asset, totalChange }: { asset: CftcAsset; totalChange: number }) {
  const [changesOpen, setChangesOpen] = useState(true);
  const rows = asset.breakdown ?? [{ name: asset.coreTrader, long: asset.long, short: asset.short, netChange: asset.weeklyDelta }];
  const max = Math.max(1, ...rows.map((row) => Math.abs(row.long - row.short)));
  return <div className="tab-panel">
    <section className="detail-card positions-card"><h2>各类交易者持仓</h2><p>总持仓 {format(asset.openInterest)}手 · <span className="red">红=多头</span> / <span className="green">绿=空头</span></p>{rows.map((row, index) => <TraderPositionRow row={row} index={index} key={row.name} />)}</section>
    <section className={`detail-card changes-card ${changesOpen ? "open" : "collapsed"}`}><button type="button" className="changes-toggle" aria-expanded={changesOpen} onClick={() => { setChangesOpen((open) => !open); trackEvent("weekly_changes", { symbol: asset.symbol, expanded: !changesOpen }); }}><span><b>本周持仓变化</b><small>总持仓 {format(totalChange, true)}</small></span><strong>{changesOpen ? "收起⌃" : "展开⌄"}</strong></button>{changesOpen && <div className="changes-body"><div className="total-change"><span><i />总持仓变化</span><strong className={totalChange >= 0 ? "red" : "green"}>⌁ {format(totalChange, true)}</strong></div>{rows.map((row, index) => <WeeklyChangeRow row={row} index={index} key={row.name} />)}</div>}</section>
    <section className="detail-card chart-card"><h3>交易者净持仓对比</h3><p>当前各类别多头减空头的净值</p><div className="horizontal-bars">{rows.map((row, index) => { const net = row.long - row.short; return <div key={row.name}><span>{traderName(row.name)}</span><i style={{ width: `${Math.max(8, Math.abs(net) / max * 100)}%`, background: traderDots[index] }} /><b className={net >= 0 ? "red" : "green"}>{formatNetPosition(net, true)}</b></div>; })}</div></section>
    <section className="detail-card explainer-card"><h3>口径说明</h3><p>净持仓＝多头－空头；方向比例＝多头 ÷（多头 + 空头），不含 spreading。CFTC 分类按交易者主要业务目的划分，数据本身不能说明某一笔持仓的具体交易动机。</p></section>
  </div>;
}

function PremiumPreview({ variant }: { variant: "detail" | "pro" }) {
  if (variant === "detail") return <div className="premium-detail-preview" aria-hidden="true"><i className="wide" /><i /><i className="mid" /><i className="block" /><i className="short" /><i className="wide" /></div>;
  return <div className="premium-list-preview" aria-hidden="true">{["黄金 · 结构分析", "欧元 · 极值提醒", "原油(WTI) · 周度变化", "标普500 · 跨类别对比"].map((item) => <div key={item}><i /><span><strong>{item}</strong><small>████████████████████</small></span></div>)}</div>;
}

function PremiumGate({ preview, onUnlock }: { preview: "detail" | "pro"; onUnlock: () => void }) {
  return <section className="pro-gate-card"><div className="pro-gate-head"><span className="wand-icon" aria-hidden="true">✧</span><div><h3>专业版内容 <b>PRO</b></h3><p>统一解锁完整周报、历史极值与结构解读</p></div></div><div className={`pro-preview pro-preview-${preview}`}><PremiumPreview variant={preview} /><i className="preview-fade" /></div><div className="pro-features"><div><i className="feature-bars"><b /><b /><b /></i><span><strong>持仓结构深度解读</strong><small>以一致口径呈现多周趋势、历史分位和类别分歧</small></span></div><div><i className="feature-trend">↗</i><span><strong>跨品种重要变化</strong><small>自动识别方向翻转、历史极值与单周大幅变化</small></span></div><div><i className="feature-report">▤</i><span><strong>每周持仓周报</strong><small>覆盖全部品种，不需要逐项解锁</small></span></div></div><div className="pro-gate-action"><button type="button" onClick={onUnlock}><span className="lock-icon" aria-hidden="true" /> 查看完整专业版</button><p>点击即可查看完整内容；正式版将由金十钻石VIP权益统一解锁</p></div></section>;
}

function PremiumAnalysis({ asset }: { asset: CftcAsset }) {
  const net = netOf(asset); const history = asset.history ?? []; const values = history.map((point) => point.net); const sample = values.length ? values : [net]; const low = Math.min(...sample); const high = Math.max(...sample);
  const percentile = percentileRank(sample, net); const marker = Math.max(2, Math.min(98, rangePosition(sample, net))); const structure = classifyStructure(asset.long, asset.short); const trend = describeMultiWeekTrend(history, asset.weeklyDelta);
  const opposite = [...(asset.breakdown ?? [])].filter((row) => row.name !== asset.coreTrader).sort((a, b) => Math.abs((b.long - b.short)) - Math.abs((a.long - a.short)))[0]; const oppositeNet = opposite ? opposite.long - opposite.short : 0;
  return <div className="premium-analysis" aria-label={`${screenName(asset)}专业版深度解读`}><section className="premium-card structure-card"><div className="premium-card-title"><h3>市场结构</h3><div><span className={`structure-badge ${net >= 0 ? "bull" : "bear"}`}>{structure}</span><span className={trend.direction >= 0 ? "trend-up" : "trend-down"}>{trend.direction >= 0 ? "↗" : "↘"} {trend.label}</span></div></div><p>{asset.coreTrader}当前{formatNetPosition(net)}手，多头占方向持仓的 {share(asset.long, asset.short)}%；在近{sample.length}周样本中处于 {percentile}% 历史分位。</p><div className="percentile-scale"><div><span>区间低位</span><strong>{percentile}%历史分位</strong><span>区间高位</span></div><i><b style={{ left: `${marker}%` }} /></i></div></section>
    {(percentile >= 85 || percentile <= 15) && sample.length >= 13 && <section className="premium-warning">当前核心资金净仓进入近{sample.length}周样本的极值区域。该提示只描述统计位置，不代表方向即将反转。</section>}
    <section className="premium-card context-card"><h3>核心类别持仓背景</h3><p>{asset.coreTrader}本周净仓变化 {format(asset.weeklyDelta, true)} 手，当前多头 {format(asset.long)} 手、空头 {format(asset.short)} 手，结构为{formatNetPosition(net)}。</p></section>
    <section className="premium-card context-card"><h3>近期动能</h3><p>{trend.label}。本周变化约相当于当前净仓绝对值的 {Math.round(Math.abs(asset.weeklyDelta) / Math.max(1, Math.abs(net)) * 100)}%，是否延续仍需结合下一期总持仓和分项变化确认。</p></section>
    <section className="premium-card context-card"><h3>对手类别持仓背景</h3><p>{opposite ? traderName(opposite.name) : "其他类别"}当前{formatNetPosition(oppositeNet)}手，与核心类别{Math.sign(oppositeNet) === Math.sign(net) ? "方向一致" : "方向相反"}。这只表示持仓结构关系，不代表该类别的具体交易动机。</p></section>
    <section className="premium-card extremes-card"><div className="premium-card-title"><h3>历史极值对比</h3><span>近{sample.length}周</span></div><div className="extreme-grid"><div><span>当前净仓</span><strong className={net >= 0 ? "red" : "green"}>{formatNetPosition(net)}</strong></div><div><span>区间最高</span><strong>{formatNetPosition(high)}</strong></div><div><span>区间最低</span><strong>{formatNetPosition(low)}</strong></div></div></section><p className="premium-disclaimer">分析基于CFTC Futures Only公开数据，只描述统计与结构事实，不构成投资建议</p></div>;
}

function WeeklyPremiumReport({ assetList, reportDate, onAsset }: { assetList: CftcAsset[]; reportDate: string; onAsset: (asset: CftcAsset) => void }) {
  const important = buildMarketHighlights(assetList, 3) as Array<{ asset: CftcAsset; reason: string }>;
  return <div className="weekly-premium-report"><div className="weekly-report-meta"><span>持仓日期: {displayReportDate(reportDate)}</span><strong>{important.length} 个重要变化</strong></div><section className="important-report-card"><header><span>✦</span> 本周重要变化</header>{important.map(({ asset, reason }) => <button key={asset.symbol} type="button" onClick={() => onAsset(asset)}><i className={asset.weeklyDelta >= 0 ? "up" : "down"}>{asset.weeklyDelta >= 0 ? "↗" : "↘"}</i><span><b>{screenName(asset)}</b><small>{reason}</small></span><strong className={asset.weeklyDelta >= 0 ? "red" : "green"}>{format(asset.weeklyDelta, true)}</strong></button>)}</section><section className="all-report-section"><h3>全部品种持仓摘要</h3>{assetList.map((asset) => { const net = netOf(asset); const structure = classifyStructure(asset.long, asset.short); return <button key={asset.symbol} type="button" onClick={() => onAsset(asset)}><i className={asset.weeklyDelta >= 0 ? "up" : "down"}>{asset.weeklyDelta >= 0 ? "↗" : "↘"}</i><span><b>{screenName(asset)} <em className={net >= 0 ? "bull" : "bear"}>{structure}</em></b><small>{formatNetPosition(net)} · 本周 {format(asset.weeklyDelta, true)}</small></span><strong>›</strong></button>; })}</section><p className="premium-disclaimer">排序综合方向翻转、历史极值与单周变化幅度；不推断交易者的具体动机</p></div>;
}

function DeepPremiumView({ assetList, selectedSymbol, onSelect, onAsset }: { assetList: CftcAsset[]; selectedSymbol: string; onSelect: (symbol: string) => void; onAsset: (asset: CftcAsset) => void }) {
  const selected = assetList.find((asset) => asset.symbol === selectedSymbol) ?? assetList[0];
  return <div className="deep-premium-view"><p className="premium-selector-label">选择品种查看深度解读</p><div className="premium-selector">{assetList.map((asset) => <button type="button" key={asset.symbol} className={selectedSymbol === asset.symbol ? "active" : ""} onClick={() => { onSelect(asset.symbol); trackEvent("pro_asset", { symbol: asset.symbol }); }}>{screenName(asset)}</button>)}</div><button type="button" className="full-data-link" onClick={() => onAsset(selected)}><span>查看 {screenName(selected)} 完整持仓数据</span><b>›</b></button><PremiumAnalysis asset={selected} /></div>;
}

function DetailView({ asset, tab, setTab, onBack }: { asset: CftcAsset; tab: DetailTab; setTab: (tab: DetailTab) => void; onBack: () => void }) {
  const [snapshots, setSnapshots] = useState<CftcSnapshot[]>([]); const [selectedDate, setSelectedDate] = useState(asset.history?.[0]?.date ?? reportMeta.asOf); const [dateMenuOpen, setDateMenuOpen] = useState(false); const [historyLoading, setHistoryLoading] = useState(true); const [historyError, setHistoryError] = useState(false); const [historyRequest, setHistoryRequest] = useState(0);
  useEffect(() => { const controller = new AbortController(); fetch(`/api/cftc-history?symbol=${encodeURIComponent(asset.symbol)}&limit=104`, { signal: controller.signal }).then(async (response) => { if (!response.ok) throw new Error("history unavailable"); return response.json() as Promise<{ snapshots?: CftcSnapshot[] }>; }).then((payload) => { if (!payload.snapshots?.length) throw new Error("history empty"); setSnapshots(payload.snapshots); setSelectedDate(payload.snapshots[0].date); }).catch((error: unknown) => { if (error instanceof DOMException && error.name === "AbortError") return; setHistoryError(true); }).finally(() => { if (!controller.signal.aborted) setHistoryLoading(false); }); return () => controller.abort(); }, [asset.symbol, historyRequest]);
  const selectedIndex = snapshots.findIndex((snapshot) => snapshot.date === selectedDate); const selectedSnapshot = selectedIndex >= 0 ? snapshots[selectedIndex] : undefined; const historySnapshots = selectedIndex >= 0 ? snapshots.slice(selectedIndex) : snapshots; const selectedIsHistorical = selectedIndex > 0;
  const viewAsset: CftcAsset = selectedSnapshot ? { ...asset, openInterest: selectedSnapshot.openInterest, long: selectedSnapshot.long, short: selectedSnapshot.short, weeklyDelta: selectedSnapshot.weeklyDelta, breakdown: selectedSnapshot.breakdown, history: snapshotsToHistory(asset, historySnapshots, selectedIsHistorical) } : asset;
  const totalChange = selectedSnapshot?.openInterestChange ?? 0; const latestDate = snapshots[0]?.date ?? asset.history?.[0]?.date ?? reportMeta.asOf; const dateOptions = snapshots.slice(0, 52);
  return <div className="cot-scroll detail-scroll"><section className="detail-titlebar"><button className="back" onClick={onBack} aria-label="返回">‹</button><div><h1>{screenName(asset)} <span>{screenSymbol(asset)}</span></h1><div className="date-control"><button className="date-button" type="button" aria-expanded={dateMenuOpen} aria-haspopup="listbox" onClick={() => setDateMenuOpen((open) => !open)}>{displayReportDate(selectedDate)} <small>{selectedDate === latestDate ? "最新" : "历史"}</small><b>{dateMenuOpen ? "⌃" : "⌄"}</b></button>{dateMenuOpen && <div className="date-menu" role="listbox" aria-label="选择CFTC报告日期">{historyLoading && <div className="date-menu-status">正在加载CFTC历史数据…</div>}{historyError && !historyLoading && <div className="date-menu-status error">历史数据加载失败<button type="button" onClick={() => { setHistoryError(false); setHistoryLoading(true); setHistoryRequest((value) => value + 1); }}>重试</button></div>}{!historyLoading && !historyError && dateOptions.map((snapshot, index) => <button key={snapshot.date} type="button" role="option" aria-selected={snapshot.date === selectedDate} className={snapshot.date === selectedDate ? "active" : ""} onClick={() => { setSelectedDate(snapshot.date); setDateMenuOpen(false); trackEvent("report_date", { symbol: asset.symbol, date: snapshot.date }); }}><span>{displayReportDate(snapshot.date)}</span>{index === 0 && <small>最新</small>}</button>)}{!historyLoading && !historyError && dateOptions.length > 0 && <p>CFTC官方 · 可选最近52期；每期保留后续52周趋势</p>}</div>}</div></div><button className="refresh" aria-label="刷新" onClick={() => { setHistoryError(false); setHistoryLoading(true); setHistoryRequest((value) => value + 1); }}>↻</button></section>
    <div className="analysis-tabs sticky-tabs" role="tablist"><button role="tab" aria-selected={tab === "positions"} className={tab === "positions" ? "active" : ""} onClick={() => { setTab("positions"); trackEvent("detail_tab", { tab: "positions", symbol: asset.symbol }); }}>持仓数据</button><button role="tab" aria-selected={tab === "history"} className={tab === "history" ? "active" : ""} onClick={() => { setTab("history"); trackEvent("detail_tab", { tab: "history", symbol: asset.symbol }); }}>结构趋势</button></div>
    {historyLoading && <div className="inline-data-state">正在同步该品种最新104期官方数据…</div>}{historyError && <div className="inline-data-state error">官方历史接口暂不可用，当前显示最近缓存</div>}
    {tab === "positions" && <PositionsPanel asset={viewAsset} totalChange={totalChange} />}{tab === "history" && <HistoryPanel asset={viewAsset} />}
    <section className="detail-card instrument-note"><h3>数据与分类说明</h3><p>{screenName(asset)}期货 {asset.reportType} Futures Only 报告。持仓日期为周二，CFTC通常于周五发布。分类按交易者主要业务目的确定，不能据此判断每笔持仓的具体原因。</p><div><span>合约单位: 手</span><span>{asset.reportType === "TFF" ? "金融期货报告" : "分类报告"}</span></div><a href={sourceFor(asset)} target="_blank" rel="noreferrer">核验官方原表 ↗</a></section>
  </div>;
}

function ProView({ premium, onUnlock, onAsset, assetList, reportDate }: { premium: boolean; onUnlock: () => void; onAsset: (asset: CftcAsset) => void; assetList: CftcAsset[]; reportDate: string }) {
  const [section, setSection] = useState<"weekly" | "analysis">("weekly");
  const [selectedSymbol, setSelectedSymbol] = useState("XAU");
  function openAnalysis(asset: CftcAsset) { setSelectedSymbol(asset.symbol); setSection("analysis"); trackEvent("pro_drilldown", { symbol: asset.symbol }); }
  return <div className="cot-scroll pro-page"><section className="pro-title"><div><h1>专业版</h1><span>PRO</span></div><p>跨品种变化筛选、历史分位与多周结构解读</p></section><div className="pro-segments" role="tablist"><button type="button" role="tab" aria-selected={section === "weekly"} className={section === "weekly" ? "active" : ""} onClick={() => { setSection("weekly"); trackEvent("pro_section", { section: "weekly" }); }}>持仓周报</button><button type="button" role="tab" aria-selected={section === "analysis"} className={section === "analysis" ? "active" : ""} onClick={() => { setSection("analysis"); trackEvent("pro_section", { section: "analysis" }); }}>深度解读</button></div><div className="pro-gate-wrap">{premium ? section === "weekly" ? <WeeklyPremiumReport assetList={assetList} reportDate={reportDate} onAsset={openAnalysis} /> : <DeepPremiumView assetList={assetList} selectedSymbol={selectedSymbol} onSelect={setSelectedSymbol} onAsset={onAsset} /> : <PremiumGate preview="pro" onUnlock={onUnlock} />}</div></div>;
}

export default function Home() {
  const [screen, setScreen] = useState<Screen>("home"); const [filter, setFilter] = useState<Filter>("全部"); const [symbol, setSymbol] = useState("XAU"); const [tab, setTab] = useState<DetailTab>("positions"); const [premium, setPremium] = useState(() => typeof window !== "undefined" && sessionStorage.getItem("cftc_pro_access") === "1"); const [market, setMarket] = useState<MarketPayload | null>(null); const [marketLoading, setMarketLoading] = useState(true);
  useEffect(() => { const controller = new AbortController(); fetch("/api/cftc-market", { signal: controller.signal }).then(async (response) => { if (!response.ok) throw new Error("market unavailable"); return response.json() as Promise<MarketPayload>; }).then(setMarket).catch(() => undefined).finally(() => setMarketLoading(false)); fetch("/api/membership", { signal: controller.signal }).catch(() => undefined); return () => controller.abort(); }, []);
  const assetList = useMemo(() => assets.map((asset) => mergeOfficialAsset(asset, market?.histories[asset.symbol])), [market]); const selected = useMemo(() => assetList.find((asset) => asset.symbol === symbol) ?? assetList[0], [assetList, symbol]); const reportDate = market?.reportDate ?? reportMeta.asOf;
  function unlockPremium() { sessionStorage.setItem("cftc_pro_access", "1"); setPremium(true); trackEvent("pro_unlock", { source: screen }); }
  function openAsset(asset: CftcAsset, openTab: DetailTab = "positions") { setSymbol(asset.symbol); setTab(openTab); setScreen("detail"); trackEvent("open_asset", { symbol: asset.symbol, tab: openTab }); window.scrollTo(0, 0); }
  return <main className="cot-app"><BrandHeader premium={premium} />{screen === "home" && <HomeView filter={filter} setFilter={setFilter} onOpen={openAsset} assetList={assetList} reportDate={reportDate} loading={marketLoading} unavailable={market?.unavailable ?? []} />}{screen === "detail" && <DetailView key={selected.symbol} asset={selected} tab={tab} setTab={setTab} onBack={() => setScreen("home")} />}{screen === "pro" && <ProView premium={premium} onUnlock={unlockPremium} onAsset={(asset) => openAsset(asset, "positions")} assetList={assetList} reportDate={reportDate} />}<BottomNav screen={screen} onHome={() => setScreen("home")} onPro={() => { setScreen("pro"); trackEvent("open_pro"); }} /></main>;
}
