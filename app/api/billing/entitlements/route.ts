import { NextRequest } from "next/server";
import { resolveUserIdOrCreateGuest } from "@/lib/whopAuth";
import { getActivePlanForUser, getMonthlyUsage } from "@/lib/billing";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(_req: NextRequest) {
  const userId = await resolveUserIdOrCreateGuest();
  const entitlements = await getActivePlanForUser(userId);
  const usage = await getMonthlyUsage(userId);
  return Response.json({ entitlements, usage });
}
