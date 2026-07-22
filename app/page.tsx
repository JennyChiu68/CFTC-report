"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { assets, reportMeta, type CftcAsset, type TraderRow } from "./cftc-data";

type Screen = "home" | "detail" | "pro";
type DetailTab = "history" | "chart" | "depth";
type Filter = "全部" | "贵金属" | "能源" | "外汇" | "股指/加密";

const physicalSource = "https://www.cftc.gov/dea/futures/other_lf.htm";
const financialSource = "https://www.cftc.gov/dea/futures/financial_lf.htm";
const methodSource = "https://www.cftc.gov/MarketReports/CommitmentsofTraders/AbouttheCOTReports/index.htm";

const filters: Array<{ key: Filter; icon?: string }> = [
  { key: "全部" },
  { key: "贵金属", icon: "🥇" },
  { key: "能源", icon: "⚡" },
  { key: "外汇", icon: "💱" },
  { key: "股指/加密", icon: "📈" },
];

const groups = [
  { key: "贵金属" as const, icon: "🥇", title: "贵金属", subtitle: "黄金、白银、铜", symbols: ["XAU", "XAG", "HG"] },
  { key: "能源" as const, icon: "⚡", title: "能源", subtitle: "原油、天然气、布伦特", symbols: ["CL", "NG", "BZ"] },
  { key: "外汇" as const, icon: "💱", title: "外汇", subtitle: "美元指数、欧元、英镑等", symbols: ["DXY", "EUR", "GBP", "JPY", "AUD", "CAD"] },
  { key: "股指/加密" as const, icon: "📈", title: "股指/加密", subtitle: "标普500、纳斯达克、比特币", symbols: ["ES", "NQ", "BTC"] },
];

const displayNames: Record<string, string> = {
  CL: "原油(WTI)", ES: "标普500", NQ: "纳斯达克100",
};

const displaySymbols: Record<string, string> = {
  XAU: "XAU/USD", XAG: "XAG/USD", EUR: "EUR/USD", GBP: "GBP/USD",
  JPY: "JPY/USD", AUD: "AUD/USD", CAD: "CAD/USD",
};

const traderLabels: Record<string, string> = {
  "生产商 / 商业商": "生产商/商业",
  "交易商 / 中介": "交易商/中介",
  "资产管理机构": "资管机构",
  "其他报告交易者": "其他可报告",
  "非报告交易者": "非报告持仓",
};

const traderDots = ["#f5ad3d", "#8b5cf6", "#55d39a", "#5d82ff", "#758091"];

const goldChanges: Record<string, { long: number; short: number }> = {
  "生产商 / 商业商": { long: 1558, short: -279 },
  "掉期交易商": { long: -268, short: -5925 },
  "管理基金": { long: 1964, short: -2654 },
  "其他报告交易者": { long: -8367, short: 3815 },
  "非报告交易者": { long: -1217, short: -1287 },
};

const dxyChanges: Record<string, { long: number; short: number }> = {
  "交易商 / 中介": { long: 280, short: 109 },
  "资管机构": { long: 1799, short: 1184 },
  "杠杆基金": { long: -1864, short: -1452 },
  "其他报告交易者": { long: -116, short: -50 },
  "非报告交易者": { long: -145, short: 163 },
};

const oiHistory: Record<string, number[]> = {
  XAU: [383689, 371776, 369541, 352167, 339330, 332709, 326052, 353489, 379325, 376496, 367932, 369530, 365842, 362274, 354877, 361409, 403925, 411388, 413956, 409789, 420182, 407078, 404391, 409694, 488463, 528004],
  DXY: [53293, 53384, 54306, 54908, 49411, 50285, 43090, 42278, 40626, 32108, 32496, 30611, 30651, 32911, 36573, 38735, 36113, 35456, 32012, 29871, 26218, 26596, 27789, 28190, 31746, 29579],
};

function netOf(asset: CftcAsset) { return asset.long - asset.short; }
function share(long: number, short: number) { return Math.round((long / (long + short)) * 100); }

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

