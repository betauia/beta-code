export const prerender = false;
 
import { getCurrentUser } from "../../../lib/session";
import { initCodeSavesTable, saveUserCode } from "../../../lib/users";
 
export async function POST({ request }: { request: Request }) {
  const user = await getCurrentUser(request);
  if (!user) {
    return new Response(JSON.stringify({ error: "Not logged in" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
 
  const body = await request.json().catch(() => ({}));
  const problemId = String(body?.problemId ?? "");
  const code = String(body?.code ?? "");
 
  if (!problemId) {
    return new Response(JSON.stringify({ error: "Missing problemId" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
 
  await initCodeSavesTable();
  await saveUserCode(user.id, problemId, code);
 
  return new Response(JSON.stringify({ ok: true }), {
    headers: { "Content-Type": "application/json" },
  });
}