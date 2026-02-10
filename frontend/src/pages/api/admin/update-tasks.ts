export const prerender = false;
 
import { getCurrentUser } from "../../../lib/session";
import { addCompletedTask, removeCompletedTask } from "../../../lib/users";
 
export async function POST({ request }: { request: Request }) {
  const user = await getCurrentUser(request);
 
  if (!user || !user.is_admin) {
    return new Response(
      JSON.stringify({ error: "Forbidden" }),
      { status: 403, headers: { "Content-Type": "application/json" } }
    );
  }
 
  const body = await request.json().catch(() => ({}));
  const userId = Number(body?.userId);
  const problemId = String(body?.problemId ?? "");
  const action = String(body?.action ?? ""); // "add" or "remove"
 
  if (!userId || isNaN(userId)) {
    return new Response(
      JSON.stringify({ error: "Missing or invalid userId" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }
 
  if (!problemId) {
    return new Response(
      JSON.stringify({ error: "Missing problemId" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }
 
  if (action !== "add" && action !== "remove") {
    return new Response(
      JSON.stringify({ error: "Action must be 'add' or 'remove'" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }
 
  let success: boolean;
  if (action === "add") {
    success = await addCompletedTask(userId, problemId);
  } else {
    success = await removeCompletedTask(userId, problemId);
  }
 
  return new Response(
    JSON.stringify({ success }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
}

