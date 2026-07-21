"use client";

import { useMemo, useState } from "react";
import {
  assets,
  groupOptions,
  reportMeta,
  type CftcAsset,
  type MarketGroup,
} from "./cftc-data";

type Tier = "free" | "diamond";

const physicalSource = "https://www.cftc.gov/dea/futures/other_lf.htm";
const financialSource = "https://www.cftc.gov/dea/futures/financial_lf.htm";
const methodologySource =
  "https://www.cftc.gov/MarketReports/CommitmentsofTraders/AbouttheCOTReports/index.htm";

function netOf(asset: CftcAsset) {
  return asset.long - asset.short;
}

function longShare(asset: CftcAsset) {
  return Math.round((asset.long / (asset.long + asset.short)) * 100);
}

function formatContracts(value: number, signed = false) {
  const absolute = Math.abs(value);
  const prefix = value < 0 ? "−" : signed && value > 0 ? "+" : "";
  if (absolute >= 1_000_000) return `${prefix}${(absolute / 1_000_000).toFixed(1)}M`;
  if (absolute >= 1_000) return `${prefix}${(absolute / 1_000).toFixed(1)}K`;
  return `${prefix}${absolute.toLocaleString("zh-CN")}`;
}

function sourceFor(asset: CftcAsset) {
  return asset.reportType === "TFF" ? financialSource : physicalSource;
}

function DirectionBar({ asset }: { asset: CftcAsset }) {
  const share = longShare(asset);
  return (
    <div className="position-direction">
      <div className="direction-copy">
        <span>多头 {share}%</span>
        <span>空头 {100 - share}%</span>
      </div>
      <div className="direction-rail" role="img" aria-label={`多头 ${share}%，空头 ${100 - share}%`}>
        <i className="long-segment" style={{ width: `${share}%` }} />
        <i className="short-segment" style={{ width: `${100 - share}%` }} />
      </div>
    </div>
  );
}

function TierSwitch({ tier, onChange }: { tier: Tier; onChange: (tier: Tier) => void }) {
  return (
    <div className="tier-switch" aria-label="会员视图切换">
      <button className={tier === "free" ? "active" : ""} onClick={() => onChange("free")}>免费</button>
      <button className={tier === "diamond" ? "active diamond" : ""} onClick={() => onChange("diamond")}>
        <span>◆</span> 钻石
      </button>
    </div>
  );
}

function MarketRow({ asset, onOpen }: { asset: CftcAsset; onOpen: () => void }) {
  const net = netOf(asset);
  return (
    <button className="market-row" onClick={onOpen} aria-label={`查看${asset.name}持仓详情`}>
      <span className={`asset-token token-${asset.group}`}>{asset.symbol}</span>
      <span className="market-identity">
        <strong>{asset.name}</strong>
        <small>{asset.coreTrader} · {asset.reportType}</small>
      </span>
      <span className="market-position">
        <strong className={net >= 0 ? "positive" : "negative"}>{formatContracts(net, true)}</strong>
        <small className={asset.weeklyDelta >= 0 ? "positive" : "negative"}>周变 {formatContracts(asset.weeklyDelta, true)}</small>
      </span>
      <span className="row-arrow">›</span>
      <span className="mini-rail" aria-hidden="true">
        <i className="long-segment" style={{ width: `${longShare(asset)}%` }} />
        <i className="short-segment" style={{ width: `${100 - longShare(asset)}%` }} />
      </span>
    </button>
  );
}

function HistoryCard({ asset }: { asset: CftcAsset }) {
  const [period, setPeriod] = useState<13 | 26>(13);
  if (!asset.history) {
    return (
      <section className="content-card unavailable-card">
        <div className="section-title compact">
          <div><small>HISTORY</small><h2>历史净仓</h2></div>
          <span className="free-tag">FREE</span>
        </div>
        <div className="empty-chart">
          <i>i</i>
          <p>正式版将接入该品种完整历史序列。Demo 不用模拟数据补齐曲线。</p>
        </div>
      </section>
    );
  }

  const points = asset.history.slice(0, period).reverse();
  const max = Math.max(...points.map((point) => Math.abs(point.net)));
  return (
    <section className="content-card history-card">
      <div className="section-title compact">
        <div><small>HISTORY</small><h2>{asset.coreTrader}净仓</h2></div>
        <div className="period-toggle">
          {([13, 26] as const).map((item) => (
            <button key={item} className={period === item ? "active" : ""} onClick={() => setPeriod(item)}>{item}周</button>
          ))}
        </div>
      </div>
      <div className="mobile-chart" role="img" aria-label={`${asset.name}${period}周净仓变化`}>
        <div className="chart-zero" />
        {points.map((point) => {
          const height = Math.max(4, (Math.abs(point.net) / max) * 43);
          return (
            <span className="chart-column" key={point.date} title={`${point.date} ${formatContracts(point.net, true)}`}>
              <i className={point.net >= 0 ? "up" : "down"} style={{ height: `${height}%` }} />
            </span>
          );
        })}
      </div>
      <div className="chart-foot">
        <span>{points[0].date}</span>
        <span><i className="legend-dot" /> 净仓 · 合约</span>
        <span>{points[points.length - 1].date}</span>
      </div>
    </section>
  );
}

