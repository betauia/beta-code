export const prerender = false;

import { initTasksTable, getTestsForTask } from "../../../lib/tasks";

// Internal endpoint used by the runner to fetch test cases for a task.
// GET /api/tasks/tests?taskId=N
export async function GET({ request }: { request: Request }) {
  await initTasksTable();

  const url = new URL(request.url);
  const taskId = Number(url.searchParams.get("taskId"));
  if (!taskId) {
    return new Response(JSON.stringify({ error: "Missing taskId" }), { status: 400 });
  }

  const tests = await getTestsForTask(taskId);
  return new Response(JSON.stringify(tests), {
    headers: { "Content-Type": "application/json" },
  });
}