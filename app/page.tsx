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

function formatContracts(value: number, signed = false) {
  const sign = signed && value > 0 ? "+" : "";
  const absolute = Math.abs(value);
  const prefix = value < 0 ? "−" : sign;
  if (absolute >= 1_000_000) return `${prefix}${(absolute / 1_000_000).toFixed(1)}M`;
  if (absolute >= 1_000) return `${prefix}${(absolute / 1_000).toFixed(1)}K`;
  return `${prefix}${absolute.toLocaleString("zh-CN")}`;
}

function longShare(asset: CftcAsset) {
  return Math.round((asset.long / (asset.long + asset.short)) * 100);
}

function netPosition(asset: CftcAsset) {
  return asset.long - asset.short;
}

function sourceFor(asset: CftcAsset) {
  return asset.reportType === "TFF" ? financialSource : physicalSource;
}

function DirectionBar({ asset, compact = false }: { asset: CftcAsset; compact?: boolean }) {
  const share = longShare(asset);
  return (
    <div className={`direction-wrap ${compact ? "compact" : ""}`}>
      <div className="direction-labels">
        <span>多 {share}%</span>
        <span>空 {100 - share}%</span>
      </div>
      <div
        className="direction-track"
        role="img"
        aria-label={`${asset.coreTrader}方向持仓，多头 ${share}%，空头 ${100 - share}%`}
      >
        <span className="direction-long" style={{ width: `${share}%` }} />
        <span className="direction-short" style={{ width: `${100 - share}%` }} />
      </div>
    </div>
  );
}

function AssetCard({
  asset,
  selected,
  onSelect,
}: {
  asset: CftcAsset;
  selected: boolean;
  onSelect: () => void;
}) {
  const net = netPosition(asset);
  return (
    <button
      className={`asset-card ${selected ? "selected" : ""}`}
      onClick={onSelect}
      aria-pressed={selected}
    >
      <div className="asset-card-top">
        <div className="asset-symbol">{asset.symbol}</div>
        <span className="report-pill">{asset.reportType}</span>
      </div>
      <div className="asset-name-row">
        <div>
          <strong>{asset.name}</strong>
          <small>{asset.coreTrader}</small>
        </div>
        <span className={`net-value ${net >= 0 ? "positive" : "negative"}`}>
          {formatContracts(net, true)}
        </span>
      </div>
      <DirectionBar asset={asset} compact />
      <div className="asset-card-foot">
        <span>总持仓 {formatContracts(asset.openInterest)}</span>
        <span className={asset.weeklyDelta >= 0 ? "positive" : "negative"}>
          周变 {formatContracts(asset.weeklyDelta, true)}
        </span>
      </div>
    </button>
  );
}

function HistoryChart({ asset }: { asset: CftcAsset }) {
  const [period, setPeriod] = useState<13 | 26>(26);
  if (!asset.history) {
    return (
      <div className="data-availability">
        <span className="availability-mark">i</span>
        <div>
          <strong>历史序列将在正式版接入</strong>
          <p>当前 Demo 对该品种仅展示最新官方周报，不使用插值或模拟数据补齐曲线。</p>
        </div>
      </div>
    );
  }

  const points = asset.history.slice(0, period).reverse();
  const maxAbsolute = Math.max(...points.map((point) => Math.abs(point.net)));
  return (
    <div className="history-block">
      <div className="chart-toolbar">
        <div>
          <span className="eyebrow muted">真实历史</span>
          <h3>{asset.coreTrader}净仓趋势</h3>
        </div>
        <div className="period-tabs" aria-label="历史周期">
          {([13, 26] as const).map((item) => (
            <button
              key={item}
              className={period === item ? "active" : ""}
              onClick={() => setPeriod(item)}
            >
              {item}周
            </button>
          ))}
        </div>
      </div>
      <div className="trend-chart" role="img" aria-label={`${asset.name}${period}周净仓柱状图`}>
        <div className="zero-line" />
        {points.map((point, index) => {
          const height = Math.max(4, (Math.abs(point.net) / maxAbsolute) * 44);
          return (
            <div className="trend-column" key={`${point.date}-${index}`} title={`${point.date} ${formatContracts(point.net, true)}`}>
              <span
                className={`trend-bar ${point.net >= 0 ? "up" : "down"}`}
                style={{ height: `${height}%` }}
              />
              {(index === 0 || index === points.length - 1 || index % 4 === 0) && (
                <small>{point.date}</small>
              )}
            </div>
          );
        })}
      </div>
      <div className="chart-legend">
        <span><i className="legend-long" /> 净多</span>
        <span><i className="legend-short" /> 净空</span>
        <span>单位：合约</span>
      </div>
    </div>
  );
}

