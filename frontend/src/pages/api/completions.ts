export const prerender = false;
 
import { initUsersTable, initTaskCompletionsTable, getAllCompletions, getAllUsers } from "../../lib/users";
import { initTasksTable, getAllTasks } from "../../lib/tasks";
import { getCompetitionStart, getCompetitionEnd } from "../../lib/settings";
 
export async function GET() {
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