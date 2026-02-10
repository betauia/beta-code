export const prerender = false;
 
import { getCurrentUser } from "../../../lib/session";
import { getAllUsers } from "../../../lib/users";
 
export async function GET({ request }: { request: Request }) {
  const user = await getCurrentUser(request);
 
  if (!user || !user.is_admin) {
    return new Response(
      JSON.stringify({ error: "Forbidden" }),
      { status: 403, headers: { "Content-Type": "application/json" } }
    );
  }
 
  const users = await getAllUsers();
 
  return new Response(
    JSON.stringify({ users }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
}