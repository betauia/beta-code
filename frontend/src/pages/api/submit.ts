export const prerender = false;

import { Queue } from "bullmq";
import IORedis from "ioredis";

const REDIS_URL = import.meta.env.REDIS_URL || process.env.REDIS_URL;
if (!REDIS_URL) throw new Error("Missing REDIS_URL");

const connection = new IORedis(REDIS_URL, { maxRetriesPerRequest: null });
const queue = new Queue("submissions", { connection });

export async function POST({ request }: { request: Request }) {
  const body = await request.json().catch(() => ({}));
  const code = String(body?.code ?? "");
  const problemId = String(body?.problemId ?? "");

  if (!code || !problemId) {
    return new Response(JSON.stringify({ error: "Missing code/problemId" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const job = await queue.add(
    "run",
    { code, problemId },
    {
      removeOnComplete: { count: 2000 },
      removeOnFail: { count: 2000 },
    }
  );

  return new Response(JSON.stringify({ jobId: job.id }), {
    headers: { "Content-Type": "application/json" },
  });
}
