import { cookies } from "next/headers";
import { whopApi } from "@/lib/whop";
import { getDb } from "@/lib/db";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  if (!code || !state) return new Response("Invalid OAuth response", { status: 400 });

  const nextCookie = cookies().get(`oauth-state.${state}`)?.value;
  cookies().delete(`oauth-state.${state}`);
  const nextPath = nextCookie ? decodeURIComponent(nextCookie) : "/dashboard";

  const result = await whopApi.oauth.exchangeCode({
    redirectUri: `${process.env.NEXT_PUBLIC_BASE_URL}/api/oauth/callback`,
    code,
  });
  if (!("ok" in result) || !result.ok) {
    return new Response("OAuth exchange failed", { status: 401 });
  }
  // We don't persist tokens here; identity is handled via Whop proxy header + middleware cookie.
  // Optionally, we could fetch user profile with result.tokens.access_token when needed.

  return Response.redirect(`${process.env.NEXT_PUBLIC_BASE_URL}${nextPath}`);
}


