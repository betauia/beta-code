export const prerender = false;

import { execFile } from "node:child_process";
import { mkdtemp, writeFile, readFile, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

type Test = {
  name: string;
  input: string;
  expected: string;
  hidden: boolean;
};

function runDocker(mountDir: string): Promise<{ exitCode: number; stderr: string }> {
  const args = [
    "run",
    "--rm",
    "--network",
    "none",
    "--cpus",
    "1.0",
    "--memory",
    "256m",
    "--pids-limit",
    "64",
    "-v",
    `${mountDir}:/sandbox`,
    "cpp-sandbox:latest",
  ];

  return new Promise((resolve) => {
    execFile("docker", args, { timeout: 20000 }, (err, _stdout, stderr) => {
      const exitCode = typeof err?.code === "number" ? err.code : 0;
      resolve({ exitCode, stderr: String(stderr ?? "") });
    });
  });
}

function norm(s: string) {
  return s.replace(/\r\n/g, "\n").trimEnd();
}

export async function POST({ request }: { request: Request }) {
  const body = await request.json();
  const code = String(body?.code ?? "");
  const problemId = String(body?.problemId ?? "");

  // Load tests from file: problems/<problemId>/tests.json
  const testsPath = join(process.cwd(), "problems", problemId, "tests.json");
  let tests: Test[];
  console.log("CWD:", process.cwd());

  try {
    const raw = await readFile(testsPath, "utf8");
    tests = JSON.parse(raw) as Test[];
  } catch {
    return new Response(
      JSON.stringify({
        verdict: "Server Error",
        error: `Could not load tests for problemId=${problemId}. Expected file: ${testsPath}`,
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  }

  if (!Array.isArray(tests) || tests.length === 0) {
    return new Response(
      JSON.stringify({
        verdict: "Server Error",
        error: `No tests found for problemId=${problemId}`,
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  }

  // Host temp directory mounted into container as /sandbox
  const dir = await mkdtemp(join(tmpdir(), "judge-"));

  // Write code + tests
  await writeFile(join(dir, "main.cpp"), code, "utf8");
  await mkdir(join(dir, "tests"), { recursive: true });
  await mkdir(join(dir, "outs"), { recursive: true });

  for (const t of tests) {
    await writeFile(join(dir, "tests", `${t.name}.in`), t.input, "utf8");
  }

  // Run container once (compile + run all tests)
  const docker = await runDocker(dir);

  // Read container-produced files
  const compileErr = await readFile(join(dir, "compile_stderr.txt"), "utf8").catch(() => "");
  const runErr = await readFile(join(dir, "run_stderr.txt"), "utf8").catch(() => "");
  const resultsRaw = await readFile(join(dir, "results.json"), "utf8").catch(() => "");

  if (!resultsRaw) {
    return new Response(
      JSON.stringify({
        verdict: "Sandbox Error",
        error: docker.stderr.trim() || "No results.json produced by sandbox",
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  }

  let results: any;
  try {
    results = JSON.parse(resultsRaw);
  } catch {
    return new Response(
      JSON.stringify({
        verdict: "Sandbox Error",
        error: "Invalid results.json",
        raw: resultsRaw,
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  }

  // Compile error
  if (results.verdict === "CE") {
    return new Response(
      JSON.stringify({
        verdict: "Compile Error",
        error: compileErr,
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  }

  // If sandbox stopped early on RE/TLE
  const execFail = Array.isArray(results.tests)
    ? results.tests.find((t: any) => t.status && t.status !== "OK")
    : null;

  if (execFail) {
    const tdef = tests.find((t) => t.name === execFail.name);

    return new Response(
      JSON.stringify({
        verdict: execFail.status === "TLE" ? "Time Limit Exceeded" : "Runtime Error",
        failedTest: tdef?.hidden ? "hidden" : execFail.name,
        error: tdef?.hidden ? undefined : runErr,
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  }

  // Compare outputs
  const perTest: any[] = [];
  let allAccepted = true;

  for (const t of tests) {
    const outPath = join(dir, "outs", `${t.name}.out`);
    const gotRaw = await readFile(outPath, "utf8").catch(() => "");
    const ok = norm(gotRaw) === norm(t.expected);

    if (!ok) allAccepted = false;

    perTest.push({
      name: t.hidden ? "hidden" : t.name,
      status: ok ? "OK" : "WA",
      output: t.hidden ? undefined : gotRaw,
      expected: t.hidden ? undefined : t.expected,
    });

    // stop early on first WA (optional)
    if (!ok) break;
  }

  return new Response(
    JSON.stringify({
      verdict: allAccepted ? "Accepted" : "Wrong Answer",
      tests: perTest,
    }),
    { headers: { "Content-Type": "application/json" } }
  );
}
