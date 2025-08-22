import { NextRequest } from "next/server";
import { whopApi } from "@/lib/whop";
import { headers } from "next/headers";
import { getVerifiedWhopUser } from "@/lib/whopAuth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const { plan } = await req.json().catch(() => ({ plan: "PRO" }));
    const planId = plan === "ENTERPRISE" ? process.env.NEXT_PUBLIC_ENT_PLAN_ID : process.env.NEXT_PUBLIC_PRO_PLAN_ID;
    if (!planId || !/^plan_/.test(String(planId))) {
      return Response.json({ error: "Invalid or missing plan id (must start with plan_)" }, { status: 400 });
    }

    // Optional: verify Whop user; not strictly needed for creating the session
    const hdrs = await headers();
    const verified = await getVerifiedWhopUser().catch(() => null);
    const userId = verified?.userId || null;

    // Create a subscription checkout session per Whop docs
    // Create the checkout session as the app/company (do not act on-behalf-of)
    const checkoutSession = await whopApi.payments.createCheckoutSession({
      planId,
      metadata: {
        source: "ace",
        requestedPlan: plan,
        userId: userId ?? "unknown",
        userAgent: hdrs.get("user-agent") || "",
      },
    });

    // If Whop injects iframe SDK, the object above can be passed directly.
    // Also include a hosted redirect fallback URL.
    return Response.json({ ...checkoutSession, redirectUrl: `/api/billing/checkout?plan=${plan}` });
  } catch (e: any) {
    console.error("[billing] createCheckoutSession failed", e?.message || e);
    return Response.json({ error: e?.message || "Create checkout session failed" }, { status: 500 });
  }
}


