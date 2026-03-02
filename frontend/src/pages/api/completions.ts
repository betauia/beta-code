export const prerender = false;
 
import { initUsersTable, initTaskCompletionsTable, getAllCompletions, getAllUsers } from "../../lib/users";
import { initTasksTable, getAllTasks } from "../../lib/tasks";
import { getCompetitionStart, getCompetitionEnd } from "../../lib/settings";
 
import { getCurrentUser } from "../../lib/session";
 
export async function GET({ request }: { request: Request }) {
  const user = await getCurrentUser(request);
  if (!user) {
    return new Response(JSON.stringify({ error: "Not logged in" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
  await initUsersTable();
  await initTaskCompletionsTable();
  await initTasksTable();
 
  const [completions, tasks, users] = await Promise.all([
    getAllCompletions(),
    getAllTasks(),
    getAllUsers(),
  ]);
 
  const pointsById = new Map(tasks.map((t) => [String(t.id), t.points]));
  const playerUsernames = users.filter((u) => !u.is_admin).map((u) => u.username);
  const competitionStart = getCompetitionStart();
  const competitionEnd = getCompetitionEnd();
 
  return new Response(
    JSON.stringify({ completions, pointsById: Object.fromEntries(pointsById), playerUsernames, competitionStart, competitionEnd }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
}