function TraderTable({ asset }: { asset: CftcAsset }) {
  const rows = asset.breakdown ?? [{ name: asset.coreTrader, long: asset.long, short: asset.short, netChange: asset.weeklyDelta }];
  return (
    <section className="content-card trader-card">
      <div className="section-title compact">
        <div><small>TRADERS</small><h2>交易者分类</h2></div>
        <span className="free-tag">FREE</span>
      </div>
      <div className="trader-table">
        <div className="trader-row table-head"><span>类别</span><span>净仓</span><span>周变</span></div>
        {rows.map((row) => {
          const net = row.long - row.short;
          return (
            <div className="trader-row" key={row.name}>
              <span><strong>{row.name}</strong><small>多 {formatContracts(row.long)} · 空 {formatContracts(row.short)}</small></span>
              <span className={net >= 0 ? "positive" : "negative"}>{formatContracts(net, true)}</span>
              <span className={row.netChange >= 0 ? "positive" : "negative"}>{formatContracts(row.netChange, true)}</span>
            </div>
          );
        })}
      </div>
      {!asset.breakdown && <p className="coverage-copy">当前 Demo 展示已核验的核心交易者数据，完整分类明细将在正式数据链路展开。</p>}
    </section>
  );
}

function DiamondBlock({ asset, tier, onUnlock }: { asset: CftcAsset; tier: Tier; onUnlock: () => void }) {
  const net = netOf(asset);
  const weeklyRank = [...assets].sort((a, b) => b.weeklyDelta - a.weeklyDelta).findIndex((item) => item.symbol === asset.symbol) + 1;
  const strengthRank = [...assets]
    .sort((a, b) => Math.abs(netOf(b)) / b.openInterest - Math.abs(netOf(a)) / a.openInterest)
    .findIndex((item) => item.symbol === asset.symbol) + 1;
  const percentile = asset.history
    ? Math.round((asset.history.filter((point) => point.net <= net).length / asset.history.length) * 100)
    : null;
  const positionLabel = percentile !== null ? `${percentile}%` : `#${strengthRank}`;

  return (
    <section className={`diamond-card ${tier === "diamond" ? "unlocked" : "locked"}`}>
      <div className="diamond-title">
        <span className="diamond-gem">◆</span>
        <div><small>DIAMOND VIEW</small><h2>这组持仓意味着什么？</h2></div>
        {tier === "free" && <span className="lock-chip">已锁定</span>}
      </div>
      <div className="evidence-list">
        <article>
          <span>位置</span>
          <strong>{positionLabel}</strong>
          <p>{percentile !== null ? `${asset.coreTrader}净仓位于近 26 周第 ${percentile} 百分位。` : `净仓强度在 15 个跟踪品种中排第 ${strengthRank}。`}</p>
        </article>
        <article>
          <span>动量</span>
          <strong className={asset.weeklyDelta >= 0 ? "positive" : "negative"}>{formatContracts(asset.weeklyDelta, true)}</strong>
          <p>本周净仓变化由强到弱排名 {weeklyRank}/15。</p>
        </article>
      </div>
      <div className="watch-note">
        <span>下周观察</span>
        <strong>{asset.name}的{net >= 0 ? "净多" : "净空"}结构{asset.weeklyDelta >= 0 ? "继续增强" : "正在降温"}</strong>
        <p>继续观察净仓方向是否延续，以及总持仓能否提供确认。仓位不是价格，也不是交易指令。</p>
      </div>
      {tier === "free" && (
        <div className="diamond-cover">
          <span>◆</span>
          <strong>解锁完整证据链</strong>
          <p>历史分位 · 跨品种排名 · 分歧 · 观察清单</p>
          <button onClick={onUnlock}>体验钻石视图</button>
        </div>
      )}
    </section>
  );
}

