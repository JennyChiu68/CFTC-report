import { getChatGPTUser } from "../../chatgpt-auth";

export const runtime = "edge";

export async function GET() {
  const user = await getChatGPTUser();
  return Response.json({
    authenticated: Boolean(user),
    entitlement: "diamond_vip_required",
    provider: "jin10",
    integration: "pending",
  }, { headers: { "cache-control": "private, no-store" } });
}
