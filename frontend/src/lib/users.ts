import { getPool } from "./db";
import crypto from "crypto";
 
export interface User {
  id: number;
  username: string;
  completed_tasks: string[]; // Array of problem IDs
  created_at: Date;
}
 
// Initialize the users table
export async function initUsersTable() {
  const pool = await getPool() as any;
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username VARCHAR(50) UNIQUE NOT NULL,
      password_hash VARCHAR(128) NOT NULL,
      salt VARCHAR(32) NOT NULL,
      completed_tasks TEXT[] DEFAULT '{}',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
}
 
// Hash password with salt
function hashPassword(password: string, salt: string): string {
  return crypto.createHash("sha256").update(password + salt).digest("hex");
}
 
// Create a new user
export async function createUser(username: string, password: string): Promise<User | null> {
  const pool = await getPool() as any;
  const salt = crypto.randomBytes(16).toString("hex");
  const passwordHash = hashPassword(password, salt);
 
  try {
    const result = await pool.query(
      `INSERT INTO users (username, password_hash, salt, completed_tasks)
       VALUES ($1, $2, $3, '{}')
       RETURNING id, username, completed_tasks, created_at`,
      [username, passwordHash, salt]
    );
    return result.rows[0] as User;
  } catch (err: unknown) {
    // Username already exists
    if ((err as { code?: string }).code === "23505") {
      return null;
    }
    throw err;
  }
}
 
// Verify user credentials and return user if valid
export async function verifyUser(username: string, password: string): Promise<User | null> {
  const pool = await getPool() as any;
  const result = await pool.query(
    `SELECT id, username, password_hash, salt, completed_tasks, created_at
     FROM users WHERE username = $1`,
    [username]
  );
 
  if (result.rows.length === 0) {
    return null;
  }
 
  const row = result.rows[0];
  const passwordHash = hashPassword(password, row.salt);
 
  if (passwordHash !== row.password_hash) {
    return null;
  }
 
  return {
    id: row.id,
    username: row.username,
    completed_tasks: row.completed_tasks || [],
    created_at: row.created_at,
  };
}
 
// Get user by ID
export async function getUserById(id: number): Promise<User | null> {
  const pool = await getPool() as any;
  const result = await pool.query(
    `SELECT id, username, completed_tasks, created_at
     FROM users WHERE id = $1`,
    [id]
  );
 
  if (result.rows.length === 0) {
    return null;
  }
 
  return result.rows[0] as User;
}
 
// Add a completed task to user's list (if not already completed)
export async function addCompletedTask(userId: number, problemId: string): Promise<boolean> {
  const pool = await getPool() as any;
  const result = await pool.query(
    `UPDATE users
     SET completed_tasks = array_append(completed_tasks, $2)
     WHERE id = $1 AND NOT ($2 = ANY(completed_tasks))
     RETURNING id`,
    [userId, problemId]
  );
  return result.rowCount !== null && result.rowCount > 0;
}
 
// Get user's completed tasks
export async function getCompletedTasks(userId: number): Promise<string[]> {
  const pool = await getPool() as any;
  const result = await pool.query(
    `SELECT completed_tasks FROM users WHERE id = $1`,
    [userId]
  );
 
  if (result.rows.length === 0) {
    return [];
  }
 
  return result.rows[0].completed_tasks || [];
}
// Get all users for leaderboard
export async function getAllUsers(): Promise<User[]> {
  const pool = await getPool() as any;
  const result = await pool.query(
    `SELECT id, username, completed_tasks, created_at
     FROM users`
  );

  return result.rows.map((row: User) => ({
    id: row.id,
    username: row.username,
    completed_tasks: row.completed_tasks || [],
    created_at: row.created_at,
  }));
}