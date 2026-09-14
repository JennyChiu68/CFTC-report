import { assets as savedAssets } from "./cftc-data";
import { applySnapshot, categorySnapshot, categoryHistoryValue } from "./designer-data.mjs";

export function mountCftc(root, options = {}) {
const fetchData = options.fetchData || globalThis.fetch.bind(globalThis);
const physicalSource = "https://www.cftc.gov/dea/futures/other_lf.htm";
const petroleumSource = "https://www.cftc.gov/dea/futures/petroleum_lf.htm";
const gasSource = "https://www.cftc.gov/dea/futures/nat_gas_lf.htm";
const financialSource = "https://www.cftc.gov/dea/futures/financial_lf.htm";
const methodSource = "https://www.cftc.gov/MarketReports/CommitmentsofTraders/AbouttheCOTReports/index.htm";

const reportMeta = {
  asOf: "",
  scope: "Futures Only",
};

const traderColors = ["#f0a33a", "#8b5cf6", "#1f9d68", "#5a82e6", "#aeb7c4"];
const traderLabels = {
  "生产商 / 商业商": "生产商/商业",
  "交易商 / 中介": "交易商/中介",
  资管机构: "资管机构",
  资产管理机构: "资管机构",
  其他报告交易者: "其他可报告",
  非报告交易者: "非报告持仓",
};

const homeTraderTabs = [
  { key: "managed", label: "管理/杠杆基金" },
  { key: "producer", label: "生产商/交易商" },
  { key: "swap", label: "掉期/资管机构" },
  { key: "other", label: "其他可报告", aliases: ["其他报告交易者", "其他可报告"] },
  { key: "nonreport", label: "非报告持仓", aliases: ["非报告交易者", "非报告持仓"] },
];


const groups = [
  { key: "贵金属", title: "贵金属", subtitle: "黄金、白银、铜", symbols: ["XAU", "XAG", "HG"] },
  { key: "能源", title: "能源", subtitle: "原油、天然气、布伦特", symbols: ["CL", "NG", "BZ"] },
  { key: "外汇", title: "外汇", subtitle: "美元指数、欧元、英镑等", symbols: ["DXY", "EUR", "GBP", "JPY", "AUD", "CAD"] },
  { key: "股指", title: "股指", subtitle: "标普500、纳斯达克100", symbols: ["ES", "NQ"] },
];

const displayNames = { CL: "原油(WTI)", ES: "标普500", NQ: "纳斯达克100" };
const displaySymbols = {
  XAU: "XAU/USD",
  XAG: "XAG/USD",
  EUR: "EUR/USD",
  GBP: "GBP/USD",
  JPY: "JPY/USD",
  AUD: "AUD/USD",
  CAD: "CAD/USD",
};

let assets = savedAssets.map(asset => applySnapshot(asset, [], ""));

const state = {
  screen: "home",
  filter: "全部",
  homeTrader: "managed",
  selectedSymbol: "XAU",
  detailTab: "positions",
  historyView: "chart",
  historyRowsVisible: 15,
  proTab: "weekly",
  proSymbol: "XAU",
  homeSort: "longDesc",
  weeks: 26,
};

let charts = [];
const histories = new Map();
const fullHistories = new Set();
const pending = new Set();
const requests = new AbortController();
let disposed = false;
let selectedReportDate = null;
let pendingDate = null;
let statusText = "正在读取 CFTC 官方数据…";
let marketLoading = true;
const statusNotice = document.createElement("div");
statusNotice.className = "notice";
statusNotice.setAttribute("role", "status");

function refreshAssets() {
  const latestDate = [...histories.values()].map(items => items[0]?.date).filter(Boolean).sort().at(-1) || "";
  assets = savedAssets.map(asset => {
    return applySnapshot(asset, histories.get(asset.symbol) || [], selectedReportDate || latestDate);
  });
  reportMeta.asOf = selectedReportDate || latestDate;
}

async function loadMarket() {
  try {
    const response = await fetchData("/api/cftc-market", { signal: requests.signal });
    if (!response.ok) throw new Error("unavailable");
    const payload = await response.json();
    for (const [symbol, points] of Object.entries(payload.histories || {})) {
      if (points.length) {
        const older = (histories.get(symbol) || []).filter(point => point.date < points.at(-1).date);
        histories.set(symbol, [...points, ...older]);
      }
    }
    if (!histories.size) throw new Error("empty");
    for (const symbol of payload.unavailable || []) histories.delete(symbol);
    marketLoading = false;
    statusText = payload.unavailable?.length ? "以下品种官方数据暂不可用，不以旧数据替代：" + payload.unavailable.join("、") : "";
    refreshAssets();
    if (!disposed) render();
  } catch {
    if (!disposed) {
      histories.clear();
      fullHistories.clear();
      marketLoading = false;
      statusText = "官方数据暂时不可用；当前不展示持仓数值，稍后将自动重试。";
      render();
    }
  }
}

async function loadDetail(symbol) {
  if (pending.has(symbol) || fullHistories.has(symbol)) return;
  pending.add(symbol);
  try {
    const response = await fetchData("/api/cftc-history?symbol=" + encodeURIComponent(symbol) + "&limit=104", { signal: requests.signal });
    if (!response.ok) throw new Error("unavailable");
    const payload = await response.json();
    if (!payload.snapshots?.length) throw new Error("empty");
    histories.set(symbol, payload.snapshots);
    fullHistories.add(symbol);
    statusText = "";
    refreshAssets();
    if (!disposed) render();
  } catch {
    if (!disposed) {
      statusText = "历史数据暂时不可用，已保留可用数据。";
      render();
    }
  } finally { pending.delete(symbol); }
}

function netOf(asset) {
  return asset.long - asset.short;
}

function share(long, short) {
  if (!Number.isFinite(long) || !Number.isFinite(short) || long + short === 0) return null;
  return Math.round((long / (long + short)) * 100);
}

function screenName(asset) {
  return displayNames[asset.symbol] || asset.name;
}

function screenSymbol(asset) {
  return displaySymbols[asset.symbol] || asset.symbol;
}

function traderName(name) {
  return traderLabels[name] || name;
}

function selectedHomeTraderTab() {
  return homeTraderTabs.find((tab) => tab.key === state.homeTrader) || homeTraderTabs[0];
}

function traderSnapshotFor(asset, tab = selectedHomeTraderTab()) {
  const row = categorySnapshot(asset, tab.key);
  return row ? { ...row, label: traderName(row.name) } : null;
}

function sourceFor(asset) {
  if (asset.symbol === "NG") return gasSource;
  if (["CL", "BZ"].includes(asset.symbol)) return petroleumSource;
  return asset.reportType === "TFF" ? financialSource : physicalSource;
}

function format(value, signed = false) {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  const absolute = Math.abs(value);
  const prefix = value < 0 ? "-" : signed && value > 0 ? "+" : "";
  if (absolute >= 10000) {
    const valueInWan = (absolute / 10000).toFixed(1).replace(/\.0$/, "");
    return `${prefix}${valueInWan}万`;
  }
  return `${prefix}${absolute}`;
}

function formatContracts(value, signed = false) {
  return `${format(value, signed)}手`;
}

function contractMetricParts(value, signed = false) {
  const formatted = format(value, signed);
  if (formatted.endsWith("万")) {
    return { value: formatted.slice(0, -1), unit: "万手" };
  }
  return { value: formatted, unit: "手" };
}

function formatChineseDate(value) {
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return value;
  return `${year}年${month}月${day}日`;
}

function formatHistoryDate(value) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  if (/^\d{2}-\d{2}$/.test(value)) return `${reportMeta.asOf.slice(0, 4)}-${value}`;
  return value;
}

