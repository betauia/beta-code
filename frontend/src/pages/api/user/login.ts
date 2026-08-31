export const prerender = false;
 
import { verifyUser, initUsersTable } from "../../../lib/users";
import { createSession, createSessionCookie } from "../../../lib/session";
import { isRateLimited, recordFailedAttempt, clearAttempts, getClientIp } from "../../../lib/rateLimit";

export async function POST({ request }: { request: Request }) {
  try {
    // Ensure table exists
    await initUsersTable();

    const body = await request.json().catch(() => ({}));
    const username = String(body?.username ?? "").trim();
    const password = String(body?.password ?? "");

    // Validate input
    if (!username || !password) {
      return new Response(
        JSON.stringify({ error: "Username and password are required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const rateLimitKey = `${getClientIp(request)}:${username.toLowerCase()}`;
    if (isRateLimited(rateLimitKey)) {
      return new Response(
        JSON.stringify({ error: "Too many failed attempts. Try again later." }),
        { status: 429, headers: { "Content-Type": "application/json" } }
      );
    }

    // Verify credentials
    const user = await verifyUser(username, password);

    if (!user) {
      recordFailedAttempt(rateLimitKey);
      return new Response(
        JSON.stringify({ error: "Invalid username or password" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    clearAttempts(rateLimitKey);

    // Create session
    const sessionId = createSession(user.id);
    const cookie = createSessionCookie(sessionId);
 
    return new Response(
      JSON.stringify({
        success: true,
        user: {
          id: user.id,
          username: user.username,
          completed_tasks: user.completed_tasks,
        },
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Set-Cookie": cookie,
        },
      }
    );
  } catch (err) {
    console.error("Login error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}