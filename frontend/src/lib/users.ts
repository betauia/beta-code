import { getPool } from "./db";
 
export type User = {
  id: number;
  username: string;
  createdAt: string;
};
 
const USERS_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS users (
    id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    username text NOT NULL UNIQUE,
    password_hash text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
  );
`;
 
function mapUser(row: {
  id: number;
  username: string;
  created_at: Date | string;
}): User {
  const createdAt =
    row.created_at instanceof Date
      ? row.created_at.toISOString()
      : new Date(row.created_at).toISOString();
 
  return {
    id: row.id,
    username: row.username,
    createdAt,
  };
}
 
import type { Pool } from "pg";
 
export async function ensureUsersTable() {
  const pool = (await getPool()) as Pool;
  await pool.query(USERS_TABLE_SQL);
}
 
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const saltedData = new Uint8Array(salt.length + data.length);
  saltedData.set(salt);
  saltedData.set(data, salt.length);
 
  const hashBuffer = await crypto.subtle.digest("SHA-256", saltedData);
  const hashArray = new Uint8Array(hashBuffer);
 
  const saltHex = Array.from(salt)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  const hashHex = Array.from(hashArray)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
 
  return `${saltHex}:${hashHex}`;
}
 
async function verifyPassword(
  password: string,
  storedHash: string
): Promise<boolean> {
  const [saltHex, hashHex] = storedHash.split(":");
  if (!saltHex || !hashHex) return false;
 
  const salt = new Uint8Array(
    saltHex.match(/.{2}/g)!.map((byte) => parseInt(byte, 16))
  );
 
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const saltedData = new Uint8Array(salt.length + data.length);
  saltedData.set(salt);
  saltedData.set(data, salt.length);
 
  const hashBuffer = await crypto.subtle.digest("SHA-256", saltedData);
  const hashArray = new Uint8Array(hashBuffer);
  const computedHashHex = Array.from(hashArray)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
 
  return computedHashHex === hashHex;
}
 
export async function createUser({
  username,
  password,
}: {
  username: string;
  password: string;
}): Promise<User> {
  await ensureUsersTable();
  const pool = (await getPool()) as Pool;
  const passwordHash = await hashPassword(password);
 
  const result = await pool.query(
    "INSERT INTO users (username, password_hash) VALUES ($1, $2) RETURNING id, username, created_at",
    [username, passwordHash]
  );
 
  return mapUser(result.rows[0]);
}
 
export async function getUserByUsername(
  username: string
): Promise<(User & { passwordHash: string }) | null> {
  await ensureUsersTable();
  const pool = (await getPool()) as Pool;
 
  const result = await pool.query(
    "SELECT id, username, password_hash, created_at FROM users WHERE username = $1",
    [username]
  );
 
  if (result.rows.length === 0) return null;
 
  const row = result.rows[0];
  return {
    ...mapUser(row),
    passwordHash: row.password_hash,
  };
}
 
export async function validateUser(
  username: string,
  password: string
): Promise<User | null> {
  const user = await getUserByUsername(username);
  if (!user) return null;
 
  const isValid = await verifyPassword(password, user.passwordHash);
  if (!isValid) return null;
 
  const { passwordHash: _, ...userWithoutPassword } = user;
  return userWithoutPassword;
}