function formatNetPosition(value, compact = false, withUnit = false) {
  if (!Number.isFinite(value)) return "暂无数据";
  const direction = value > 0 ? (compact ? "多" : "净多") : value < 0 ? (compact ? "空" : "净空") : compact ? "平" : "持平";
  return `${direction} ${format(Math.abs(value))}${withUnit ? "手" : ""}`;
}

function changeTone(value, inverted = false) {
  if (value === 0) return "neutral";
  const isBullish = inverted ? value < 0 : value > 0;
  return isBullish ? "red" : "green";
}

function classifyStructure(long, short) {
  const longPct = share(long, short);
  if (longPct >= 68) return "强净多";
  if (longPct >= 58) return "净多";
  if (longPct <= 32) return "强净空";
  if (longPct <= 42) return "净空";
  return "均衡";
}

function classifySummary(asset) {
  const longPct = asset.long + asset.short === 0 ? null : asset.long / (asset.long + asset.short) * 100;
  if (longPct === null) return { label: "无方向持仓", tone: "balanced" };
  if (longPct >= 55) return { label: "多头主导", tone: "bull" };
  if (longPct <= 35) return { label: "空头主导", tone: "bear" };
  return { label: "多空均衡", tone: "balanced" };
}

function percentileRank(values, current) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const below = sorted.filter((value) => value <= current).length;
  return Math.round((below / sorted.length) * 100);
}

function rangePosition(values, current) {
  const low = Math.min(...values);
  const high = Math.max(...values);
  if (high === low) return 50;
  return Math.round(((current - low) / (high - low)) * 100);
}

function describeMultiWeekTrend(history, weeklyDelta) {
  const recent = history?.slice(0, 4).map((point) => point.net) || [];
  if (recent.length < 3) return { label: weeklyDelta > 0 ? "本周净仓回升" : weeklyDelta < 0 ? "本周净仓回落" : "本周净仓不变", direction: Math.sign(weeklyDelta) };
  const consecutiveWeeks = history.slice(0, 3).every((point, index) => history[index + 1] && new Date(point.date) - new Date(history[index + 1].date) === 7 * 86400000);
  if (recent.length === 4 && consecutiveWeeks) {
    const changes = recent.slice(0, 3).map((net, index) => net - recent[index + 1]);
    if (changes.every(change => change > 0)) return { label: "连续3周增多", direction: 1 };
    if (changes.every(change => change < 0)) return { label: "连续3周减少", direction: -1 };
  }
  const direction = recent[0] - recent[recent.length - 1];
  if (direction > 0) return { label: "近几期净仓抬升", direction: 1 };
  if (direction < 0) return { label: "近几期净仓回落", direction: -1 };
  return { label: "近几期净仓横向整理", direction: 0 };
}

function summaryAssets() {
  const order = ["XAU", "XAG", "HG", "CL", "NG", "BZ", "DXY", "EUR", "GBP", "JPY", "AUD", "CAD", "ES", "NQ"];
  const bySymbol = new Map(assets.map((asset) => [asset.symbol, asset]));
  return order.map((symbol) => bySymbol.get(symbol)).filter(Boolean);
}

function homeSortLabel() {
  if (state.homeSort === "longDesc") return "多头优先";
  if (state.homeSort === "shortDesc") return "空头优先";
  return "多头优先";
}

function visibleHomeAssets() {
  const tab = selectedHomeTraderTab();
  const groupSymbols = groups
    .filter((group) => state.filter === "全部" || group.key === state.filter)
    .flatMap((group) => group.symbols);
  const bySymbol = new Map(assets.map((asset) => [asset.symbol, asset]));
  const rows = groupSymbols.map((symbol) => bySymbol.get(symbol)).filter(asset => asset && !asset.unavailable && traderSnapshotFor(asset, tab));
  const sorter = {
    netDesc: (a, b) => {
      const first = traderSnapshotFor(a, tab);
      const second = traderSnapshotFor(b, tab);
      return Math.abs(second.long - second.short) - Math.abs(first.long - first.short);
    },
    longDesc: (a, b) => {
      const first = traderSnapshotFor(a, tab);
      const second = traderSnapshotFor(b, tab);
      return share(second.long, second.short) - share(first.long, first.short);
    },
    shortDesc: (a, b) => {
      const first = traderSnapshotFor(a, tab);
      const second = traderSnapshotFor(b, tab);
      return share(first.long, first.short) - share(second.long, second.short);
    },
  }[state.homeSort] || ((a, b) => groups.findIndex((group) => group.key === a.group) - groups.findIndex((group) => group.key === b.group));
  return rows.sort(sorter);
}

