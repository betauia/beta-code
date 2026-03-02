export const prerender = false;

import { initTasksTable, getTestsForTask } from "../../../lib/tasks";

const RUNNER_SECRET = import.meta.env.RUNNER_SECRET || process.env.RUNNER_SECRET || "";

// Internal endpoint used by the runner to fetch test cases for a task.
// GET /api/tasks/tests?taskId=N
// Protected by a shared secret passed via the Authorization header.
export async function GET({ request }: { request: Request }) {
  if (RUNNER_SECRET) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${RUNNER_SECRET}`) {
      return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 });
    }
  }
  
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