
export const prerender = false;

import { initTasksTable, getTestsForTask } from "../../../lib/tasks";

// GET /api/problems/task-file?taskId=N&fileName=X
// Serves downloadable data files attached to non-hidden tests for a task.
export async function GET({ url }: { url: URL }) {
  const taskId = Number(url.searchParams.get("taskId"));
  const fileName = url.searchParams.get("fileName");

  if (!taskId || !fileName) {
    return new Response(JSON.stringify({ error: "Missing taskId or fileName" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  await initTasksTable();
  const tests = await getTestsForTask(taskId);

  // Only serve files from non-hidden tests
  const test = tests.find(
    (t) => !t.is_hidden && t.data_file_name === fileName && t.data_file_content
  );

  if (!test || !test.data_file_content) {
    return new Response(JSON.stringify({ error: "File not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  const contentType = fileName.endsWith(".json")
    ? "application/json"
    : fileName.endsWith(".csv")
    ? "text/csv"
    : "text/plain";

  return new Response(test.data_file_content, {
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `attachment; filename="${fileName}"`,
    },
  });
}