function setHeader() {
  const selected = assets.find((asset) => asset.symbol === state.selectedSymbol) || assets[0];
  const isDetail = state.screen === "detail" || state.screen === "analysisDetail";
  const isAnalysisDetail = state.screen === "analysisDetail";
  const title = isDetail ? `${screenName(selected)} ${screenSymbol(selected)}` : "CFTC持仓报告";

  document.title = title;
  root.querySelector(".hero").classList.toggle("hero--detail", isDetail);
  root.querySelector(".hero").classList.toggle("hero--analysis-detail", isAnalysisDetail);
  root.querySelector("#navTitle").textContent = isDetail ? screenName(selected) : "CFTC持仓报告";
  root.querySelector("#pageTitle").textContent = title;
  const titleMenuButton = root.querySelector("#heroTitleMenuButton");
  const fullDataButton = root.querySelector("#heroFullDataButton");
  const heroAssetMenu = root.querySelector("#heroAssetMenu");
  titleMenuButton.hidden = !isAnalysisDetail;
  titleMenuButton.setAttribute("aria-expanded", "false");
  fullDataButton.hidden = !isAnalysisDetail;
  heroAssetMenu.hidden = true;
  heroAssetMenu.innerHTML = "";
  if (isAnalysisDetail) {
    fullDataButton.dataset.heroOpenAsset = selected.symbol;
    heroAssetMenu.innerHTML = summaryAssets()
      .map((item) => `<button class="${item.symbol === selected.symbol ? "is-active" : ""}" data-open-analysis="${item.symbol}" type="button">${screenName(item)}</button>`)
      .join("");
  } else {
    delete fullDataButton.dataset.heroOpenAsset;
  }
  root.querySelector("#crumbTopic").textContent = "CFTC持仓";
  root.querySelector("#dateLabel").textContent = reportMeta.asOf ? formatChineseDate(reportMeta.asOf) : "暂无报告日期";
  const heroMeta = root.querySelector("#heroMeta");
  heroMeta.hidden = !isDetail;
  heroMeta.textContent = isDetail ? `合约代码 ${selected.contractCode}` : "";
  root.querySelector("#navBack").style.visibility = isDetail ? "visible" : "hidden";
}

function renderScreenTabs() {
  const shell = root.querySelector(".view-switch-tabs");
  const target = root.querySelector("#screenTabs");
  if (state.screen !== "detail") {
    shell.hidden = true;
    target.innerHTML = "";
    return;
  }

  shell.hidden = false;
  const tabs = [
    { key: "positions", label: "持仓详情" },
    { key: "analysis", label: "深度解读" },
  ];
  target.innerHTML = tabs
    .map((tab) => `<button class="j-filter-tabs__item ${state.detailTab === tab.key ? "is-active" : ""}" data-screen-tab="${tab.key}">${tab.label}</button>`)
    .join("");
}

function positionBar(longPct, label, leftText = "", rightText = "") {
  if (longPct === null) return '<div class="position-bar" aria-label="无方向持仓"><span class="position-bar__value position-bar__value--long">0手</span><span class="position-bar__value position-bar__value--short">0手</span></div>';
  return `
    <div class="position-bar" aria-label="${label}">
      <span class="position-bar__long" style="width:${longPct}%"></span>
      <span class="position-bar__short"></span>
      ${leftText ? `<span class="position-bar__value position-bar__value--long">${leftText}</span>` : ""}
      ${rightText ? `<span class="position-bar__value position-bar__value--short">${rightText}</span>` : ""}
    </div>
  `;
}

function marketRow(asset) {
  const snapshot = traderSnapshotFor(asset);
  const longPct = share(snapshot.long, snapshot.short);
  const net = snapshot.long - snapshot.short;
  return `
    <button class="position-row position-row--market" data-open-asset="${asset.symbol}" aria-label="查看${screenName(asset)}完整分析">
      <div class="position-row__name">
        <span class="instrument-title">${screenName(asset)}</span>
        <span class="instrument-code">${snapshot.label}</span>
      </div>
      <div class="position-row__body">
        ${positionBar(longPct, `${screenName(asset)} ${snapshot.label} 多头${formatContracts(snapshot.long)}，空头${formatContracts(snapshot.short)}`, formatContracts(snapshot.long), formatContracts(snapshot.short))}
        <div class="position-row__meta position-row__meta--single">
          <span class="${net >= 0 ? "red" : "green"}">${formatNetPosition(net, false, true)}</span>
        </div>
      </div>
    </button>
  `;
}

function renderHome() {
  const rows = visibleHomeAssets();
  root.querySelector("#appView").innerHTML = `
    <div class="j-filter-tabs category-chip-tabs" aria-label="品种分类">
      <div class="j-filter-tabs__track">
        ${["全部", ...groups.map((group) => group.key)].map((filter) => `<button class="j-filter-tabs__item ${state.filter === filter ? "is-active" : ""}" data-filter="${filter}">${filter}</button>`).join("")}
      </div>
    </div>
    <div class="j-filter-tabs home-trader-tabs" aria-label="交易者类型">
      <div class="j-filter-tabs__track">
        ${homeTraderTabs.map((tab) => `<button class="j-filter-tabs__item ${state.homeTrader === tab.key ? "is-active" : ""}" data-home-trader="${tab.key}">${tab.label}</button>`).join("")}
      </div>
    </div>
    <section class="list-section">
      <div class="position-toolbar">
        <div class="sort-control" aria-label="排序方式">
          <button class="sort-control__label" type="button" data-home-sort="longDesc">${homeSortLabel()}</button>
          <div class="sort-control__arrows">
            <button class="sort-control__triangle sort-control__triangle--up ${state.homeSort === "longDesc" ? "is-active" : ""}" type="button" data-home-sort="longDesc" aria-label="多头优先"></button>
            <button class="sort-control__triangle sort-control__triangle--down ${state.homeSort === "shortDesc" ? "is-active" : ""}" type="button" data-home-sort="shortDesc" aria-label="空头优先"></button>
          </div>
        </div>
        <div class="bar-labels" aria-hidden="true"><span>多头</span><span>空头</span></div>
      </div>
      <div class="position-list">${rows.length ? rows.map((asset) => marketRow(asset)).join("") : '<div class="notice">' + (marketLoading ? "正在读取官方持仓…" : "该报告日期暂无可用的官方分类持仓数据。") + '</div>'}</div>
    </section>
  `;
}

