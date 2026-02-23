import { getPool } from "./db";

export interface Task {
  id: number;
  name: string;
  description: string;
  code_preview: string;
  points: number;
  type: "solve" | "fix";
  difficulty: string;
  created_at: Date;
}

export interface TaskTest {
  id: number;
  task_id: number;
  name: string;
  input: string;
  expected_output: string;
  is_hidden: boolean;
  data_file_name: string | null;
  data_file_content: string | null;
  created_at: Date;
}

export async function initTasksTable() {
  const pool = await getPool() as any;
  await pool.query(`
    CREATE TABLE IF NOT EXISTS tasks (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      code_preview TEXT NOT NULL DEFAULT '',
      points INTEGER NOT NULL DEFAULT 50,
      type VARCHAR(10) NOT NULL DEFAULT 'solve' CHECK (type IN ('solve', 'fix')),
      difficulty VARCHAR(10) NOT NULL DEFAULT 'Easy',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS task_tests (
      id SERIAL PRIMARY KEY,
      task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      name VARCHAR(100) NOT NULL,
      input TEXT NOT NULL DEFAULT '',
      expected_output TEXT NOT NULL DEFAULT '',
      is_hidden BOOLEAN NOT NULL DEFAULT FALSE,
      data_file_name VARCHAR(255),
      data_file_content TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

function rowToTask(row: any): Task {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    code_preview: row.code_preview,
    points: row.points,
    type: row.type,
    difficulty: row.difficulty,
    created_at: row.created_at,
  };
}

function rowToTest(row: any): TaskTest {
  return {
    id: row.id,
    task_id: row.task_id,
    name: row.name,
    input: row.input,
    expected_output: row.expected_output,
    is_hidden: row.is_hidden,
    data_file_name: row.data_file_name,
    data_file_content: row.data_file_content,
    created_at: row.created_at,
  };
}

export async function getAllTasks(): Promise<Task[]> {
  const pool = await getPool() as any;
  const result = await pool.query(
    `SELECT id, name, description, code_preview, points, type, difficulty, created_at
     FROM tasks ORDER BY id ASC`
  );
  return result.rows.map(rowToTask);
}

export async function getTaskById(id: number): Promise<Task | null> {
  const pool = await getPool() as any;
  const result = await pool.query(
    `SELECT id, name, description, code_preview, points, type, difficulty, created_at
     FROM tasks WHERE id = $1`,
    [id]
  );
  if (result.rows.length === 0) return null;
  return rowToTask(result.rows[0]);
}

export async function createTask(data: {
  name: string;
  description: string;
  code_preview: string;
  points: number;
  type: "solve" | "fix";
  difficulty: string;
}): Promise<Task> {
  const pool = await getPool() as any;
  const result = await pool.query(
    `INSERT INTO tasks (name, description, code_preview, points, type, difficulty)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, name, description, code_preview, points, type, difficulty, created_at`,
    [data.name, data.description, data.code_preview, data.points, data.type, data.difficulty]
  );
  return rowToTask(result.rows[0]);
}

export async function deleteTask(id: number): Promise<boolean> {
  const pool = await getPool() as any;
  const result = await pool.query(`DELETE FROM tasks WHERE id = $1`, [id]);
  return result.rowCount !== null && result.rowCount > 0;
}

export async function getTestsForTask(taskId: number): Promise<TaskTest[]> {
  const pool = await getPool() as any;
  const result = await pool.query(
    `SELECT id, task_id, name, input, expected_output, is_hidden, data_file_name, data_file_content, created_at
     FROM task_tests WHERE task_id = $1 ORDER BY id ASC`,
    [taskId]
  );
  return result.rows.map(rowToTest);
}

export async function createTest(data: {
  task_id: number;
  name: string;
  input: string;
  expected_output: string;
  is_hidden: boolean;
  data_file_name?: string | null;
  data_file_content?: string | null;
}): Promise<TaskTest> {
  const pool = await getPool() as any;
  const result = await pool.query(
    `INSERT INTO task_tests (task_id, name, input, expected_output, is_hidden, data_file_name, data_file_content)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id, task_id, name, input, expected_output, is_hidden, data_file_name, data_file_content, created_at`,
    [
      data.task_id,
      data.name,
      data.input,
      data.expected_output,
      data.is_hidden,
      data.data_file_name ?? null,
      data.data_file_content ?? null,
    ]
  );
  return rowToTest(result.rows[0]);
}

export async function deleteTest(id: number): Promise<boolean> {
  const pool = await getPool() as any;
  const result = await pool.query(`DELETE FROM task_tests WHERE id = $1`, [id]);
  return result.rowCount !== null && result.rowCount > 0;
}