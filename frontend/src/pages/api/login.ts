import type { APIRoute } from "astro";
import { authenticateUser, initUsersTable } from "../../lib/users";
import { createSession } from "../../lib/session";
 
export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    await initUsersTable();
 
    const body = await request.json();
    const { username, password } = body;
 
    if (!username || !password) {
      return new Response(
        JSON.stringify({ success: false, error: "Username and password are required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }
 
    const result = await authenticateUser(username, password);
 
    if (!result.success || !result.user) {
      return new Response(
        JSON.stringify({ success: false, error: result.error }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }
 
    // Create session and set cookie
    const sessionId = createSession(result.user);
    cookies.set("session", sessionId, {
      path: "/",
      httpOnly: true,
      secure: import.meta.env.PROD,
      sameSite: "lax",
      maxAge: 60 * 60 * 24, // 24 hours
    });
 
    return new Response(
      JSON.stringify({
        success: true,
        user: {
          id: result.user.id,
          username: result.user.username,
          tasks_completed: result.user.tasks_completed,
          points: result.user.points,
        },
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Login error:", error);
    return new Response(
      JSON.stringify({ success: false, error: "An error occurred during login" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};