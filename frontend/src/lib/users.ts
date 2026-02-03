import { getPool } from "./db";
import { createHash, randomBytes } from "crypto";
 
export interface User {
  id: number;
  username: string;
  password_hash: string;
  tasks_completed: number;
  points: number;
  created_at: Date;
}
 
export interface UserPublic {
  id: number;
  username: string;
  tasks_completed: number;
  points: number;
  created_at: Date;
}
 
function hashPassword(password: string, salt: string): string {
  return createHash("sha256").update(password + salt).digest("hex") + ":" + salt;
}
 
function verifyPassword(password: string, storedHash: string): boolean {
  const [hash, salt] = storedHash.split(":");
  if (!salt) return false;
  const newHash = createHash("sha256").update(password + salt).digest("hex");
  return hash === newHash;
}
 
export async function initUsersTable(): Promise<void> {
  const pool = (await getPool()) as import("pg").Pool;
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      tasks_completed INTEGER DEFAULT 0,
      points INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);
}
 
export async function createUser(
  username: string,
  password: string
): Promise<{ success: boolean; error?: string; user?: UserPublic }> {
  const pool = (await getPool()) as import("pg").Pool;
 
  // Validate username
  if (username.length < 3 || username.length > 30) {
    return { success: false, error: "Username must be between 3 and 30 characters" };
  }
  if (!/^[a-zA-Z0-9_]+$/.test(username)) {
    return { success: false, error: "Username can only contain letters, numbers, and underscores" };
  }
 
  // Validate password
  if (password.length < 6) {
    return { success: false, error: "Password must be at least 6 characters" };
  }
 
  const salt = randomBytes(16).toString("hex");
  const passwordHash = hashPassword(password, salt);
 
  try {
    const result = await pool.query(
      `INSERT INTO users (username, password_hash, tasks_completed, points)
       VALUES ($1, $2, 0, 0)
       RETURNING id, username, tasks_completed, points, created_at`,
      [username, passwordHash]
    );
    const user = result.rows[0] as UserPublic;
    return { success: true, user };
  } catch (err: unknown) {
    if (err && typeof err === "object" && "code" in err && err.code === "23505") {
      return { success: false, error: "Username already exists" };
    }
    throw err;
  }
}
 
export async function authenticateUser(
  username: string,
  password: string
): Promise<{ success: boolean; error?: string; user?: UserPublic }> {
  const pool = (await getPool()) as import("pg").Pool;
 
  try {
    const result = await pool.query(
      `SELECT id, username, password_hash, tasks_completed, points, created_at
       FROM users WHERE username = $1`,
      [username]
    );
 
    if (result.rows.length === 0) {
      return { success: false, error: "Invalid username or password" };
    }
 
    const user = result.rows[0] as User;
    if (!verifyPassword(password, user.password_hash)) {
      return { success: false, error: "Invalid username or password" };
    }
 
    const { password_hash, ...publicUser } = user;
    return { success: true, user: publicUser };
  } catch (err) {
    console.error("Authentication error:", err);
    return { success: false, error: "An error occurred during authentication" };
  }
}
 
export async function getUserById(id: number): Promise<UserPublic | null> {
  const pool = (await getPool()) as import("pg").Pool;
  const result = await pool.query(
    `SELECT id, username, tasks_completed, points, created_at
     FROM users WHERE id = $1`,
    [id]
  );
  return result.rows[0] || null;
}
 
export async function getUserByUsername(username: string): Promise<UserPublic | null> {
  const pool = (await getPool()) as import("pg").Pool;
  const result = await pool.query(
    `SELECT id, username, tasks_completed, points, created_at
     FROM users WHERE username = $1`,
    [username]
  );
  return result.rows[0] || null;
}
 
export async function updateUserStats(
  userId: number,
  tasksToAdd: number,
  pointsToAdd: number
): Promise<UserPublic | null> {
  const pool = (await getPool()) as import("pg").Pool;
  const result = await pool.query(
    `UPDATE users
     SET tasks_completed = tasks_completed + $2,
         points = points + $3
     WHERE id = $1
     RETURNING id, username, tasks_completed, points, created_at`,
    [userId, tasksToAdd, pointsToAdd]
  );
  return result.rows[0] || null;
}
 
export async function getAllUsers(): Promise<UserPublic[]> {
  const pool = (await getPool()) as import("pg").Pool;
  const result = await pool.query(
    `SELECT id, username, tasks_completed, points, created_at
     FROM users ORDER BY points DESC, tasks_completed DESC`
  );
  return result.rows;
}