export const prerender = false;

import { Queue } from "bullmq";
import IORedis from "ioredis";
import { getCurrentUser } from "../../../lib/session";

const REDIS_URL = import.meta.env.REDIS_URL || process.env.REDIS_URL;
if (!REDIS_URL) throw new Error("Missing REDIS_URL");

const connection = new IORedis(REDIS_URL, { maxRetriesPerRequest: null });
const queue = new Queue("submissions", { connection });

export async function GET({ request, url }: { request: Request; url: URL }) {
  const user = await getCurrentUser(request);
  if (!user) {
    return new Response(JSON.stringify({ error: "Not logged in" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const jobId = url.searchParams.get("jobId");
  if (!jobId) {
    return new Response(JSON.stringify({ error: "Missing jobId" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const job = await queue.getJob(jobId);
  if (!job) {
    return new Response(JSON.stringify({ error: "Unknown jobId" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Only the submitting player (or an admin) can read this submission's result.
  if (job.data?.userId !== user.id && !user.is_admin) {
    return new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }

  const state = await job.getState();

  if (state === "completed") {
    return new Response(JSON.stringify({ state, result: job.returnvalue }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  if (state === "failed") {
    return new Response(JSON.stringify({ state, error: job.failedReason }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ state }), {
    headers: { "Content-Type": "application/json" },
  });
}
