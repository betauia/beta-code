export const prerender = false;

import { createTeam, listTeams } from "../../lib/teams";

type PgError = Error & { code?: string };

export async function GET() {
  try {
    const teams = await listTeams();
    return new Response(JSON.stringify({ teams }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Database unavailable";
    return new Response(JSON.stringify({ error: message }), {
      status: 503,
      headers: { "Content-Type": "application/json" },
    });
  }
}

export async function POST({ request }: { request: Request }) {
  const body = await request.json().catch(() => ({}));
  const name = String(body?.name ?? "").trim();
  const descriptionRaw = body?.description;
  const description =
    typeof descriptionRaw === "string" && descriptionRaw.trim()
      ? descriptionRaw.trim()
      : null;

  if (!name) {
    return new Response(JSON.stringify({ error: "Missing team name" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const team = await createTeam({ name, description });
    return new Response(JSON.stringify({ team }), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    const pgError = error as PgError;
    if (pgError.message?.includes("Missing DATABASE_URL")) {
      return new Response(JSON.stringify({ error: "Database not configured" }), {
        status: 503,
        headers: { "Content-Type": "application/json" },
      });
    }
    if (pgError.code === "23505") {
      return new Response(JSON.stringify({ error: "Team already exists" }), {
        status: 409,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unable to create team" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}