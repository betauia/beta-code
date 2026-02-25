import { Worker } from "bullmq";
import IORedis from "ioredis";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdtemp, mkdir, writeFile, readFile, rm } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { basename, dirname, join } from "node:path";

const execFileAsync = promisify(execFile);

const __dirname = dirname(fileURLToPath(import.meta.url));

const REDIS_URL = process.env.REDIS_URL;

const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:4321";

const JOBS_BASE =
  process.env.JOBS_BASE ||
  join(__dirname, "jobs");

const CONCURRENCY = Number(process.env.CONCURRENCY || "50");

if (!REDIS_URL) throw new Error("Missing REDIS_URL");

async function getTestsFromAPI(taskId) {
  const url = `${FRONTEND_URL}/api/tasks/tests?taskId=${taskId}`;
  const res = await fetch(url);
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Failed to fetch tests for task ${taskId}: ${res.status} ${text}`);
  }
  const tests = await res.json();
  if (!Array.isArray(tests)) throw new Error("Expected an array of tests");
  // Normalize field names: expected_output -> expected, is_hidden -> hidden
  return tests.map((t) => ({
    name: t.name,
    input: t.input ?? "",
    expected: t.expected_output ?? "",
    hidden: t.is_hidden ?? false,
    data_file_name: t.data_file_name ?? null,
    data_file_content: t.data_file_content ?? null,
  }));
}

function sanitizeTestName(name) {
  return String(name ?? "test")
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9_-]+/g, "_")
    .replace(/^_+|_+$/g, "") || "test";
}

function prepareTests(rawTests) {
  const used = new Set();
  return rawTests.map((test, index) => {
    const base = sanitizeTestName(test.name || `test-${index + 1}`);
    let safeName = base;
    let suffix = 2;
    while (used.has(safeName)) {
      safeName = `${base}_${suffix++}`;
    }
    used.add(safeName);

    return {
      ...test,
      safeName,
      originalName: test.name,
    };
  });
}

function norm(s) {
  return String(s ?? "").replace(/\r\n/g, "\n").trimEnd();
}

async function runDocker(mountDir) {
  const args = [
    "run", "--rm",
    "--network", "none",
    "--cpus", "1.0",
    "--memory", "256m",
    "--pids-limit", "64",
    "--security-opt", "no-new-privileges",
    "--cap-drop", "ALL",
    "--user", `${process.getuid?.() ?? 1000}:${process.getgid?.() ?? 1000}`,
    "-v", `${mountDir}:/sandbox:rw`,
    "--tmpfs", "/tmp:rw,noexec,nosuid,size=64m",
    "cpp-sandbox:latest",
  ];

  await execFileAsync("docker", args, { timeout: 30000 });
}

const connection = new IORedis(REDIS_URL, { maxRetriesPerRequest: null });

await mkdir(JOBS_BASE, { recursive: true });

new Worker(
  "submissions",
  async (job) => {
    const { problemId, code } = job.data ?? {};
    if (!problemId || !code) throw new Error("Missing problemId/code");

    // Fetch tests from the frontend API (backed by repo file stores)
    const tests = prepareTests(await getTestsFromAPI(Number(problemId)));
    if (tests.length === 0) {
      return { verdict: "No Tests", error: "No tests have been added to this task yet." };
    }
    const jobDir = await mkdtemp(join(JOBS_BASE, "job-"));

    try {
      await mkdir(join(jobDir, "tests"), { recursive: true });
      await mkdir(join(jobDir, "outs"), { recursive: true });

      // Write source code and all test inputs in parallel
      const writeOps = [
        writeFile(join(jobDir, "main.cpp"), String(code), "utf8"),
      ];
      for (const t of tests) {
        writeOps.push(
           writeFile(join(jobDir, "tests", `${t.safeName}.in`), t.input ?? "", "utf8")
        );
 
        // Write optional data file stored inline in the tests file store
        if (t.data_file_name && t.data_file_content) {
          const testDataDir = join(jobDir, "testdata", t.safeName);
          writeOps.push(
            mkdir(testDataDir, { recursive: true }).then(() =>
              writeFile(
                join(testDataDir, basename(t.data_file_name)),
                t.data_file_content,
                "utf8"
              )
            )
          );
        }
      }

      await Promise.all(writeOps);

      await runDocker(jobDir);

      const resultsRaw = await readFile(join(jobDir, "results.json"), "utf8");
      const results = JSON.parse(resultsRaw);

      const compileErr = await readFile(join(jobDir, "compile_stderr.txt"), "utf8").catch(() => "");
      const runErr = await readFile(join(jobDir, "run_stderr.txt"), "utf8").catch(() => "");

      if (results.verdict === "CE") {
        return { verdict: "Compile Error", error: compileErr };
      }

      const execFail = (results.tests || []).find((t) => t.status && t.status !== "OK");
      if (execFail) {
        const def = tests.find((t) => t.safeName === execFail.name || t.originalName === execFail.name);
        return {
          verdict: execFail.status === "TLE" ? "Time Limit Exceeded" : "Runtime Error",
          failedTest: def?.hidden ? "hidden" : (def?.originalName ?? execFail.name),
          error: def?.hidden ? undefined : runErr,
          input: def?.hidden ? undefined : def?.input,
        };
      }

      const perTest = [];
      let allAccepted = true;

      for (const t of tests) {
         const got = await readFile(join(jobDir, "outs", `${t.safeName}.out`), "utf8").catch(() => "");
        const ok = norm(got) === norm(t.expected);
        if (!ok) allAccepted = false;

        perTest.push({
          name: t.hidden ? "hidden" : (t.originalName ?? t.safeName),
          status: ok ? "OK" : "WA",
          output: t.hidden ? undefined : got,
          expected: t.hidden ? undefined : t.expected,
          input: t.hidden ? undefined : t.input,
        });

        if (!ok) break;
      }

      return { verdict: allAccepted ? "Accepted" : "Wrong Answer", tests: perTest };
    } finally {
      await rm(jobDir, { recursive: true, force: true }).catch(() => {});
    }
  },
  { connection, concurrency: CONCURRENCY }
);

console.log(`Runner online (concurrency=${CONCURRENCY})`);
console.log(`Runner fetches tests from: ${FRONTEND_URL}`);