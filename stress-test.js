#!/usr/bin/env node
 
/**
 * Stress test: simulates N concurrent users hitting "Run" on heavy tasks.
 *
 * Usage:
 *   node stress-test.js                  # 100 users, default server
 *   node stress-test.js --users 50       # 50 users
 *   node stress-test.js --url http://localhost:4321
 *   node stress-test.js --problem 3      # only submit problem 3
 *   node stress-test.js --delay 0        # all at once (no stagger)
 */
 
const BASE_URL = getArg("--url") || "http://localhost:4321";
const NUM_USERS = parseInt(getArg("--users") || "100", 10);
const PROBLEM_ID = getArg("--problem"); // undefined = random mix
const STAGGER_MS = parseInt(getArg("--delay") ?? "50", 10); // ms between launches
const POLL_INTERVAL = 500; // ms between status polls
const TIMEOUT = 60_000; // max wait per submission
 
// ---------------------------------------------------------------------------
// Heavy C++ solutions that will actually compile & run (stresses Docker + CPU)
// ---------------------------------------------------------------------------
const SOLUTIONS = {
  "1": `#include <iostream>
using namespace std;
int main() {
    int a, b;
    cin >> a >> b;
    cout << a + b;
}`,
  "3": `#include <iostream>
using namespace std;
int main() {
    int n; cin >> n;
    for (int i = 1; i <= n; i++) {
        if (i % 15 == 0) cout << "FizzBuzz";
        else if (i % 3 == 0) cout << "Fizz";
        else if (i % 5 == 0) cout << "Buzz";
        else cout << i;
        if (i < n) cout << "\\n";
    }
}`,
  "4": `#include <iostream>
using namespace std;
int main() {
    int n; cin >> n;
    int sum = 0;
    for (int i = 1; i <= n; i++) sum += i;
    cout << sum << endl;
}`,
  // Intentionally bad code — will cause Compile Error (tests error path under load)
  "bad": `#include <iostream>
int main() {
    this wont compile;
}`,
  // Slow code — burns CPU for ~1.5s (tests timeout / resource limits under load)
  "slow": `#include <iostream>
using namespace std;
int main() {
    long long s = 0;
    for (long long i = 0; i < 500000000LL; i++) s += i;
    cout << s;
}`,
};
 
// Which problem IDs and solution keys to use for a realistic mix
const WORKLOAD_MIX = [
  { problemId: "1", solution: "1", label: "A+B (correct)" },
  { problemId: "1", solution: "1", label: "A+B (correct)" },
  { problemId: "3", solution: "3", label: "FizzBuzz (correct)" },
  { problemId: "3", solution: "3", label: "FizzBuzz (correct)" },
  { problemId: "4", solution: "4", label: "Fix the Sum (correct)" },
  { problemId: "1", solution: "bad", label: "Compile Error" },
  { problemId: "1", solution: "slow", label: "Slow (CPU burn)" },
];
 
// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function getArg(flag) {
  const i = process.argv.indexOf(flag);
  return i !== -1 && i + 1 < process.argv.length ? process.argv[i + 1] : undefined;
}
 
function pickWorkload() {
  if (PROBLEM_ID && SOLUTIONS[PROBLEM_ID]) {
    return { problemId: PROBLEM_ID, solution: PROBLEM_ID, label: `Problem ${PROBLEM_ID}` };
  }
  return WORKLOAD_MIX[Math.floor(Math.random() * WORKLOAD_MIX.length)];
}
 
function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}
 
