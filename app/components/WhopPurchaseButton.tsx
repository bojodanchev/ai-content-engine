"use client";
import { useCallback, useState } from "react";
import { ensureWhopIframeSdk } from "@/lib/whopSdkClient";

type PurchasePlan = "PRO" | "ENTERPRISE";

export default function WhopPurchaseButton({
  plan,
  children,
  className,
}: {
  plan: PurchasePlan;
  children: React.ReactNode;
  className?: string;
}) {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const handleClick = useCallback(async () => {
    try {
      setLoading(true);
      setErr(null);
      const res = await fetch("/api/billing/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      if (!res.ok) {
        const t = await res.text().catch(() => "");
        throw new Error(t || `HTTP ${res.status}`);
      }
      const checkout = await res.json();
      const iframeSdk = await ensureWhopIframeSdk(4000);
      if (iframeSdk && typeof (iframeSdk as any).inAppPurchase === "function") {
        // Open Whop modal in the embed
        const result = await (iframeSdk as any).inAppPurchase(checkout);
        if (result?.status !== "ok") {
          setErr(result?.error || "Purchase cancelled");
        }
      } else {
        // Fallback: hosted checkout
        const url = checkout?.redirectUrl || `/api/billing/checkout?plan=${plan}`;
        try {
          if (typeof window !== "undefined" && window.top) {
            window.top.location.href = url;
          } else {
            window.location.href = url;
          }
        } catch {
          window.location.href = url;
        }
      }
    } catch (err: any) {
      setErr(err?.message || "Failed to start checkout.");
    } finally {
      setLoading(false);
    }
  }, [plan]);

  return (
    <>
      <button onClick={handleClick} disabled={loading} className={className}>
        {loading ? "Opening checkout…" : children}
      </button>
      {err && (
        <div className="mt-2 text-xs text-amber-300/90">
          {err}
        </div>
      )}
    </>
  );
}


