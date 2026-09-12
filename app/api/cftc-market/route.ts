import { assets } from "../../cftc-data";
import { cftcSource, fetchCftcSnapshots } from "../../cftc-service";

export const runtime = "edge";

export async function GET() {
  const results = await Promise.allSettled(assets.map(async (asset) => ({
    symbol: asset.symbol,
    snapshots: await fetchCftcSnapshots(asset, 26),
  })));
  const histories: Record<string, Awaited<ReturnType<typeof fetchCftcSnapshots>>> = {};
  const unavailable: string[] = [];

  results.forEach((result, index) => {
    const symbol = assets[index].symbol;
    if (result.status === "fulfilled" && result.value.snapshots.length) histories[symbol] = result.value.snapshots;
    else unavailable.push(symbol);
  });

  if (!Object.keys(histories).length) return Response.json({ error: "CFTC市场数据暂时不可用" }, { status: 502 });
  const reportDate = Object.values(histories).flatMap((items) => items[0]?.date ? [items[0].date] : []).sort().at(-1) ?? null;
  return Response.json(
    { source: cftcSource, scope: "Futures Only", reportDate, syncedAt: new Date().toISOString(), histories, unavailable },
    { headers: { "cache-control": "public, max-age=300, s-maxage=300" } },
  );
}
