"use client";
import { useEffect } from "react";

export default function WhopIframeClientProvider() {
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const appId = (process.env.NEXT_PUBLIC_WHOP_APP_ID || "").trim();
        if (!appId) return;
        // Dynamically import to avoid SSR issues
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        const mod = await import("@whop/iframe");
        const createSdk = (mod as any)?.createSdk;
        if (typeof createSdk === "function" && !cancelled) {
          const sdk = createSdk({ appId });
          // Expose for our button helper
          (window as any).iframeSdk = sdk;
        }
      } catch {
        // ignore; hosted checkout fallback will handle
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);
  return null;
}
