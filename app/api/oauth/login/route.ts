import { whopApi } from "@/lib/whop";
import { cookies } from "next/headers";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const next = url.searchParams.get("next") ?? "/dashboard";

  const { url: authUrl, state } = whopApi.oauth.getAuthorizationUrl({
    redirectUri: `${process.env.NEXT_PUBLIC_BASE_URL}/api/oauth/callback`,
    scope: ["read_user"],
  });

  cookies().set(`oauth-state.${state}`, encodeURIComponent(next), {
    httpOnly: true,
    sameSite: "lax",
    secure: true,
    path: "/",
    maxAge: 60 * 60,
  });

  return Response.redirect(authUrl);
}


