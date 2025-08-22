"use client";
import { useEffect, useState } from "react";
import WhopPurchaseButton from "@/app/components/WhopPurchaseButton";

export default function BillingClient() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/billing/entitlements", { cache: "no-store" });
        if (!res.ok) throw new Error("Failed to load entitlements");
        const json = await res.json();
        if (!cancelled) setData(json);
      } catch (e: any) {
        if (!cancelled) setError(e?.message || "Failed to load entitlements");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  if (loading) return <div className="rounded-xl border border-white/10 bg-white/5 p-4">Loading plan…</div>;
  if (error) return <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-rose-200">{error}</div>;

  const plan = data?.entitlements?.plan || "FREE";
  const limit = data?.entitlements?.monthlyVideoLimit ?? null;
  const used = data?.usage?.videosUsed ?? 0;
  const isFree = plan === "FREE";

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm text-white/60">Current Plan</div>
          <div className="text-xl font-semibold">{plan}</div>
        </div>
        <div className="text-right">
          <div className="text-sm text-white/60">This Month</div>
          <div className="text-xl font-semibold">{limit === null ? `${used} / ∞` : `${used} / ${limit}`}</div>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-2">
        {isFree && (
          <WhopPurchaseButton plan="PRO" className="rounded-lg px-3 py-2 text-sm border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-center">Upgrade to Pro ($9.99)</WhopPurchaseButton>
        )}
        {plan !== "ENTERPRISE" && (
          <WhopPurchaseButton plan="ENTERPRISE" className="rounded-lg px-3 py-2 text-sm border border-sky-500/30 bg-sky-500/10 hover:bg-sky-500/20 text-center">Upgrade to Enterprise ($29.99)</WhopPurchaseButton>
        )}
        <a href="https://whop.com" className="rounded-lg px-3 py-2 text-sm border border-white/15 hover:bg-white/10">Manage Billing</a>
      </div>
    </div>
  );
}
