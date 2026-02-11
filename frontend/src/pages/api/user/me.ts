export const prerender = false;
 
import { getCurrentUser } from "../../../lib/session";
 
export async function GET({ request }: { request: Request }) {
  const user = await getCurrentUser(request);
 
  if (!user) {
    return new Response(
      JSON.stringify({ user: null }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  }
 
  return new Response(
    JSON.stringify({
      user: {
        id: user.id,
        username: user.username,
        completed_tasks: user.completed_tasks,
        is_admin: user.is_admin,
      },
    }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
}