import type { APIRoute } from "astro";
import { deleteSession, getSessionCookie } from "../../lib/session";
 
export const POST: APIRoute = async ({ cookies }) => {
  const sessionId = getSessionCookie(cookies);
 
  if (sessionId) {
    deleteSession(sessionId);
  }
 
  cookies.delete("session", { path: "/" });
 
  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};