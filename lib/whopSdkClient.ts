declare global {
  interface Window {
    iframeSdk?: any;
    whop?: { iframeSdk?: any };
    whopIframeSdk?: any;
  }
}

function loadScriptOnce(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve();
      return;
    }
    const s = document.createElement("script");
    s.src = src;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(s);
  });
}

export async function ensureWhopIframeSdk(timeoutMs = 2000): Promise<any | null> {
  const g: any = typeof window !== "undefined" ? window : {};
  let sdk = g.iframeSdk || g.whopIframeSdk || g.whop?.iframeSdk || g.parent?.iframeSdk || g.parent?.whopIframeSdk || g.parent?.whop?.iframeSdk;
  if (sdk && typeof sdk.inAppPurchase === "function") return sdk;

  // Try to load from CDN if not present (harmless if 404)
  try {
    await loadScriptOnce("https://cdn.whop.com/iframe-sdk.js");
  } catch {}

  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    sdk = g.iframeSdk || g.whopIframeSdk || g.whop?.iframeSdk || g.parent?.iframeSdk || g.parent?.whopIframeSdk || g.parent?.whop?.iframeSdk;
    if (sdk && typeof sdk.inAppPurchase === "function") return sdk;
    await new Promise((r) => setTimeout(r, 100));
  }
  return null;
}