function BrandHeader({ premium }: { premium: boolean }) {
  return (
    <header className="cot-header">
      <div className="cot-brand">
        <span className="brand-chart"><i /><i /><i /></span>
        <div><strong>CFTC持仓动向</strong></div>
      </div>
      {premium ? <span className="premium-status"><b>✧</b> PRO</span> : <span className="official-status"><i /> 官方数据</span>}
    </header>
  );
}

function BottomNav({ screen, onHome, onPro }: { screen: Screen; onHome: () => void; onPro: () => void }) {
  return (
    <nav className="cot-bottom-nav" aria-label="主导航">
      <button className={screen !== "pro" ? "active" : ""} onClick={onHome}>
        <span className="home-icon">⌂</span><small>品种</small>
      </button>
      <button className={screen === "pro" ? "active" : ""} onClick={onPro}>
        <span className="pro-icon">✧</span><small>专业版</small>
      </button>
    </nav>
  );
}

function AssetCard({ asset, onOpen }: { asset: CftcAsset; onOpen: () => void }) {
  const net = netOf(asset);
  const longPct = share(asset.long, asset.short);
  return (
    <button className="cot-asset-card" onClick={onOpen} aria-label={`查看${screenName(asset)}完整分析`}>
      <div className="asset-card-heading">
        <div><strong>{screenName(asset)}</strong><span>{screenSymbol(asset)}</span></div>
        <small>{reportMeta.asOf}<b>›</b></small>
      </div>
      <div className="asset-card-sub"><strong>{asset.symbol === "DXY" || asset.reportType === "TFF" ? "杠杆资金" : "管理基金"}</strong><span>OI {format(asset.openInterest)}手</span></div>
      <div className="summary-metrics">
        <div className="metric-long"><span>多头</span><strong>{format(asset.long)}</strong></div>
        <div className="metric-short"><span>空头</span><strong>{format(asset.short)}</strong></div>
        <div className={net >= 0 ? "metric-long" : "metric-short"}><span>{net > 0 ? "净多" : net < 0 ? "净空" : "持平"}</span><strong>{format(Math.abs(net))}</strong></div>
      </div>
      <div className="summary-bar"><i className="bar-long" style={{ width: `${longPct}%` }} /><i className="bar-short" style={{ width: `${100 - longPct}%` }} /></div>
      <div className="summary-labels"><span>多 {longPct}%</span><span>空 {100 - longPct}%</span></div>
      <div className="weekly-line">较上周净持仓 <strong className={asset.weeklyDelta >= 0 ? "red" : "green"}>{format(asset.weeklyDelta, true)}</strong></div>
    </button>
  );
}

function HomeView({ filter, setFilter, onOpen }: { filter: Filter; setFilter: (filter: Filter) => void; onOpen: (asset: CftcAsset) => void }) {
  const visibleGroups = groups.filter((group) => filter === "全部" || group.key === filter);
  return (
    <div className="cot-scroll home-scroll">
      <section className="home-intro">
        <h1>CFTC 持仓报告</h1>
        <p>官方数据 · 每周五更新 · 点击品种查看完整分析</p>
      </section>
      <div className="filter-strip" aria-label="品种分类">
        {filters.map((item) => <button key={item.key} className={filter === item.key ? "active" : ""} onClick={() => setFilter(item.key)}>{item.icon && <span>{item.icon}</span>}{item.key}</button>)}
      </div>
      {visibleGroups.map((group) => (
        <section className="market-group" key={group.key}>
          <div className="group-title"><span>{group.icon}</span><h2>{group.title}</h2><p>{group.subtitle}</p></div>
          <div className="asset-stack">
            {group.symbols.map((symbol) => {
              const asset = assets.find((item) => item.symbol === symbol);
              return asset ? <AssetCard key={symbol} asset={asset} onOpen={() => onOpen(asset)} /> : null;
            })}
          </div>
        </section>
      ))}
      <div className="method-links">
        <a href={methodSource} target="_blank" rel="noreferrer">CFTC 原始说明</a>
        <a href={physicalSource} target="_blank" rel="noreferrer">Disaggregated 原表</a>
        <a href={financialSource} target="_blank" rel="noreferrer">TFF 原表</a>
      </div>
    </div>
  );
}

