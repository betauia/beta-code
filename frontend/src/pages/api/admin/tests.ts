export const prerender = false;

import { getCurrentUser } from "../../../lib/session";
import {
  initTasksTable,
  getTestsForTask,
  createTest,
  deleteTest,
} from "../../../lib/tasks";

async function requireAdmin(request: Request) {
  const user = await getCurrentUser(request);
  if (!user || !user.is_admin) return null;
  return user;
}

// GET /api/admin/tests?taskId=N — list tests for a task
export async function GET({ request }: { request: Request }) {
  const user = await requireAdmin(request);
  if (!user) return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 });

  await initTasksTable();

  const url = new URL(request.url);
  const taskId = Number(url.searchParams.get("taskId"));
  if (!taskId) return new Response(JSON.stringify({ error: "Missing taskId" }), { status: 400 });

  const tests = await getTestsForTask(taskId);
  return new Response(JSON.stringify(tests), {
    headers: { "Content-Type": "application/json" },
  });
}

// POST /api/admin/tests — create a test
export async function POST({ request }: { request: Request }) {
  const user = await requireAdmin(request);
  if (!user) return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 });

  await initTasksTable();

  const body = await request.json().catch(() => ({}));
  const task_id = Number(body?.task_id);
  const name = String(body?.name ?? "").trim();
  const input = String(body?.input ?? "");
  const expected_output = String(body?.expected_output ?? "");
  const is_hidden = Boolean(body?.is_hidden);
  const data_file_name = body?.data_file_name ? String(body.data_file_name).trim() : null;
  const data_file_content = body?.data_file_content ? String(body.data_file_content) : null;

  if (!task_id) return new Response(JSON.stringify({ error: "Missing task_id" }), { status: 400 });
  if (!name) return new Response(JSON.stringify({ error: "Test name is required" }), { status: 400 });

  const test = await createTest({
    task_id,
    name,
    input,
    expected_output,
    is_hidden,
    data_file_name,
    data_file_content,
  });
  return new Response(JSON.stringify(test), {
    status: 201,
    headers: { "Content-Type": "application/json" },
  });
}

// DELETE /api/admin/tests — delete a test by id
export async function DELETE({ request }: { request: Request }) {
  const user = await requireAdmin(request);
  if (!user) return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 });

  await initTasksTable();

  const body = await request.json().catch(() => ({}));
  const id = Number(body?.id);
  if (!id) return new Response(JSON.stringify({ error: "Missing id" }), { status: 400 });

  const deleted = await deleteTest(id);
  return new Response(JSON.stringify({ success: deleted }), {
    headers: { "Content-Type": "application/json" },
  });
}