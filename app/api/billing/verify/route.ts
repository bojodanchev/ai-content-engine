import { whopApi } from "@/lib/whop";
import { getVerifiedWhopUser } from "@/lib/whopAuth";
import { getActivePlanForUser } from "@/lib/billing";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const verified = await getVerifiedWhopUser();
  if (!verified?.userId) return Response.json({ error: "Missing Whop user context" }, { status: 401 });

  const userId = verified.userId;
  const proPass = process.env.NEXT_PUBLIC_PRO_ACCESS_PASS_ID;
  const entPass = process.env.NEXT_PUBLIC_ENT_ACCESS_PASS_ID;
  const companyId = (process.env.NEXT_PUBLIC_WHOP_COMPANY_ID || "").trim();

  const results: any = { userId };

  try {
    if (proPass) {
      const r = await whopApi.access.checkIfUserHasAccessToAccessPass({ accessPassId: proPass, userId });
      results.hasProAccess = Boolean(r?.hasAccess);
    }
    if (entPass) {
      const r = await whopApi.access.checkIfUserHasAccessToAccessPass({ accessPassId: entPass, userId });
      results.hasEntAccess = Boolean(r?.hasAccess);
    }
    if (companyId) {
      const r = await whopApi.access.checkIfUserHasAccessToCompany({ companyId, userId });
      results.companyAccess = r;
    }
  } catch (e: any) {
    results.checkError = e?.message || String(e);
  }

  const plan = await getActivePlanForUser(userId);
  return Response.json({ ...results, resolvedPlan: plan });
}