function BottomNav({ active, onHome, onDiamond }: { active: "home" | "detail" | "diamond"; onHome: () => void; onDiamond: () => void }) {
  return (
    <nav className="bottom-nav" aria-label="底部导航">
      <button className={active === "home" ? "active" : ""} onClick={onHome}><i className="nav-dot">⌂</i><span>持仓</span></button>
      <button className={active === "detail" ? "active" : ""}><i>⌁</i><span>趋势</span></button>
      <button className={active === "diamond" ? "active diamond" : ""} onClick={onDiamond}><i>◆</i><span>钻石</span></button>
      <button onClick={() => document.getElementById("method-sheet")?.scrollIntoView({ behavior: "smooth" })}><i>···</i><span>更多</span></button>
    </nav>
  );
}

function DetailView({ asset, tier, onTier, onBack }: { asset: CftcAsset; tier: Tier; onTier: (tier: Tier) => void; onBack: () => void }) {
  const net = netOf(asset);
  return (
    <div className="detail-view">
      <header className="mobile-header detail-header">
        <button className="back-button" onClick={onBack} aria-label="返回品种列表">‹</button>
        <div className="detail-header-title"><strong>{asset.name}</strong><small>{asset.symbol} · {asset.reportType}</small></div>
        <a className="source-button" href={sourceFor(asset)} target="_blank" rel="noreferrer">原表 ↗</a>
      </header>

      <div className="detail-content">
        <section className="position-hero">
          <div className="position-hero-top">
            <span className="large-token">{asset.symbol}</span>
            <div><small>{asset.coreTrader}净仓</small><strong className={net >= 0 ? "positive" : "negative"}>{formatContracts(net, true)}</strong></div>
            <span className={`week-chip ${asset.weeklyDelta >= 0 ? "up" : "down"}`}>本周 {formatContracts(asset.weeklyDelta, true)}</span>
          </div>
          <DirectionBar asset={asset} />
          <div className="position-stats">
            <span><small>多头</small><strong>{formatContracts(asset.long)}</strong></span>
            <span><small>空头</small><strong>{formatContracts(asset.short)}</strong></span>
            <span><small>总持仓</small><strong>{formatContracts(asset.openInterest)}</strong></span>
          </div>
        </section>

        <div className="free-banner"><span>FREE</span><p>公开数据完整开放，不需要会员</p></div>
        <HistoryCard asset={asset} />
        <TraderTable asset={asset} />
        <DiamondBlock asset={asset} tier={tier} onUnlock={() => onTier("diamond")} />

        <section className="method-sheet" id="method-sheet">
          <h2>数据口径</h2>
          <p>每周二持仓，通常周五发布；页面多空占比 = 多头 ÷（多头 + 空头），不含 spreading。</p>
          <div>
            <a href={physicalSource} target="_blank" rel="noreferrer">Disaggregated 原表 ↗</a>
            <a href={financialSource} target="_blank" rel="noreferrer">TFF 原表 ↗</a>
            <a href={methodologySource} target="_blank" rel="noreferrer">CFTC 原始说明 ↗</a>
          </div>
          <small>持仓截至 {reportMeta.asOf} · 发布于 {reportMeta.published} · {reportMeta.scope}</small>
        </section>
      </div>

      <BottomNav active="detail" onHome={onBack} onDiamond={() => onTier("diamond")} />
    </div>
  );
}

