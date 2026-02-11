export const prerender = false;
 
import { getCurrentUser } from "../../../lib/session";
import { deleteUser } from "../../../lib/users";
 
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
 
  if (!userId || isNaN(userId)) {
    return new Response(
      JSON.stringify({ error: "Missing or invalid userId" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }
 
  if (userId === user.id) {
    return new Response(
      JSON.stringify({ error: "Cannot delete yourself" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }
 
  const deleted = await deleteUser(userId);
 
  return new Response(
    JSON.stringify({ success: deleted }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
}