function TraderPositionRow({ row, index }: { row: TraderRow; index: number }) {
  const net = row.long - row.short;
  const longPct = share(row.long, row.short);
  return (
    <div className="trader-position-row">
      <div className="trader-row-heading"><strong><i style={{ background: traderDots[index % traderDots.length] }} />{traderName(row.name)}</strong><span className={net >= 0 ? "red" : "green"}>{formatNetPosition(net)}</span></div>
      <div className="trader-numbers"><span>多 <b className="red">{format(row.long)}</b></span><span>空 <b className="green">{format(row.short)}</b></span></div>
      <div className="detail-bar"><i className="bar-long" style={{ width: `${longPct}%` }} /><i className="bar-short" style={{ width: `${100 - longPct}%` }} /></div>
      <div className="detail-percent"><span>{longPct}%</span><span>{100 - longPct}%</span></div>
    </div>
  );
}

function WeeklyChangeRow({ row, asset, index }: { row: TraderRow; asset: CftcAsset; index: number }) {
  const map = asset.symbol === "XAU" ? goldChanges : asset.symbol === "DXY" ? dxyChanges : {};
  const changes = map[row.name] ?? { long: 0, short: 0 };
  return (
    <div className="change-row">
      <div className="change-heading"><strong><i style={{ background: traderDots[index % traderDots.length] }} />{traderName(row.name)}</strong><span className={row.netChange >= 0 ? "red" : "green"}>⌁ 净 {format(row.netChange, true)}</span></div>
      <div className="change-grid">
        <div><span>多头变化</span><strong className={changes.long >= 0 ? "red" : "green"}>⌁ {format(changes.long, true)}</strong><small>当前 {format(row.long)}</small></div>
        <div><span>空头变化</span><strong className={changes.short >= 0 ? "red" : "green"}>⌁ {format(changes.short, true)}</strong><small>当前 {format(row.short)}</small></div>
      </div>
    </div>
  );
}

function LineCanvas({ series, colors }: { series: number[][]; colors: string[] }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const ratio = window.devicePixelRatio || 1;
    canvas.width = rect.width * ratio;
    canvas.height = rect.height * ratio;
    const context = canvas.getContext("2d");
    if (!context) return;
    context.scale(ratio, ratio);
    const width = rect.width;
    const height = rect.height;
    const pad = { left: 38, right: 10, top: 12, bottom: 24 };
    const all = series.flat();
    const absoluteMax = Math.max(...all.map((value) => Math.abs(value)));
    const step = absoluteMax > 100000 ? 125000 : absoluteMax > 40000 ? 25000 : absoluteMax > 10000 ? 12500 : 5000;
    const bound = Math.max(step, Math.ceil(absoluteMax / step) * step);
    const max = bound;
    const min = -bound;
    const range = max - min;
    context.strokeStyle = "#1b252a";
    context.lineWidth = 1;
    context.setLineDash([3, 3]);
    for (let i = 0; i <= 4; i++) {
      const y = pad.top + ((height - pad.top - pad.bottom) / 4) * i;
      context.beginPath(); context.moveTo(pad.left, y); context.lineTo(width - pad.right, y); context.stroke();
      const axisValue = max - (range / 4) * i;
      context.fillStyle = "#68757d";
      context.font = "9px ui-monospace";
      context.fillText(axisValue === 0 ? "0" : `${axisValue / 1000}K`, 3, y + 3);
    }
    for (let i = 0; i <= 3; i++) {
      const x = pad.left + ((width - pad.left - pad.right) / 3) * i;
      context.beginPath(); context.moveTo(x, pad.top); context.lineTo(x, height - pad.bottom); context.stroke();
    }
    context.setLineDash([]);
    series.forEach((values, index) => {
      context.strokeStyle = colors[index];
      context.lineWidth = 2;
      context.beginPath();
      values.forEach((value, pointIndex) => {
        const x = pad.left + (pointIndex / Math.max(1, values.length - 1)) * (width - pad.left - pad.right);
        const y = pad.top + ((max - value) / range) * (height - pad.top - pad.bottom);
        if (pointIndex === 0) context.moveTo(x, y); else context.lineTo(x, y);
      });
      context.stroke();
    });
    context.fillStyle = "#68757d";
    context.font = "9px ui-monospace";
    ["01/20", "03/31", "05/05", "07/14"].forEach((label, index) => {
      const x = pad.left + (index / 3) * (width - pad.left - pad.right);
      context.fillText(label, x - (index === 3 ? 26 : 10), height - 5);
    });
  }, [series, colors]);
  return <canvas className="line-canvas" ref={ref} />;
}

