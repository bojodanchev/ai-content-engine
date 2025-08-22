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

function getSdkFrom(win: any): any | null {
  if (!win) return null;
  try {
    return win.iframeSdk || win.whopIframeSdk || win.whop?.iframeSdk || null;
  } catch {
    return null;
  }
}

function searchAncestorsForSdk(start: any, maxHops = 3): any | null {
  let cur = start;
  for (let i = 0; i <= maxHops; i++) {
    const found = getSdkFrom(cur);
    if (found && typeof found.inAppPurchase === "function") return found;
    try {
      if (!cur || cur.parent === cur) break;
      cur = cur.parent;
    } catch {
      break;
    }
  }
  return null;
}

export async function ensureWhopIframeSdk(timeoutMs = 2000): Promise<any | null> {
  const g: any = typeof window !== "undefined" ? window : {};
  let sdk = searchAncestorsForSdk(g);
  if (sdk && typeof sdk.inAppPurchase === "function") return sdk;

  // Try to load from CDN if not present (harmless if 404)
  try {
    await loadScriptOnce("https://cdn.whop.com/iframe-sdk.js");
  } catch {}

  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    sdk = searchAncestorsForSdk(g);
    if (sdk && typeof sdk.inAppPurchase === "function") return sdk;
    await new Promise((r) => setTimeout(r, 100));
  }
  return null;
}


