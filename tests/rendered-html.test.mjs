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
  assert.match(html, /钻石 VIP/);
  assert.doesNotMatch(html, /钻石VIP专享功能|预览完整功能/);
  assert.match(html, /CFTC 持仓报告/);
  assert.match(html, /持仓截至时间/);
  assert.match(html, /报告发布时间/);
  assert.doesNotMatch(html, /同步 \d{2}\/\d{2}/);
  assert.match(html, /查看黄金完整分析/);
  assert.equal((html.match(/class="cot-asset-card"/g) ?? []).length, 14);
  assert.match(html, /2026-09-01/);
  assert.match(html, /2026-09-04/);
  assert.doesNotMatch(html, /-105\.7K/);
  assert.match(html, /动向解读/);
  assert.match(html, /CFTC 原始说明/);
  assert.doesNotMatch(html, /Your site is taking shape|react-loading-skeleton/);
});

test("ships real multi-asset data and transparent methodology", async () => {
  const [page, data, historyRoute, css, packageJson] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/cftc-data.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/cftc-service.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
  ]);

  assert.match(page, /Disaggregated 原表/);
  assert.match(page, /TFF 原表/);
  assert.match(page, /多头 ÷（多头 \+ 空头）/);
  assert.match(page, /跨品种变化筛选、历史分位与多周结构解读/);
  assert.match(page, /本周重要变化/);
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
  assert.match(data, /asOf: "2026-09-01"/);
  assert.match(data, /published: "2026-09-04"/);
  assert.match(data, /openInterest: 415196/);
  assert.match(data, /long: 149721/);
  assert.match(data, /short: 12950/);
  assert.match(data, /symbol: "DXY"/);
  assert.doesNotMatch(data, /symbol: "BTC"/);
  assert.doesNotMatch(data, /加密资产/);
  assert.doesNotMatch(page, /比特币|股指\/加密/);
  assert.match(data, /thirdNet: -233429/);
  assert.match(data, /categoryNets/);
  assert.match(historyRoute, /72hh-3qpy/);
  assert.match(historyRoute, /gpe5-46if/);
  assert.match(historyRoute, /cftc_contract_market_code/);
  assert.match(css, /max-width: 448px/);
  assert.match(css, /\.cot-bottom-nav/);
  assert.match(css, /\.cot-asset-card/);
  assert.match(css, /\.analysis-tabs/);
  assert.match(css, /\.date-menu/);
  assert.match(css, /\.fan-canvas/);
  assert.match(css, /\.chart-mode-switch/);
  assert.doesNotMatch(packageJson, /react-loading-skeleton/);
});