// ---------------------------------------------------------------------------
// Core: submit -> poll -> collect result
// ---------------------------------------------------------------------------
async function simulateUser(userId) {
  const workload = pickWorkload();
  const start = Date.now();
  const tag = `[User ${String(userId).padStart(3)}] ${workload.label}`;
 
  try {
    // Submit
    const submitRes = await fetch(`${BASE_URL}/api/problems/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        problemId: workload.problemId,
        code: SOLUTIONS[workload.solution],
      }),
    });
 
    if (!submitRes.ok) {
      const text = await submitRes.text();
      return { userId, tag, status: "SUBMIT_FAILED", elapsed: Date.now() - start, detail: text };
    }
 
    const { jobId } = await submitRes.json();
    const submitTime = Date.now() - start;
 
    // Poll for result
    const pollStart = Date.now();
    while (Date.now() - pollStart < TIMEOUT) {
      await sleep(POLL_INTERVAL);
 
      const statusRes = await fetch(`${BASE_URL}/api/problems/status?jobId=${jobId}`);
      if (!statusRes.ok) continue;
 
      const data = await statusRes.json();
 
      if (data.state === "completed") {
        const elapsed = Date.now() - start;
        return {
          userId,
          tag,
          status: "DONE",
          verdict: data.result?.verdict || "Internal Error (no verdict)",
          elapsed,
          submitTime,
          execTime: elapsed - submitTime,
        };
      }
 
      if (data.state === "failed") {
        return {
          userId,
          tag,
          status: "JOB_FAILED",
          elapsed: Date.now() - start,
          detail: data.error,
        };
      }
    }
 
    return { userId, tag, status: "TIMEOUT", elapsed: Date.now() - start };
  } catch (err) {
    return { userId, tag, status: "ERROR", elapsed: Date.now() - start, detail: err.message };
  }
}
 
// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  console.log("=".repeat(65));
  console.log(`  STRESS TEST — ${NUM_USERS} concurrent users`);
  console.log(`  Target: ${BASE_URL}`);
  console.log(`  Stagger: ${STAGGER_MS}ms between launches`);
  console.log(`  Problem: ${PROBLEM_ID || "random mix"}`);
  console.log("=".repeat(65));
  console.log();
 
  const globalStart = Date.now();
 
  // Launch all users with optional stagger
  const promises = [];
  for (let i = 1; i <= NUM_USERS; i++) {
    promises.push(simulateUser(i));
    if (STAGGER_MS > 0 && i < NUM_USERS) {
      await sleep(STAGGER_MS);
    }
  }
 
  const results = await Promise.all(promises);
  const totalTime = Date.now() - globalStart;
 
  // ---------------------------------------------------------------------------
  // Report
  // ---------------------------------------------------------------------------
  console.log();
  console.log("=".repeat(65));
  console.log("  RESULTS");
  console.log("=".repeat(65));
 
  // Per-user breakdown
  for (const r of results) {
    const elapsed = `${(r.elapsed / 1000).toFixed(1)}s`;
    if (r.status === "DONE") {
      console.log(`  ${r.tag}  =>  ${r.verdict}  (${elapsed})`);
    } else {
      console.log(`  ${r.tag}  =>  ${r.status}  (${elapsed})  ${r.detail || ""}`);
    }
  }
 
  // Summary stats
  const done = results.filter((r) => r.status === "DONE");
  const failed = results.filter((r) => r.status !== "DONE");
 
  const verdicts = {};
  for (const r of done) {
    verdicts[r.verdict] = (verdicts[r.verdict] || 0) + 1;
  }
 
  const elapsedAll = results.map((r) => r.elapsed);
  const p50 = percentile(elapsedAll, 50);
  const p95 = percentile(elapsedAll, 95);
  const p99 = percentile(elapsedAll, 99);
  const maxTime = Math.max(...elapsedAll);
 
  console.log();
  console.log("-".repeat(65));
  console.log(`  Total users:      ${NUM_USERS}`);
  console.log(`  Completed:        ${done.length}`);
  console.log(`  Failed/Timeout:   ${failed.length}`);
  console.log(`  Verdicts:         ${JSON.stringify(verdicts)}`);
  console.log();
  console.log(`  Wall-clock time:  ${(totalTime / 1000).toFixed(1)}s`);
  console.log(`  Latency p50:      ${(p50 / 1000).toFixed(1)}s`);
  console.log(`  Latency p95:      ${(p95 / 1000).toFixed(1)}s`);
  console.log(`  Latency p99:      ${(p99 / 1000).toFixed(1)}s`);
  console.log(`  Latency max:      ${(maxTime / 1000).toFixed(1)}s`);
  console.log("-".repeat(65));
 
  if (failed.length > 0) {
    console.log();
    console.log("  FAILURES:");
    for (const r of failed) {
      console.log(`    ${r.tag}: ${r.status} — ${r.detail || ""}`);
    }
  }
 
  console.log();
  process.exit(failed.length > 0 ? 1 : 0);
}
 
function percentile(arr, pct) {
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = Math.ceil((pct / 100) * sorted.length) - 1;
  return sorted[Math.max(0, idx)];
}
 
main();