function HistoryPanel({ asset }: { asset: CftcAsset }) {
  const [weeks, setWeeks] = useState<13 | 26 | 52>(26);
  const history = asset.history ?? [];
  const count = Math.min(weeks, history.length);
  const visible = history.slice(0, count).reverse();
  const oi = (oiHistory[asset.symbol] ?? Array(history.length).fill(asset.openInterest)).slice(0, count).reverse();
  return (
    <div className="tab-panel">
      <div className="range-row"><span>时间范围:</span>{([13, 26, 52] as const).map((item) => <button key={item} className={weeks === item ? "active" : ""} onClick={() => setWeeks(item)}>{item}周</button>)}</div>
      <section className="detail-card chart-card">
        <h3>净持仓历史趋势</h3><p>近{count}周各类交易者净持仓变化</p>
        {history.length ? <LineCanvas series={[visible.map((p) => p.net), visible.map((p) => p.counterpartNet), visible.map((p) => p.thirdNet ?? 0)]} colors={["#f5a73b", asset.reportType === "TFF" ? "#8b5cf6" : "#5577f3", asset.reportType === "TFF" ? "#5577f3" : "#8b5cf6"]} /> : <div className="no-history">该品种历史序列将在正式版接入</div>}
        <div className="chart-legend"><span className="orange">{asset.reportType === "TFF" ? "杠杆资金" : "管理基金"}</span><span className={asset.reportType === "TFF" ? "purple" : "blue"}>{asset.reportType === "TFF" ? "资产管理" : "生产商/商业"}</span><span className={asset.reportType === "TFF" ? "blue" : "purple"}>{asset.reportType === "TFF" ? "交易商" : "掉期交易商"}</span></div>
      </section>
      {history.length > 0 && (
        <section className="detail-card data-card">
          <h3>近期数据明细</h3>
          <div className="history-table">
            <div className="history-row history-head"><span>日期</span><span>总持仓</span><span>{asset.coreTrader}净</span><span>{asset.counterpartLabel ?? "对手净"}</span></div>
            {[...history].slice(0, count).map((point, index) => (
              <div className="history-row" key={point.date}>
                <span className={index === 0 ? "latest-date" : ""}>2026-{point.date}{index === 0 && <small>最新</small>}</span>
                <span>{format((oiHistory[asset.symbol] ?? [asset.openInterest])[index] ?? asset.openInterest)}</span>
                <span className={point.net >= 0 ? "red" : "green"}>{formatNetPosition(point.net, true)}</span>
                <span className={point.counterpartNet >= 0 ? "red" : "green"}>{formatNetPosition(point.counterpartNet, true)}</span>
              </div>
            ))}
          </div>
        </section>
      )}
      {history.length > 0 && <section className="detail-card chart-card"><h3>总持仓趋势</h3><p>近{count}周总持仓量变化</p><LineCanvas series={[oi]} colors={["#13b8b1"]} /></section>}
    </div>
  );
}

