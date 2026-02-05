import crypto from "crypto";
import type { User } from "./users";
import { getUserById } from "./users";
 
// In-memory session store (for simplicity - in production use Redis)
const sessions = new Map<string, { userId: number; expiresAt: number }>();
 
const SESSION_DURATION = 24 * 60 * 60 * 1000; // 24 hours
const COOKIE_NAME = "session_id";
 
// Generate a secure session ID
function generateSessionId(): string {
  return crypto.randomBytes(32).toString("hex");
}
 
// Create a new session for a user
export function createSession(userId: number): string {
  const sessionId = generateSessionId();
  const expiresAt = Date.now() + SESSION_DURATION;
 
  sessions.set(sessionId, { userId, expiresAt });
 
  return sessionId;
}
 
// Get user ID from session
export function getSessionUserId(sessionId: string): number | null {
  const session = sessions.get(sessionId);
 
  if (!session) {
    return null;
  }
 
  // Check if session has expired
  if (Date.now() > session.expiresAt) {
    sessions.delete(sessionId);
    return null;
  }
 
  return session.userId;
}
 
// Delete a session
export function deleteSession(sessionId: string): void {
  sessions.delete(sessionId);
}
 
// Parse session ID from cookie header
export function getSessionIdFromCookies(cookieHeader: string | null): string | null {
  if (!cookieHeader) return null;
 
  const cookies = cookieHeader.split(";").map((c) => c.trim());
  for (const cookie of cookies) {
    const [name, value] = cookie.split("=");
    if (name === COOKIE_NAME) {
      return value;
    }
  }
  return null;
}
 
// Create session cookie header value
export function createSessionCookie(sessionId: string): string {
  return `${COOKIE_NAME}=${sessionId}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${SESSION_DURATION / 1000}`;
}
 
// Create cookie to clear session
export function clearSessionCookie(): string {
  return `${COOKIE_NAME}=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0`;
}
 
// Get current user from request
export async function getCurrentUser(request: Request): Promise<User | null> {
  const cookieHeader = request.headers.get("cookie");
  const sessionId = getSessionIdFromCookies(cookieHeader);
 
  if (!sessionId) {
    return null;
  }
 
  const userId = getSessionUserId(sessionId);
  if (!userId) {
    return null;
  }
 
  return getUserById(userId);
}