import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SETTINGS_PATH = path.join(__dirname, "..", "data", "settings-store.json");

interface Settings {
  competition_start: string | null;
}

function readSettings(): Settings {
  try {
    const raw = fs.readFileSync(SETTINGS_PATH, "utf-8");
    return JSON.parse(raw);
  } catch (err: any) {
    if (err?.code === "ENOENT") return { competition_start: null };
    throw err;
  }
}

function writeSettings(settings: Settings): void {
  fs.mkdirSync(path.dirname(SETTINGS_PATH), { recursive: true });
  fs.writeFileSync(SETTINGS_PATH, JSON.stringify(settings, null, 2) + "\n");
}

export function getCompetitionStart(): string | null {
  return readSettings().competition_start;
}

export function setCompetitionStart(dateISO: string | null): void {
  const settings = readSettings();
  settings.competition_start = dateISO;
  writeSettings(settings);
}

export function hasCompetitionStarted(): boolean {
  const start = getCompetitionStart();
  if (!start) return true;
  return Date.now() >= new Date(start).getTime();
}