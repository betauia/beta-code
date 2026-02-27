export const prerender = false;
 
import { getCompetitionStart } from "../../lib/settings";
 
// GET /api/settings — public endpoint returning competition start time
export async function GET() {
  const competition_start = getCompetitionStart();
  return new Response(JSON.stringify({ competition_start }), {
    headers: { "Content-Type": "application/json" },
  });
}