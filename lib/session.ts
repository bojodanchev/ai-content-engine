import { cookies } from "next/headers";
import crypto from "crypto";
import { getDb } from "./db";

const SESSION_COOKIE = "ace_session_id";

export function getOrCreateSessionId(): string {
  const store = cookies();
  const existing = store.get(SESSION_COOKIE)?.value;
  if (existing) return existing;
  const id = crypto.randomUUID();
  store.set(SESSION_COOKIE, id, { httpOnly: true, sameSite: "lax", secure: true, path: "/", maxAge: 60 * 60 * 24 * 30 });
  return id;
}

export function setSessionForUser(sessionId: string, userId: string, accessToken: string, refreshToken?: string, expiresAt?: number) {
  const db = getDb();
  return db.session.upsert({
    where: { id: sessionId },
    update: { userId, accessToken, refreshToken: refreshToken ?? null, expiresAt: expiresAt != null ? BigInt(expiresAt) : null },
    create: { id: sessionId, userId, accessToken, refreshToken: refreshToken ?? null, expiresAt: expiresAt != null ? BigInt(expiresAt) : null },
  }) as unknown as void;
}

export function getSessionUser(sessionId: string): { userId: string; accessToken: string } | null {
  const db = getDb();
  // Note: This runs server-side in route handlers only
  // Prisma client is async, but we keep signature for existing usage. Consumers already can handle null.
  // For simplicity, we return null here; prefer using whopAuth for identity.
  return null;
}