function ChartPanel({ asset }: { asset: CftcAsset }) {
  const rows = asset.breakdown ?? [{ name: asset.coreTrader, long: asset.long, short: asset.short, netChange: asset.weeklyDelta }];
  return (
    <div className="tab-panel">
      <section className="detail-card chart-card"><h3>交易者净持仓对比</h3><p>当前各类交易者净持仓</p><div className="horizontal-bars">{rows.map((row, index) => { const net = row.long - row.short; const max = Math.max(...rows.map((item) => Math.abs(item.long - item.short))); return <div key={row.name}><span>{traderName(row.name)}</span><i style={{ width: `${Math.max(8, Math.abs(net) / max * 100)}%`, background: traderDots[index] }} /><b className={net >= 0 ? "red" : "green"}>{formatNetPosition(net, true)}</b></div>; })}</div></section>
      <section className="detail-card explainer-card"><h3>图表说明</h3><p>红色代表多头，绿色代表空头；净持仓为多头减去空头。多头 ÷（多头 + 空头）为方向持仓比例，不含 spreading。</p></section>
    </div>
  );
}

function PremiumPreview({ variant }: { variant: "detail" | "pro" }) {
  if (variant === "detail") {
    return (
      <div className="premium-detail-preview" aria-hidden="true">
        <i className="wide" /><i /><i className="mid" /><i className="block" /><i className="short" /><i className="wide" />
      </div>
    );
  }

  return (
    <div className="premium-list-preview" aria-hidden="true">
      {["黄金 · 多头主导", "欧元 · 空头主导", "原油(WTI) · 多空均衡", "标普500 · 多头主导"].map((item) => (
        <div key={item}><i /><span><strong>{item}</strong><small>████████████████████</small></span></div>
      ))}
    </div>
  );
}

function PremiumGate({ preview, onUnlock }: { preview: "detail" | "pro"; onUnlock: () => void }) {
  return (
    <section className="pro-gate-card">
      <div className="pro-gate-head"><span className="wand-icon" aria-hidden="true">✧</span><div><h3>专业版内容 <b>PRO</b></h3><p>以下内容为付费会员专属，提供更深层的持仓结构分析</p></div></div>
      <div className={`pro-preview pro-preview-${preview}`}><PremiumPreview variant={preview} /><i className="preview-fade" /></div>
      <div className="pro-features">
        <div><i className="feature-bars"><b /><b /><b /></i><span><strong>持仓结构深度解读</strong><small>投机者与商业用户的持仓逻辑、历史背景分析</small></span></div>
        <div><i className="feature-trend">↗</i><span><strong>历史极值对比</strong><small>当前持仓与历史极端点的统计对比，了解历史规律</small></span></div>
        <div><i className="feature-report">▤</i><span><strong>每周持仓周报</strong><small>跨品种持仓变化摘要，快速掌握本周最值得关注的变化</small></span></div>
      </div>
      <div className="pro-gate-action"><button type="button" onClick={onUnlock}><span className="lock-icon" aria-hidden="true" /> 登录后升级专业版</button><p>所有分析均基于CFTC官方公开数据，仅描述持仓结构事实，不构成投资建议</p></div>
    </section>
  );
}

