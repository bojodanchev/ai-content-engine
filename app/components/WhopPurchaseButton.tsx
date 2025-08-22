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
      const res = await fetch("/api/billing/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      if (!res.ok) throw new Error("Failed to create checkout session");
      const checkout = await res.json();
      
      const sdk = await ensureWhopIframeSdk(3000);

      if (sdk && typeof sdk.inAppPurchase === "function") {
        // Open Whop modal in the embed
        const result = await sdk.inAppPurchase(checkout);
        if (result?.status !== "ok") {
          setErr(result?.error || "Purchase cancelled");
        }
      } else {
        setErr("Whop in-app checkout is not available in this view.");
      }
    } catch (err) {
      setErr("Failed to start checkout.");
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


