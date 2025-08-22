import { NextRequest } from "next/server";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function mapProductToPlan(productOrAccessPassId?: string | null): "PRO" | "ENTERPRISE" | null {
  const id = productOrAccessPassId;
  if (!productId) return null;
  // Prefer explicit server envs
  if (process.env.WHOP_PRO_PRODUCT_ID && id === process.env.WHOP_PRO_PRODUCT_ID) return "PRO";
  if (process.env.WHOP_ENT_PRODUCT_ID && id === process.env.WHOP_ENT_PRODUCT_ID) return "ENTERPRISE";
  // Fallback to public access pass ids you provided
  if (process.env.NEXT_PUBLIC_PRO_ACCESS_PASS_ID && id === process.env.NEXT_PUBLIC_PRO_ACCESS_PASS_ID) return "PRO";
  if (process.env.NEXT_PUBLIC_ENT_ACCESS_PASS_ID && id === process.env.NEXT_PUBLIC_ENT_ACCESS_PASS_ID) return "ENTERPRISE";
  return null;
}

export async function POST(req: NextRequest) {
  const secretHeader = req.headers.get("x-whop-webhook-secret");
  const expected = process.env.WHOP_WEBHOOK_SECRET;
  if (!expected || secretHeader !== expected) {
    return new Response("Unauthorized", { status: 401 });
  }

  let payload: any;
  try {
    payload = await req.json();
  } catch {
    return new Response("Bad JSON", { status: 400 });
  }

  const eventType: string = payload?.type || payload?.event || payload?.name || "";
  const userId: string | undefined = payload?.data?.user_id || payload?.user_id || payload?.data?.user?.id || payload?.user?.id;
  // Try both product and access pass identifiers
  const relatedId: string | undefined =
    payload?.data?.product_id || payload?.product_id || payload?.data?.product?.id ||
    payload?.data?.access_pass_id || payload?.access_pass_id || payload?.data?.access_pass?.id;
  if (!eventType || !userId) {
    return new Response("Missing fields", { status: 400 });
  }

  const plan = mapProductToPlan(relatedId);
  const db = getDb();

  if (eventType.includes("membership") || eventType.includes("subscription")) {
    // Handle Whop membership lifecycle events shown in dashboard
    const isNowActive = /membership_went_valid|membership_experience_claimed|created|activated|updated|resumed|reactivated/i.test(eventType);
    const isNowInactive = /membership_went_invalid|canceled|cancelled|expired|paused/i.test(eventType);
    if (isNowActive) {
      if (plan) {
        await db.subscription.upsert({
          where: { id: `${userId}:${plan}` },
          update: { status: "active", validUntil: null, source: "whop", externalId: payload?.data?.id ?? null },
          create: { id: `${userId}:${plan}`, userId, plan, status: "active", validUntil: null, source: "whop", externalId: payload?.data?.id ?? null },
        });
      }
    } else if (isNowInactive) {
      if (plan) {
        await db.subscription.upsert({
          where: { id: `${userId}:${plan}` },
          update: { status: "canceled", validUntil: payload?.data?.valid_until ? new Date(payload.data.valid_until) : null, source: "whop", externalId: payload?.data?.id ?? null },
          create: { id: `${userId}:${plan}`, userId, plan, status: "canceled", validUntil: payload?.data?.valid_until ? new Date(payload.data.valid_until) : null, source: "whop", externalId: payload?.data?.id ?? null },
        });
      }
    }
  }

  return Response.json({ ok: true });
}


