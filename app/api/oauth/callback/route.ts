import { cookies } from "next/headers";
import { whopApi } from "@/lib/whop";
import { getDb } from "@/lib/db";
import { getOrCreateSessionId, setSessionForUser } from "@/lib/session";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  if (!code || !state) return new Response("Invalid OAuth response", { status: 400 });

  const nextCookie = cookies().get(`oauth-state.${state}`)?.value;
  cookies().delete(`oauth-state.${state}`);
  const nextPath = nextCookie ? decodeURIComponent(nextCookie) : "/dashboard";

  const { accessToken, refreshToken, expiresAt } = await whopApi.oauth.exchangeCode({
    redirectUri: `${process.env.NEXT_PUBLIC_BASE_URL}/api/oauth/callback`,
    code,
  });

  const me = await whopApi.me.getMe({ accessToken });

  const db = getDb();
  db.prepare(
    `INSERT INTO users (id, username, avatar_url) VALUES (?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET username=excluded.username, avatar_url=excluded.avatar_url`
  ).run(me.id, me.username ?? null, me.avatar_url ?? null);

  const sessionId = getOrCreateSessionId();
  setSessionForUser(sessionId, me.id, accessToken, refreshToken, expiresAt);

  return Response.redirect(`${process.env.NEXT_PUBLIC_BASE_URL}${nextPath}`);
}