function renderDetail() {
  const asset = assets.find((item) => item.symbol === state.selectedSymbol) || assets[0];
  if (asset.unavailable) {
    root.querySelector("#appView").innerHTML = '<div class="notice">该日期暂无本品种数据，请选择其他报告日期。</div>';
    return;
  }
  const rows = asset.breakdown || [{ name: asset.coreTrader, long: asset.long, short: asset.short, netChange: asset.weeklyDelta }];

  root.querySelector("#appView").innerHTML = `
    ${state.detailTab === "positions" ? renderPositions(asset, rows) : renderDeepAnalysis(asset)}
  `;
}

function renderAnalysisDetail() {
  const asset = assets.find((item) => item.symbol === state.selectedSymbol) || assets[0];
  root.querySelector("#appView").innerHTML = renderDeepAnalysis(asset);
}

function renderDeepAnalysis(asset) {
  if (asset.unavailable) return '<div class="notice">暂无官方数据，无法生成解读。</div>';
  const net = netOf(asset);
  const history = (asset.history || []).slice(0, 26);
  const sample = history.map((point) => point.net);
  const percentile = percentileRank(sample, net);
  const marker = percentile ?? 0;
  const summary = classifySummary(asset);
  const trend = describeMultiWeekTrend(history, asset.weeklyDelta).label;
  const counterpartName = asset.counterpartLabel || "对手类别";
  const counterpartNet = history[0]?.counterpartNet ?? (asset.breakdown?.[0] ? asset.breakdown[0].long - asset.breakdown[0].short : null);
  const weeklyRatio = net === 0 ? null : Math.round(Math.abs(asset.weeklyDelta) / Math.abs(net) * 100);
  const longShare = share(asset.long, asset.short);
  const shortShare = longShare === null ? null : 100 - longShare;
  const marketNetParts = contractMetricParts(Math.abs(net));
  const marketNetDirection = net > 0 ? "净多" : net < 0 ? "净空" : "持平";
  const momentumBody = `${trend}。${weeklyRatio === null ? "当前净仓为零，变化比例不适用" : "本周变化约相当于当前净仓绝对值的 " + weeklyRatio + "%"}，是否延续仍需结合下一期总持仓和分项变化确认。`;
  const counterpartBody = counterpartNet === null ? "其他类别数据暂不可用，待官方数据更新后展示。" : `${counterpartName}当前${formatNetPosition(counterpartNet, false, true)}，${net === 0 || counterpartNet === 0 ? "至少一方净仓为零，不作多空方向比较" : "与核心类别" + (Math.sign(counterpartNet) === Math.sign(net) ? "方向一致" : "方向相反")}。这只表示持仓结构关系，不代表该类别的具体交易动机。`;

  return `
    <section class="section-band section-band--flush section-band--analysis-cards">
      <div class="analysis-card-stack">
        <article class="analysis-detail-card analysis-detail-card--market">
          <div class="analysis-detail-card__head">
            <h2>市场结构</h2>
            <span class="analysis-badge analysis-badge--${summary.tone}">${summary.label}</span>
            <em class="${asset.weeklyDelta >= 0 ? "red" : "green"}">${asset.weeklyDelta >= 0 ? "↗" : "↘"} ${trend}</em>
          </div>
          <div class="analysis-market-position">
            <div class="analysis-market-position__side analysis-market-position__side--long">
              <span>多头</span>
              <strong>${longShare === null ? "—" : longShare + "%"}</strong>
              <em>${formatContracts(asset.long)}</em>
            </div>
            <div class="analysis-market-position__arc" aria-label="${longShare === null ? "无方向持仓，占比不适用" : screenName(asset) + " 多头占比" + longShare + "%，空头占比" + shortShare + "%"}">
              <svg viewBox="0 0 220 126" aria-hidden="true">
                <path class="analysis-market-position__arc-bg" d="M20 108 A90 90 0 0 1 200 108" pathLength="100" />
                <path class="analysis-market-position__arc-long" d="M20 108 A90 90 0 0 1 200 108" pathLength="100" opacity="${longShare === null ? 0 : 1}" />
                <path class="analysis-market-position__arc-short" d="M200 108 A90 90 0 0 0 20 108" pathLength="100" stroke-dasharray="${shortShare ?? 0} 100" />
              </svg>
              <div class="analysis-market-position__center">
                <span>${asset.coreTrader}净持仓</span>
                <strong class="${net >= 0 ? "red" : "green"}"><em>${marketNetDirection}</em><b>${marketNetParts.value}</b><em>${marketNetParts.unit}</em></strong>
              </div>
            </div>
            <div class="analysis-market-position__side analysis-market-position__side--short">
              <span>空头</span>
              <strong>${shortShare === null ? "—" : shortShare + "%"}</strong>
              <em>${formatContracts(asset.short)}</em>
            </div>
          </div>
          <div class="analysis-percentile">
            <div class="analysis-percentile__subtitle">${history.length ? `在近${history.length}期样本中处于 ${percentile}% 历史分位` : "历史数据暂不可用"}</div>
            <div class="analysis-percentile__track">
              <span style="left:${marker}%">${history.length ? percentile + "%" : "—"}</span>
              <i style="left:${marker}%"></i>
            </div>
            <div class="analysis-percentile__labels"><span>区间低位</span><span>区间高位</span></div>
          </div>
          <div class="analysis-alert">${history.length < 26 ? "当前历史样本不足26期，分位仅供参考。" : percentile >= 90 || percentile <= 10 ? "当前核心资金净仓进入近26期样本的极值区域。" : "当前核心资金净仓未进入近26期样本的极值区域。"}该提示只描述统计位置，不代表方向即将反转。</div>
        </article>
        <article class="analysis-detail-card analysis-detail-card--text">
          <h2>近期动能</h2>
          <p>${momentumBody}</p>
        </article>
        <article class="analysis-detail-card analysis-detail-card--text">
          <h2>其他类别持仓背景</h2>
          <p>${counterpartBody}</p>
        </article>
      </div>
    </section>
  `;
}

