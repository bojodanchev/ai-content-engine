import { headers } from "next/headers";
import * as jose from "jose";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const hdrs = await headers();
  const token = hdrs.get("x-whop-user-token");
  const cookie = hdrs.get("cookie") || "";
  const aceWhopUid = /ace_whop_uid=([^;]+)/.exec(cookie)?.[1];
  const aceGuest = /ace_guest_id=([^;]+)/.exec(cookie)?.[1];

  let decoded: any = null;
  if (token) {
    try {
      const publicKeyPem = `-----BEGIN PUBLIC KEY-----\nMFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAErz8a8vxvexHC0TLT91g7llOdDOsN\nuYiGEfic4Qhni+HMfRBuUphOh7F3k8QgwZc9UlL0AHmyYqtbhL9NuJes6w==\n-----END PUBLIC KEY-----`;
      const key = await jose.importSPKI(publicKeyPem, "ES256");
      const appId = (process.env.NEXT_PUBLIC_WHOP_APP_ID || "").trim();
      const { payload } = await jose.jwtVerify(token, key, {
        issuer: "urn:whopcom:exp-proxy",
        audience: appId,
      });
      decoded = { sub: payload.sub, aud: payload.aud };
    } catch (e: any) {
      decoded = { error: e?.message || "verify failed" };
    }
  }

  return Response.json({
    hasHeader: Boolean(token),
    aceWhopUid: aceWhopUid || null,
    aceGuestId: aceGuest || null,
    decoded,
    appId: (process.env.NEXT_PUBLIC_WHOP_APP_ID || "").trim() || null,
  });
}


