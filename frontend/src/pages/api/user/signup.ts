export const prerender = false;
 
import { createUser, initUsersTable } from "../../../lib/users";
import { createSession, createSessionCookie } from "../../../lib/session";
 
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
 
    if (username.length < 3 || username.length > 50) {
      return new Response(
        JSON.stringify({ error: "Username must be between 3 and 50 characters" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }
 
    if (password.length < 6) {
      return new Response(
        JSON.stringify({ error: "Password must be at least 6 characters" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }
 
    // Create the user
    const user = await createUser(username, password);
 
    if (!user) {
      return new Response(
        JSON.stringify({ error: "Username already taken" }),
        { status: 409, headers: { "Content-Type": "application/json" } }
      );
    }
 
    // Create session and auto-login
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
        status: 201,
        headers: {
          "Content-Type": "application/json",
          "Set-Cookie": cookie,
        },
      }
    );
  } catch (err) {
    console.error("Signup error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}