function PremiumAnalysis({ asset }: { asset: CftcAsset }) {
  const net = netOf(asset);
  const directionTotal = asset.long + asset.short;
  const history = asset.history ?? [];
  const values = history.length ? history.map((point) => point.net) : [net * 0.72, net * 0.86, net];
  const low = Math.min(...values);
  const high = Math.max(...values);
  const percentile = Math.max(0, Math.min(100, Math.round(((net - low) / Math.max(1, high - low)) * 100)));
  const rangePosition = Math.max(2, Math.min(98, percentile));
  const structure = net > directionTotal * 0.18 ? "多头主导" : net < -directionTotal * 0.18 ? "空头主导" : "多空均衡";
  const trend = asset.weeklyDelta > 0 ? "持续增多" : asset.weeklyDelta < 0 ? "持续减少" : "震荡";
  const rows = asset.breakdown ?? [];
  const opposite = rows
    .filter((row) => row.name !== asset.coreTrader)
    .sort((a, b) => net >= 0 ? (a.long - a.short) - (b.long - b.short) : (b.long - b.short) - (a.long - a.short))[0];
  const oppositeNet = opposite ? opposite.long - opposite.short : -net;
  const summary = asset.symbol === "XAU"
    ? `管理基金净多仍处于近26周高位，当前${formatNetPosition(net)} 手。多头结构保持优势，但本周扩张速度较前期放缓。`
    : asset.symbol === "DXY"
      ? `杠杆资金维持净空 ${format(Math.abs(net))} 手，而资管机构方向相反。美元当前处在机构持仓分歧阶段。`
      : `${asset.coreTrader}当前${formatNetPosition(net)}手，方向持仓中多头占 ${share(asset.long, asset.short)}%，整体呈${structure}。`;

  return (
    <div className="premium-analysis" aria-label={`${screenName(asset)}专业版深度解读`}>
      <section className="premium-card structure-card">
        <div className="premium-card-title"><h3>市场结构</h3><div><span className={`structure-badge ${net >= 0 ? "bull" : "bear"}`}>{structure}</span><span className={asset.weeklyDelta >= 0 ? "trend-up" : "trend-down"}>{asset.weeklyDelta >= 0 ? "↗" : "↘"} {trend}</span></div></div>
        <p>{summary}</p>
        <div className="percentile-scale"><div><span>历史低位</span><strong>{percentile}%分位</strong><span>历史高位</span></div><i><b style={{ left: `${rangePosition}%` }} /></i></div>
      </section>

      {(percentile >= 85 || percentile <= 15) && <section className="premium-warning">当前核心资金净仓已接近历史极值区，方向优势明显，同时需留意拥挤交易松动风险。</section>}

      <section className="premium-card context-card"><h3>投机者持仓背景</h3><p>{asset.coreTrader}本周净仓变化 {format(asset.weeklyDelta, true)} 手，当前多头 {format(asset.long)} 手、空头 {format(asset.short)} 手。{net >= 0 ? "资金仍以净多结构为主。" : "资金仍以净空结构为主。"}</p></section>
      <section className="premium-card context-card"><h3>近期动能</h3><p>{asset.weeklyDelta >= 0 ? "核心资金继续向多头方向移动" : "核心资金本周向空头方向移动"}，变化幅度相当于当前净仓的 {Math.round(Math.abs(asset.weeklyDelta) / Math.max(1, Math.abs(net)) * 100)}%。需结合下周总持仓变化确认延续性。</p></section>
      <section className="premium-card context-card"><h3>商业用户持仓背景</h3><p>{opposite ? traderName(opposite.name) : "对手资金"}当前{formatNetPosition(oppositeNet)}手，与核心投机资金{Math.sign(oppositeNet) === Math.sign(net) ? "方向一致" : "方向相反"}，反映出套保盘与趋势资金之间的结构关系。</p></section>

      <section className="premium-card extremes-card">
        <div className="premium-card-title"><h3>历史极值对比</h3><span>近{history.length || 26}周</span></div>
        <div className="extreme-grid"><div><span>当前净仓</span><strong className={net >= 0 ? "red" : "green"}>{formatNetPosition(net)}</strong></div><div><span>区间最高</span><strong>{formatNetPosition(high)}</strong></div><div><span>区间最低</span><strong>{formatNetPosition(low)}</strong></div></div>
      </section>
      <p className="premium-disclaimer">以上分析基于CFTC官方公开数据，仅描述持仓结构事实，不构成投资建议</p>
    </div>
  );
}

