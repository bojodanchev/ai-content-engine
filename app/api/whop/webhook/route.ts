import { NextRequest } from "next/server";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function mapProductToPlan(productId?: string | null): "PRO" | "ENTERPRISE" | null {
  if (!productId) return null;
  // Prefer explicit server envs
  if (process.env.WHOP_PRO_PRODUCT_ID && productId === process.env.WHOP_PRO_PRODUCT_ID) return "PRO";
  if (process.env.WHOP_ENT_PRODUCT_ID && productId === process.env.WHOP_ENT_PRODUCT_ID) return "ENTERPRISE";
  // Fallback to public access pass ids you provided
  if (process.env.NEXT_PUBLIC_PRO_ACCESS_PASS_ID && productId === process.env.NEXT_PUBLIC_PRO_ACCESS_PASS_ID) return "PRO";
  if (process.env.NEXT_PUBLIC_ENT_ACCESS_PASS_ID && productId === process.env.NEXT_PUBLIC_ENT_ACCESS_PASS_ID) return "ENTERPRISE";
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

  const eventType: string = payload?.type || payload?.event || "";
  const userId: string | undefined = payload?.data?.user_id || payload?.user_id || payload?.data?.user?.id;
  const productId: string | undefined = payload?.data?.product_id || payload?.product_id || payload?.data?.product?.id;
  if (!eventType || !userId) {
    return new Response("Missing fields", { status: 400 });
  }

  const plan = mapProductToPlan(productId);
  const db = getDb();

  if (eventType.includes("membership") || eventType.includes("subscription")) {
    if (eventType.match(/created|activated|updated|resumed|reactivated/i)) {
      if (plan) {
        await db.subscription.upsert({
          where: { id: `${userId}:${plan}` },
          update: { status: "active", validUntil: null, source: "whop", externalId: payload?.data?.id ?? null },
          create: { id: `${userId}:${plan}`, userId, plan, status: "active", validUntil: null, source: "whop", externalId: payload?.data?.id ?? null },
        });
      }
    } else if (eventType.match(/canceled|cancelled|expired|paused/i)) {
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