function PositionTable({ asset }: { asset: CftcAsset }) {
  const rows = asset.breakdown ?? [
    {
      name: asset.coreTrader,
      long: asset.long,
      short: asset.short,
      netChange: asset.weeklyDelta,
    },
  ];

  return (
    <div className="table-shell">
      <div className="table-headline">
        <div>
          <span className="eyebrow muted">持仓拆解</span>
          <h3>交易者分类</h3>
        </div>
        <span className="table-note">净仓 = 多头 − 空头</span>
      </div>
      <div className="position-table" role="table" aria-label={`${asset.name}交易者分类持仓`}>
        <div className="position-row position-header" role="row">
          <span>交易者</span><span>多头</span><span>空头</span><span>净仓</span><span>周变</span>
        </div>
        {rows.map((row) => {
          const net = row.long - row.short;
          return (
            <div className="position-row" role="row" key={row.name}>
              <span data-label="交易者">{row.name}</span>
              <span data-label="多头">{formatContracts(row.long)}</span>
              <span data-label="空头">{formatContracts(row.short)}</span>
              <span data-label="净仓" className={net >= 0 ? "positive" : "negative"}>{formatContracts(net, true)}</span>
              <span data-label="周变" className={row.netChange >= 0 ? "positive" : "negative"}>{formatContracts(row.netChange, true)}</span>
            </div>
          );
        })}
      </div>
      {!asset.breakdown && (
        <p className="coverage-note">Demo 已核验核心交易者数据；完整分类明细将在正式数据链路中展开。</p>
      )}
    </div>
  );
}

function DiamondAnalysis({ asset, tier, onUnlock }: { asset: CftcAsset; tier: Tier; onUnlock: () => void }) {
  const net = netPosition(asset);
  const weeklyRank = [...assets]
    .sort((a, b) => b.weeklyDelta - a.weeklyDelta)
    .findIndex((item) => item.symbol === asset.symbol) + 1;
  const crowding = Math.abs(net) / asset.openInterest;
  const crowdingRank = [...assets]
    .sort((a, b) => Math.abs(netPosition(b)) / b.openInterest - Math.abs(netPosition(a)) / a.openInterest)
    .findIndex((item) => item.symbol === asset.symbol) + 1;

  const historicalPercentile = asset.history
    ? Math.round((asset.history.filter((point) => point.net <= net).length / asset.history.length) * 100)
    : null;
  const counterpart = asset.history?.[0]?.counterpartNet;
  const counterpartHigh = asset.history
    ? Math.max(...asset.history.map((point) => point.counterpartNet))
    : null;

  const evidenceLine = historicalPercentile !== null
    ? `${asset.coreTrader}净仓位于近 26 周第 ${historicalPercentile} 百分位。`
    : `净仓占总持仓 ${Math.round(crowding * 100)}%，横截面强度排第 ${crowdingRank}/15。`;

  return (
    <section className={`diamond-panel ${tier === "diamond" ? "unlocked" : "locked"}`} aria-labelledby="diamond-title">
      <div className="diamond-heading">
        <div>
          <span className="diamond-kicker"><i>◆</i> 钻石 VIP · 证据型解读</span>
          <h2 id="diamond-title">数据不设墙，判断力才是会员价值</h2>
          <p>把公开持仓转成可复核的分位、异动、分歧与观察情境。</p>
        </div>
        {tier === "free" && <span className="lock-badge">锁定</span>}
      </div>

      <div className="diamond-insight-grid">
        <article>
          <span>位置</span>
          <strong>{historicalPercentile !== null ? `${historicalPercentile}%` : `#${crowdingRank}/15`}</strong>
          <p>{evidenceLine}</p>
        </article>
        <article>
          <span>动量</span>
          <strong className={asset.weeklyDelta >= 0 ? "positive" : "negative"}>{formatContracts(asset.weeklyDelta, true)}</strong>
          <p>本周净仓变化，15 个跟踪品种中由强到弱排第 {weeklyRank}。</p>
        </article>
        <article>
          <span>分歧</span>
          <strong>{counterpart !== undefined ? formatContracts(counterpart, true) : asset.reportType}</strong>
          <p>
            {counterpart !== undefined && counterpartHigh !== null
              ? `${asset.counterpartLabel}；近 26 周高位为 ${formatContracts(counterpartHigh, true)}。`
              : `需结合 ${asset.reportType} 其他交易者类别，避免只读单一净仓。`}
          </p>
        </article>
      </div>

      <div className="scenario-grid">
        <div className="scenario-card">
          <span className="scenario-label">本周观察</span>
          <h3>{asset.name}：{net >= 0 ? "净多结构" : "净空结构"}{asset.weeklyDelta >= 0 ? "增强" : "降温"}</h3>
          <p>
            当前{asset.coreTrader}净仓为 {formatContracts(net, true)}，周变 {formatContracts(asset.weeklyDelta, true)}。
            下周重点观察净仓方向是否延续，以及总持仓变化是否提供确认。
          </p>
        </div>
        <div className="scenario-card risk">
          <span className="scenario-label">反向风险</span>
          <h3>仓位不是价格，也不是交易指令</h3>
          <p>报告存在发布时间差；极端仓位既可能代表趋势共识，也可能增加反向挤压风险。</p>
        </div>
      </div>

      {tier === "free" && (
        <div className="diamond-gate">
          <div className="gate-glow" />
          <span className="gate-icon">◆</span>
          <div>
            <strong>升级钻石 VIP，查看完整证据链</strong>
            <p>历史分位 · 跨品种排名 · 交易者分歧 · 下周观察清单</p>
          </div>
          <button onClick={onUnlock}>体验钻石视图</button>
        </div>
      )}
    </section>
  );
}

