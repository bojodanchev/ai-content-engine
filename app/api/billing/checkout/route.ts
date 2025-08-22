import { NextRequest } from "next/server";
import { resolveUserIdOrCreateGuest } from "@/lib/whopAuth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const userId = await resolveUserIdOrCreateGuest();
  const { plan } = await req.json().catch(() => ({ plan: "PRO" }));
  const productId = plan === "ENTERPRISE" ? process.env.WHOP_ENT_PRODUCT_ID : process.env.WHOP_PRO_PRODUCT_ID;
  if (!productId) return Response.json({ error: "Missing product configuration" }, { status: 500 });
  // Redirect user to Whop product page with optional referral/context
  const url = `https://whop.com/checkout/${productId}?app_user_id=${encodeURIComponent(userId)}`;
  return Response.json({ url });
}


