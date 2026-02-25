export const prerender = false;
 
import { getCurrentUser } from "../../../lib/session";
import { initCodeSavesTable, loadUserCode } from "../../../lib/users";
 
export async function GET({ request }: { request: Request }) {
  const user = await getCurrentUser(request);
  if (!user) {
    return new Response(JSON.stringify({ code: null }), {
      headers: { "Content-Type": "application/json" },
    });
  }
 
  const url = new URL(request.url);
  const problemId = url.searchParams.get("problemId") ?? "";
 
  if (!problemId) {
    return new Response(JSON.stringify({ error: "Missing problemId" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
 
  await initCodeSavesTable();
  const code = await loadUserCode(user.id, problemId);
 
  return new Response(JSON.stringify({ code }), {
    headers: { "Content-Type": "application/json" },
  });
}