function analysisTextCard(title, body) {
  return `
    <div class="analysis-detail-card">
      <h2>${title}</h2>
      <p>${body}</p>
    </div>
  `;
}

function renderPositions(asset, rows) {
  return `
    <section class="section-band section-band--flush section-band--detail-card">
      <div class="section section--detail-composite">
        <article class="module">
          <div class="module__head">
            <div>
              <h2 class="module__title">各类交易者持仓</h2>
            </div>
          </div>
          <div class="position-toolbar position-toolbar--inside">
            <span class="sort-control__label">交易者类别</span>
            <div class="bar-labels" aria-hidden="true"><span>多头</span><span>空头</span></div>
          </div>
          <div class="position-list">${rows.map((row, index) => traderRow(row, index)).join("")}</div>
        </article>
        ${renderNetStructure(rows)}
        ${renderHistory(asset, rows)}
      </div>
    </section>
  `;
}

function renderNetStructure(rows) {
  const currentCategories = rows.map((row, index) => ({ name: traderName(row.name), net: row.long - row.short, color: traderColors[index % traderColors.length] }));
  const fanTotal = currentCategories.reduce((sum, row) => sum + Math.abs(row.net), 0);
  return `
    <div class="detail-card-divider" aria-hidden="true"></div>
    <article class="module">
      <div class="module__head">
        <div>
          <h2 class="module__title">交易者净仓结构</h2>
        </div>
      </div>
      <div class="donut-summary">
        <div class="donut-legend">
          ${currentCategories.map((row) => `
            <div class="donut-legend__row">
              <span class="donut-legend__dot" style="--dot-color:${row.color}"></span>
              <span class="donut-legend__name">${row.name}</span>
              <strong>${fanTotal ? (Math.abs(row.net) / fanTotal * 100).toFixed(2) + "%" : "—"}</strong>
            </div>
          `).join("")}
        </div>
        <div class="chart chart--donut" id="fanChart"></div>
      </div>
    </article>
  `;
}

function traderRow(row, index) {
  const net = row.long - row.short;
  const longPct = share(row.long, row.short);
  const longChange = row.longChange;
  const shortChange = row.shortChange;
  return `
    <div class="position-row position-row--trader">
      <div class="position-row__name">
        <span class="instrument-title">${traderName(row.name)}</span>
        <span class="instrument-net ${net >= 0 ? "red" : "green"}">${formatNetPosition(net, false, true)}</span>
      </div>
      <div class="position-row__body">
        ${positionBar(longPct, `${traderName(row.name)} 多头${formatContracts(row.long)}，空头${formatContracts(row.short)}`, formatContracts(row.long), formatContracts(row.short))}
        <div class="position-row__meta position-row__meta--trader">
          <span>较上周 <strong>${formatContracts(longChange, true)}</strong></span>
          <span>较上周 <strong>${formatContracts(shortChange, true)}</strong></span>
        </div>
      </div>
    </div>
  `;
}

function historyStackRows(asset, rows) {
  return rows;
}

function historyTableData(asset, rows, history) {
  const stackRows = historyStackRows(asset, rows);
  const points = history.filter(point => point.breakdown?.length).slice(0, state.weeks);
  return {
    stackRows,
    rows: points.map((point) => {
      const openInterest = point.openInterest;
      return {
        date: point.date,
        openInterest,
        values: stackRows.map(row => categoryHistoryValue(point, row.name)),
      };
    }),
  };
}

