import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import * as jose from "jose";

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const token = req.headers.get("x-whop-user-token");
  if (!token) return res;
  try {
    const publicKeyPem = `-----BEGIN PUBLIC KEY-----\nMFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAErz8a8vxvexHC0TLT91g7llOdDOsN\nuYiGEfic4Qhni+HMfRBuUphOh7F3k8QgwZc9UlL0AHmyYqtbhL9NuJes6w==\n-----END PUBLIC KEY-----`;
    const key = await jose.importSPKI(publicKeyPem, "ES256");
    const { payload } = await jose.jwtVerify(token, key, {
      issuer: "urn:whopcom:exp-proxy",
      audience: process.env.NEXT_PUBLIC_WHOP_APP_ID,
    });
    const sub = typeof payload.sub === "string" ? payload.sub : null;
    if (sub) {
      res.cookies.set("ace_whop_uid", sub, {
        httpOnly: true,
        sameSite: "lax",
        secure: true,
        path: "/",
        maxAge: 60 * 60, // 1 hour
      });
    }
  } catch {
    // ignore; header may be missing or invalid
  }
  return res;
}

export const config = {
  matcher: "/:path*",
};


