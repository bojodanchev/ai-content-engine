import { headers } from "next/headers";
import * as jose from "jose";

export type VerifiedWhop = { userId: string } | null;

// Verify x-whop-user-token (ES256) and return { userId } or null
export async function getVerifiedWhopUser(): Promise<VerifiedWhop> {
  const hdrs = await headers();
  const token = hdrs.get("x-whop-user-token");
  if (!token) {
    // fallback to cookie set by middleware if present, or guest id if enabled
    const cookieHeader = hdrs.get("cookie") || "";
    const mUid = cookieHeader.match(/ace_whop_uid=([^;]+)/);
    if (mUid?.[1]) return { userId: decodeURIComponent(mUid[1]) };
    const mGuest = cookieHeader.match(/ace_guest_id=([^;]+)/);
    if (mGuest?.[1]) return { userId: decodeURIComponent(mGuest[1]) };
    return null;
  }
  try {
    const publicKeyPem = `-----BEGIN PUBLIC KEY-----\nMFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAErz8a8vxvexHC0TLT91g7llOdDOsN\nuYiGEfic4Qhni+HMfRBuUphOh7F3k8QgwZc9UlL0AHmyYqtbhL9NuJes6w==\n-----END PUBLIC KEY-----`;
    const key = await jose.importSPKI(publicKeyPem, "ES256");
    const { payload } = await jose.jwtVerify(token, key, {
      issuer: "urn:whopcom:exp-proxy",
      audience: process.env.NEXT_PUBLIC_WHOP_APP_ID,
    });
    const sub = payload.sub;
    if (typeof sub !== "string" || !sub.trim()) return null;
    return { userId: sub };
  } catch {
    return null;
  }
}