function WeeklyPremiumReport({ onAsset }: { onAsset: (asset: CftcAsset) => void }) {
  const reportItems = ["XAU", "NG", "DXY", "EUR", "ES", "BTC"].map((symbol) => assets.find((asset) => asset.symbol === symbol)).filter((asset): asset is CftcAsset => Boolean(asset));
  const important = reportItems.slice(0, 3);
  return (
    <div className="weekly-premium-report">
      <div className="weekly-report-meta"><span>报告日期: 2026/07/14</span><strong>3 个重要变化</strong></div>
      <section className="important-report-card">
        <header><span>✦</span> 本周重要变化</header>
        {important.map((asset) => {
          const highlight = asset.symbol === "XAU" ? "管理基金净多仍处近26周高位" : asset.symbol === "NG" ? "管理基金净空单周扩大45.4K" : "资管净多、杠杆资金净空，分歧延续";
          return <button key={asset.symbol} type="button" onClick={() => onAsset(asset)}><i className={asset.weeklyDelta >= 0 ? "up" : "down"}>{asset.weeklyDelta >= 0 ? "↗" : "↘"}</i><span><b>{screenName(asset)}</b><small>{highlight}</small></span><strong className={asset.weeklyDelta >= 0 ? "red" : "green"}>{format(asset.weeklyDelta, true)}</strong></button>;
        })}
      </section>
      <section className="all-report-section"><h3>跨品种持仓摘要</h3>{reportItems.map((asset) => {
        const net = netOf(asset);
        const label = net > 0 ? "多头主导" : "空头主导";
        return <button key={asset.symbol} type="button" onClick={() => onAsset(asset)}><i className={asset.weeklyDelta >= 0 ? "up" : "down"}>{asset.weeklyDelta >= 0 ? "↗" : "↘"}</i><span><b>{screenName(asset)} <em className={net >= 0 ? "bull" : "bear"}>{label}</em></b><small>{formatNetPosition(net)} · 本周 {format(asset.weeklyDelta, true)}</small></span><strong>›</strong></button>;
      })}</section>
      <p className="premium-disclaimer">数据来自CFTC官方公开报告，仅描述持仓结构事实，不构成投资建议</p>
    </div>
  );
}

function DeepPremiumView({ onAsset }: { onAsset: (asset: CftcAsset) => void }) {
  const choices = ["XAU", "XAG", "DXY", "CL", "NG", "EUR"];
  const [selectedSymbol, setSelectedSymbol] = useState("XAU");
  const selectedAsset = assets.find((asset) => asset.symbol === selectedSymbol) ?? assets[0];
  return (
    <div className="deep-premium-view">
      <p className="premium-selector-label">选择品种查看深度解读</p>
      <div className="premium-selector">{choices.map((symbol) => { const asset = assets.find((item) => item.symbol === symbol); return asset ? <button type="button" key={symbol} className={selectedSymbol === symbol ? "active" : ""} onClick={() => setSelectedSymbol(symbol)}>{screenName(asset)}</button> : null; })}</div>
      <button type="button" className="full-data-link" onClick={() => onAsset(selectedAsset)}><span>查看 {screenName(selectedAsset)} 完整持仓数据</span><b>›</b></button>
      <PremiumAnalysis asset={selectedAsset} />
    </div>
  );
}

function DepthPanel({ asset, premium, onUnlock }: { asset: CftcAsset; premium: boolean; onUnlock: () => void }) {
  return <div className="tab-panel">{premium ? <PremiumAnalysis asset={asset} /> : <PremiumGate preview="detail" onUnlock={onUnlock} />}</div>;
}

