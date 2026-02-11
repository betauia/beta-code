export const prerender = false;
 
import {
  getSessionIdFromCookies,
  deleteSession,
  clearSessionCookie,
} from "../../../lib/session";
 
export async function POST({ request }: { request: Request }) {
  const cookieHeader = request.headers.get("cookie");
  const sessionId = getSessionIdFromCookies(cookieHeader);
 
  if (sessionId) {
    deleteSession(sessionId);
  }
 
  return new Response(
    JSON.stringify({ success: true }),
    {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Set-Cookie": clearSessionCookie(),
      },
    }
  );
}