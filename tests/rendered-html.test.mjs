import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("server-renders the reference-style CFTC mobile demo", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /CFTC持仓动向/);
  assert.match(html, /CFTC 持仓报告/);
  assert.match(html, /官方数据/);
  assert.match(html, /2026-07-14/);
  assert.match(html, /持仓截至时间/);
  assert.match(html, /报告发布时间/);
  assert.match(html, /2026-07-17/);
  assert.doesNotMatch(html, /同步 \d{2}\/\d{2}/);
  assert.match(html, /动向解读/);
  assert.match(html, /查看黄金完整分析/);
  assert.match(html, /净空/);
  assert.doesNotMatch(html, /-105\.7K/);
  assert.match(html, /专业版/);
  assert.match(html, /CFTC 原始说明/);
  assert.doesNotMatch(html, /Your site is taking shape|react-loading-skeleton/);
});

test("ships real multi-asset data and transparent methodology", async () => {
  const [page, data, historyRoute, insightsRoute, insights, css, packageJson] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/cftc-data.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/cftc-service.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/cftc-insights/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/cftc-insights.mjs", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
  ]);

  assert.match(page, /Disaggregated 原表/);
  assert.match(page, /TFF 原表/);
  assert.match(page, /多头 ÷（多头 \+ 空头）/);
  assert.match(page, /查看完整专业版/);
  assert.match(page, /持仓变化归因/);
  assert.match(page, /跨品种变化筛选、历史分位与多周结构解读/);
  assert.match(page, /标准化资金异动雷达/);
  assert.match(page, /持仓变化归因/);
  assert.match(page, /windowNetChanges/);
  assert.match(page, /const \[changesOpen, setChangesOpen\] = useState\(true\)/);
  assert.match(page, /setSelectedSymbol\(asset\.symbol\); setSection\("analysis"\)/);
  assert.match(page, /市场结构/);
  assert.match(page, /\/api\/cftc-history\?symbol=/);
  assert.match(page, /选择持仓截至日期/);
  assert.match(page, /日期为持仓截至日/);
  assert.doesNotMatch(page, /tab === "depth"/);
  assert.match(page, /可选最近52期/);
  assert.match(page, /当前净仓结构/);
  assert.match(page, /绝对净仓规模占比/);
  assert.match(page, /PositionFanCanvas/);
  assert.doesNotMatch(page, /公开预览|收起演示/);
  assert.match(data, /openInterest: 383689/);
  assert.match(data, /long: 136905/);
  assert.match(data, /short: 16126/);
  assert.match(data, /symbol: "DXY"/);
  assert.match(data, /symbol: "BTC"/);
  assert.match(data, /thirdNet: -195639/);
  assert.match(data, /categoryNets/);
  assert.match(historyRoute, /72hh-3qpy/);
  assert.match(historyRoute, /gpe5-46if/);
  assert.match(historyRoute, /cftc_contract_market_code/);
  assert.match(insightsRoute, /fetchCftcSnapshots\(asset, 156\)/);
  assert.match(insightsRoute, /rankStandardizedInsights/);
  assert.match(insights, /changeToOiPct/);
  assert.match(insights, /changePercentile52/);
  assert.match(insights, /zScore/);
  assert.match(insights, /增多与减空共同推动/);
  assert.match(insights, /\[1, 4, 13\]/);
  assert.match(css, /max-width: 448px/);
  assert.match(css, /\.cot-bottom-nav/);
  assert.match(css, /\.cot-asset-card/);
  assert.match(css, /\.analysis-tabs/);
  assert.match(css, /\.date-menu/);
  assert.match(css, /\.fan-canvas/);
  assert.match(css, /\.chart-mode-switch/);
  assert.doesNotMatch(packageJson, /react-loading-skeleton/);
});
