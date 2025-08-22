import { NextRequest } from "next/server";
import { whopApi } from "@/lib/whop";
import { headers } from "next/headers";
import { getVerifiedWhopUser } from "@/lib/whopAuth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const { plan } = await req.json().catch(() => ({ plan: "PRO" }));
  const planId = plan === "ENTERPRISE" ? process.env.NEXT_PUBLIC_ENT_PLAN_ID : process.env.NEXT_PUBLIC_PRO_PLAN_ID;
  if (!planId) return Response.json({ error: "Missing plan configuration" }, { status: 500 });

  // Optional: verify Whop user; not strictly needed for creating the session
  const hdrs = await headers();
  const verified = await getVerifiedWhopUser().catch(() => null);
  const userId = verified?.userId || null;

  const checkoutSession = await whopApi.payments.createCheckoutSession({
    planId,
    metadata: {
      source: "ace",
      requestedPlan: plan,
      userId: userId ?? "unknown",
      userAgent: hdrs.get("user-agent") || "",
    },
  });

  return Response.json(checkoutSession);
}


