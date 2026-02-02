import { getPool } from "./db";

export type Team = {
  id: number;
  name: string;
  description: string | null;
  createdAt: string;
};

const TEAM_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS teams (
    id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name text NOT NULL UNIQUE,
    description text,
    created_at timestamptz NOT NULL DEFAULT now()
  );
`;

function mapTeam(row: {
  id: number;
  name: string;
  description: string | null;
  created_at: Date | string;
}): Team {
  const createdAt =
    row.created_at instanceof Date
      ? row.created_at.toISOString()
      : new Date(row.created_at).toISOString();

  return {
    id: row.id,
    name: row.name,
    description: row.description,
    createdAt,
  };
}

import type { Pool } from "pg";

export async function ensureTeamsTable() {
  const pool = await getPool() as Pool;
  await pool.query(TEAM_TABLE_SQL);
}

export async function listTeams(): Promise<Team[]> {
  await ensureTeamsTable();
  const pool = await getPool() as Pool;
  const result = await pool.query(
    "SELECT id, name, created_at FROM teams ORDER BY created_at DESC, id DESC"
  );

  return result.rows.map(mapTeam);
}

export async function createTeam({
  name,
  description,
}: {
  name: string;
  description?: string | null;
}): Promise<Team> {
  await ensureTeamsTable();
  const pool = await getPool() as Pool;
  const result = await pool.query(
    "INSERT INTO teams (name) VALUES ($1) RETURNING id, name, created_at",
    [name, description ?? null]
  );

  return mapTeam(result.rows[0]);
}