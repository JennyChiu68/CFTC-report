import assert from "node:assert/strict";
import test from "node:test";
const { default: worker } = await import("../dist/server/index.js");
const request = path => worker.fetch(new Request("http://localhost" + path),
  { ASSETS: { fetch: async () => new Response("", { status: 404 }) } },
  { waitUntil() {}, passThroughOnException() {} });

test("official outage returns errors without static market or history numbers", async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async () => new Response("Unavailable", { status: 503 });
  try {
    for (const path of ["/api/cftc-market", "/api/cftc-history?symbol=XAU"]) {
      const response = await request(path);
      assert.equal(response.status, 502);
      const payload = await response.json();
      assert.deepEqual(Object.keys(payload), ["error"]);
    }
    assert.equal((await request("/api/cftc-history?symbol=BTC")).status, 400);
  } finally { globalThis.fetch = original; }
});

test("malformed official records fail closed at both public endpoints", async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async () => Response.json([{ cftc_contract_market_code: "088691", report_date_as_yyyy_mm_dd: "2026-09-08" }]);
  try {
    assert.equal((await request("/api/cftc-market")).status, 502);
    assert.equal((await request("/api/cftc-history?symbol=XAU")).status, 502);
  } finally { globalThis.fetch = original; }
});
