export const prerender = false;
 
import { getProblem } from "../../../data/problems";
import fs from "node:fs";
import path from "node:path";
 
export async function GET({ url }: { url: URL }) {
  const problemId = url.searchParams.get("problemId");
  if (!problemId) {
    return new Response(JSON.stringify({ error: "Missing problemId" }), {
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
  const filePath = path.resolve("../runner/problems", problemId, "sample1", problem.dataFile);
 
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