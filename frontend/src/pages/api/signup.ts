export const prerender = false;
 
import { createUser } from "../../lib/users";
 
type PgError = Error & { code?: string };
 
export async function POST({ request }: { request: Request }) {
  const body = await request.json().catch(() => ({}));
  const username = String(body?.username ?? "").trim();
  const password = String(body?.password ?? "");
 
  if (!username) {
    return new Response(JSON.stringify({ error: "Username is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
 
  if (username.length < 3) {
    return new Response(
      JSON.stringify({ error: "Username must be at least 3 characters" }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
 
  if (username.length > 30) {
    return new Response(
      JSON.stringify({ error: "Username must be at most 30 characters" }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
 
  if (!/^[a-zA-Z0-9_]+$/.test(username)) {
    return new Response(
      JSON.stringify({
        error: "Username can only contain letters, numbers, and underscores",
      }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
 
  if (!password) {
    return new Response(JSON.stringify({ error: "Password is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
 
  if (password.length < 6) {
    return new Response(
      JSON.stringify({ error: "Password must be at least 6 characters" }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
 
  try {
    const user = await createUser({ username, password });
    return new Response(JSON.stringify({ user }), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    const pgError = error as PgError;
 
    if (pgError.message?.includes("Missing DATABASE_URL")) {
      return new Response(
        JSON.stringify({ error: "Database not configured" }),
        {
          status: 503,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
 
    if (pgError.code === "23505") {
      return new Response(
        JSON.stringify({ error: "Username already taken" }),
        {
          status: 409,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
 
    return new Response(JSON.stringify({ error: "Unable to create account" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}