export default function Home() {
  const [tier, setTier] = useState<Tier>("free");
  const [group, setGroup] = useState<"全部" | MarketGroup>("全部");
  const [query, setQuery] = useState("");
  const [selectedSymbol, setSelectedSymbol] = useState("XAU");

  const filteredAssets = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return assets.filter((asset) => {
      const inGroup = group === "全部" || asset.group === group;
      const matches = !normalized || `${asset.name} ${asset.symbol}`.toLowerCase().includes(normalized);
      return inGroup && matches;
    });
  }, [group, query]);

  const selectedAsset = assets.find((asset) => asset.symbol === selectedSymbol) ?? assets[0];
  const weeklyLeaders = [...assets].sort((a, b) => b.weeklyDelta - a.weeklyDelta).slice(0, 2);
  const weeklyLaggard = [...assets].sort((a, b) => a.weeklyDelta - b.weeklyDelta)[0];

  function selectAsset(asset: CftcAsset) {
    setSelectedSymbol(asset.symbol);
    window.setTimeout(() => document.getElementById("detail")?.scrollIntoView({ behavior: "smooth", block: "start" }), 0);
  }

  return (
    <main>
      <header className="site-header">
        <a className="brand" href="#top" aria-label="金十 CFTC 智能报告首页">
          <span className="brand-mark">10</span>
          <span><strong>金十 CFTC</strong><small>持仓情报站</small></span>
        </a>
        <nav aria-label="主导航">
          <a href="#radar">持仓雷达</a>
          <a href="#detail">品种详情</a>
          <a href="#method">数据口径</a>
        </nav>
        <div className="tier-toggle" aria-label="会员视图切换">
          <button className={tier === "free" ? "active" : ""} onClick={() => setTier("free")}>免费版</button>
          <button className={tier === "diamond" ? "active diamond" : ""} onClick={() => setTier("diamond")}><span>◆</span> 钻石 VIP</button>
        </div>
      </header>

      <section className="hero" id="top">
        <div className="hero-noise" />
        <div className="hero-copy">
          <span className="eyebrow"><i /> CFTC 官方数据 · 金十产品概念 Demo</span>
          <h1>公开持仓，<br /><em>免费读懂。</em></h1>
          <p>原始数据不该被锁住。每周多空、净仓与历史趋势全部开放；真正值得付费的，是把数字变成判断框架。</p>
          <div className="hero-actions">
            <a className="primary-action" href="#radar">查看本周持仓 <span>↓</span></a>
            <button className="text-action" onClick={() => setTier("diamond")}>切换钻石体验 <span>→</span></button>
          </div>
        </div>
        <div className="hero-signal" aria-label="本周市场仓位概览">
          <div className="signal-orbit orbit-one" />
          <div className="signal-orbit orbit-two" />
          <div className="signal-core">
            <small>管理基金 · 黄金净仓</small>
            <strong>+120.8K</strong>
            <span>周增 +4.6K</span>
          </div>
          <span className="float-chip chip-one">GBP <b>+10.6K</b></span>
          <span className="float-chip chip-two">NG <b>−45.4K</b></span>
          <span className="float-chip chip-three">15 个品种</span>
        </div>
      </section>

      <section className="report-status" aria-label="报告日期和口径">
        <div><span className="live-dot" /> <strong>最新官方周报</strong></div>
        <div><small>持仓日期</small><strong>{reportMeta.asOf}</strong><span>周二</span></div>
        <div><small>发布日期</small><strong>{reportMeta.published}</strong><span>周五</span></div>
        <div><small>覆盖口径</small><strong>{reportMeta.scope}</strong><span>15 个品种</span></div>
        <a href={methodologySource} target="_blank" rel="noreferrer">CFTC 原始说明 ↗</a>
      </section>

      <section className="pulse-section page-section" aria-labelledby="pulse-title">
        <div className="section-heading split">
          <div><span className="eyebrow muted">WEEKLY PULSE</span><h2 id="pulse-title">一眼看见资金在往哪里走</h2></div>
          <p>统一比较核心投机类别的净仓周变。<br />商品看管理基金，金融品种看杠杆基金。</p>
        </div>
        <div className="pulse-grid">
          {weeklyLeaders.map((asset, index) => (
            <article className="pulse-card" key={asset.symbol}>
              <span className="pulse-index">0{index + 1}</span>
              <div><small>本周净仓增强</small><h3>{asset.name}</h3><p>{asset.coreTrader} · {asset.symbol}</p></div>
              <strong className="positive">{formatContracts(asset.weeklyDelta, true)}</strong>
            </article>
          ))}
          <article className="pulse-card risk-card">
            <span className="pulse-index">!</span>
            <div><small>本周变化最大</small><h3>{weeklyLaggard.name}</h3><p>{weeklyLaggard.coreTrader} · {weeklyLaggard.symbol}</p></div>
            <strong className="negative">{formatContracts(weeklyLaggard.weeklyDelta, true)}</strong>
          </article>
        </div>
      </section>

      <section className="radar-section page-section" id="radar" aria-labelledby="radar-title">
        <div className="section-heading">
          <span className="eyebrow muted">FREE · 官方持仓雷达</span>
          <h2 id="radar-title">所有公开数据，完整开放</h2>
          <p>点击任一品种，查看方向持仓、净仓变化和交易者分类。</p>
        </div>
        <div className="radar-controls">
          <div className="group-tabs" aria-label="品种分类">
            {groupOptions.map((item) => (
              <button key={item} className={group === item ? "active" : ""} onClick={() => setGroup(item)}>{item}</button>
            ))}
          </div>
          <label className="search-box">
            <span>⌕</span>
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索品种 / 代码" aria-label="搜索品种" />
          </label>
        </div>
        {filteredAssets.length > 0 ? (
          <div className="asset-grid">
            {filteredAssets.map((asset) => (
              <AssetCard key={asset.symbol} asset={asset} selected={asset.symbol === selectedSymbol} onSelect={() => selectAsset(asset)} />
            ))}
          </div>
        ) : (
          <div className="empty-state"><strong>没有匹配的品种</strong><button onClick={() => { setQuery(""); setGroup("全部"); }}>清除筛选</button></div>
        )}
      </section>

      <section className="detail-section page-section" id="detail" aria-labelledby="detail-title">
        <div className="detail-title-row">
          <div className="detail-identity">
            <span className="detail-symbol">{selectedAsset.symbol}</span>
            <div>
              <span className="eyebrow muted">{selectedAsset.group} · {selectedAsset.reportType}</span>
              <h2 id="detail-title">{selectedAsset.name}持仓详情</h2>
            </div>
          </div>
          <a className="official-link" href={sourceFor(selectedAsset)} target="_blank" rel="noreferrer">核验 CFTC 原表 ↗</a>
        </div>

        <div className="detail-summary">
          <article className="hero-metric">
            <small>{selectedAsset.coreTrader}净仓</small>
            <strong className={netPosition(selectedAsset) >= 0 ? "positive" : "negative"}>{formatContracts(netPosition(selectedAsset), true)}</strong>
            <span className={selectedAsset.weeklyDelta >= 0 ? "positive" : "negative"}>本周 {formatContracts(selectedAsset.weeklyDelta, true)}</span>
          </article>
          <article><small>多头持仓</small><strong>{formatContracts(selectedAsset.long)}</strong><span>合约</span></article>
          <article><small>空头持仓</small><strong>{formatContracts(selectedAsset.short)}</strong><span>合约</span></article>
          <article><small>总持仓</small><strong>{formatContracts(selectedAsset.openInterest)}</strong><span>全市场</span></article>
          <div className="detail-direction"><DirectionBar asset={selectedAsset} /></div>
        </div>

        <div className="free-data-grid">
          <HistoryChart asset={selectedAsset} />
          <PositionTable asset={selectedAsset} />
        </div>

        <DiamondAnalysis asset={selectedAsset} tier={tier} onUnlock={() => setTier("diamond")} />
      </section>

      <section className="weekly-brief page-section" aria-labelledby="brief-title">
        <div className="brief-heading">
          <span className="diamond-kicker"><i>◆</i> DIAMOND WEEKLY</span>
          <h2 id="brief-title">跨市场资金简报</h2>
          <p>同一套数据，钻石会员得到的是更快的比较与更清晰的观察顺序。</p>
        </div>
        <div className={`brief-board ${tier === "free" ? "brief-locked" : ""}`}>
          <div className="brief-column">
            <span>增强榜</span>
            <strong>英镑 <b className="positive">+10.6K</b></strong>
            <p>杠杆基金净多本周增幅居首；黄金、铜随后。</p>
          </div>
          <div className="brief-column">
            <span>降温榜</span>
            <strong>天然气 <b className="negative">−45.4K</b></strong>
            <p>管理基金净仓大幅转弱；纳指、欧元同步降温。</p>
          </div>
          <div className="brief-column">
            <span>分歧观察</span>
            <strong>美元指数 <b>22.0K</b></strong>
            <p>资管机构净多处于 26 周高位，杠杆基金仍为净空。</p>
          </div>
          {tier === "free" && (
            <button className="brief-unlock" onClick={() => setTier("diamond")}><span>◆</span> 解锁钻石周报预览</button>
          )}
        </div>
      </section>

      <section className="method-section page-section" id="method" aria-labelledby="method-title">
        <div className="section-heading split">
          <div><span className="eyebrow muted">TRANSPARENT BY DESIGN</span><h2 id="method-title">每一个数字，都能回到原表</h2></div>
          <p>COT 是仓位快照，不是实时成交，也不是预测模型。产品应当让用户理解口径，而不是制造神秘感。</p>
        </div>
        <div className="method-grid">
          <article><span>01</span><h3>时间</h3><p>统计每周二收盘后的未平仓头寸，通常在同周周五发布。</p></article>
          <article><span>02</span><h3>分类</h3><p>商品采用 Disaggregated；金融期货采用 TFF，核心投机类别不同。</p></article>
          <article><span>03</span><h3>比例</h3><p>页面多空占比 = 多头 ÷（多头 + 空头），不含 spreading。</p></article>
          <article><span>04</span><h3>边界</h3><p>净仓仅描述申报持仓结构，不等同价格方向或投资建议。</p></article>
        </div>
        <div className="source-strip">
          <span>官方来源</span>
          <a href={physicalSource} target="_blank" rel="noreferrer">Disaggregated 原表 ↗</a>
          <a href={financialSource} target="_blank" rel="noreferrer">TFF 原表 ↗</a>
          <a href={methodologySource} target="_blank" rel="noreferrer">COT 方法说明 ↗</a>
          <small>Demo 数据：持仓截至 {reportMeta.asOf}，发布于 {reportMeta.published}</small>
        </div>
      </section>

      <footer>
        <div className="brand footer-brand"><span className="brand-mark">10</span><span><strong>金十 CFTC</strong><small>持仓情报站 · 概念 Demo</small></span></div>
        <p>数据免费，是信任的起点。<br />解读收费，是专业的边界。</p>
        <span>本页面仅作产品方案演示，不构成投资建议。</span>
      </footer>
    </main>
  );
}

