export const prerender = false;

import { getCurrentUser } from "../../../lib/session";
import {
  initTasksTable,
  getAllTasks,
  createTask,
  updateTask,
  deleteTask,
} from "../../../lib/tasks";

async function requireAdmin(request: Request) {
  const user = await getCurrentUser(request);
  if (!user || !user.is_admin) return null;
  return user;
}

// GET /api/admin/tasks — list all tasks
export async function GET({ request }: { request: Request }) {
  const user = await requireAdmin(request);
  if (!user) return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 });

  await initTasksTable();
  const tasks = await getAllTasks();
  return new Response(JSON.stringify(tasks), {
    headers: { "Content-Type": "application/json" },
  });
}

// POST /api/admin/tasks — create a task
export async function POST({ request }: { request: Request }) {
  const user = await requireAdmin(request);
  if (!user) return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 });

  await initTasksTable();

  const body = await request.json().catch(() => ({}));
  const name = String(body?.name ?? "").trim();
  const description = String(body?.description ?? "").trim();
  const code_preview = String(body?.code_preview ?? "");
  const points = Number(body?.points ?? 50);
  const type = body?.type === "fix" ? "fix" : "solve";
  const difficulty = ["Easy", "Medium", "Hard"].includes(body?.difficulty)
    ? body.difficulty
    : "Easy";

  if (!name) {
    return new Response(JSON.stringify({ error: "Name is required" }), { status: 400 });
  }

  const task = await createTask({ name, description, code_preview, points, type, difficulty });
  return new Response(JSON.stringify(task), {
    status: 201,
    headers: { "Content-Type": "application/json" },
  });
}

// DELETE /api/admin/tasks — delete a task by id
export async function DELETE({ request }: { request: Request }) {
  const user = await requireAdmin(request);
  if (!user) return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 });

  await initTasksTable();

  const body = await request.json().catch(() => ({}));
  const id = Number(body?.id);
  if (!id) return new Response(JSON.stringify({ error: "Missing id" }), { status: 400 });

  const deleted = await deleteTask(id);
  return new Response(JSON.stringify({ success: deleted }), {
    headers: { "Content-Type": "application/json" },
  });
}

// PUT /api/admin/tasks — update a task by id
export async function PUT({ request }: { request: Request }) {
  const user = await requireAdmin(request);
  if (!user) return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 });

  await initTasksTable();

  const body = await request.json().catch(() => ({}));
  const id = Number(body?.id);
  if (!id) return new Response(JSON.stringify({ error: "Missing id" }), { status: 400 });

  const name = String(body?.name ?? "").trim();
  const description = String(body?.description ?? "").trim();
  const code_preview = String(body?.code_preview ?? "");
  const points = Number(body?.points ?? 50);
  const type = body?.type === "fix" ? "fix" : "solve";
  const difficulty = ["Easy", "Medium", "Hard"].includes(body?.difficulty)
    ? body.difficulty
    : "Easy";

  if (!name) {
    return new Response(JSON.stringify({ error: "Name is required" }), { status: 400 });
  }

  const task = await updateTask(id, { name, description, code_preview, points, type, difficulty });
  if (!task) return new Response(JSON.stringify({ error: "Task not found" }), { status: 404 });

  return new Response(JSON.stringify(task), {
    headers: { "Content-Type": "application/json" },
  });
}