function renderHistoryTable(asset, rows, history) {
  const table = historyTableData(asset, rows, history);
  const visibleHistoryCount = Math.min(state.historyRowsVisible, table.rows.length);
  return `
    <div class="history-table-scroll" aria-label="历史持仓表格">
      <table class="history-data-table">
        <thead>
          <tr>
            <th>日期</th>
            <th>总持仓</th>
            ${table.stackRows.map((row) => `<th>${traderName(row.name)}</th>`).join("")}
          </tr>
        </thead>
        <tbody>
          ${table.rows.slice(0, visibleHistoryCount).map((point) => `
            <tr>
              <td>${formatHistoryDate(point.date)}</td>
              <td>${point.openInterest.toLocaleString("en-US")}手</td>
              ${point.values.map((value) => `<td>${Number.isFinite(value) ? value.toLocaleString("en-US") + "手" : "—"}</td>`).join("")}
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
    ${visibleHistoryCount < table.rows.length ? `<button class="load-more-button" data-history-more type="button">查看更多</button>` : ""}
  `;
}

function renderHistory(asset, rows) {
  const history = (asset.history || []).filter(point => point.breakdown?.length);
  const historyBody = state.historyView === "table" ? renderHistoryTable(asset, rows, history) : `
    <div class="trend-legend" aria-label="交易者类别图例">
      ${historyStackRows(asset, rows).map((row, index) => `<span><i style="--legend-color:${traderColors[index % traderColors.length]}"></i>${traderName(row.name)}</span>`).join("")}
    </div>
    <div class="chart chart--stacked" id="historyStackedChart"></div>
  `;

  if (!history.length) {
    return `
      <div class="detail-card-divider" aria-hidden="true"></div>
      <article class="module">
        <div class="module__head">
          <div>
            <h2 class="module__title">历史持仓与趋势</h2>
          </div>
          <div class="module-view-switch module-view-switch--history" aria-label="历史持仓展示切换">
            <button class="${state.historyView === "chart" ? "is-active" : ""}" data-history-view="chart" type="button">图表</button>
            <button class="${state.historyView === "table" ? "is-active" : ""}" data-history-view="table" type="button">表格</button>
          </div>
        </div>
        <div class="notice">历史序列暂时不可用，当前展示最近一期分类持仓。</div>
        <div class="history-panel"></div>
      </article>
    `;
  }

  return `
    <div class="detail-card-divider" aria-hidden="true"></div>
    <article class="module">
      <div class="module__head">
        <div>
          <h2 class="module__title">历史持仓与趋势</h2>
        </div>
        <div class="module-view-switch module-view-switch--history" aria-label="历史持仓展示切换">
          <button class="${state.historyView === "chart" ? "is-active" : ""}" data-history-view="chart" type="button">图表</button>
          <button class="${state.historyView === "table" ? "is-active" : ""}" data-history-view="table" type="button">表格</button>
        </div>
      </div>
      <div class="history-panel">
        ${historyBody}
      </div>
    </article>
  `;
}

function renderPro() {
  const selected = assets.find((asset) => asset.symbol === state.proSymbol) || assets[0];
  root.querySelector("#appView").innerHTML = `
    <div class="j-filter-tabs" aria-label="专业版筛选">
      <div class="j-filter-tabs__track">
        <button class="j-filter-tabs__item ${state.proTab === "weekly" ? "is-active" : ""}" data-pro-tab="weekly">持仓周报</button>
        <button class="j-filter-tabs__item ${state.proTab === "analysis" ? "is-active" : ""}" data-pro-tab="analysis">深度解读</button>
      </div>
    </div>
    ${state.proTab === "weekly" ? `
      <section class="section-band section-band--flush">
        <div class="section">
          <article class="module">
            <div class="module__head">
              <div>
                <h2 class="module__title">本周持仓动态</h2>
              </div>
            </div>
            <div class="asset-card-grid">${assets.filter(asset => !asset.unavailable).map((asset) => proAssetCard(asset)).join("")}</div>
          </article>
        </div>
      </section>
    ` : renderPremiumAnalysis(selected)}
    <section class="section-band">
      <div class="section">
        <article class="module">
          <p class="source-note">分析基于CFTC Futures Only公开数据，只描述统计与结构事实，不构成投资建议。</p>
        </article>
      </div>
    </section>
  `;
}

function proAssetCard(asset, selectable = false) {
  const net = netOf(asset);
  const longPct = share(asset.long, asset.short);
  const active = selectable && state.proSymbol === asset.symbol;
  return `
    <button class="pro-asset-card ${active ? "is-active" : ""}" ${selectable ? `data-pro-symbol="${asset.symbol}"` : `data-open-asset="${asset.symbol}"`} type="button" aria-label="${selectable ? "选择" : "查看"}${screenName(asset)}持仓">
      <span class="pro-asset-card__head">
        <strong>${screenName(asset)}</strong>
        <em class="structure-badge ${net >= 0 ? "" : "bear"}">${classifyStructure(asset.long, asset.short)}</em>
      </span>
      <span class="pro-asset-card__code">${screenSymbol(asset)}</span>
      <span class="pro-asset-card__net ${net >= 0 ? "red" : "green"}">${formatNetPosition(net, true)}</span>
      <span class="pro-asset-card__change ${asset.weeklyDelta >= 0 ? "red" : "green"}">周变 ${format(asset.weeklyDelta, true)}</span>
      <span class="pro-asset-card__bar" aria-hidden="true"><i style="width:${longPct}%"></i><b></b></span>
    </button>
  `;
}

function premiumRow(asset, reason) {
  return `
    <button class="premium-row" data-open-asset="${asset.symbol}">
      <span class="premium-row__main"><b>${screenName(asset)} <em class="structure-badge ${netOf(asset) >= 0 ? "" : "bear"}">${classifyStructure(asset.long, asset.short)}</em></b><small>${reason}</small></span>
      <strong class="${asset.weeklyDelta >= 0 ? "red" : "green"}">${format(asset.weeklyDelta, true)}</strong>
    </button>
  `;
}

function renderPremiumAnalysis(asset) {
  return renderDeepAnalysis(asset);
}


function clearCharts() {
  charts.forEach((chart) => chart.dispose());
  charts = [];
}

function initCharts() {
  clearCharts();
  if (!window.echarts || state.screen !== "detail" || state.detailTab !== "positions") return;
  const asset = assets.find((item) => item.symbol === state.selectedSymbol) || assets[0];
  const history = (asset.history || []).filter(point => point.breakdown?.length);
  const rows = asset.breakdown || [{ name: asset.coreTrader, long: asset.long, short: asset.short }];
  const currentCategories = rows.map((row, index) => ({ name: traderName(row.name), net: row.long - row.short, color: traderColors[index % traderColors.length] }));
  const fanEl = root.querySelector("#fanChart");
  const visible = history.slice(0, state.weeks).reverse();
  const historyEl = root.querySelector("#historyStackedChart");
  const dates = visible.map((point) => point.date.slice(-5));

  if (fanEl) {
    const fanChart = echarts.init(fanEl);
    fanChart.setOption({
      color: currentCategories.map((item) => item.color),
      tooltip: {
        trigger: "item",
        confine: true,
        borderWidth: 0,
        textStyle: { fontSize: 12 },
        valueFormatter: (value) => formatContracts(Math.round(value)),
      },
      series: [{
        type: "pie",
        radius: ["52%", "78%"],
        center: ["50%", "50%"],
        startAngle: 90,
        stillShowZeroSum: false,
        label: { show: false },
        itemStyle: { borderRadius: 2, borderColor: "#fff", borderWidth: 1 },
        data: currentCategories.map((item) => ({ name: item.name, value: Math.abs(item.net) })),
      }],
    });
    charts.push(fanChart);
  }

  if (historyEl && history.length) {
    const stackRows = historyStackRows(asset, rows);
    const max = Math.max(1, Math.ceil(Math.max(...visible.map((point) => point.openInterest)) / 100000) * 100000);
    const chart = echarts.init(historyEl);
    chart.setOption({
      color: stackRows.map((row, index) => traderColors[index % traderColors.length]),
      grid: { left: 6, right: 12, top: 16, bottom: 58, containLabel: true },
      tooltip: {
        trigger: "axis",
        confine: true,
        borderWidth: 0,
        textStyle: { fontSize: 12 },
        formatter: (params) => {
          const items = Array.isArray(params) ? params : [params];
          const first = items[0] || {};
          const point = visible[first.dataIndex] || {};
          const total = point.openInterest;
          const rows = items.map((item) => {
            return `${item.marker}${item.seriesName}<span style="float:right;margin-left:16px;font-weight:700">${Number.isFinite(item.value) ? item.value.toLocaleString("en-US") + "手" : "—"}</span>`;
          }).join("<br/>");
          return `<div style="margin-bottom:6px">${point.date || ""} · 多头含套利</div><div style="margin-bottom:6px">总持仓<span style="float:right;margin-left:16px;font-weight:700">${total.toLocaleString("en-US")}手</span></div>${rows}`;
        },
      },
      legend: { show: false },
      xAxis: {
        type: "category",
        boundaryGap: true,
        data: dates,
        axisLabel: { fontSize: 11, color: "rgba(0,0,0,.6)" },
        axisLine: { lineStyle: { color: "#dcdcdc", width: 0.5 } },
        axisTick: { show: false },
        splitLine: { show: true, lineStyle: { color: "#e7e7e7", width: 1 } },
      },
      yAxis: {
        type: "value",
        min: 0,
        max,
        interval: max / 4,
        axisLabel: { formatter: (value) => format(value), fontSize: 11, color: "rgba(0,0,0,.6)" },
        splitLine: { lineStyle: { color: "#e7e7e7", width: 1 } },
      },
      dataZoom: [dataZoomOption()],
      series: stackRows.map((row, index) => {
        return {
          name: traderName(row.name),
          type: "bar",
          stack: "total",
          barMaxWidth: 14,
          emphasis: { focus: "series" },
          itemStyle: { borderRadius: index === stackRows.length - 1 ? [2, 2, 0, 0] : 0 },
          data: visible.map(point => categoryHistoryValue(point, row.name)),
        };
      }),
    });
    charts.push(chart);
  }
}

function dataZoomOption() {
  return {
    type: "slider",
    height: 34,
    bottom: 8,
    left: 12,
    right: 12,
    start: 8,
    end: 100,
    showDetail: false,
    brushSelect: false,
    borderColor: "#e7e7e7",
    backgroundColor: "#f3f3f3",
    fillerColor: "rgba(90,130,230,.12)",
    handleSize: 12,
    handleStyle: { color: "#fff", borderColor: "#e7e7e7", borderWidth: 0.5, borderRadius: 2 },
    dataBackground: {
      lineStyle: { color: "#9eb4f2", width: 1 },
      areaStyle: { color: "rgba(90,130,230,.06)" },
    },
    selectedDataBackground: {
      lineStyle: { color: "#9eb4f2", width: 1 },
      areaStyle: { color: "rgba(90,130,230,.1)" },
    },
    textStyle: { color: "#8b8b8b", fontSize: 10 },
  };
}

function render() {
  refreshAssets();
  clearCharts();
  statusNotice.remove();
  if (statusText) {
    statusNotice.textContent = statusText;
    root.querySelector(".hero").after(statusNotice);
  }
  setHeader();
  renderScreenTabs();
  if (state.screen === "home") renderHome();
  if (state.screen === "detail") renderDetail();
  if (state.screen === "analysisDetail") renderAnalysisDetail();
  if (state.screen === "pro") renderPro();
  bindViewEvents();
  initCharts();
  if (state.screen === "detail" && !pending.has(state.selectedSymbol) && !fullHistories.has(state.selectedSymbol)) {
    // A failed fetch remains retryable on the next user action, not in a render loop.
    queueMicrotask(() => { if (!disposed) loadDetail(state.selectedSymbol); });
  }
}

function bindViewEvents() {
  const titleMenuButton = root.querySelector("#heroTitleMenuButton");
  const heroAssetMenu = root.querySelector("#heroAssetMenu");
  if (titleMenuButton && heroAssetMenu) {
    titleMenuButton.onclick = () => {
      const nextHidden = !heroAssetMenu.hidden;
      heroAssetMenu.hidden = nextHidden;
      titleMenuButton.setAttribute("aria-expanded", String(!nextHidden));
    };
  }
  const fullDataButton = root.querySelector("#heroFullDataButton");
  if (fullDataButton) {
    fullDataButton.onclick = () => {
      const symbol = fullDataButton.dataset.heroOpenAsset;
      if (!symbol) return;
      state.selectedSymbol = symbol;
      state.screen = "detail";
      state.detailTab = "positions";
      state.historyRowsVisible = 15;
      window.scrollTo(0, 0);
      render();
    };
  }
  root.querySelectorAll("[data-screen-tab]").forEach((button) => {
    button.addEventListener("click", () => {
      const key = button.dataset.screenTab;
      if (state.screen === "detail") state.detailTab = key;
      else state.screen = key;
      window.scrollTo(0, 0);
      render();
    });
  });
  root.querySelectorAll("[data-filter]").forEach((button) => {
    button.addEventListener("click", () => {
      state.filter = button.dataset.filter;
      render();
    });
  });
  root.querySelectorAll("[data-home-trader]").forEach((button) => {
    button.addEventListener("click", () => {
      state.homeTrader = button.dataset.homeTrader;
      render();
    });
  });
  root.querySelectorAll("[data-home-sort]").forEach((button) => {
    button.addEventListener("click", () => {
      state.homeSort = button.dataset.homeSort;
      render();
    });
  });
  root.querySelectorAll("[data-detail-tab]").forEach((button) => {
    button.addEventListener("click", () => {
      state.detailTab = button.dataset.detailTab;
      render();
    });
  });
  root.querySelectorAll("[data-history-view]").forEach((button) => {
    button.addEventListener("click", () => {
      state.historyView = button.dataset.historyView;
      render();
    });
  });
  root.querySelectorAll("[data-open-asset]").forEach((button) => {
    button.addEventListener("click", () => {
      state.selectedSymbol = button.dataset.openAsset;
      state.screen = "detail";
      state.detailTab = "positions";
      state.historyRowsVisible = 15;
      window.scrollTo(0, 0);
      render();
    });
  });
  root.querySelectorAll("[data-open-analysis]").forEach((button) => {
    button.addEventListener("click", () => {
      state.selectedSymbol = button.dataset.openAnalysis;
      state.screen = "detail";
      state.detailTab = "analysis";
      window.scrollTo(0, 0);
      render();
    });
  });
  root.querySelectorAll("[data-pro-tab]").forEach((button) => {
    button.addEventListener("click", () => {
      state.proTab = button.dataset.proTab;
      render();
    });
  });
  root.querySelectorAll("[data-pro-symbol]").forEach((button) => {
    button.addEventListener("click", () => {
      state.proSymbol = button.dataset.proSymbol;
      render();
    });
  });
  root.querySelectorAll("[data-history-more]").forEach((button) => {
    button.addEventListener("click", () => {
      state.historyRowsVisible += 15;
      render();
    });
  });
  root.querySelectorAll("[data-help]").forEach((button) => {
    button.addEventListener("click", () => openHelp(button.dataset.help));
  });
}

const mask = root.querySelector("#sheetMask");
const sheets = [...root.querySelectorAll(".j-bottom-sheet")];

function openSheet(id) {
  sheets.forEach((sheet) => {
    const active = sheet.id === id;
    sheet.classList.toggle("is-open", active);
    sheet.setAttribute("aria-hidden", String(!active));
  });
  mask.classList.add("is-open");
}

function closeSheets() {
  sheets.forEach((sheet) => {
    sheet.classList.remove("is-open");
    sheet.setAttribute("aria-hidden", "true");
  });
  mask.classList.remove("is-open");
}

function openHelp(kind) {
  const copy = kind === "method"
    ? "净持仓＝多头－空头；方向比例＝多头 ÷（多头＋空头），不含套利持仓。分母为零时不计算比例。净仓结构圆环＝各类别净仓绝对值 ÷ 所有类别净仓绝对值之和，不是总持仓占比。历史图表、表格为各类别多头＋套利持仓，其合计等于总持仓。分位＝样本中净仓不高于当前值的期数 ÷ 样本期数；解读使用截至所选日期最近26期。多头比例≥55%标为多头主导，≤35%为空头主导，其余为均衡；分位≥90%或≤10%为样本极值区。这些是本页统计规则，非CFTC观点，也不是AI预测。商品使用管理基金、生产商、掉期交易商；金融期货使用杠杆基金、交易商、资管机构，行内注明实际类别。万手数值及百分比四舍五入显示，历史表格保留完整手数。"
    : "持仓日期为周二，CFTC通常于周五发布。Disaggregated 适用于实物商品，TFF 适用于金融期货。页面保留官方原表入口，便于核验。";
  root.querySelector("#helpBody").innerHTML = `<p class="sheet-copy">${copy}</p>`;
  openSheet("helpSheet");
}

function availableDates() {
  const points = state.screen === "detail" ? histories.get(state.selectedSymbol) || [] : [...histories.values()].flat();
  return [...new Set(points.map(point => point.date))].sort().reverse().slice(0, 52);
}

function renderDateWheel() {
  const dates = availableDates();
  const current = pendingDate || dates[0] || reportMeta.asOf;
  const [year, month, day] = current.split("-");
  const shiftWeek = direction => {
    const date = new Date(current + "T00:00:00Z");
    date.setUTCDate(date.getUTCDate() + direction * 7);
    return date.toISOString().slice(0, 10);
  };
  const previousWeek = shiftWeek(-1);
  const nextWeek = shiftWeek(1);
  const columns = [
    [String(Number(year) - 1), year, String(Number(year) + 1)],
    [String((Number(month) + 10) % 12 + 1).padStart(2, "0"), month, String(Number(month) % 12 + 1).padStart(2, "0")],
    [previousWeek.slice(8), day, nextWeek.slice(8)],
  ];
  const wheel = root.querySelector(".date-wheel");
  wheel.removeAttribute("aria-hidden");
  wheel.innerHTML = columns.map((values, index) => {
    return `<div class="date-wheel__column">${values.map((value, slot) => {
      const target = index === 0 ? dates.find(date => date.startsWith(value))
        : index === 1 ? dates.find(date => date.startsWith(year + "-" + value))
        : [previousWeek, current, nextWeek][slot];
      const available = !!target && dates.includes(target);
      return `<span class="date-wheel__option${slot === 1 ? " is-active" : ""}" role="button" tabindex="${available ? 0 : -1}" aria-disabled="${!available}" data-date-target="${available ? target : ""}">${Number(value)}${["年", "月", "日"][index]}</span>`;
    }).join("")}</div>`;
  }).join("");
  wheel.querySelectorAll("[data-date-target]").forEach(option => {
    const select = () => {
      if (!option.dataset.dateTarget) return;
      pendingDate = option.dataset.dateTarget;
      renderDateWheel();
    };
    option.onclick = select;
    option.onkeydown = event => {
      if (event.key === "Enter" || event.key === " ") { event.preventDefault(); select(); }
    };
  });
}

root.querySelector("#dateSelector").addEventListener("click", () => {
  pendingDate = reportMeta.asOf;
  if (!availableDates().length) {
    root.querySelector("#helpBody").innerHTML = '<p class="sheet-copy">历史日期正在加载，请稍后重试。</p>';
    openSheet("helpSheet");
    return;
  }
  renderDateWheel();
  openSheet("dateSheet");
});
root.querySelectorAll("[data-sheet]").forEach((button) => {
  button.addEventListener("click", () => openSheet(button.dataset.sheet));
});
root.querySelectorAll("[data-close]").forEach((button) => button.addEventListener("click", closeSheets));
root.querySelector("#dateSheet .j-bottom-sheet__confirm").addEventListener("click", () => {
  if (!pendingDate || !availableDates().includes(pendingDate)) return;
  selectedReportDate = pendingDate === availableDates()[0] ? null : pendingDate;
  state.historyRowsVisible = 15;
  render();
});
mask.addEventListener("click", closeSheets);
root.querySelector("#navBack").addEventListener("click", () => {
  if (state.screen !== "home") {
    state.screen = "home";
    window.scrollTo(0, 0);
    render();
  }
});
const resize = () => charts.forEach((chart) => chart.resize());
window.addEventListener("resize", resize);
const escape = event => { if (event.key === "Escape") closeSheets(); };
window.addEventListener("keydown", escape);

render();
loadMarket();
const refreshTimer = window.setInterval(() => {
  if (document.visibilityState === "visible") { fullHistories.clear(); loadMarket(); }
}, 5 * 60 * 1000);

return () => {
  disposed = true;
  requests.abort();
  clearCharts();
  window.clearInterval(refreshTimer);
  window.removeEventListener("resize", resize);
  window.removeEventListener("keydown", escape);
  statusNotice.remove();
};
}
