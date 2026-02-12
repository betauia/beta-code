import { Worker } from "bullmq";
import IORedis from "ioredis";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdtemp, mkdir, writeFile, readFile, rm } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const execFileAsync = promisify(execFile);

const __dirname = dirname(fileURLToPath(import.meta.url));

const REDIS_URL = process.env.REDIS_URL;

const PROBLEMS_DIR =
  process.env.PROBLEMS_DIR ||
  join(__dirname, "problems");

const JOBS_BASE =
  process.env.JOBS_BASE ||
  join(__dirname, "jobs");

const CONCURRENCY = Number(process.env.CONCURRENCY || "50");

if (!REDIS_URL) throw new Error("Missing REDIS_URL");

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
    "cpp-sandbox:latest",
  ];

  await execFileAsync("docker", args, { timeout: 30000 });
}

const connection = new IORedis(REDIS_URL, { maxRetriesPerRequest: null });

await mkdir(JOBS_BASE, { recursive:  true });

new Worker(
  "submissions",
  async (job) => {
    const { problemId, code } = job.data ?? {};
    if (!problemId || !code) throw new Error("Missing problemId/code");

    const problemDir = join(PROBLEMS_DIR, problemId);
    const testsPath = join(problemDir, "tests.json");
    const tests = JSON.parse(await readFile(testsPath, "utf8"));

    const jobDir = await mkdtemp(join(JOBS_BASE, "job-"));

    try {
      await mkdir(join(jobDir, "tests"), { recursive: true });
      await mkdir(join(jobDir, "outs"), { recursive: true });

      await writeFile(join(jobDir, "main.cpp"), String(code), "utf8");
      for (const t of tests) {
        await writeFile(join(jobDir, "tests", `${t.name}.in`), t.input ?? "", "utf8");
 
        // Write optional per-test files (e.g. CSV, JSON) into testdata/{testname}/
        if (t.files) {
          const testDataDir = join(jobDir, "testdata", t.name);
          await mkdir(testDataDir, { recursive: true });
 
          if (Array.isArray(t.files)) {
            // Array of filenames — look in problemDir/{testName}/ first, then problemDir/
            for (const filename of t.files) {
              const perTestSrc = join(problemDir, t.name, filename);
              const sharedSrc = join(problemDir, filename);
              const content = await readFile(perTestSrc).catch(() => readFile(sharedSrc));
              await writeFile(join(testDataDir, filename), content);
            }
          } else if (typeof t.files === "object") {
            // Inline content map (backward compat)
            for (const [filename, content] of Object.entries(t.files)) {
              await writeFile(join(testDataDir, filename), String(content), "utf8");
            }
          }
        }
      }

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
        const def = tests.find((t) => t.name === execFail.name);
        return {
          verdict: execFail.status === "TLE" ? "Time Limit Exceeded" : "Runtime Error",
          failedTest: def?.hidden ? "hidden" : execFail.name,
          error: def?.hidden ? undefined : runErr,
        };
      }

      const perTest = [];
      let allAccepted = true;

      for (const t of tests) {
        const got = await readFile(join(jobDir, "outs", `${t.name}.out`), "utf8").catch(() => "");
        const ok = norm(got) === norm(t.expected);
        if (!ok) allAccepted = false;

        perTest.push({
          name: t.hidden ? "hidden" : t.name,
          status: ok ? "OK" : "WA",
          output: t.hidden ? undefined : got,
          expected: t.hidden ? undefined : t.expected,
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
console.log("Runner PROBLEMS_DIR:", PROBLEMS_DIR);