function DetailView({ asset, tab, setTab, onBack, premium, onUnlock }: { asset: CftcAsset; tab: DetailTab; setTab: (tab: DetailTab) => void; onBack: () => void; premium: boolean; onUnlock: () => void }) {
  const rows = asset.breakdown ?? [{ name: asset.coreTrader, long: asset.long, short: asset.short, netChange: asset.weeklyDelta }];
  const totalChange = asset.symbol === "XAU" ? 11913 : asset.symbol === "DXY" ? -91 : 0;
  return (
    <div className="cot-scroll detail-scroll">
      <section className="detail-titlebar">
        <button className="back" onClick={onBack} aria-label="返回">‹</button>
        <div><h1>{screenName(asset)} <span>{screenSymbol(asset)}</span></h1><button className="date-button">2026/07/14 <small>最新</small>⌄</button></div>
        <button className="refresh" aria-label="刷新">↻</button>
      </section>

      <section className="detail-card positions-card">
        <h2>各类交易者持仓</h2><p>总持仓 {format(asset.openInterest)}手 · <span className="red">红=多头</span> / <span className="green">绿=空头</span></p>
        {rows.map((row, index) => <TraderPositionRow row={row} index={index} key={row.name} />)}
      </section>

      <section className="detail-card changes-card">
        <h2>本周持仓变化</h2>
        <div className="total-change"><span><i />总持仓变化</span><strong className={totalChange >= 0 ? "red" : "green"}>⌁ {format(totalChange, true)}</strong></div>
        {rows.map((row, index) => <WeeklyChangeRow row={row} asset={asset} index={index} key={row.name} />)}
      </section>

      <div className="analysis-tabs" role="tablist">
        <button role="tab" aria-selected={tab === "history"} className={tab === "history" ? "active" : ""} onClick={() => setTab("history")}>历史趋势</button>
        <button role="tab" aria-selected={tab === "chart"} className={tab === "chart" ? "active" : ""} onClick={() => setTab("chart")}>图表</button>
        <button role="tab" aria-selected={tab === "depth"} className={tab === "depth" ? "active" : ""} onClick={() => setTab("depth")}><span className="lock-icon" aria-hidden="true" /> 深度解读</button>
      </div>

      {tab === "history" && <HistoryPanel asset={asset} />}
      {tab === "chart" && <ChartPanel asset={asset} />}
      {tab === "depth" && <DepthPanel asset={asset} premium={premium} onUnlock={onUnlock} />}

      <section className="detail-card instrument-note"><h3>品种说明</h3><p>{screenName(asset)}期货 CFTC 持仓分类报告，展示主要交易者类别的方向和变化。</p><div><span>合约单位: 手</span><span>{asset.reportType === "TFF" ? "金融期货报告" : "分类报告"}</span></div><a href={sourceFor(asset)} target="_blank" rel="noreferrer">核验官方原表 ↗</a></section>
    </div>
  );
}

function ProView({ premium, onUnlock, onAsset }: { premium: boolean; onUnlock: () => void; onAsset: (asset: CftcAsset) => void }) {
  const [section, setSection] = useState<"weekly" | "analysis">("weekly");
  return (
    <div className="cot-scroll pro-page">
      <section className="pro-title"><div><h1>专业版</h1><span>PRO</span></div><p>基于CFTC官方数据的深度持仓结构分析</p></section>
      <div className="pro-segments" role="tablist">
        <button type="button" role="tab" aria-selected={section === "weekly"} className={section === "weekly" ? "active" : ""} onClick={() => setSection("weekly")}>持仓周报</button>
        <button type="button" role="tab" aria-selected={section === "analysis"} className={section === "analysis" ? "active" : ""} onClick={() => setSection("analysis")}>深度解读</button>
      </div>
      <div className="pro-gate-wrap">{premium ? section === "weekly" ? <WeeklyPremiumReport onAsset={onAsset} /> : <DeepPremiumView onAsset={onAsset} /> : <PremiumGate preview="pro" onUnlock={onUnlock} />}</div>
    </div>
  );
}

export default function Home() {
  const [screen, setScreen] = useState<Screen>("home");
  const [filter, setFilter] = useState<Filter>("全部");
  const [symbol, setSymbol] = useState("XAU");
  const [tab, setTab] = useState<DetailTab>("history");
  const [premium, setPremium] = useState(false);
  const selected = useMemo(() => assets.find((asset) => asset.symbol === symbol) ?? assets[0], [symbol]);

  function unlockPremium() {
    setPremium(true);
  }

  function openAsset(asset: CftcAsset, openTab: DetailTab = "history") {
    setSymbol(asset.symbol); setTab(openTab); setScreen("detail");
    window.scrollTo(0, 0);
  }

  return (
    <main className="cot-app">
      <BrandHeader premium={premium} />
      {screen === "home" && <HomeView filter={filter} setFilter={setFilter} onOpen={openAsset} />}
      {screen === "detail" && <DetailView asset={selected} tab={tab} setTab={setTab} onBack={() => setScreen("home")} premium={premium} onUnlock={unlockPremium} />}
      {screen === "pro" && <ProView premium={premium} onUnlock={unlockPremium} onAsset={(asset) => openAsset(asset, "depth")} />}
      <BottomNav screen={screen} onHome={() => setScreen("home")} onPro={() => setScreen("pro")} />
    </main>
  );
}
