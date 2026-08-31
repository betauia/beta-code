export const prerender = false;

import crypto from "node:crypto";
import { initTasksTable, getTestsForTask } from "../../../lib/tasks";

const RUNNER_SECRET = import.meta.env.RUNNER_SECRET || process.env.RUNNER_SECRET || "";

function timingSafeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

// Internal endpoint used by the runner to fetch test cases for a task,
// including hidden tests' expected output — must never be reachable
// without a valid shared secret, even if RUNNER_SECRET isn't configured.
// GET /api/tasks/tests?taskId=N
export async function GET({ request }: { request: Request }) {
  const auth = request.headers.get("authorization") ?? "";
  if (!RUNNER_SECRET || !timingSafeEqual(auth, `Bearer ${RUNNER_SECRET}`)) {
    return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 });
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