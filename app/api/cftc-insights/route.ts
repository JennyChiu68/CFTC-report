import { assets } from "../../cftc-data";
import { rankStandardizedInsights } from "../../cftc-insights.mjs";
import { cftcSource, fetchCftcSnapshots } from "../../cftc-service";

export const runtime = "edge";

export async function GET() {
  const results = await Promise.allSettled(assets.map(async (asset) => ({
    asset,
    snapshots: await fetchCftcSnapshots(asset, 156),
  })));
  const available = results.flatMap((result) => result.status === "fulfilled" && result.value.snapshots.length ? [result.value] : []);
  const unavailable = results.flatMap((result, index) => result.status === "rejected" || !result.value.snapshots.length ? [assets[index].symbol] : []);
  if (!available.length) return Response.json({ error: "CFTC异动分析暂时不可用" }, { status: 502 });

  const insights = rankStandardizedInsights(available, 5);
  return Response.json(
    { source: cftcSource, insights, unavailable, reportDate: insights[0]?.reportDate ?? null },
    { headers: { "cache-control": "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400" } },
  );
}
