import { randomBytes } from "crypto";
import type { UserPublic } from "./users";
 
// In-memory session store (for production, use Redis or database)
const sessions = new Map<string, { user: UserPublic; expiresAt: number }>();
 
const SESSION_DURATION = 24 * 60 * 60 * 1000; // 24 hours
 
export function createSession(user: UserPublic): string {
  const sessionId = randomBytes(32).toString("hex");
  const expiresAt = Date.now() + SESSION_DURATION;
  sessions.set(sessionId, { user, expiresAt });
  return sessionId;
}
 
export function getSession(sessionId: string): UserPublic | null {
  const session = sessions.get(sessionId);
  if (!session) return null;
 
  if (Date.now() > session.expiresAt) {
    sessions.delete(sessionId);
    return null;
  }
 
  return session.user;
}
 
export function deleteSession(sessionId: string): void {
  sessions.delete(sessionId);
}
 
export function updateSessionUser(sessionId: string, user: UserPublic): void {
  const session = sessions.get(sessionId);
  if (session) {
    session.user = user;
  }
}
 
// Cookie helpers
export function getSessionCookie(cookies: { get: (name: string) => { value: string } | undefined }): string | null {
  const cookie = cookies.get("session");
  return cookie?.value || null;
}
 
export function getUserFromCookies(cookies: { get: (name: string) => { value: string } | undefined }): UserPublic | null {
  const sessionId = getSessionCookie(cookies);
  if (!sessionId) return null;
  return getSession(sessionId);
}