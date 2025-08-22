"use client";
import { useCallback, useState } from "react";

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
      
      const g: any = typeof window !== "undefined" ? window : {};
      // Heuristics for SDK in Whop embed
      let sdk =
        g?.iframeSdk ||
        g?.whopIframeSdk ||
        g?.whop?.iframeSdk ||
        g?.parent?.iframeSdk ||
        g?.parent?.whopIframeSdk ||
        g?.parent?.whop?.iframeSdk;

      // In case the SDK initializes a moment after click, poll briefly
      if (!sdk) {
        await new Promise((r) => setTimeout(r, 400));
        sdk =
          g?.iframeSdk ||
          g?.whopIframeSdk ||
          g?.whop?.iframeSdk ||
          g?.parent?.iframeSdk ||
          g?.parent?.whopIframeSdk ||
          g?.parent?.whop?.iframeSdk;
      }

      if (sdk && typeof sdk.inAppPurchase === "function") {
        // Open Whop modal in the embed
        const result = await sdk.inAppPurchase(checkout);
        if (result?.status !== "ok") {
          // Fallback to redirect if modal fails/cancelled
          window.location.href = checkout?.redirectUrl || `/api/billing/checkout?plan=${plan}`;
        }
      } else {
        // Final fallback: open hosted checkout
        window.location.href = checkout?.redirectUrl || `/api/billing/checkout?plan=${plan}`;
      }
    } catch (err) {
      // Final fallback to redirect route
      window.location.href = `/api/billing/checkout?plan=${plan}`;
    } finally {
      setLoading(false);
    }
  }, [plan]);

  return (
    <button onClick={handleClick} disabled={loading} className={className}>
      {loading ? "Opening checkout…" : children}
    </button>
  );
}


