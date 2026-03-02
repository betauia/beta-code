export const prerender = false;
 
import { getProblem } from "../../../data/problems";
import fs from "node:fs";
import path from "node:path";
 
export async function GET({ url }: { url: URL }) {
  const problemId = url.searchParams.get("problemId");
  if (!problemId || !/^[a-zA-Z0-9_-]+$/.test(problemId)) {
    return new Response(JSON.stringify({ error: "Missing or invalid problemId" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
 
  const problem = getProblem(problemId);
  if (!problem || !problem.dataFile) {
    return new Response(JSON.stringify({ error: "No data file for this problem" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }
 
  // Use sample1 data file for download
  const baseDir = path.resolve("../runner/problems");
  const filePath = path.resolve(baseDir, problemId, "sample1", problem.dataFile);
 
  // Prevent path traversal
  if (!filePath.startsWith(baseDir + path.sep)) {
    return new Response(JSON.stringify({ error: "Invalid path" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
 
  if (!fs.existsSync(filePath)) {
    return new Response(JSON.stringify({ error: "Data file not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }
 
  const content = fs.readFileSync(filePath);
  const contentType = problem.dataFile.endsWith(".json")
    ? "application/json"
    : "text/csv";
 
  return new Response(content, {
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `attachment; filename="${problem.dataFile}"`,
    },
  });
}