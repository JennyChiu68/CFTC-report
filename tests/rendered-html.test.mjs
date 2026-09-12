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

test("server-renders the supplied miniapp shell", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  const html = await response.text();
  for (const text of ["CFTC持仓报告", "j-mini-fixed-shell", "pageTitle", "dateSelector", "appView", "j-bottom-actions-fixed", "选择报告日期"]) assert.ok(html.includes(text), text);
  assert.doesNotMatch(html, /预览完整功能|钻石VIP专享功能|cot-asset-card/);
});

test("designer assets and live data integration are present", async () => {
  const runtime = await readFile(new URL("../app/designer-runtime.js", import.meta.url), "utf8");
  const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
  for (const text of ["/api/cftc-market", "/api/cftc-history?symbol=", "renderDateWheel", "categoryHistoryValue", "loadDetail", "requests.abort()"]) assert.ok(runtime.includes(text), text);
  assert.doesNotMatch(runtime, /homeTraderFallbacks|grossTotal|Math.random/);
  assert.match(css, /max-width: 414px/);
  assert.match(css, /analysis-detail-card/);
  const shell = await readFile(new URL("../app/designer-shell.ts", import.meta.url), "utf8");
  const markup = JSON.parse(shell.slice(shell.indexOf("=") + 1).trim().slice(0, -1));
  for (const match of markup.matchAll(/src="([^"?]+)[^"]*"/g)) {
    const contents = await readFile(new URL("../public" + match[1], import.meta.url));
    assert.ok(contents.length > 0, match[1]);
  }
});
