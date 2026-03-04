const DATABASE_URL = import.meta.env.DATABASE_URL || process.env.DATABASE_URL;

type GlobalPool = typeof globalThis & { __betaCodePoolPromise?: Promise<unknown> };

const globalForPool = globalThis as GlobalPool;

export async function getPool() {
  if (!DATABASE_URL) {
    throw new Error("Missing DATABASE_URL");
  }

  if (!globalForPool.__betaCodePoolPromise) {
    globalForPool.__betaCodePoolPromise = import("pg").then(({ Pool }) => {
      const isLocalhost = DATABASE_URL.includes("localhost") || DATABASE_URL.includes("127.0.0.1");
      return new Pool({
        connectionString: DATABASE_URL,
        ssl: isLocalhost ? false : { rejectUnauthorized: false },
      });
    });
  }

  return globalForPool.__betaCodePoolPromise;
}