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
  db.prepare(
    `INSERT INTO sessions (id, user_id, access_token, refresh_token, expires_at) VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET user_id=excluded.user_id, access_token=excluded.access_token, refresh_token=excluded.refresh_token, expires_at=excluded.expires_at`
  ).run(sessionId, userId, accessToken, refreshToken ?? null, expiresAt ?? null);
}

export function getSessionUser(sessionId: string): { userId: string; accessToken: string } | null {
  const db = getDb();
  const row = db.prepare("SELECT user_id as userId, access_token as accessToken FROM sessions WHERE id = ?").get(sessionId) as any;
  return row ?? null;
}


