const DATABASE_URL = import.meta.env.DATABASE_URL || process.env.DATABASE_URL;

type GlobalPool = typeof globalThis & { __betaCodePoolPromise?: Promise<unknown> };

const globalForPool = globalThis as GlobalPool;

export async function getPool() {
  if (!DATABASE_URL) {
    throw new Error("Missing DATABASE_URL");
  }

  if (!globalForPool.__betaCodePoolPromise) {
    globalForPool.__betaCodePoolPromise = import("pg").then(({ Pool }) => {
      return new Pool({
        connectionString: DATABASE_URL,
        ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
      });
    });
  }

  return globalForPool.__betaCodePoolPromise;
}