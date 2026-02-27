export const prerender = false;
 
import { initUsersTable, initTaskCompletionsTable, getAllCompletions } from "../../lib/users";
import { initTasksTable, getAllTasks } from "../../lib/tasks";
 
export async function GET() {
  await initUsersTable();
  await initTaskCompletionsTable();
  await initTasksTable();
 
  const [completions, tasks] = await Promise.all([
    getAllCompletions(),
    getAllTasks(),
  ]);
 
  const pointsById = new Map(tasks.map((t) => [String(t.id), t.points]));
 
  return new Response(
    JSON.stringify({ completions, pointsById: Object.fromEntries(pointsById) }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
}