import { getPool } from "./db";
import crypto from "crypto";
 
export interface User {
  id: number;
  username: string;
  completed_tasks: string[]; // Array of problem IDs
  is_admin: boolean;
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
      is_admin BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await pool.query(`
    ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE
  `);
  // Create default admin user if it doesn't exist
  const existing = await pool.query(
    `SELECT id FROM users WHERE id = 0 OR username = 'admin'`
  );
  if (existing.rows.length === 0) {
    const salt = crypto.randomBytes(16).toString("hex");
    const passwordHash = hashPassword("admin123", salt);
    await pool.query(
       `INSERT INTO users (id, username, password_hash, salt, completed_tasks, is_admin)
       VALUES (0, 'admin', $1, $2, '{}', TRUE)`,
      [passwordHash, salt]
    );
  }
  
  await pool.query(`
    SELECT setval(
      pg_get_serial_sequence('users','id'),
      GREATEST((SELECT COALESCE(MAX(id), 0) FROM users) + 1, 1),
      false
    )
  `);
}
 
// Hash password with salt
function hashPassword(password: string, salt: string): string {
  return crypto.createHash("sha256").update(password + salt).digest("hex");
}

function rowToUser(row: any): User {
  return {
    id: row.id,
    username: row.username,
    completed_tasks: row.completed_tasks || [],
    is_admin: row.is_admin || false,
    created_at: row.created_at,
  };
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
       RETURNING id, username, completed_tasks, is_admin, created_at`,
      [username, passwordHash, salt]
    );
    return rowToUser(result.rows[0]);
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
     `SELECT id, username, password_hash, salt, completed_tasks, is_admin, created_at
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
 
  return rowToUser(row);
}
 
// Get user by ID
export async function getUserById(id: number): Promise<User | null> {
  const pool = await getPool() as any;
  const result = await pool.query(
    `SELECT id, username, completed_tasks, is_admin, created_at
     FROM users WHERE id = $1`,
    [id]
  );
 
  if (result.rows.length === 0) {
    return null;
  }
 
  return rowToUser(result.rows[0]);
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
  const added = result.rowCount !== null && result.rowCount > 0;
  if (added) {
    await pool.query(
      `INSERT INTO task_completions (user_id, task_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [userId, problemId]
    );
  }
  return added;
}
 
// Get all users for leaderboard
export async function getAllUsers(): Promise<User[]> {
  const pool = await getPool() as any;
  const result = await pool.query(
    `SELECT id, username, completed_tasks, is_admin, created_at
     FROM users
     ORDER BY id`
  );

  return result.rows.map((row: any) => rowToUser(row));
}

// Delete a user by ID (admin only)
export async function deleteUser(userId: number): Promise<boolean> {
  const pool = await getPool() as any;
  const result = await pool.query(
    `DELETE FROM users WHERE id = $1`,
    [userId]
  );
  return result.rowCount !== null && result.rowCount > 0;
}
 
// Remove a specific completed task from a user (admin only)
export async function removeCompletedTask(userId: number, problemId: string): Promise<boolean> {
  const pool = await getPool() as any;
  const result = await pool.query(
    `UPDATE users
     SET completed_tasks = array_remove(completed_tasks, $2)
     WHERE id = $1
     RETURNING id`,
    [userId, problemId]
  );
  const removed = result.rowCount !== null && result.rowCount > 0;
  if (removed) {
    await pool.query(
      `DELETE FROM task_completions WHERE user_id = $1 AND task_id = $2`,
      [userId, problemId]
    );
  }
  return removed;
}

// Initialize the user_code_saves table
export async function initCodeSavesTable() {
  const pool = await getPool() as any;
  await pool.query(`
    CREATE TABLE IF NOT EXISTS user_code_saves (
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      problem_id VARCHAR(50) NOT NULL,
      code TEXT NOT NULL DEFAULT '',
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (user_id, problem_id)
    )
  `);
}

// Initialize the task_completions table (tracks when each task was completed)
export async function initTaskCompletionsTable() {
  const pool = await getPool() as any;
  await pool.query(`
    CREATE TABLE IF NOT EXISTS task_completions (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      task_id VARCHAR(50) NOT NULL,
      completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE (user_id, task_id)
    )
  `);
}
 
// Get all task completions for the graph (ordered by time)
export async function getAllCompletions(): Promise<{ user_id: number; username: string; task_id: string; completed_at: string }[]> {
  const pool = await getPool() as any;
  const result = await pool.query(`
    SELECT tc.user_id, u.username, tc.task_id, tc.completed_at
    FROM task_completions tc
    JOIN users u ON u.id = tc.user_id
    WHERE u.is_admin = FALSE
    ORDER BY tc.completed_at ASC
  `);
  return result.rows;
}
 
// Save a player's code for a specific problem (upsert)
export async function saveUserCode(userId: number, problemId: string, code: string): Promise<void> {
  const pool = await getPool() as any;
  await pool.query(
    `INSERT INTO user_code_saves (user_id, problem_id, code, updated_at)
     VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
     ON CONFLICT (user_id, problem_id)
     DO UPDATE SET code = $3, updated_at = CURRENT_TIMESTAMP`,
    [userId, problemId, code]
  );
}
 
// Load a player's saved code for a specific problem
export async function loadUserCode(userId: number, problemId: string): Promise<string | null> {
  const pool = await getPool() as any;
  const result = await pool.query(
    `SELECT code FROM user_code_saves WHERE user_id = $1 AND problem_id = $2`,
    [userId, problemId]
  );
  if (result.rows.length === 0) {
    return null;
  }
  return result.rows[0].code;
}