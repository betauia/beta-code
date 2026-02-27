export const prerender = false;
 
import { getCurrentUser } from "../../../lib/session";
import { getCompetitionStart, setCompetitionStart } from "../../../lib/settings";
 
async function requireAdmin(request: Request) {
  const user = await getCurrentUser(request);
  if (!user || !user.is_admin) return null;
  return user;
}
 
// GET /api/admin/settings — get current settings
export async function GET({ request }: { request: Request }) {
  const user = await requireAdmin(request);
  if (!user) return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 });
 
  return new Response(JSON.stringify({ competition_start: getCompetitionStart() }), {
    headers: { "Content-Type": "application/json" },
  });
}
 
// PUT /api/admin/settings — update competition start time
export async function PUT({ request }: { request: Request }) {
  const user = await requireAdmin(request);
  if (!user) return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 });
 
  const body = await request.json().catch(() => ({}));
  const competition_start = body?.competition_start ?? null;
 
  if (competition_start !== null && isNaN(Date.parse(competition_start))) {
    return new Response(JSON.stringify({ error: "Invalid date format" }), { status: 400 });
  }
 
  setCompetitionStart(competition_start);
  return new Response(JSON.stringify({ success: true, competition_start }), {
    headers: { "Content-Type": "application/json" },
  });
}