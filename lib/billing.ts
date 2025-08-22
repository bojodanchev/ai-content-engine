import { getDb } from "./db";
import { whopApi } from "./whop";

export type PlanKey = "FREE" | "PRO" | "ENTERPRISE";

export type Entitlements = {
  plan: PlanKey;
  monthlyVideoLimit: number | null; // null = unlimited
  features: {
    advancedMetadata: boolean;
    priorityProcessing: boolean;
    batchOperations: boolean;
    customMetadataTemplates: boolean;
    whiteLabel: boolean;
  };
};

export const PLAN_ENTITLEMENTS: Record<PlanKey, Entitlements> = {
  FREE: {
    plan: "FREE",
    monthlyVideoLimit: 5,
    features: {
      advancedMetadata: false,
      priorityProcessing: false,
      batchOperations: false,
      customMetadataTemplates: false,
      whiteLabel: false,
    },
  },
  PRO: {
    plan: "PRO",
    monthlyVideoLimit: 100,
    features: {
      advancedMetadata: true,
      priorityProcessing: true,
      batchOperations: true,
      customMetadataTemplates: false,
      whiteLabel: false,
    },
  },
  ENTERPRISE: {
    plan: "ENTERPRISE",
    monthlyVideoLimit: null,
    features: {
      advancedMetadata: true,
      priorityProcessing: true,
      batchOperations: true,
      customMetadataTemplates: true,
      whiteLabel: true,
    },
  },
};

export async function getActivePlanForUser(userId: string): Promise<Entitlements> {
  const db = getDb();
  // First, check live Whop access for PRO/ENTERPRISE (authoritative)
  try {
    const proAccessPassId = process.env.NEXT_PUBLIC_PRO_ACCESS_PASS_ID;
    const entAccessPassId = process.env.NEXT_PUBLIC_ENT_ACCESS_PASS_ID;
    if (entAccessPassId) {
      const res = await whopApi.access.checkIfUserHasAccessToAccessPass({ accessPassId: entAccessPassId, userId });
      if (res?.hasAccess && res?.accessLevel === "customer") {
        return PLAN_ENTITLEMENTS.ENTERPRISE;
      }
    }
    if (proAccessPassId) {
      const res = await whopApi.access.checkIfUserHasAccessToAccessPass({ accessPassId: proAccessPassId, userId });
      if (res?.hasAccess && res?.accessLevel === "customer") {
        return PLAN_ENTITLEMENTS.PRO;
      }
    }
  } catch {}

  // Fallback to our local subscription table if available
  const sub = await db.subscription.findFirst({
    where: {
      userId,
      status: { in: ["active", "trialing"] },
      OR: [{ validUntil: null }, { validUntil: { gt: new Date() } }],
    },
    orderBy: { createdAt: "desc" },
  });
  if (!sub) return PLAN_ENTITLEMENTS.FREE;
  const planKey = sub.plan as PlanKey;
  return PLAN_ENTITLEMENTS[planKey] ?? PLAN_ENTITLEMENTS.FREE;
}

function formatMonth(date = new Date()): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

export async function getMonthlyUsage(userId: string): Promise<{ month: string; videosUsed: number }> {
  const db = getDb();
  const month = formatMonth();
  const usage = await db.monthlyUsage.findUnique({ where: { userId_month: { userId, month } } });
  return { month, videosUsed: usage?.videosUsed ?? 0 };
}

export async function canUserCreateJob(userId: string): Promise<{ allowed: boolean; reason?: string; entitlements: Entitlements; usage: { month: string; videosUsed: number } }>{
  const entitlements = await getActivePlanForUser(userId);
  const usage = await getMonthlyUsage(userId);
  if (entitlements.monthlyVideoLimit == null) {
    return { allowed: true, entitlements, usage };
  }
  if (usage.videosUsed >= entitlements.monthlyVideoLimit) {
    return { allowed: false, reason: "quota_exceeded", entitlements, usage };
  }
  return { allowed: true, entitlements, usage };
}

export async function incrementMonthlyUsage(userId: string, amount = 1): Promise<void> {
  const db = getDb();
  const month = formatMonth();
  await db.monthlyUsage.upsert({
    where: { userId_month: { userId, month } },
    update: { videosUsed: { increment: amount } },
    create: { userId, month, videosUsed: amount },
  });
}


