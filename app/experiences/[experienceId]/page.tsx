import { redirect } from "next/navigation";
import { headers } from "next/headers";
import * as jose from "jose";

export const dynamic = "force-dynamic";

export default function ExperienceEntry() {
  // Whop may mount the app at /experiences/[experienceId]. We don't need the id
  // for the UI today, so route users to the public landing page by default.
  redirect("/");
}

// Helper to verify the Whop user token if we need the user server-side soon.
export async function verifyWhopUserToken() {
  const hdrs = await headers();
  const token = hdrs.get("x-whop-user-token");
  if (!token) return null;
  try {
    const publicKeyPem = `-----BEGIN PUBLIC KEY-----\nMFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAErz8a8vxvexHC0TLT91g7llOdDOsN\nuYiGEfic4Qhni+HMfRBuUphOh7F3k8QgwZc9UlL0AHmyYqtbhL9NuJes6w==\n-----END PUBLIC KEY-----`;
    const key = await jose.importSPKI(publicKeyPem, "ES256");
    const { payload } = await jose.jwtVerify(token, key, {
      issuer: "urn:whopcom:exp-proxy",
      audience: process.env.NEXT_PUBLIC_WHOP_APP_ID,
    });
    return { userId: payload.sub as string };
  } catch {
    return null;
  }
}


