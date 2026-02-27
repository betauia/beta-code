export const prerender = false;
 
import { getCurrentUser } from "../../../lib/session";
import { addCompletedTask, initTaskCompletionsTable } from "../../../lib/users";
 
export async function POST({ request }: { request: Request }) {
  const user = await getCurrentUser(request);
 
  if (!user) {
    return new Response(
      JSON.stringify({ error: "Not logged in" }),
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }
 
  const body = await request.json().catch(() => ({}));
  const problemId = String(body?.problemId ?? "");
 
  if (!problemId) {
    return new Response(
      JSON.stringify({ error: "Missing problemId" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }
 
  await initTaskCompletionsTable();
  const added = await addCompletedTask(user.id, problemId);
 
  return new Response(
    JSON.stringify({ success: true, newTask: added }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
}