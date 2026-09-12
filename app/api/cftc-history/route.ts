import { assets } from "../../cftc-data";
import { cftcSource, fetchCftcSnapshots } from "../../cftc-service";

export const runtime = "edge";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get("symbol")?.toUpperCase();
  const requestedLimit = Number(searchParams.get("limit") ?? 104);
  const limit = Math.max(1, Math.min(104, Number.isFinite(requestedLimit) ? requestedLimit : 104));
  const asset = assets.find((item) => item.symbol === symbol);
  if (!asset) return Response.json({ error: "不支持的品种" }, { status: 400 });

  try {
    const snapshots = await fetchCftcSnapshots(asset, limit);
    return Response.json(
      { symbol: asset.symbol, source: cftcSource, snapshots, syncedAt: new Date().toISOString() },
      { headers: { "cache-control": "public, max-age=300, s-maxage=300" } },
    );
  } catch {
    return Response.json({ error: "CFTC历史数据暂时不可用" }, { status: 502 });
  }
}
