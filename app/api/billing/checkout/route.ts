import { NextRequest } from "next/server";
import { resolveUserIdOrCreateGuest } from "@/lib/whopAuth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function resolveCheckoutId(plan: string) {
  const upper = String(plan || "PRO").toUpperCase();
  if (upper === "ENTERPRISE") {
    return (
      process.env.WHOP_ENT_PRODUCT_ID ||
      process.env.NEXT_PUBLIC_ENT_ACCESS_PASS_ID ||
      process.env.NEXT_PUBLIC_ENT_PLAN_ID ||
      null
    );
  }
  return (
    process.env.WHOP_PRO_PRODUCT_ID ||
    process.env.NEXT_PUBLIC_PRO_ACCESS_PASS_ID ||
    process.env.NEXT_PUBLIC_PRO_PLAN_ID ||
    null
  );
}

function buildCheckoutUrl(id: string, userId: string) {
  // Whop supports /checkout/{id}; append app_user_id for association
  return `https://whop.com/checkout/${id}?app_user_id=${encodeURIComponent(userId)}`;
}

export async function POST(req: NextRequest) {
  const userId = await resolveUserIdOrCreateGuest();
  const { plan } = await req.json().catch(() => ({ plan: "PRO" }));
  const id = resolveCheckoutId(plan);
  if (!id) return Response.json({ error: "Missing plan configuration" }, { status: 500 });
  const url = buildCheckoutUrl(id, userId);
  return Response.json({ url });
}

export async function GET(req: NextRequest) {
  const userId = await resolveUserIdOrCreateGuest();
  const u = new URL(req.url);
  const plan = u.searchParams.get("plan") || "PRO";
  const id = resolveCheckoutId(plan);
  if (!id) return new Response("Missing plan configuration", { status: 500 });
  const url = buildCheckoutUrl(id, userId);
  return Response.redirect(url, 302);
}


