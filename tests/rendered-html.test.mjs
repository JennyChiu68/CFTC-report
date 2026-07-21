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

test("server-renders the upgraded CFTC product demo", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /金十 CFTC 持仓情报站/);
  assert.match(html, /公开持仓/);
  assert.match(html, /免费版/);
  assert.match(html, /钻石 VIP/);
  assert.match(html, /2026-07-14/);
  assert.match(html, /CFTC 原始说明/);
  assert.doesNotMatch(html, /Your site is taking shape|react-loading-skeleton/);
});

test("ships real multi-asset data and transparent methodology", async () => {
  const [page, data, css, packageJson] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/cftc-data.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
  ]);

  assert.match(page, /Disaggregated 原表/);
  assert.match(page, /TFF 原表/);
  assert.match(page, /多头 ÷（多头 \+ 空头）/);
  assert.match(data, /openInterest: 383689/);
  assert.match(data, /long: 136905/);
  assert.match(data, /short: 16126/);
  assert.match(data, /symbol: "DXY"/);
  assert.match(data, /symbol: "BTC"/);
  assert.match(css, /@media \(max-width: 700px\)/);
  assert.doesNotMatch(packageJson, /react-loading-skeleton/);
});
