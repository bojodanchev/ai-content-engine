import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import * as jose from "jose";

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const token = req.headers.get("x-whop-user-token");
  if (token) {
    try {
      const publicKeyPem = `-----BEGIN PUBLIC KEY-----\nMFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAErz8a8vxvexHC0TLT91g7llOdDOsN\nuYiGEfic4Qhni+HMfRBuUphOh7F3k8QgwZc9UlL0AHmyYqtbhL9NuJes6w==\n-----END PUBLIC KEY-----`;
      const key = await jose.importSPKI(publicKeyPem, "ES256");
      const appId = (process.env.NEXT_PUBLIC_WHOP_APP_ID || "").trim();
      const { payload } = await jose.jwtVerify(token, key, {
        issuer: "urn:whopcom:exp-proxy",
        audience: appId,
      });
      const sub = typeof payload.sub === "string" ? payload.sub : null;
      if (sub) {
        res.cookies.set("ace_whop_uid", sub, {
          httpOnly: true,
          sameSite: "none",
          secure: true,
          path: "/",
          maxAge: 60 * 60, // 1 hour
        });
      }
    } catch {
      // ignore invalid token
    }
    return res;
  }
  // Ensure a guest id for anonymous usage (non-Whop direct visits or missing proxy headers)
  const hasGuest = req.cookies.get("ace_guest_id")?.value;
  if (!hasGuest) {
    // Basic UUID-like fallback
    const id = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
    res.cookies.set("ace_guest_id", `guest_${id}`, {
      httpOnly: true,
      sameSite: "none",
      secure: true,
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });
  }
  return res;
}

export const config = {
  matcher: "/:path*",
};


