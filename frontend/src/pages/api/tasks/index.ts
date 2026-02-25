export const prerender = false;

import { initTasksTable, getAllTasks, getTaskById } from "../../../lib/tasks";

// GET /api/tasks — list all tasks
// GET /api/tasks?id=N — get a single task
export async function GET({ request }: { request: Request }) {
  await initTasksTable();

  const url = new URL(request.url);
  const idParam = url.searchParams.get("id");

  if (idParam) {
    const id = Number(idParam);
    if (!id) return new Response(JSON.stringify({ error: "Invalid id" }), { status: 400 });
    const task = await getTaskById(id);
    if (!task) return new Response(JSON.stringify({ error: "Not found" }), { status: 404 });
    return new Response(JSON.stringify(task), {
      headers: { "Content-Type": "application/json" },
    });
  }

  const tasks = await getAllTasks();
  return new Response(JSON.stringify(tasks), {
    headers: { "Content-Type": "application/json" },
  });
}