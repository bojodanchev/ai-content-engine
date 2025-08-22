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

    // Ensure API key exists to avoid confusing errors
    const apiKey = process.env.WHOP_API_KEY;
    if (!apiKey || !apiKey.trim()) {
      return Response.json({ error: "WHOP_API_KEY is not configured" }, { status: 500 });
    }

    // Scope to your company and act on-behalf-of the purchasing user
    const companyId = (process.env.NEXT_PUBLIC_WHOP_COMPANY_ID || "").trim();
    const base = companyId ? whopApi.withCompany(companyId) : whopApi;
    const api = userId ? base.withUser(userId) : base;
    const checkoutSession = await api.payments.createCheckoutSession({
      planId,
      metadata: {
        source: "ace",
        requestedPlan: plan,
        userId: userId ?? "unknown",
        userAgent: hdrs.get("user-agent") || "",
      },
    });

    return Response.json({ ...checkoutSession, redirectUrl: `/api/billing/checkout?plan=${plan}` });
  } catch (e: any) {
    console.error("[billing] createCheckoutSession failed", e?.message || e);
    return Response.json({ error: e?.message || "Create checkout session failed" }, { status: 500 });
  }
}


