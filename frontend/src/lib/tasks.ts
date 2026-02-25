import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { problems } from "../data/problems";

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

type SerializedTask = Omit<Task, "created_at"> & { created_at: string };
type SerializedTaskTest = Omit<TaskTest, "created_at"> & { created_at: string };

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const tasksStorePath = path.resolve(__dirname, "../data/tasks-store.json");
const testsStorePath = path.resolve(__dirname, "../data/tests-store.json");

function fromSerializedTask(task: SerializedTask): Task {
  return { ...task, created_at: new Date(task.created_at) };
}

function fromSerializedTest(test: SerializedTaskTest): TaskTest {
  return { ...test, created_at: new Date(test.created_at) };
}

function toSerializedTask(task: Task): SerializedTask {
  return { ...task, created_at: task.created_at.toISOString() };
}

function toSerializedTest(test: TaskTest): SerializedTaskTest {
  return { ...test, created_at: test.created_at.toISOString() };
}

function toDefaultTasks(): SerializedTask[] {
  const now = new Date().toISOString();
  return problems.map((p) => ({
    id: Number(p.id),
    name: p.title,
    description: p.description,
    code_preview: p.starterCode,
    points: p.points,
    type: p.type,
    difficulty: p.difficulty,
    created_at: now,
  }));
}


async function readTasksStore(): Promise<SerializedTask[]> {
  const raw = await readFile(tasksStorePath, "utf8");
  const parsed = JSON.parse(raw) as { tasks?: SerializedTask[] } | SerializedTask[];
  if (Array.isArray(parsed)) return parsed;
  return Array.isArray(parsed.tasks) ? parsed.tasks : [];
}

async function readTestsStore(): Promise<SerializedTaskTest[]> {
  const raw = await readFile(testsStorePath, "utf8");
  const parsed = JSON.parse(raw) as { tests?: SerializedTaskTest[] } | SerializedTaskTest[];
  if (Array.isArray(parsed)) return parsed;
  return Array.isArray(parsed.tests) ? parsed.tests : [];
}

async function writeTasksStore(tasks: SerializedTask[]) {
  await writeFile(tasksStorePath, JSON.stringify({ tasks }, null, 2) + "\n", "utf8");
}

async function writeTestsStore(tests: SerializedTaskTest[]) {
  await writeFile(testsStorePath, JSON.stringify({ tests }, null, 2) + "\n", "utf8");
}

export async function initTasksTable() {
  await mkdir(path.dirname(tasksStorePath), { recursive: true });

  try {
    await access(tasksStorePath);
  } catch {
    await writeTasksStore(toDefaultTasks());
  }

  try {
    await access(testsStorePath);
  } catch {
    await writeTestsStore([]);
  }

  const tasks = await readTasksStore();
  if (!Array.isArray(tasks) || tasks.length === 0) {
    await writeTasksStore(toDefaultTasks());
  }

  const tests = await readTestsStore();
  if (!Array.isArray(tests) || tests.length === 0) {
    await writeTestsStore([]);
  }
}

export async function getAllTasks(): Promise<Task[]> {
  const tasks = await readTasksStore();
  return tasks.map(fromSerializedTask).sort((a, b) => a.id - b.id);
}

export async function getTaskById(id: number): Promise<Task | null> {
  const tasks = await readTasksStore();
  const found = tasks.find((task) => task.id === id);
  return found ? fromSerializedTask(found) : null;
}

export async function createTask(data: {
  name: string;
  description: string;
  code_preview: string;
  points: number;
  type: "solve" | "fix";
  difficulty: string;
}): Promise<Task> {
  const tasks = await readTasksStore();
  const nextId = tasks.reduce((max, task) => Math.max(max, task.id), 0) + 1;
  const task: Task = {
    id: nextId,
    name: data.name,
    description: data.description,
    code_preview: data.code_preview,
    points: data.points,
    type: data.type,
    difficulty: data.difficulty,
    created_at: new Date(),
  };

  tasks.push(toSerializedTask(task));
  await writeTasksStore(tasks);
  return task;
}

export async function updateTask(
  id: number,
  data: Partial<Pick<Task, "name" | "description" | "code_preview" | "points" | "type" | "difficulty">>
): Promise<Task | null> {
  const tasks = await readTasksStore();
  const task = tasks.find((entry) => entry.id === id);
  if (!task) return null;

  if (data.name !== undefined) task.name = data.name;
  if (data.description !== undefined) task.description = data.description;
  if (data.code_preview !== undefined) task.code_preview = data.code_preview;
  if (data.points !== undefined) task.points = data.points;
  if (data.type !== undefined) task.type = data.type;
  if (data.difficulty !== undefined) task.difficulty = data.difficulty;

  await writeTasksStore(tasks);
  return fromSerializedTask(task);
}

export async function deleteTask(id: number): Promise<boolean> {
  const tasks = await readTasksStore();
  const initialTasks = tasks.length;
  const filteredTasks = tasks.filter((task) => task.id !== id);
  if (filteredTasks.length === initialTasks) return false;

  const tests = await readTestsStore();
  const filteredTests = tests.filter((test) => test.task_id !== id);

  await writeTasksStore(filteredTasks);
  await writeTestsStore(filteredTests);
  return true;
}

export async function getTestsForTask(taskId: number): Promise<TaskTest[]> {
  const tests = await readTestsStore();
  return tests
    .filter((test) => test.task_id === taskId)
    .map(fromSerializedTest)
    .sort((a, b) => a.id - b.id);
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
  const tests = await readTestsStore();
  const nextId = tests.reduce((max, test) => Math.max(max, test.id), 0) + 1;

  const test: TaskTest = {
    id: nextId,
    task_id: data.task_id,
    name: data.name,
    input: data.input,
    expected_output: data.expected_output,
    is_hidden: data.is_hidden,
    data_file_name: data.data_file_name ?? null,
    data_file_content: data.data_file_content ?? null,
    created_at: new Date(),
  };

  tests.push(toSerializedTest(test));
  await writeTestsStore(tests);
  return test;
}

export async function updateTest(
  id: number,
  data: Partial<Pick<TaskTest, "name" | "input" | "expected_output" | "is_hidden" | "data_file_name" | "data_file_content">>
): Promise<TaskTest | null> {
  const tests = await readTestsStore();
  const test = tests.find((entry) => entry.id === id);
  if (!test) return null;

  if (data.name !== undefined) test.name = data.name;
  if (data.input !== undefined) test.input = data.input;
  if (data.expected_output !== undefined) test.expected_output = data.expected_output;
  if (data.is_hidden !== undefined) test.is_hidden = data.is_hidden;
  if (data.data_file_name !== undefined) test.data_file_name = data.data_file_name;
  if (data.data_file_content !== undefined) test.data_file_content = data.data_file_content;

  await writeTestsStore(tests);
  return fromSerializedTest(test);
}

export async function deleteTest(id: number): Promise<boolean> {
  const tests = await readTestsStore();
  const initialLength = tests.length;
  const filtered = tests.filter((test) => test.id !== id);
  if (filtered.length === initialLength) return false;

  await writeTestsStore(filtered);
  return true;
}