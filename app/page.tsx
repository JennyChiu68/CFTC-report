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

function sourceFor(asset: CftcAsset) { return asset.reportType === "TFF" ? financialSource : physicalSource; }
function traderName(name: string) { return traderLabels[name] ?? name; }
function screenName(asset: CftcAsset) { return displayNames[asset.symbol] ?? asset.name; }
function screenSymbol(asset: CftcAsset) { return displaySymbols[asset.symbol] ?? asset.symbol; }

function BrandHeader() {
  return (
    <header className="cot-header">
      <div className="cot-brand">
        <span className="brand-chart"><i /><i /><i /></span>
        <div><strong>CFTC COT</strong><span>持仓分析</span></div>
      </div>
      <span className="official-status"><i /> 官方数据</span>
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
        <div className={net >= 0 ? "metric-long" : "metric-short"}><span>净持仓</span><strong>{format(net, true)}</strong></div>
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
      <div className="trader-row-heading"><strong><i style={{ background: traderDots[index % traderDots.length] }} />{traderName(row.name)}</strong><span className={net >= 0 ? "red" : "green"}>净 {format(net, true)}</span></div>
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
                <span className={point.net >= 0 ? "red" : "green"}>{format(point.net, true)}</span>
                <span className={point.counterpartNet >= 0 ? "red" : "green"}>{format(point.counterpartNet, true)}</span>
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
      <section className="detail-card chart-card"><h3>交易者净持仓对比</h3><p>当前各类交易者净持仓</p><div className="horizontal-bars">{rows.map((row, index) => { const net = row.long - row.short; const max = Math.max(...rows.map((item) => Math.abs(item.long - item.short))); return <div key={row.name}><span>{traderName(row.name)}</span><i style={{ width: `${Math.max(8, Math.abs(net) / max * 100)}%`, background: traderDots[index] }} /><b className={net >= 0 ? "red" : "green"}>{format(net, true)}</b></div>; })}</div></section>
      <section className="detail-card explainer-card"><h3>图表说明</h3><p>红色代表多头，绿色代表空头；净持仓为多头减去空头。多头 ÷（多头 + 空头）为方向持仓比例，不含 spreading。</p></section>
    </div>
  );
}

function DepthPanel() {
  return (
    <div className="tab-panel">
      <section className="pro-gate-card">
        <div className="pro-gate-head"><span>⌁</span><div><h3>专业版内容 <b>PRO</b></h3><p>以下内容为付费会员专属，提供更深层的持仓结构分析</p></div></div>
        <div className="pro-space" />
        <div className="pro-features">
          <div><i>▥</i><span><strong>持仓结构深度解读</strong><small>投机者与商业用户的持仓逻辑、历史背景分析</small></span></div>
          <div><i>↗</i><span><strong>历史极值对比</strong><small>当前持仓与历史极端点的统计对比，了解历史规律</small></span></div>
          <div><i>◫</i><span><strong>每周持仓周报</strong><small>跨品种持仓变化摘要，快速掌握本周变化</small></span></div>
        </div>
        <button>登录后升级钻石VIP</button>
        <p className="risk-copy">所有分析均基于 CFTC 官方公开数据，仅描述持仓结构事实，不构成投资建议</p>
      </section>
    </div>
  );
}

function DetailView({ asset, tab, setTab, onBack }: { asset: CftcAsset; tab: DetailTab; setTab: (tab: DetailTab) => void; onBack: () => void }) {
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
        <button role="tab" aria-selected={tab === "depth"} className={tab === "depth" ? "active" : ""} onClick={() => setTab("depth")}><span>▱</span> 深度解读</button>
      </div>

      {tab === "history" && <HistoryPanel asset={asset} />}
      {tab === "chart" && <ChartPanel asset={asset} />}
      {tab === "depth" && <DepthPanel />}

      <section className="detail-card instrument-note"><h3>品种说明</h3><p>{screenName(asset)}期货 CFTC 持仓分类报告，展示主要交易者类别的方向和变化。</p><div><span>合约单位: 手</span><span>{asset.reportType === "TFF" ? "金融期货报告" : "分类报告"}</span></div><a href={sourceFor(asset)} target="_blank" rel="noreferrer">核验官方原表 ↗</a></section>
    </div>
  );
}

function ProView({ onAsset }: { onAsset: (asset: CftcAsset) => void }) {
  return (
    <div className="cot-scroll pro-page">
      <div className="pro-hero"><span>✧</span><h1>钻石VIP专业版</h1><p>不锁公开数据，只提供更深的持仓结构判断。</p></div>
      <section className="pro-overview-card"><small>本周跨品种摘要</small><h2>三个值得关注的持仓变化</h2><button onClick={() => onAsset(assets.find((asset) => asset.symbol === "XAU") ?? assets[0])}><span>01</span><div><strong>黄金净多处于高位</strong><small>管理基金近 26 周第 96 百分位</small></div><b>›</b></button><button onClick={() => onAsset(assets.find((asset) => asset.symbol === "NG") ?? assets[0])}><span>02</span><div><strong>天然气净仓快速降温</strong><small>本周变化 -45.4K</small></div><b>›</b></button><button onClick={() => onAsset(assets.find((asset) => asset.symbol === "DXY") ?? assets[0])}><span>03</span><div><strong>美元机构持仓分歧</strong><small>资管净多、杠杆基金净空</small></div><b>›</b></button></section>
      <DepthPanel />
    </div>
  );
}

export default function Home() {
  const [screen, setScreen] = useState<Screen>("home");
  const [filter, setFilter] = useState<Filter>("全部");
  const [symbol, setSymbol] = useState("XAU");
  const [tab, setTab] = useState<DetailTab>("history");
  const selected = useMemo(() => assets.find((asset) => asset.symbol === symbol) ?? assets[0], [symbol]);

  function openAsset(asset: CftcAsset, openTab: DetailTab = "history") {
    setSymbol(asset.symbol); setTab(openTab); setScreen("detail");
    window.scrollTo(0, 0);
  }

  return (
    <main className="cot-app">
      <BrandHeader />
      {screen === "home" && <HomeView filter={filter} setFilter={setFilter} onOpen={openAsset} />}
      {screen === "detail" && <DetailView asset={selected} tab={tab} setTab={setTab} onBack={() => setScreen("home")} />}
      {screen === "pro" && <ProView onAsset={(asset) => openAsset(asset, "depth")} />}
      <BottomNav screen={screen} onHome={() => setScreen("home")} onPro={() => setScreen("pro")} />
    </main>
  );
}