export default function Home() {
  const [tier, setTier] = useState<Tier>("free");
  const [group, setGroup] = useState<"全部" | MarketGroup>("全部");
  const [query, setQuery] = useState("");
  const [selectedSymbol, setSelectedSymbol] = useState("XAU");
  const [detailOpen, setDetailOpen] = useState(false);

  const filteredAssets = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return assets.filter((asset) => {
      const matchesGroup = group === "全部" || asset.group === group;
      const matchesQuery = !normalized || `${asset.name} ${asset.symbol}`.toLowerCase().includes(normalized);
      return matchesGroup && matchesQuery;
    });
  }, [group, query]);

  const selectedAsset = assets.find((asset) => asset.symbol === selectedSymbol) ?? assets[0];

  function openAsset(asset: CftcAsset) {
    setSelectedSymbol(asset.symbol);
    setDetailOpen(true);
    window.scrollTo({ top: 0, behavior: "instant" });
  }

  if (detailOpen) {
    return (
      <main className="app-shell">
        <DetailView asset={selectedAsset} tier={tier} onTier={setTier} onBack={() => { setDetailOpen(false); window.scrollTo({ top: 0 }); }} />
      </main>
    );
  }

  return (
    <main className="app-shell">
      <header className="mobile-header">
        <a className="mobile-brand" href="#top" aria-label="金十 CFTC 首页"><span>10</span><strong>金十 CFTC</strong></a>
        <TierSwitch tier={tier} onChange={setTier} />
      </header>

      <div className="home-content" id="top">
        <section className="report-hero">
          <div className="report-meta"><span><i /> 官方周报已更新</span><small>{reportMeta.published}</small></div>
          <h1>本周持仓<br /><em>风向仪</em></h1>
          <p>公开数据免费。钻石会员看分位、异动与资金分歧。</p>
          <div className="hero-facts">
            <span><small>持仓日期</small><strong>07/14</strong></span>
            <span><small>跟踪品种</small><strong>15</strong></span>
            <span><small>报告口径</small><strong>期货</strong></span>
          </div>
        </section>

        <section className="pulse-mobile">
          <div className="section-title">
            <div><small>WEEKLY PULSE</small><h2>本周资金脉冲</h2></div>
            <span>净仓周变</span>
          </div>
          <div className="pulse-scroll">
            <article className="pulse-tile strongest"><span>增强最快</span><strong>英镑</strong><b>+10.6K</b><small>杠杆基金</small></article>
            <article className="pulse-tile"><span>净多高位</span><strong>黄金</strong><b>+120.8K</b><small>管理基金</small></article>
            <article className="pulse-tile weakest"><span>降温最快</span><strong>天然气</strong><b>−45.4K</b><small>管理基金</small></article>
          </div>
        </section>

        <section className={`diamond-preview ${tier === "diamond" ? "active" : ""}`}>
          <div className="preview-heading"><span>◆</span><div><small>DIAMOND WEEKLY</small><strong>{tier === "diamond" ? "跨市场资金简报" : "免费数据之上的判断层"}</strong></div></div>
          {tier === "diamond" ? (
            <div className="preview-insights">
              <p><span>01</span> 英镑净仓增幅居首，黄金与铜随后。</p>
              <p><span>02</span> 天然气净仓大幅转弱，纳指、欧元同步降温。</p>
              <p><span>03</span> 美元资管净多处于 26 周高位，杠杆基金仍净空。</p>
            </div>
          ) : (
            <div className="preview-locked"><p>历史分位 · 异动排名 · 资金分歧</p><button onClick={() => setTier("diamond")}>体验钻石视图</button></div>
          )}
        </section>

        <section className="market-list-section">
          <div className="section-title market-title">
            <div><small>MARKETS</small><h2>全部品种</h2></div>
            <span>{filteredAssets.length} 个结果</span>
          </div>
          <label className="mobile-search">
            <span>⌕</span>
            <input aria-label="搜索品种" placeholder="搜索品种或代码" value={query} onChange={(event) => setQuery(event.target.value)} />
          </label>
          <div className="mobile-filters" aria-label="品种分类">
            {groupOptions.map((item) => (
              <button key={item} className={group === item ? "active" : ""} onClick={() => setGroup(item)}>{item}</button>
            ))}
          </div>
          <div className="market-list">
            {filteredAssets.map((asset) => <MarketRow key={asset.symbol} asset={asset} onOpen={() => openAsset(asset)} />)}
          </div>
          {filteredAssets.length === 0 && <div className="empty-results"><strong>没有匹配结果</strong><button onClick={() => { setQuery(""); setGroup("全部"); }}>清除筛选</button></div>}
        </section>

        <section className="method-sheet home-method" id="method-sheet">
          <h2>公开、透明、可核验</h2>
          <p>COT 是每周仓位快照，不是实时成交，也不是买卖建议。</p>
          <a href={methodologySource} target="_blank" rel="noreferrer">查看 CFTC 原始说明 ↗</a>
        </section>
      </div>

      <BottomNav active={tier === "diamond" ? "diamond" : "home"} onHome={() => window.scrollTo({ top: 0, behavior: "smooth" })} onDiamond={() => setTier("diamond")} />
    </main>
  );
}

